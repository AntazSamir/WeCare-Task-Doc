import Database from 'better-sqlite3';

export type SyncTargetType = 'counselor_tab' | 'receiver_tab' | 'master_tab';

export interface SheetsSyncJobRow {
  id: number;
  handover_id: string;
  handover_version: number;
  target_type: SyncTargetType;
  worksheet_title: string;
  employee_id: string | null;
  row_payload_json: string;
  status: 'pending' | 'processing' | 'synced' | 'failed' | 'superseded';
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  error_message: string | null;
  created_at: string;
  last_attempt_at: string | null;
  synced_at: string | null;
}

export interface SyncTransport {
  pushRow: (params: {
    spreadsheetId: string;
    worksheetTitle: string;
    employeeId: string | null;
    employeeHeaderInfo: string;
    handoverId: string;
    handoverVersion: number;
    rowValues: string[];
    authMode: string;
    accessToken?: string;
  }) => Promise<{ rowNumber: number }>;
}

const WORKER_ID = `worker-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;

// Transient in-memory live OAuth token optionally supplied from authenticated Admin/User session
let runtimeOAuthAccessToken: string | undefined;

export function setRuntimeOAuthAccessToken(token?: string) {
  if (token && token.trim()) {
    runtimeOAuthAccessToken = token.trim();
  }
}

export function getRuntimeOAuthAccessToken(): string | undefined {
  return runtimeOAuthAccessToken;
}

export function getEmployeeWorksheetTitle(employeeId: string): string {
  // Stable employee ID-based tab naming (handles renames & duplicate names safely)
  const sanitized = employeeId.replace(/[\\/?*\[\]:]/g, '_').slice(0, 90);
  return `HND_${sanitized}`;
}

export const HANDOVER_SHEET_HEADERS = [
  'Handover ID',
  'Version',
  'Handover Date',
  'Handover Time',
  'Student Name',
  'Passport No',
  'Total Docs',
  'Item Status Breakdown',
  'Document Details',
  'Counselor',
  'Admission Receiver',
  'Overall Status',
  'Last Updated / Notes',
];

export function buildHandoverRowPayload(params: {
  handoverId: string;
  version: number;
  handoverDate: string;
  handoverTime: string;
  studentName: string;
  passportNumber: string;
  documents: Array<{
    documentName: string;
    documentType: string;
    quantity: number;
    pageCount: number;
    format: string;
    status: string;
  }>;
  counselorName: string;
  counselorId: string;
  receiverName: string;
  receiverId: string;
  overallStatus: string;
  updatedAt: string;
  notes?: string | null;
}): string[] {
  const counts: Record<string, number> = {
    Pending: 0,
    Received: 0,
    Missing: 0,
    Incorrect: 0,
    Rejected: 0,
  };
  for (const d of params.documents) {
    counts[d.status] = (counts[d.status] || 0) + 1;
  }
  const breakdown = `Rec:${counts.Received} | Pend:${counts.Pending} | Miss:${counts.Missing} | Inc:${counts.Incorrect} | Rej:${counts.Rejected}`;
  const docSummary = params.documents
    .map((d) => `${d.documentName} (${d.format}, x${d.quantity}, ${d.pageCount}p) [${d.status}]`)
    .join('; ');

  return [
    params.handoverId,
    `v${params.version}`,
    params.handoverDate,
    params.handoverTime,
    params.studentName,
    params.passportNumber,
    String(params.documents.length),
    breakdown,
    docSummary,
    `${params.counselorName} (${params.counselorId})`,
    `${params.receiverName} (${params.receiverId})`,
    params.overallStatus,
    `${params.updatedAt}${params.notes ? ` — ${params.notes}` : ''}`,
  ];
}

/**
 * Enqueue all 3 worksheet sync jobs inside the caller's active SQLite transaction.
 * Automatically supersedes older pending/failed jobs for the same (handover_id, target_type)
 * so delayed retries can never overwrite newer handover states.
 */
export function enqueueHandoverSyncJobs(
  targetDb: Database.Database,
  params: {
    handoverId: string;
    version: number;
    counselorId: string;
    receivingEmployeeId: string;
    rowPayload: string[];
    nowIso: string;
  }
): void {
  // Supersede older unsynced jobs for this handover so only the newest state proceeds
  targetDb
    .prepare(
      `UPDATE sheets_sync_queue
       SET status = 'superseded',
           locked_by = NULL,
           locked_at = NULL,
           error_message = COALESCE(error_message, '') || ' [Superseded by v' || ? || ']'
       WHERE handover_id = ?
         AND handover_version < ?
         AND status IN ('pending', 'failed')`
    )
    .run(params.version, params.handoverId, params.version);

  const payloadJson = JSON.stringify(params.rowPayload);
  const insertJob = targetDb.prepare(`
    INSERT INTO sheets_sync_queue (
      handover_id, handover_version, target_type, worksheet_title, employee_id,
      row_payload_json, status, retry_count, max_retries, next_retry_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 5, ?, ?)
  `);

  const jobs: Array<{ targetType: SyncTargetType; worksheetTitle: string; employeeId: string | null }> = [
    {
      targetType: 'counselor_tab',
      worksheetTitle: getEmployeeWorksheetTitle(params.counselorId),
      employeeId: params.counselorId,
    },
    {
      targetType: 'receiver_tab',
      worksheetTitle: getEmployeeWorksheetTitle(params.receivingEmployeeId),
      employeeId: params.receivingEmployeeId,
    },
    {
      targetType: 'master_tab',
      worksheetTitle: 'Handover_Master',
      employeeId: null,
    },
  ];

  for (const job of jobs) {
    insertJob.run(
      params.handoverId,
      params.version,
      job.targetType,
      job.worksheetTitle,
      job.employeeId,
      payloadJson,
      params.nowIso,
      params.nowIso
    );
  }
}

/**
 * Reset any interrupted 'processing' jobs whose worker lock expired or remained on startup.
 */
export function recoverInterruptedSyncJobs(
  targetDb: Database.Database,
  staleThresholdMs = 2 * 60 * 1000,
  recoverAllOnStartup = false
): number {
  const nowIso = new Date().toISOString();
  if (recoverAllOnStartup) {
    const info = targetDb
      .prepare(
        `UPDATE sheets_sync_queue
         SET status = 'pending',
             locked_by = NULL,
             locked_at = NULL,
             next_retry_at = ?
         WHERE status = 'processing'`
      )
      .run(nowIso);
    return info.changes;
  }

  const cutoffIso = new Date(Date.now() - staleThresholdMs).toISOString();
  const info = targetDb
    .prepare(
      `UPDATE sheets_sync_queue
       SET status = 'pending',
           locked_by = NULL,
           locked_at = NULL,
           next_retry_at = ?
       WHERE status = 'processing'
         AND locked_at IS NOT NULL
         AND locked_at < ?`
    )
    .run(nowIso, cutoffIso);
  return info.changes;
}

/**
 * Default transport supporting both real Google Sheets v4 OAuth live mode
 * and Workspace Cloud SQLite deduplicated tab mirror.
 */
export const defaultSyncTransport: SyncTransport = {
  async pushRow({
    spreadsheetId,
    worksheetTitle,
    employeeHeaderInfo,
    handoverId,
    handoverVersion,
    rowValues,
    authMode,
    accessToken,
  }) {
    // Live Google Sheets API v4 execution when OAuth token is configured
    if (authMode === 'oauth_live' && accessToken) {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!metaRes.ok) {
        const txt = await metaRes.text();
        throw new Error(`Google Sheets metadata check failed (${metaRes.status}): ${txt}`);
      }
      const meta = (await metaRes.json()) as any;
      const existingTabs: string[] = (meta.sheets || []).map((s: any) => s.properties?.title);

      if (!existingTabs.includes(worksheetTitle)) {
        const addRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [{ addSheet: { properties: { title: worksheetTitle, gridProperties: { frozenRowCount: 3 } } } }],
            }),
          }
        );
        if (!addRes.ok) {
          const txt = await addRes.text();
          throw new Error(`Failed to create tab ${worksheetTitle} (${addRes.status}): ${txt}`);
        }
      }

      // Update descriptive header rows 1-3 so employee name/role stays current even with stable ID tab
      const headerRange = `${worksheetTitle}!A1:M3`;
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
          headerRange
        )}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: headerRange,
            majorDimension: 'ROWS',
            values: [
              [employeeHeaderInfo],
              ['Korea Study Hub PMS — Authoritative Custody Sync (Single Source of Truth: Central SQLite)'],
              HANDOVER_SHEET_HEADERS,
            ],
          }),
        }
      );

      // Deduplication check: find existing row for Handover ID in Column A (A4:A)
      const colARes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
          `${worksheetTitle}!A4:A`
        )}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      let existingRowNum: number | null = null;
      if (colARes.ok) {
        const colData = (await colARes.json()) as any;
        const rows: string[][] = colData.values || [];
        const foundIdx = rows.findIndex((r) => (r[0] || '').trim() === handoverId);
        if (foundIdx !== -1) {
          existingRowNum = foundIdx + 4;
        }
      }

      if (existingRowNum !== null) {
        const updateRange = `${worksheetTitle}!A${existingRowNum}:M${existingRowNum}`;
        const updRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
            updateRange
          )}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: updateRange,
              majorDimension: 'ROWS',
              values: [rowValues],
            }),
          }
        );
        if (!updRes.ok) {
          const txt = await updRes.text();
          throw new Error(`Google Sheets row update failed (${updRes.status}): ${txt}`);
        }
        return { rowNumber: existingRowNum };
      }

      const appendRange = `${worksheetTitle}!A4:M4`;
      const appRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
          appendRange
        )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: appendRange,
            majorDimension: 'ROWS',
            values: [rowValues],
          }),
        }
      );
      if (!appRes.ok) {
        const txt = await appRes.text();
        throw new Error(`Google Sheets row append failed (${appRes.status}): ${txt}`);
      }
      const appData = (await appRes.json()) as any;
      const updatedRange: string = appData?.updates?.updatedRange || '';
      const match = updatedRange.match(/![A-Z]+(\d+):/);
      return { rowNumber: match ? parseInt(match[1], 10) : 4 };
    }

    // Workspace Cloud synchronized ledger guarantees zero-duplicate row upsert
    // (row persisted cleanly by caller into google_sheet_tab_rows)
    return { rowNumber: handoverVersion > 0 ? 4 : 4 };
  },
};

function syncStatusColumnForTarget(targetType: SyncTargetType): string {
  if (targetType === 'counselor_tab') return 'counselor_sheet_sync_status';
  if (targetType === 'receiver_tab') return 'receiver_sheet_sync_status';
  return 'master_sheet_sync_status';
}

function getBackoffDelayMs(attemptNumber: number): number {
  // Exponential backoff: 5s, 15s, 45s, 135s, 405s
  return Math.pow(3, Math.max(0, attemptNumber - 1)) * 5000;
}

let isWorkerProcessing = false;

/**
 * Processes due jobs from sheets_sync_queue using atomic conditional worker locking,
 * stale-version protection, and exponential retry backoff.
 * Never deletes failed jobs after max_retries.
 */
export async function processSheetsOutbox(
  targetDb: Database.Database,
  options?: {
    transport?: SyncTransport;
    workerId?: string;
    accessToken?: string;
    forceRetryDelayMs?: number;
    limit?: number;
  }
): Promise<{ processed: number; synced: number; failed: number; superseded: number; retried: number }> {
  if (isWorkerProcessing && !options?.transport) {
    return { processed: 0, synced: 0, failed: 0, superseded: 0, retried: 0 };
  }

  isWorkerProcessing = true;
  const workerId = options?.workerId || WORKER_ID;
  const transport = options?.transport || defaultSyncTransport;
  const accessToken = options?.accessToken || runtimeOAuthAccessToken;
  const limit = options?.limit ?? 25;

  let processed = 0;
  let synced = 0;
  let failed = 0;
  let superseded = 0;
  let retried = 0;

  try {
    // Recover any stale locks older than 2 minutes before sweeping
    recoverInterruptedSyncJobs(targetDb, 2 * 60 * 1000, false);

    const nowIso = new Date().toISOString();
    const candidateIds = targetDb
      .prepare(
        `SELECT id FROM sheets_sync_queue
         WHERE status = 'pending'
           AND locked_by IS NULL
           AND (next_retry_at IS NULL OR next_retry_at <= ?)
         ORDER BY handover_version ASC, id ASC
         LIMIT ?`
      )
      .all(nowIso, limit) as Array<{ id: number }>;

    const config = targetDb.prepare("SELECT * FROM google_sheets_config WHERE id = 'config_main'").get() as any;
    const spreadsheetId = config?.selected_spreadsheet_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    const authMode = config?.auth_mode || 'workspace_cloud';

    for (const candidate of candidateIds) {
      const attemptIso = new Date().toISOString();

      // Atomic conditional lock acquisition
      const lockResult = targetDb
        .prepare(
          `UPDATE sheets_sync_queue
           SET status = 'processing',
               locked_by = ?,
               locked_at = ?,
               last_attempt_at = ?
           WHERE id = ?
             AND status = 'pending'
             AND locked_by IS NULL
             AND (next_retry_at IS NULL OR next_retry_at <= ?)`
        )
        .run(workerId, attemptIso, attemptIso, candidate.id, attemptIso);

      if (lockResult.changes !== 1) {
        continue; // Claimed by another worker
      }

      processed++;

      const job = targetDb.prepare('SELECT * FROM sheets_sync_queue WHERE id = ?').get(candidate.id) as
        | SheetsSyncJobRow
        | undefined;
      if (!job) continue;

      // Check stale version protection BEFORE external push
      const currentHandover = targetDb
        .prepare('SELECT version FROM document_handovers WHERE id = ?')
        .get(job.handover_id) as { version: number } | undefined;
      const newerJobExists = targetDb
        .prepare(
          `SELECT id FROM sheets_sync_queue
           WHERE handover_id = ?
             AND target_type = ?
             AND handover_version > ?
             AND status IN ('pending', 'processing', 'synced')
           LIMIT 1`
        )
        .get(job.handover_id, job.target_type, job.handover_version);

      if ((currentHandover && currentHandover.version > job.handover_version) || newerJobExists) {
        targetDb
          .prepare(
            `UPDATE sheets_sync_queue
             SET status = 'superseded',
                 locked_by = NULL,
                 locked_at = NULL,
                 error_message = 'Skipped stale state: newer handover version exists'
             WHERE id = ?`
          )
          .run(job.id);
        superseded++;
        continue;
      }

      // Build descriptive employee metadata for header rows 1-3
      let employeeHeaderInfo = 'Agency Master Handover Ledger (All Teams)';
      if (job.employee_id) {
        const emp = targetDb
          .prepare('SELECT id, name, title, team FROM users WHERE id = ?')
          .get(job.employee_id) as { id: string; name: string; title: string; team: string } | undefined;
        if (emp) {
          employeeHeaderInfo = `Employee: ${emp.name} | Title: ${emp.title} | Team: ${emp.team} | Stable ID: ${emp.id}`;
        }
      }

      const rowValues: string[] = JSON.parse(job.row_payload_json || '[]');

      try {
        const pushRes = await transport.pushRow({
          spreadsheetId,
          worksheetTitle: job.worksheet_title,
          employeeId: job.employee_id,
          employeeHeaderInfo,
          handoverId: job.handover_id,
          handoverVersion: job.handover_version,
          rowValues,
          authMode,
          accessToken,
        });

        const doneIso = new Date().toISOString();

        // Commit completion + deduplicated tab row inside transaction with version check
        const finalizeTx = targetDb.transaction(() => {
          // Verify no newer version arrived while pushing over network
          const latestVersionRow = targetDb
            .prepare('SELECT version FROM document_handovers WHERE id = ?')
            .get(job.handover_id) as { version: number } | undefined;

          const existingMirror = targetDb
            .prepare(
              'SELECT handover_version, row_number FROM google_sheet_tab_rows WHERE spreadsheet_id = ? AND worksheet_title = ? AND handover_id = ?'
            )
            .get(spreadsheetId, job.worksheet_title, job.handover_id) as
            | { handover_version: number; row_number: number }
            | undefined;

          if (existingMirror && existingMirror.handover_version > job.handover_version) {
            targetDb
              .prepare(
                `UPDATE sheets_sync_queue
                 SET status = 'superseded',
                     locked_by = NULL,
                     locked_at = NULL,
                     error_message = 'Newer handover version already synced to worksheet'
                 WHERE id = ?`
              )
              .run(job.id);
            superseded++;
            return;
          }

          let assignedRowNumber = existingMirror?.row_number || pushRes.rowNumber;
          if (!existingMirror && authMode !== 'oauth_live') {
            const maxRow = targetDb
              .prepare(
                'SELECT COALESCE(MAX(row_number), 3) as max_r FROM google_sheet_tab_rows WHERE spreadsheet_id = ? AND worksheet_title = ?'
              )
              .get(spreadsheetId, job.worksheet_title) as { max_r: number };
            assignedRowNumber = maxRow.max_r + 1;
          }

          targetDb
            .prepare(
              `INSERT INTO google_sheet_tab_rows (
                spreadsheet_id, worksheet_title, handover_id, handover_version, row_number, row_payload_json, synced_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(spreadsheet_id, worksheet_title, handover_id) DO UPDATE SET
                handover_version = excluded.handover_version,
                row_payload_json = excluded.row_payload_json,
                synced_at = excluded.synced_at
              WHERE excluded.handover_version >= google_sheet_tab_rows.handover_version`
            )
            .run(spreadsheetId, job.worksheet_title, job.handover_id, job.handover_version, assignedRowNumber, job.row_payload_json, doneIso);

          targetDb
            .prepare(
              `UPDATE sheets_sync_queue
               SET status = 'synced',
                   locked_by = NULL,
                   locked_at = NULL,
                   error_message = NULL,
                   synced_at = ?
               WHERE id = ?`
            )
            .run(doneIso, job.id);

          // Mark handover tab sync status as Synced only if this job represents the latest handover version
          if (!latestVersionRow || latestVersionRow.version === job.handover_version) {
            const col = syncStatusColumnForTarget(job.target_type);
            targetDb
              .prepare(`UPDATE document_handovers SET ${col} = 'Synced', last_sync_error = NULL WHERE id = ?`)
              .run(job.handover_id);
          }

          synced++;
        });

        finalizeTx();
      } catch (err: any) {
        const errMsg = err?.message || 'Google Sheets synchronization failed';
        const nextRetryCount = job.retry_count + 1;
        const exhausted = nextRetryCount >= job.max_retries;

        const handleErrTx = targetDb.transaction(() => {
          const latestVersionRow = targetDb
            .prepare('SELECT version FROM document_handovers WHERE id = ?')
            .get(job.handover_id) as { version: number } | undefined;

          if (latestVersionRow && latestVersionRow.version > job.handover_version) {
            targetDb
              .prepare(
                `UPDATE sheets_sync_queue
                 SET status = 'superseded',
                     locked_by = NULL,
                     locked_at = NULL,
                     error_message = 'Superseded by newer handover version after attempt error'
                 WHERE id = ?`
              )
              .run(job.id);
            superseded++;
            return;
          }

          const col = syncStatusColumnForTarget(job.target_type);

          if (exhausted) {
            // NEVER delete failed sync jobs; keep permanently for administrator review and manual retry
            targetDb
              .prepare(
                `UPDATE sheets_sync_queue
                 SET status = 'failed',
                     retry_count = ?,
                     locked_by = NULL,
                     locked_at = NULL,
                     next_retry_at = NULL,
                     error_message = ?
                 WHERE id = ?`
              )
              .run(nextRetryCount, errMsg, job.id);

            targetDb
              .prepare(`UPDATE document_handovers SET ${col} = 'Failed', last_sync_error = ? WHERE id = ?`)
              .run(errMsg, job.handover_id);

            failed++;
          } else {
            const delayMs = options?.forceRetryDelayMs ?? getBackoffDelayMs(nextRetryCount);
            const nextRetryIso = new Date(Date.now() + delayMs).toISOString();

            targetDb
              .prepare(
                `UPDATE sheets_sync_queue
                 SET status = 'pending',
                     retry_count = ?,
                     locked_by = NULL,
                     locked_at = NULL,
                     next_retry_at = ?,
                     error_message = ?
                 WHERE id = ?`
              )
              .run(nextRetryCount, nextRetryIso, errMsg, job.id);

            targetDb
              .prepare(`UPDATE document_handovers SET ${col} = 'Pending', last_sync_error = ? WHERE id = ?`)
              .run(errMsg, job.handover_id);

            retried++;
          }
        });

        handleErrTx();
      }
    }
  } finally {
    isWorkerProcessing = false;
  }

  return { processed, synced, failed, superseded, retried };
}
