import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { DocumentHandover, DocumentItemStatus, UserProfile } from '../types/pms';
import { acknowledgeHandoverApi } from '../services/pmsService';

interface HandoverAcknowledgementModalProps {
  handover: DocumentHandover | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const HandoverAcknowledgementModal: React.FC<HandoverAcknowledgementModalProps> = ({
  handover,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [decisions, setDecisions] = useState<
    Record<string, { status: DocumentItemStatus; verificationNotes: string }>
  >({});
  const [acknowledgementNotes, setAcknowledgementNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && handover) {
      const initial: Record<string, { status: DocumentItemStatus; verificationNotes: string }> = {};
      for (const item of handover.documents) {
        initial[item.id] = {
          status: item.status === 'Received' ? 'Received' : 'Received',
          verificationNotes: item.verificationNotes || '',
        };
      }
      setDecisions(initial);
      setAcknowledgementNotes('');
      setDisputeReason('');
      setErrorMsg(null);
    }
  }, [isOpen, handover]);

  if (!isOpen || !handover) return null;

  const isOwnCounselor = currentUser.id === handover.counselorId;
  const isAssignedAdmission =
    currentUser.id === handover.receivingEmployeeId && currentUser.team === 'Admission Team';
  const isAdmin = currentUser.role === 'Admission_Manager';
  const canVerify = !isOwnCounselor && (isAssignedAdmission || isAdmin);

  const itemsList = handover.documents;
  const statusCounts = itemsList.reduce(
    (acc, item) => {
      const st = item.status === 'Received' ? 'Received' : decisions[item.id]?.status || 'Pending';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const allReceived = itemsList.every(
    (item) => (item.status === 'Received' ? 'Received' : decisions[item.id]?.status) === 'Received'
  );
  const hasIncorrectOrRejected = itemsList.some((item) => {
    const st = item.status === 'Received' ? 'Received' : decisions[item.id]?.status;
    return st === 'Incorrect' || st === 'Rejected';
  });
  const hasMissing = itemsList.some((item) => {
    const st = item.status === 'Received' ? 'Received' : decisions[item.id]?.status;
    return st === 'Missing';
  });

  const derivedPreviewStatus = allReceived
    ? 'Accepted'
    : hasIncorrectOrRejected
    ? 'Disputed'
    : hasMissing
    ? 'Partially Received'
    : 'Pending Receipt';

  const handleSetItemStatus = (itemId: string, status: DocumentItemStatus) => {
    setDecisions((prev) => ({
      ...prev,
      [itemId]: {
        status,
        verificationNotes: prev[itemId]?.verificationNotes || '',
      },
    }));
  };

  const handleSetItemNotes = (itemId: string, verificationNotes: string) => {
    setDecisions((prev) => ({
      ...prev,
      [itemId]: {
        status: prev[itemId]?.status || 'Received',
        verificationNotes,
      },
    }));
  };

  const handleSubmit = async (action: 'Accept' | 'Partial' | 'Dispute') => {
    setErrorMsg(null);
    if (!canVerify) {
      setErrorMsg('You are not authorized to verify this handover.');
      return;
    }

    if (action === 'Accept' && !allReceived) {
      setErrorMsg('All itemized documents must be marked "Received" before finalizing Acceptance.');
      return;
    }
    if (action === 'Dispute' && !disputeReason.trim()) {
      setErrorMsg('Please enter a mandatory Dispute Reason explaining incorrect or rejected items.');
      return;
    }

    const itemDecisions = itemsList
      .filter((item) => item.status !== 'Received')
      .map((item) => ({
        itemId: item.id,
        status: decisions[item.id]?.status || 'Received',
        verificationNotes: decisions[item.id]?.verificationNotes || '',
      }));

    setIsSubmitting(true);
    try {
      await acknowledgeHandoverApi(handover.id, {
        action,
        itemDecisions,
        acknowledgementNotes,
        disputeReason,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Physical Document Inspection & Acknowledgement — {handover.id}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Student: <span className="font-semibold text-slate-700 dark:text-slate-300">{handover.studentName}</span> ({handover.studentPassport}) · From: <span className="font-semibold">{handover.counselorName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!canVerify && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {isOwnCounselor
                  ? 'Security Guard: Counselors cannot acknowledge or verify their own handovers.'
                  : `Only assigned receiver (${handover.receivingEmployeeName}) or an authorized Administrator can verify physical receipt.`}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Status Tally Bar */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Received: {statusCounts['Received'] || 0}
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-semibold">
                Missing: {statusCounts['Missing'] || 0}
              </span>
              <span className="text-rose-700 dark:text-rose-400 font-semibold">
                Incorrect/Rejected: {(statusCounts['Incorrect'] || 0) + (statusCounts['Rejected'] || 0)}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Resulting Handover Status:{' '}
              <span
                className={`font-mono font-bold ${
                  derivedPreviewStatus === 'Accepted'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : derivedPreviewStatus === 'Partially Received'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {derivedPreviewStatus}
              </span>
            </div>
          </div>

          {/* Per-Document Inspection Checklist */}
          <div className="space-y-2.5">
            {itemsList.map((item) => {
              const alreadyVerified = item.status === 'Received';
              const currentDecision = alreadyVerified
                ? 'Received'
                : decisions[item.id]?.status || 'Received';
              const currentNotes = decisions[item.id]?.verificationNotes || '';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-colors ${
                    alreadyVerified
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.documentName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          [{item.format} · x{item.quantity} · {item.pageCount}p · Batch #{item.deliveryBatch}]
                        </span>
                      </div>
                      {item.conditionRemarks && (
                        <div className="text-[11px] text-slate-500 pl-5">
                          Counselor note: {item.conditionRemarks}
                        </div>
                      )}
                      {alreadyVerified && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-5 font-medium">
                          Previously verified by {item.verifiedByName || 'Admission Officer'} (Locked as Received)
                        </div>
                      )}
                    </div>

                    {!alreadyVerified && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['Received', 'Missing', 'Incorrect', 'Rejected'] as DocumentItemStatus[]).map(
                          (st) => {
                            const active = currentDecision === st;
                            const activeCls =
                              st === 'Received'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : st === 'Missing'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-rose-600 text-white border-rose-600';
                            return (
                              <button
                                key={st}
                                type="button"
                                disabled={!canVerify}
                                onClick={() => handleSetItemStatus(item.id, st)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                                  active
                                    ? activeCls
                                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>

                  {!alreadyVerified && currentDecision !== 'Received' && (
                    <div className="mt-2.5 pl-5">
                      <input
                        type="text"
                        value={currentNotes}
                        onChange={(e) => handleSetItemNotes(item.id, e.target.value)}
                        placeholder={`Specify exact issue for "${item.documentName}" (e.g. missing notarized page 2, expired date)...`}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dispute Reason & General Inspection Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Verification Remarks
              </label>
              <textarea
                rows={2}
                value={acknowledgementNotes}
                onChange={(e) => setAcknowledgementNotes(e.target.value)}
                placeholder="Confirm physical folder condition, missing count, or desk shelf location..."
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dispute / Incorrect Reason {hasIncorrectOrRejected && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={2}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Required if rejecting or reporting incorrect/damaged documents..."
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {hasIncorrectOrRejected && (
              <button
                type="button"
                disabled={!canVerify || isSubmitting}
                onClick={() => handleSubmit('Dispute')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Report Dispute / Incorrect
              </button>
            )}

            {!allReceived && (hasMissing || hasIncorrectOrRejected) && (
              <button
                type="button"
                disabled={!canVerify || isSubmitting}
                onClick={() => handleSubmit('Partial')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-md transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Confirm Partial Receipt
              </button>
            )}

            {allReceived && (
              <button
                type="button"
                disabled={!canVerify || isSubmitting}
                onClick={() => handleSubmit('Accept')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accept All Received
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
