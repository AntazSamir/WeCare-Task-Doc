import Database from 'better-sqlite3';
import {
  buildHandoverRowPayload,
  enqueueHandoverSyncJobs,
} from './sheetsQueue';

export type DocumentItemStatus = 'Pending' | 'Received' | 'Missing' | 'Incorrect' | 'Rejected';

export type HandoverStatus =
  | 'Pending Receipt'
  | 'Accepted'
  | 'Partially Received'
  | 'Disputed'
  | 'Follow-up Delivered';

export interface HandoverDocumentItem {
  id: string;
  documentName: string;
  documentType: string;
  quantity: number;
  pageCount: number;
  format: 'Original' | 'Apostilled' | 'Notarized' | 'Certified Copy' | 'Photocopy';
  conditionRemarks?: string;
  status: DocumentItemStatus;
  verifiedAt?: string | null;
  verifiedById?: string | null;
  verifiedByName?: string | null;
  deliveryBatch: number;
  verificationNotes?: string;
}

export interface FollowUpDelivery {
  batchNumber: number;
  deliveredAt: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveredById: string;
  deliveredByName: string;
  documentsDelivered: string[];
  documentNamesDelivered: string[];
  deliveryNotes: string;
  status: 'Pending Verification' | 'Verified';
}

export interface ActorContext {
  id: string;
  name: string;
  role: 'Admission_Manager' | 'Consultant';
  team: 'Admission Team' | 'Counseling Team' | string;
}

export class HandoverError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const VALID_DOC_STATUSES: DocumentItemStatus[] = [
  'Pending',
  'Received',
  'Missing',
  'Incorrect',
  'Rejected',
];

/**
 * Authoritatively compute overall handover status from individual document item statuses.
 */
export function computeHandoverStatus(
  items: HandoverDocumentItem[],
  contextMode?: 'creation' | 'verification' | 'follow_up'
): HandoverStatus {
  if (!items || items.length === 0) return 'Pending Receipt';

  const allReceived = items.every((i) => i.status === 'Received');
  if (allReceived) return 'Accepted';

  if (contextMode === 'creation') {
    return 'Pending Receipt';
  }

  const hasPending = items.some((i) => i.status === 'Pending');
  const hasReceived = items.some((i) => i.status === 'Received');
  const hasMissing = items.some((i) => i.status === 'Missing');
  const hasIncorrectOrRejected = items.some(
    (i) => i.status === 'Incorrect' || i.status === 'Rejected'
  );

  if (contextMode === 'follow_up') {
    if (hasPending) return 'Follow-up Delivered';
  }

  // If any item is Incorrect or Rejected and nothing is Pending/Received, or dispute explicitly raised
  if (hasIncorrectOrRejected && !hasReceived) {
    return 'Disputed';
  }

  if (hasIncorrectOrRejected && !hasMissing && hasReceived) {
    // Mixed received + incorrect/rejected: partial/disputed; dispute takes precedence if incorrect items remain
    return 'Disputed';
  }

  if (hasMissing || (hasReceived && (hasMissing || hasPending || hasIncorrectOrRejected))) {
    return 'Partially Received';
  }

  return 'Pending Receipt';
}

function generateEventId(): string {
  return 'EVT-HND-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generateAuditId(): string {
  return 'AUD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generateNotifId(): string {
  return 'NTF-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Collision-safe sequence ID generator within caller's SQLite transaction.
 */
export function allocateNextHandoverId(targetDb: Database.Database, currentYear?: number): string {
  const year = currentYear || new Date().getFullYear();

  targetDb
    .prepare(
      `INSERT INTO handover_sequences (year, last_seq) VALUES (?, 1)
       ON CONFLICT(year) DO UPDATE SET last_seq = last_seq + 1`
    )
    .run(year);

  let row = targetDb
    .prepare('SELECT last_seq FROM handover_sequences WHERE year = ?')
    .get(year) as { last_seq: number };

  let candidateId = `HND-${year}-${String(row.last_seq).padStart(4, '0')}`;

  // Extra collision safeguard if manual/legacy IDs ever existed
  while (targetDb.prepare('SELECT 1 FROM document_handovers WHERE id = ?').get(candidateId)) {
    targetDb
      .prepare('UPDATE handover_sequences SET last_seq = last_seq + 1 WHERE year = ?')
      .run(year);
    row = targetDb
      .prepare('SELECT last_seq FROM handover_sequences WHERE year = ?')
      .get(year) as { last_seq: number };
    candidateId = `HND-${year}-${String(row.last_seq).padStart(4, '0')}`;
  }

  return candidateId;
}

export interface CreateHandoverInput {
  studentId: string;
  receivingEmployeeId: string;
  handoverDate: string;
  handoverTime: string;
  generalRemarks?: string;
  packageSealNumber?: string;
  documents: Array<{
    documentName: string;
    documentType?: string;
    quantity?: number;
    pageCount?: number;
    format?: 'Original' | 'Apostilled' | 'Notarized' | 'Certified Copy' | 'Photocopy';
    conditionRemarks?: string;
  }>;
}

export function createDocumentHandover(
  targetDb: Database.Database,
  actor: ActorContext,
  input: CreateHandoverInput
): { handover: any; notificationsToBroadcast: any[] } {
  // Permission 5: Keep creation strictly counselor-focused (Counseling Team)
  if (actor.team !== 'Counseling Team') {
    throw new HandoverError(
      403,
      'Only Counseling Team members can initiate document handovers.'
    );
  }

  if (!input.studentId || !input.receivingEmployeeId || !input.handoverDate || !input.handoverTime) {
    throw new HandoverError(400, 'Student, receiving Admission Team member, date, and time are required.');
  }

  if (!Array.isArray(input.documents) || input.documents.length === 0) {
    throw new HandoverError(400, 'At least one physical document item must be included in the handover.');
  }

  const student = targetDb
    .prepare('SELECT id, full_name, passport_number FROM student_applications WHERE id = ?')
    .get(input.studentId) as { id: string; full_name: string; passport_number: string } | undefined;
  if (!student) {
    throw new HandoverError(404, `Student record "${input.studentId}" does not exist.`);
  }

  const receiver = targetDb
    .prepare("SELECT id, name, role, COALESCE(team, 'Admission Team') as team FROM users WHERE id = ?")
    .get(input.receivingEmployeeId) as { id: string; name: string; role: string; team: string } | undefined;
  if (!receiver) {
    throw new HandoverError(404, `Receiving employee "${input.receivingEmployeeId}" does not exist.`);
  }
  if (receiver.team !== 'Admission Team') {
    throw new HandoverError(400, 'Receiving employee must belong to the Admission Team.');
  }
  if (receiver.id === actor.id) {
    throw new HandoverError(400, 'You cannot assign yourself as the receiving Admission employee.');
  }

  const items: HandoverDocumentItem[] = input.documents.map((doc, idx) => {
    const cleanName = (doc.documentName || '').trim();
    if (!cleanName) {
      throw new HandoverError(400, `Document #${idx + 1} is missing a document name.`);
    }
    return {
      id: `DOC-${idx + 1}`,
      documentName: cleanName,
      documentType: (doc.documentType || 'Academic / Legal').trim(),
      quantity: Math.max(1, Number(doc.quantity) || 1),
      pageCount: Math.max(1, Number(doc.pageCount) || 1),
      format: doc.format || 'Original',
      conditionRemarks: (doc.conditionRemarks || '').trim(),
      status: 'Pending',
      verifiedAt: null,
      verifiedById: null,
      verifiedByName: null,
      deliveryBatch: 1,
      verificationNotes: '',
    };
  });

  const nowIso = new Date().toISOString();
  const initialStatus = computeHandoverStatus(items, 'creation');
  const notificationsToBroadcast: any[] = [];
  let createdHandoverId = '';

  const tx = targetDb.transaction(() => {
    const handoverId = allocateNextHandoverId(targetDb);
    createdHandoverId = handoverId;
    const version = 1;

    targetDb
      .prepare(
        `INSERT INTO document_handovers (
          id, version, student_id, counselor_id, counselor_name,
          receiving_employee_id, receiving_employee_name,
          handover_date, handover_time, status, total_documents,
          documents_json, follow_up_deliveries_json, general_remarks, package_seal_number,
          created_at, updated_at,
          counselor_sheet_sync_status, receiver_sheet_sync_status, master_sheet_sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'Pending', 'Pending', 'Pending')`
      )
      .run(
        handoverId,
        version,
        student.id,
        actor.id,
        actor.name,
        receiver.id,
        receiver.name,
        input.handoverDate,
        input.handoverTime,
        initialStatus,
        items.length,
        JSON.stringify(items),
        (input.generalRemarks || '').trim(),
        (input.packageSealNumber || '').trim() || null,
        nowIso,
        nowIso
      );

    // 1. Immutable Handover Event
    targetDb
      .prepare(
        `INSERT INTO handover_events (id, handover_id, actor_id, actor_name, actor_role, action_type, details, item_states_snapshot, timestamp)
         VALUES (?, ?, ?, ?, ?, 'Created', ?, ?, ?)`
      )
      .run(
        generateEventId(),
        handoverId,
        actor.id,
        actor.name,
        actor.role,
        `Created handover ${handoverId} for ${student.full_name} (${items.length} physical document item${items.length > 1 ? 's' : ''}) assigned to ${receiver.name}.`,
        JSON.stringify(items.map((i) => ({ id: i.id, name: i.documentName, status: i.status, batch: i.deliveryBatch }))),
        nowIso
      );

    // 2. Central Audit Log
    targetDb
      .prepare(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, timestamp)
         VALUES (?, ?, ?, ?, 'CREATE_DOCUMENT_HANDOVER', 'handover', ?, ?, ?)`
      )
      .run(
        generateAuditId(),
        actor.id,
        actor.name,
        actor.role,
        handoverId,
        `Handover ${handoverId}: ${student.full_name} (${items.length} docs) -> ${receiver.name}`,
        nowIso
      );

    // 3. Persistent Receiver Notification
    const notif = {
      id: generateNotifId(),
      recipient_id: receiver.id,
      sender_id: actor.id,
      title: `Pending Document Handover: ${handoverId}`,
      message: `${actor.name} submitted ${items.length} physical document(s) for ${student.full_name} (${student.passport_number}). Please inspect & acknowledge receipt.`,
      type: 'visa_update',
      target_entity: 'handover',
      target_entity_id: handoverId,
      read_status: 0,
      created_at: nowIso,
    };

    targetDb
      .prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        notif.id,
        notif.recipient_id,
        notif.sender_id,
        notif.title,
        notif.message,
        notif.type,
        notif.target_entity,
        notif.target_entity_id,
        0,
        nowIso
      );
    notificationsToBroadcast.push(notif);

    // 4. Outbox Sync Jobs (Counselor tab, Receiver tab, Master tab)
    const rowPayload = buildHandoverRowPayload({
      handoverId,
      version,
      handoverDate: input.handoverDate,
      handoverTime: input.handoverTime,
      studentName: student.full_name,
      passportNumber: student.passport_number,
      documents: items,
      counselorName: actor.name,
      counselorId: actor.id,
      receiverName: receiver.name,
      receiverId: receiver.id,
      overallStatus: initialStatus,
      updatedAt: nowIso,
      notes: input.generalRemarks,
    });

    enqueueHandoverSyncJobs(targetDb, {
      handoverId,
      version,
      counselorId: actor.id,
      receivingEmployeeId: receiver.id,
      rowPayload,
      nowIso,
    });
  });

  tx();

  const handover = getHandoverById(targetDb, createdHandoverId);
  return { handover, notificationsToBroadcast };
}

export interface AcknowledgeHandoverInput {
  action: 'Accept' | 'Partial' | 'Dispute';
  itemDecisions: Array<{
    itemId: string;
    status: DocumentItemStatus;
    verificationNotes?: string;
  }>;
  acknowledgementNotes?: string;
  disputeReason?: string;
}

export function acknowledgeDocumentHandover(
  targetDb: Database.Database,
  handoverId: string,
  actor: ActorContext,
  input: AcknowledgeHandoverInput
): { handover: any; notificationsToBroadcast: any[] } {
  const existing = targetDb
    .prepare(
      `SELECT h.*, s.full_name as student_name, s.passport_number as student_passport
       FROM document_handovers h
       JOIN student_applications s ON h.student_id = s.id
       WHERE h.id = ?`
    )
    .get(handoverId) as any;

  if (!existing) {
    throw new HandoverError(404, `Document handover "${handoverId}" was not found.`);
  }

  // Strict RBAC guard: Counselors can NEVER acknowledge their own handovers
  if (actor.id === existing.counselor_id) {
    throw new HandoverError(
      403,
      'Counselors cannot acknowledge or verify their own handovers.'
    );
  }

  // Permission 5: Only assigned Admission employee OR authorized Administrator can verify physical documents
  const isAssignedAdmissionReceiver =
    actor.id === existing.receiving_employee_id && actor.team === 'Admission Team';
  const isAdmin = actor.role === 'Admission_Manager';

  if (!isAssignedAdmissionReceiver && !isAdmin) {
    throw new HandoverError(
      403,
      'Only the assigned Admission Team receiver or an authorized Administrator can verify and acknowledge this handover.'
    );
  }

  if (existing.status === 'Accepted') {
    throw new HandoverError(
      409,
      'This handover has already been fully accepted and finalized. Confirmed records cannot be silently modified.'
    );
  }

  if (!Array.isArray(input.itemDecisions) || input.itemDecisions.length === 0) {
    throw new HandoverError(400, 'Individual document verification decisions are required.');
  }

  const currentItems: HandoverDocumentItem[] = JSON.parse(existing.documents_json || '[]');
  const decisionMap = new Map(input.itemDecisions.map((d) => [d.itemId, d]));
  const nowIso = new Date().toISOString();

  const updatedItems: HandoverDocumentItem[] = currentItems.map((item) => {
    const decision = decisionMap.get(item.id);
    if (!decision) {
      return item;
    }

    if (!VALID_DOC_STATUSES.includes(decision.status) || decision.status === 'Pending') {
      throw new HandoverError(
        400,
        `Invalid verification status "${decision.status}" for "${item.documentName}". Must be Received, Missing, Incorrect, or Rejected.`
      );
    }

    return {
      ...item,
      status: decision.status,
      verifiedAt: nowIso,
      verifiedById: actor.id,
      verifiedByName: actor.name,
      verificationNotes:
        decision.verificationNotes !== undefined
          ? decision.verificationNotes.trim()
          : item.verificationNotes || '',
    };
  });

  // Ensure every item in the handover was evaluated (or previously received)
  const unverifiedItems = updatedItems.filter((i) => i.status === 'Pending');
  if (unverifiedItems.length > 0) {
    throw new HandoverError(
      400,
      `Every pending document must be verified (${unverifiedItems.map((u) => u.documentName).join(', ')} still Pending).`
    );
  }

  if (input.action === 'Accept' && !updatedItems.every((i) => i.status === 'Received')) {
    throw new HandoverError(
      400,
      'Cannot finalize "Accept Received" while any document is marked Missing, Incorrect, or Rejected.'
    );
  }

  if (input.action === 'Dispute' && !(input.disputeReason || '').trim()) {
    throw new HandoverError(400, 'A dispute reason is mandatory when reporting incorrect or disputed documents.');
  }

  let derivedStatus = computeHandoverStatus(updatedItems, 'verification');
  if (input.action === 'Dispute' && derivedStatus !== 'Accepted') {
    derivedStatus = 'Disputed';
  }

  const followUps: FollowUpDelivery[] = JSON.parse(existing.follow_up_deliveries_json || '[]');
  const updatedFollowUps = followUps.map((f) => ({
    ...f,
    status: 'Verified' as const,
  }));

  const isFollowUpVerification = existing.status === 'Follow-up Delivered';
  const eventActionType =
    derivedStatus === 'Accepted'
      ? isFollowUpVerification
        ? 'FollowUp_Verified'
        : 'Accepted'
      : derivedStatus === 'Disputed'
      ? 'Disputed'
      : 'Partially_Received';

  const ackType =
    derivedStatus === 'Accepted'
      ? isFollowUpVerification
        ? 'FollowUp_Accepted'
        : 'Full'
      : derivedStatus === 'Disputed'
      ? 'Dispute'
      : 'Partial';

  const nextVersion = Number(existing.version || 1) + 1;
  const notificationsToBroadcast: any[] = [];

  const summaryCounts = {
    received: updatedItems.filter((i) => i.status === 'Received').length,
    missing: updatedItems.filter((i) => i.status === 'Missing').length,
    incorrect: updatedItems.filter((i) => i.status === 'Incorrect').length,
    rejected: updatedItems.filter((i) => i.status === 'Rejected').length,
  };

  const eventDetails =
    derivedStatus === 'Accepted'
      ? `${actor.name} verified and accepted all ${updatedItems.length} physical documents.${input.acknowledgementNotes ? ` Remarks: ${input.acknowledgementNotes.trim()}` : ''}`
      : `${actor.name} marked handover as "${derivedStatus}" (Received: ${summaryCounts.received}, Missing: ${summaryCounts.missing}, Incorrect: ${summaryCounts.incorrect}, Rejected: ${summaryCounts.rejected}).${
          input.disputeReason ? ` Dispute Reason: ${input.disputeReason.trim()}.` : ''
        }${input.acknowledgementNotes ? ` Notes: ${input.acknowledgementNotes.trim()}` : ''}`;

  const tx = targetDb.transaction(() => {
    targetDb
      .prepare(
        `UPDATE document_handovers SET
          version = ?,
          status = ?,
          documents_json = ?,
          follow_up_deliveries_json = ?,
          updated_at = ?,
          last_acknowledged_at = ?,
          last_acknowledged_by_id = ?,
          last_acknowledged_by_name = ?,
          acknowledgement_type = ?,
          acknowledgement_notes = ?,
          dispute_reason = CASE WHEN ? != '' THEN ? ELSE dispute_reason END,
          counselor_sheet_sync_status = 'Pending',
          receiver_sheet_sync_status = 'Pending',
          master_sheet_sync_status = 'Pending'
         WHERE id = ?`
      )
      .run(
        nextVersion,
        derivedStatus,
        JSON.stringify(updatedItems),
        JSON.stringify(updatedFollowUps),
        nowIso,
        nowIso,
        actor.id,
        actor.name,
        ackType,
        (input.acknowledgementNotes || '').trim() || existing.acknowledgement_notes || null,
        (input.disputeReason || '').trim(),
        (input.disputeReason || '').trim(),
        handoverId
      );

    // Preserve complete historical event timeline
    targetDb
      .prepare(
        `INSERT INTO handover_events (id, handover_id, actor_id, actor_name, actor_role, action_type, details, item_states_snapshot, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        generateEventId(),
        handoverId,
        actor.id,
        actor.name,
        actor.role,
        eventActionType,
        eventDetails,
        JSON.stringify(
          updatedItems.map((i) => ({
            id: i.id,
            name: i.documentName,
            status: i.status,
            batch: i.deliveryBatch,
            notes: i.verificationNotes || '',
          }))
        ),
        nowIso
      );

    targetDb
      .prepare(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, timestamp)
         VALUES (?, ?, ?, ?, ?, 'handover', ?, ?, ?)`
      )
      .run(
        generateAuditId(),
        actor.id,
        actor.name,
        actor.role,
        `HANDOVER_${eventActionType.toUpperCase()}`,
        handoverId,
        eventDetails,
        nowIso
      );

    // Notify Counselor immediately
    const notifTitle =
      derivedStatus === 'Accepted'
        ? `Handover Accepted: ${handoverId}`
        : `Action Required (${derivedStatus}): ${handoverId}`;
    const notifMessage =
      derivedStatus === 'Accepted'
        ? `${actor.name} confirmed receipt of all ${updatedItems.length} documents for ${existing.student_name}.`
        : `${actor.name} flagged ${existing.student_name}'s handover as ${derivedStatus}. Outstanding: ${summaryCounts.missing} missing, ${summaryCounts.incorrect + summaryCounts.rejected} defective. Please deliver missing/corrected documents under ${handoverId}.`;

    const notif = {
      id: generateNotifId(),
      recipient_id: existing.counselor_id,
      sender_id: actor.id,
      title: notifTitle,
      message: notifMessage,
      type: derivedStatus === 'Accepted' ? 'task_completed' : 'deadline_warning',
      target_entity: 'handover',
      target_entity_id: handoverId,
      read_status: 0,
      created_at: nowIso,
    };

    targetDb
      .prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        notif.id,
        notif.recipient_id,
        notif.sender_id,
        notif.title,
        notif.message,
        notif.type,
        notif.target_entity,
        notif.target_entity_id,
        0,
        nowIso
      );
    notificationsToBroadcast.push(notif);

    const rowPayload = buildHandoverRowPayload({
      handoverId,
      version: nextVersion,
      handoverDate: existing.handover_date,
      handoverTime: existing.handover_time,
      studentName: existing.student_name,
      passportNumber: existing.student_passport,
      documents: updatedItems,
      counselorName: existing.counselor_name,
      counselorId: existing.counselor_id,
      receiverName: existing.receiving_employee_name,
      receiverId: existing.receiving_employee_id,
      overallStatus: derivedStatus,
      updatedAt: nowIso,
      notes: input.disputeReason || input.acknowledgementNotes || existing.general_remarks,
    });

    enqueueHandoverSyncJobs(targetDb, {
      handoverId,
      version: nextVersion,
      counselorId: existing.counselor_id,
      receivingEmployeeId: existing.receiving_employee_id,
      rowPayload,
      nowIso,
    });
  });

  tx();

  const handover = getHandoverById(targetDb, handoverId);
  return { handover, notificationsToBroadcast };
}

export interface FollowUpDeliveryInput {
  deliveryDate: string;
  deliveryTime: string;
  deliveryNotes: string;
  deliveredItems: Array<{
    itemId: string;
    quantity?: number;
    pageCount?: number;
    format?: 'Original' | 'Apostilled' | 'Notarized' | 'Certified Copy' | 'Photocopy';
    conditionRemarks?: string;
  }>;
}

export function submitHandoverFollowUp(
  targetDb: Database.Database,
  handoverId: string,
  actor: ActorContext,
  input: FollowUpDeliveryInput
): { handover: any; notificationsToBroadcast: any[] } {
  const existing = targetDb
    .prepare(
      `SELECT h.*, s.full_name as student_name, s.passport_number as student_passport
       FROM document_handovers h
       JOIN student_applications s ON h.student_id = s.id
       WHERE h.id = ?`
    )
    .get(handoverId) as any;

  if (!existing) {
    throw new HandoverError(404, `Document handover "${handoverId}" was not found.`);
  }

  // Permission 5: Follow-up delivery is strictly counselor-focused
  if (actor.team !== 'Counseling Team') {
    throw new HandoverError(
      403,
      'Only Counseling Team members can submit follow-up document deliveries.'
    );
  }

  if (existing.status !== 'Partially Received' && existing.status !== 'Disputed') {
    throw new HandoverError(
      409,
      `Follow-up deliveries can only be submitted when handover is Partially Received or Disputed (current status: ${existing.status}).`
    );
  }

  if (!input.deliveryDate || !input.deliveryTime) {
    throw new HandoverError(400, 'Follow-up delivery date and time are required.');
  }

  if (!Array.isArray(input.deliveredItems) || input.deliveredItems.length === 0) {
    throw new HandoverError(400, 'Select at least one missing, incorrect, or rejected document being delivered.');
  }

  const currentItems: HandoverDocumentItem[] = JSON.parse(existing.documents_json || '[]');
  const followUps: FollowUpDelivery[] = JSON.parse(existing.follow_up_deliveries_json || '[]');
  const nextBatchNumber = followUps.length + 2; // Batch 1 was initial creation

  const deliveredMap = new Map(input.deliveredItems.map((d) => [d.itemId, d]));
  const deliveredDocIds: string[] = [];
  const deliveredDocNames: string[] = [];

  const updatedItems: HandoverDocumentItem[] = currentItems.map((item) => {
    const update = deliveredMap.get(item.id);
    if (!update) return item;

    if (item.status === 'Received') {
      throw new HandoverError(400, `Document "${item.documentName}" is already marked Received.`);
    }

    deliveredDocIds.push(item.id);
    deliveredDocNames.push(item.documentName);

    return {
      ...item,
      quantity: update.quantity ? Math.max(1, Number(update.quantity)) : item.quantity,
      pageCount: update.pageCount ? Math.max(1, Number(update.pageCount)) : item.pageCount,
      format: update.format || item.format,
      conditionRemarks:
        update.conditionRemarks !== undefined ? update.conditionRemarks.trim() : item.conditionRemarks,
      status: 'Pending', // Needs receiver inspection to verify
      deliveryBatch: nextBatchNumber,
      verifiedAt: null,
      verifiedById: null,
      verifiedByName: null,
    };
  });

  if (deliveredDocIds.length === 0) {
    throw new HandoverError(400, 'No eligible outstanding documents matched your delivery selection.');
  }

  const nowIso = new Date().toISOString();
  const newFollowUp: FollowUpDelivery = {
    batchNumber: nextBatchNumber,
    deliveredAt: nowIso,
    deliveryDate: input.deliveryDate,
    deliveryTime: input.deliveryTime,
    deliveredById: actor.id,
    deliveredByName: actor.name,
    documentsDelivered: deliveredDocIds,
    documentNamesDelivered: deliveredDocNames,
    deliveryNotes: (input.deliveryNotes || '').trim(),
    status: 'Pending Verification',
  };

  const nextFollowUps = [...followUps, newFollowUp];
  const nextStatus = computeHandoverStatus(updatedItems, 'follow_up');
  const nextVersion = Number(existing.version || 1) + 1;
  const notificationsToBroadcast: any[] = [];

  const eventDetails = `${actor.name} submitted Follow-up Batch #${nextBatchNumber} on ${input.deliveryDate} ${input.deliveryTime} under ${handoverId}: ${deliveredDocNames.join(', ')}.${
    input.deliveryNotes ? ` Notes: ${input.deliveryNotes.trim()}` : ''
  }`;

  const tx = targetDb.transaction(() => {
    targetDb
      .prepare(
        `UPDATE document_handovers SET
          version = ?,
          status = ?,
          documents_json = ?,
          follow_up_deliveries_json = ?,
          updated_at = ?,
          counselor_sheet_sync_status = 'Pending',
          receiver_sheet_sync_status = 'Pending',
          master_sheet_sync_status = 'Pending'
         WHERE id = ?`
      )
      .run(
        nextVersion,
        nextStatus,
        JSON.stringify(updatedItems),
        JSON.stringify(nextFollowUps),
        nowIso,
        handoverId
      );

    targetDb
      .prepare(
        `INSERT INTO handover_events (id, handover_id, actor_id, actor_name, actor_role, action_type, details, item_states_snapshot, timestamp)
         VALUES (?, ?, ?, ?, ?, 'FollowUp_Submitted', ?, ?, ?)`
      )
      .run(
        generateEventId(),
        handoverId,
        actor.id,
        actor.name,
        actor.role,
        eventDetails,
        JSON.stringify(
          updatedItems.map((i) => ({
            id: i.id,
            name: i.documentName,
            status: i.status,
            batch: i.deliveryBatch,
          }))
        ),
        nowIso
      );

    targetDb
      .prepare(
        `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, timestamp)
         VALUES (?, ?, ?, ?, 'SUBMIT_HANDOVER_FOLLOWUP', 'handover', ?, ?, ?)`
      )
      .run(
        generateAuditId(),
        actor.id,
        actor.name,
        actor.role,
        handoverId,
        eventDetails,
        nowIso
      );

    // Notify Assigned Admission Receiver
    const notif = {
      id: generateNotifId(),
      recipient_id: existing.receiving_employee_id,
      sender_id: actor.id,
      title: `Follow-up Delivery Ready: ${handoverId}`,
      message: `${actor.name} delivered ${deliveredDocNames.length} missing/corrected document(s) (Batch #${nextBatchNumber}) for ${existing.student_name}. Please inspect & verify receipt.`,
      type: 'visa_update',
      target_entity: 'handover',
      target_entity_id: handoverId,
      read_status: 0,
      created_at: nowIso,
    };

    targetDb
      .prepare('INSERT INTO notifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        notif.id,
        notif.recipient_id,
        notif.sender_id,
        notif.title,
        notif.message,
        notif.type,
        notif.target_entity,
        notif.target_entity_id,
        0,
        nowIso
      );
    notificationsToBroadcast.push(notif);

    const rowPayload = buildHandoverRowPayload({
      handoverId,
      version: nextVersion,
      handoverDate: existing.handover_date,
      handoverTime: existing.handover_time,
      studentName: existing.student_name,
      passportNumber: existing.student_passport,
      documents: updatedItems,
      counselorName: existing.counselor_name,
      counselorId: existing.counselor_id,
      receiverName: existing.receiving_employee_name,
      receiverId: existing.receiving_employee_id,
      overallStatus: nextStatus,
      updatedAt: nowIso,
      notes: `Follow-up Batch #${nextBatchNumber}: ${input.deliveryNotes || deliveredDocNames.join(', ')}`,
    });

    enqueueHandoverSyncJobs(targetDb, {
      handoverId,
      version: nextVersion,
      counselorId: existing.counselor_id,
      receivingEmployeeId: existing.receiving_employee_id,
      rowPayload,
      nowIso,
    });
  });

  tx();

  const handover = getHandoverById(targetDb, handoverId);
  return { handover, notificationsToBroadcast };
}

function mapHandoverRow(row: any, events: any[] = []) {
  return {
    id: row.id,
    version: row.version,
    studentId: row.student_id,
    studentName: row.student_name,
    studentPassport: row.student_passport,
    universityName: row.university_name,
    intakeTerm: row.intake_term,
    counselorId: row.counselor_id,
    counselorName: row.counselor_name,
    receivingEmployeeId: row.receiving_employee_id,
    receivingEmployeeName: row.receiving_employee_name,
    handoverDate: row.handover_date,
    handoverTime: row.handover_time,
    status: row.status as HandoverStatus,
    totalDocuments: row.total_documents,
    documents: JSON.parse(row.documents_json || '[]') as HandoverDocumentItem[],
    followUpDeliveries: JSON.parse(row.follow_up_deliveries_json || '[]') as FollowUpDelivery[],
    generalRemarks: row.general_remarks || '',
    packageSealNumber: row.package_seal_number || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAcknowledgedAt: row.last_acknowledged_at,
    lastAcknowledgedById: row.last_acknowledged_by_id,
    lastAcknowledgedByName: row.last_acknowledged_by_name,
    acknowledgementType: row.acknowledgement_type,
    acknowledgementNotes: row.acknowledgement_notes,
    disputeReason: row.dispute_reason,
    counselorSheetSyncStatus: row.counselor_sheet_sync_status,
    receiverSheetSyncStatus: row.receiver_sheet_sync_status,
    masterSheetSyncStatus: row.master_sheet_sync_status,
    lastSyncError: row.last_sync_error,
    events: events.map((e) => ({
      id: e.id,
      handoverId: e.handover_id,
      actorId: e.actor_id,
      actorName: e.actor_name,
      actorRole: e.actor_role,
      actionType: e.action_type,
      details: e.details,
      itemStatesSnapshot: e.item_states_snapshot ? JSON.parse(e.item_states_snapshot) : [],
      timestamp: e.timestamp,
    })),
  };
}

export function getHandoverById(targetDb: Database.Database, handoverId: string) {
  const row = targetDb
    .prepare(
      `SELECT h.*,
              s.full_name as student_name,
              s.passport_number as student_passport,
              s.intake_term as intake_term,
              u.name_en as university_name
       FROM document_handovers h
       JOIN student_applications s ON h.student_id = s.id
       LEFT JOIN universities u ON s.applied_university_id = u.id
       WHERE h.id = ?`
    )
    .get(handoverId) as any;

  if (!row) return null;

  const events = targetDb
    .prepare('SELECT * FROM handover_events WHERE handover_id = ? ORDER BY timestamp ASC, id ASC')
    .all(handoverId) as any[];

  return mapHandoverRow(row, events);
}

export interface ListHandoversFilter {
  viewMode?: 'my' | 'pending' | 'received' | 'disputed' | 'all';
  search?: string;
  studentId?: string;
  counselorId?: string;
  receiverId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function listHandovers(
  targetDb: Database.Database,
  actor: ActorContext,
  filter: ListHandoversFilter
) {
  const isAdmin = actor.role === 'Admission_Manager';
  const viewMode = filter.viewMode || (actor.team === 'Counseling Team' ? 'my' : 'pending');

  if (viewMode === 'all' && !isAdmin) {
    throw new HandoverError(403, 'Only authorized Administrators can view global handover history.');
  }

  let sql = `
    SELECT h.*,
           s.full_name as student_name,
           s.passport_number as student_passport,
           s.intake_term as intake_term,
           u.name_en as university_name
    FROM document_handovers h
    JOIN student_applications s ON h.student_id = s.id
    LEFT JOIN universities u ON s.applied_university_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Role & view scoping
  if (viewMode === 'my') {
    sql += ' AND h.counselor_id = ?';
    params.push(actor.id);
  } else if (viewMode === 'pending') {
    sql += " AND h.status IN ('Pending Receipt', 'Follow-up Delivered')";
    if (!isAdmin) {
      sql += ' AND h.receiving_employee_id = ?';
      params.push(actor.id);
    }
  } else if (viewMode === 'received') {
    sql += " AND h.status = 'Accepted'";
    if (!isAdmin) {
      sql += ' AND (h.counselor_id = ? OR h.receiving_employee_id = ?)';
      params.push(actor.id, actor.id);
    }
  } else if (viewMode === 'disputed') {
    sql += " AND h.status IN ('Partially Received', 'Disputed', 'Follow-up Delivered')";
    if (!isAdmin) {
      sql += ' AND (h.counselor_id = ? OR h.receiving_employee_id = ?)';
      params.push(actor.id, actor.id);
    }
  }

  // Facet filters
  if (filter.studentId) {
    sql += ' AND h.student_id = ?';
    params.push(filter.studentId);
  }
  if (filter.counselorId) {
    sql += ' AND h.counselor_id = ?';
    params.push(filter.counselorId);
  }
  if (filter.receiverId) {
    sql += ' AND h.receiving_employee_id = ?';
    params.push(filter.receiverId);
  }
  if (filter.status && filter.status !== 'All') {
    sql += ' AND h.status = ?';
    params.push(filter.status);
  }
  if (filter.dateFrom) {
    sql += ' AND h.handover_date >= ?';
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    sql += ' AND h.handover_date <= ?';
    params.push(filter.dateTo);
  }
  if (filter.search && filter.search.trim()) {
    const q = `%${filter.search.trim().toLowerCase()}%`;
    sql += ` AND (
      LOWER(h.id) LIKE ? OR
      LOWER(s.full_name) LIKE ? OR
      LOWER(s.passport_number) LIKE ? OR
      LOWER(h.counselor_name) LIKE ? OR
      LOWER(h.receiving_employee_name) LIKE ? OR
      LOWER(h.documents_json) LIKE ?
    )`;
    params.push(q, q, q, q, q, q);
  }

  sql += ' ORDER BY h.updated_at DESC, h.id DESC';

  const rows = targetDb.prepare(sql).all(...params) as any[];
  return rows.map((r) => mapHandoverRow(r));
}

export function getHandoverStats(targetDb: Database.Database, actor: ActorContext) {
  const isAdmin = actor.role === 'Admission_Manager';
  const whereScope = isAdmin ? '' : 'WHERE counselor_id = ? OR receiving_employee_id = ?';
  const scopeParams = isAdmin ? [] : [actor.id, actor.id];

  const counts = targetDb
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Pending Receipt', 'Follow-up Delivered') THEN 1 ELSE 0 END) as pending_receipts,
        SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'Partially Received' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN status = 'Disputed' THEN 1 ELSE 0 END) as disputed,
        SUM(CASE WHEN status IN ('Pending Receipt', 'Follow-up Delivered') ${isAdmin ? '' : 'AND receiving_employee_id = ?'} THEN 1 ELSE 0 END) as my_pending_verifications
       FROM document_handovers
       ${whereScope}`
    )
    .get(...(isAdmin ? [] : [actor.id, ...scopeParams])) as any;

  const outboxStats = targetDb
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'synced' THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'superseded' THEN 1 ELSE 0 END) as superseded
       FROM sheets_sync_queue`
    )
    .get() as any;

  return {
    total: counts?.total || 0,
    pendingReceipts: counts?.pending_receipts || 0,
    accepted: counts?.accepted || 0,
    partiallyReceived: counts?.partial || 0,
    disputed: counts?.disputed || 0,
    myPendingVerifications: counts?.my_pending_verifications || 0,
    outbox: {
      pending: outboxStats?.pending || 0,
      processing: outboxStats?.processing || 0,
      synced: outboxStats?.synced || 0,
      failed: outboxStats?.failed || 0,
      superseded: outboxStats?.superseded || 0,
    },
  };
}
