import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  acknowledgeDocumentHandover,
  ActorContext,
  createDocumentHandover,
  getHandoverById,
  HandoverError,
  submitHandoverFollowUp,
} from '../server/handoverService';
import {
  getEmployeeWorksheetTitle,
  processSheetsOutbox,
  recoverInterruptedSyncJobs,
} from '../server/sheetsQueue';

function createIsolatedTestDb(): { db: Database.Database; cleanup: () => void } {
  const prodDbPath = path.resolve(process.cwd(), 'data', 'consultancy_pms.sqlite');
  const tmpFile = path.join(os.tmpdir(), `handover_test_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`);
  fs.copyFileSync(prodDbPath, tmpFile);
  const testDb = new Database(tmpFile);
  testDb.pragma('foreign_keys = ON');
  return {
    db: testDb,
    cleanup: () => {
      testDb.close();
      try { fs.unlinkSync(tmpFile); } catch {}
    },
  };
}

const counselorDavid: ActorContext = {
  id: 'USR-CONSULTANT-3',
  name: 'David Kim',
  role: 'Consultant',
  team: 'Counseling Team',
};

const admissionMinJi: ActorContext = {
  id: 'USR-CONSULTANT-1',
  name: 'Min-Ji Park',
  role: 'Consultant',
  team: 'Admission Team',
};

const admissionHannah: ActorContext = {
  id: 'USR-CONSULTANT-2',
  name: 'Hannah Lee',
  role: 'Consultant',
  team: 'Admission Team',
};

const adminSamiul: ActorContext = {
  id: 'USR-ADMIN',
  name: 'Samiul Alam',
  role: 'Admission_Manager',
  team: 'Admission Team',
};

test('Handover End-to-End Lifecycle, RBAC, Triggers, and Sequence IDs', () => {
  const { db, cleanup } = createIsolatedTestDb();
  try {
    const currentYear = new Date().getFullYear();

    // 1. Non-counselors cannot initiate handovers
    assert.throws(
      () =>
        createDocumentHandover(db, admissionMinJi, {
          studentId: 'STU-2027-001',
          receivingEmployeeId: admissionHannah.id,
          handoverDate: '2026-11-12',
          handoverTime: '10:00',
          documents: [{ documentName: 'Passport Copy', quantity: 1, pageCount: 1, format: 'Certified Copy' }],
        }),
      (err: any) => err instanceof HandoverError && err.statusCode === 403
    );

    // 2. Counselor creates handover #1 -> HND-{year}-0001
    const res1 = createDocumentHandover(db, counselorDavid, {
      studentId: 'STU-2027-001',
      receivingEmployeeId: admissionMinJi.id,
      handoverDate: '2026-11-12',
      handoverTime: '11:30',
      generalRemarks: 'Sealed beige folder handed at reception',
      packageSealNumber: 'ENV-901',
      documents: [
        { documentName: 'Apostilled High School Diploma', documentType: 'Diploma', quantity: 1, pageCount: 3, format: 'Apostilled' },
        { documentName: 'Shinhan Bank Balance Certificate ($20k)', documentType: 'Financial', quantity: 1, pageCount: 2, format: 'Original' },
      ],
    });

    assert.equal(res1.handover.id, `HND-${currentYear}-0001`);
    assert.equal(res1.handover.status, 'Pending Receipt');
    assert.equal(res1.handover.documents.length, 2);
    assert.ok(res1.handover.documents.every((d: any) => d.status === 'Pending'));
    assert.equal(res1.notificationsToBroadcast.length, 1);
    assert.equal(res1.notificationsToBroadcast[0].recipient_id, admissionMinJi.id);

    // Second handover gets HND-{year}-0002 cleanly
    const res2 = createDocumentHandover(db, counselorDavid, {
      studentId: 'STU-2027-002',
      receivingEmployeeId: admissionHannah.id,
      handoverDate: '2026-11-12',
      handoverTime: '12:00',
      documents: [{ documentName: 'Bachelor Degree', quantity: 1, pageCount: 2, format: 'Apostilled' }],
    });
    assert.equal(res2.handover.id, `HND-${currentYear}-0002`);

    // 3. Counselor cannot acknowledge own handover
    assert.throws(
      () =>
        acknowledgeDocumentHandover(db, res1.handover.id, counselorDavid, {
          action: 'Accept',
          itemDecisions: [
            { itemId: 'DOC-1', status: 'Received' },
            { itemId: 'DOC-2', status: 'Received' },
          ],
        }),
      (err: any) => err instanceof HandoverError && err.statusCode === 403
    );

    // Unassigned Admission officer cannot acknowledge someone else's handover
    assert.throws(
      () =>
        acknowledgeDocumentHandover(db, res1.handover.id, admissionHannah, {
          action: 'Accept',
          itemDecisions: [
            { itemId: 'DOC-1', status: 'Received' },
            { itemId: 'DOC-2', status: 'Received' },
          ],
        }),
      (err: any) => err instanceof HandoverError && err.statusCode === 403
    );

    // 4. Assigned receiver marks DOC-1 Received and DOC-2 Missing -> Partially Received
    const partial = acknowledgeDocumentHandover(db, res1.handover.id, admissionMinJi, {
      action: 'Partial',
      itemDecisions: [
        { itemId: 'DOC-1', status: 'Received', verificationNotes: 'Seal verified' },
        { itemId: 'DOC-2', status: 'Missing', verificationNotes: 'Not inside folder' },
      ],
      acknowledgementNotes: 'Diploma received; missing bank certificate.',
    });
    assert.equal(partial.handover.status, 'Partially Received');
    assert.equal(partial.handover.version, 2);
    assert.equal(partial.notificationsToBroadcast[0].recipient_id, counselorDavid.id);

    // 5. Non-counselor cannot submit follow-up delivery
    assert.throws(
      () =>
        submitHandoverFollowUp(db, res1.handover.id, admissionMinJi, {
          deliveryDate: '2026-11-12',
          deliveryTime: '14:00',
          deliveryNotes: 'Invalid actor attempt',
          deliveredItems: [{ itemId: 'DOC-2' }],
        }),
      (err: any) => err instanceof HandoverError && err.statusCode === 403
    );

    // 6. Counselor delivers missing DOC-2 under original Handover ID
    const followUp = submitHandoverFollowUp(db, res1.handover.id, counselorDavid, {
      deliveryDate: '2026-11-12',
      deliveryTime: '15:10',
      deliveryNotes: 'Handed original Shinhan bank certificate directly to Min-Ji.',
      deliveredItems: [{ itemId: 'DOC-2', quantity: 1, pageCount: 2, format: 'Original' }],
    });
    assert.equal(followUp.handover.id, res1.handover.id);
    assert.equal(followUp.handover.status, 'Follow-up Delivered');
    assert.equal(followUp.handover.followUpDeliveries.length, 1);
    assert.equal(followUp.handover.followUpDeliveries[0].batchNumber, 2);
    const doc2AfterFollowUp = followUp.handover.documents.find((d: any) => d.id === 'DOC-2');
    assert.equal(doc2AfterFollowUp.status, 'Pending');
    assert.equal(doc2AfterFollowUp.deliveryBatch, 2);

    // 7. Assigned Admission receiver verifies newly delivered DOC-2 -> Accepted
    const finalAccept = acknowledgeDocumentHandover(db, res1.handover.id, admissionMinJi, {
      action: 'Accept',
      itemDecisions: [{ itemId: 'DOC-2', status: 'Received', verificationNotes: 'Verified original stamp' }],
      acknowledgementNotes: 'All documents now in custody.',
    });
    assert.equal(finalAccept.handover.status, 'Accepted');
    assert.equal(finalAccept.handover.events.length, 4);
    assert.deepEqual(
      finalAccept.handover.events.map((e: any) => e.actionType),
      ['Created', 'Partially_Received', 'FollowUp_Submitted', 'FollowUp_Verified']
    );

    // 8. SQLite triggers strictly block UPDATE and DELETE on handover_events and DELETE on document_handovers
    assert.throws(
      () => db.prepare("UPDATE handover_events SET details = 'tampered' WHERE handover_id = ?").run(res1.handover.id),
      /append-only/
    );
    assert.throws(
      () => db.prepare('DELETE FROM handover_events WHERE handover_id = ?').run(res1.handover.id),
      /immutable/
    );
    assert.throws(
      () => db.prepare('DELETE FROM document_handovers WHERE id = ?').run(res1.handover.id),
      /cannot be deleted/
    );
  } finally {
    cleanup();
  }
});

test('Outbox Sync Queue: Locking, Stale Version Protection, Retries, Failed Retention & Deduplication', async () => {
  const { db, cleanup } = createIsolatedTestDb();
  try {
    // Stable ID-based worksheet tab naming
    assert.equal(getEmployeeWorksheetTitle('USR-CONSULTANT-3'), 'HND_USR-CONSULTANT-3');

    const { handover } = createDocumentHandover(db, counselorDavid, {
      studentId: 'STU-2027-001',
      receivingEmployeeId: admissionMinJi.id,
      handoverDate: '2026-11-12',
      handoverTime: '16:00',
      documents: [{ documentName: 'Passport Copy', quantity: 1, pageCount: 1, format: 'Certified Copy' }],
    });

    // Should have 3 queued jobs at v1 (counselor_tab, receiver_tab, master_tab)
    const v1Jobs = db.prepare('SELECT * FROM sheets_sync_queue WHERE handover_id = ?').all(handover.id) as any[];
    assert.equal(v1Jobs.length, 3);
    assert.ok(v1Jobs.every((j) => j.status === 'pending' && j.handover_version === 1));

    // Advance handover to v2 before v1 finishes syncing -> v1 jobs MUST be marked superseded!
    acknowledgeDocumentHandover(db, handover.id, adminSamiul, {
      action: 'Dispute',
      disputeReason: 'Passport copy blurred',
      itemDecisions: [{ itemId: 'DOC-1', status: 'Incorrect', verificationNotes: 'Blurry scan' }],
    });

    const v1AfterV2 = db
      .prepare('SELECT status FROM sheets_sync_queue WHERE handover_id = ? AND handover_version = 1')
      .all(handover.id) as any[];
    assert.ok(v1AfterV2.every((j) => j.status === 'superseded'));

    // Simulate interrupted lock on a v2 job and recover it
    const v2Job = db
      .prepare("SELECT id FROM sheets_sync_queue WHERE handover_id = ? AND handover_version = 2 AND target_type = 'counselor_tab'")
      .get(handover.id) as any;
    db.prepare(
      "UPDATE sheets_sync_queue SET status = 'processing', locked_by = 'crashed-worker', locked_at = '2020-01-01T00:00:00.000Z' WHERE id = ?"
    ).run(v2Job.id);

    const recoveredCount = recoverInterruptedSyncJobs(db, 2 * 60 * 1000, false);
    assert.equal(recoveredCount, 1);

    // Simulate persistent failure until max_retries -> jobs must move to 'failed' and NEVER be deleted
    const failingTransport = {
      async pushRow() {
        throw new Error('429 Google API Quota Exceeded');
      },
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      // Make pending retries immediately due for deterministic test
      db.prepare("UPDATE sheets_sync_queue SET next_retry_at = '2020-01-01T00:00:00.000Z' WHERE status = 'pending'").run();
      await processSheetsOutbox(db, { transport: failingTransport, forceRetryDelayMs: 0 });
    }

    const failedJobs = db
      .prepare("SELECT * FROM sheets_sync_queue WHERE handover_id = ? AND handover_version = 2 AND status = 'failed'")
      .all(handover.id) as any[];
    assert.equal(failedJobs.length, 3);
    assert.ok(failedJobs.every((j) => j.retry_count === 5 && j.error_message.includes('429')));

    const afterFailHandover = getHandoverById(db, handover.id);
    assert.ok(afterFailHandover);
    assert.equal(afterFailHandover.counselorSheetSyncStatus, 'Failed');
    assert.equal(afterFailHandover.receiverSheetSyncStatus, 'Failed');
    assert.equal(afterFailHandover.masterSheetSyncStatus, 'Failed');

    // Manual admin retry succeeds and deduplicates tab rows cleanly
    db.prepare("UPDATE sheets_sync_queue SET status = 'pending', retry_count = 0, next_retry_at = '2020-01-01T00:00:00.000Z' WHERE status = 'failed'").run();
    const successSummary = await processSheetsOutbox(db);
    assert.equal(successSummary.synced, 3);

    const tabRows = db
      .prepare('SELECT worksheet_title, handover_id, handover_version FROM google_sheet_tab_rows WHERE handover_id = ?')
      .all(handover.id) as any[];
    assert.equal(tabRows.length, 3);
    assert.deepEqual(
      tabRows.map((t) => t.worksheet_title).sort(),
      ['HND_USR-CONSULTANT-1', 'HND_USR-CONSULTANT-3', 'Handover_Master']
    );
  } finally {
    cleanup();
  }
});
