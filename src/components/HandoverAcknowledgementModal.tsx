import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import { DocumentHandover, DocumentItemStatus, UserProfile } from '../types/pms';
import { acknowledgeHandoverApi } from '../services/pmsService';
import { ModalTransition, MotionButton } from './animations';

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

  const isOwnCounselor = currentUser.id === handover?.counselorId;
  const isAssignedAdmission =
    currentUser.id === handover?.receivingEmployeeId && currentUser.team === 'Admission Team';
  const isAdmin = currentUser.role === 'Admission_Manager';
  const canVerify = !isOwnCounselor && (isAssignedAdmission || isAdmin);

  const itemsList = handover?.documents || [];
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

    if (!handover) return;

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
    <ModalTransition
      isOpen={isOpen && Boolean(handover)}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/70 backdrop-blur-xs"
      cardClassName="w-full max-w-4xl bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg shadow-2xl dark:shadow-none flex flex-col max-h-[90vh]"
    >
      {handover && (
        <>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#16A34A]/15 dark:bg-[rgba(52,194,107,0.14)] border border-[#16A34A]/35 dark:border-[#34C26B]/30 flex items-center justify-center text-[#16A34A] dark:text-[#34C26B]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#ECECEE]">
                Physical Document Inspection & Acknowledgement — {handover.id}
              </h2>
              <p className="text-[11px] text-[#0F172A]/65 dark:text-[#9A9AA2]">
                Student: <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">{handover.studentName}</span> ({handover.studentPassport}) · From: <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">{handover.counselorName}</span>
              </p>
            </div>
          </div>
          <MotionButton
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#0F172A]/50 dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </MotionButton>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-stable p-5 space-y-4">
          {!canVerify && (
            <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/35 dark:border-[#EF5350]/30 text-xs text-[#DC2626] dark:text-[#EF5350] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {isOwnCounselor
                  ? 'Security Guard: Counselors cannot acknowledge or verify their own handovers.'
                  : `Only assigned receiver (${handover.receivingEmployeeName}) or an authorized Administrator can verify physical receipt.`}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/35 dark:border-[#EF5350]/30 text-xs text-[#DC2626] dark:text-[#EF5350] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {handover.requestId && (
            <div className="p-3 rounded-md bg-[#EFF6FF]/70 dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/30 text-xs text-[#1E3A8A] dark:text-[#ECECEE] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 shrink-0 text-[#1E40AF] dark:text-[#4C8DF6]" />
              <span>
                Fulfills Admission Request <span className="tabular-nums font-bold">{handover.requestId}</span>
                {handover.requestStatus ? ` (${handover.requestStatus})` : ''}. Accepting all documents Received marks the request Completed.
              </span>
            </div>
          )}

          {/* Live Status Tally Bar */}
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs tabular-nums">
              <span className="text-[#16A34A] dark:text-[#34C26B] font-semibold">
                Received: {statusCounts['Received'] || 0}
              </span>
              <span className="text-[#D97706] dark:text-[#F0A030] font-semibold">
                Missing: {statusCounts['Missing'] || 0}
              </span>
              <span className="text-[#DC2626] dark:text-[#EF5350] font-semibold">
                Incorrect/Rejected: {(statusCounts['Incorrect'] || 0) + (statusCounts['Rejected'] || 0)}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              Resulting Handover Status:{' '}
              <span
                className={`tabular-nums font-bold ${
                  derivedPreviewStatus === 'Accepted'
                    ? 'text-[#16A34A] dark:text-[#34C26B]'
                    : derivedPreviewStatus === 'Partially Received'
                    ? 'text-[#D97706] dark:text-[#F0A030]'
                    : 'text-[#DC2626] dark:text-[#EF5350]'
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
                      ? 'bg-[#16A34A]/5 dark:bg-[rgba(52,194,107,0.14)] border-[#16A34A]/30 dark:border-[#34C26B]/30'
                      : 'bg-[#FFFFFF] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                        <span className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                          {item.documentName}
                        </span>
                        <span className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2]">
                          [{item.format} · x{item.quantity} · {item.pageCount}p · Batch #{item.deliveryBatch}]
                        </span>
                      </div>
                      {item.conditionRemarks && (
                        <div className="text-[11px] text-[#0F172A]/65 dark:text-[#9A9AA2] pl-5">
                          Counselor note: {item.conditionRemarks}
                        </div>
                      )}
                      {alreadyVerified && (
                        <div className="text-[11px] text-[#16A34A] dark:text-[#34C26B] pl-5 font-medium">
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
                                ? 'bg-[#16A34A] dark:bg-[#34C26B] text-white border-[#16A34A] dark:border-[#34C26B]'
                                : st === 'Missing'
                                ? 'bg-[#D97706] dark:bg-[#F0A030] text-white border-[#D97706] dark:border-[#F0A030]'
                                : 'bg-[#DC2626] dark:bg-[#EF5350] text-white border-[#DC2626] dark:border-[#EF5350]';
                            return (
                              <MotionButton
                                key={st}
                                type="button"
                                disabled={!canVerify}
                                onClick={() => handleSetItemStatus(item.id, st)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                                  active
                                    ? activeCls
                                    : 'bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#0F172A] dark:text-[#ECECEE] border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-[#F8FAFC] dark:hover:bg-[#2E2E32]'
                                }`}
                              >
                                {st}
                              </MotionButton>
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
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-slate-400 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
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
              <label className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Verification Remarks
              </label>
              <textarea
                rows={2}
                value={acknowledgementNotes}
                onChange={(e) => setAcknowledgementNotes(e.target.value)}
                placeholder="Confirm physical folder condition, missing count, or desk shelf location..."
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-slate-400 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Dispute / Incorrect Reason {hasIncorrectOrRejected && <span className="text-[#DC2626] dark:text-[#EF5350]">*</span>}
              </label>
              <textarea
                rows={2}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Required if rejecting or reporting incorrect/damaged documents..."
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-slate-400 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#161616] flex flex-wrap items-center justify-between gap-2">
          <MotionButton
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md hover:bg-[#EFF6FF]/40 dark:hover:bg-[#2E2E32] transition-colors"
          >
            Cancel
          </MotionButton>

          <div className="flex flex-wrap items-center gap-2">
            {hasIncorrectOrRejected && (
              <MotionButton
                type="button"
                disabled={!canVerify || isSubmitting}
                onClick={() => handleSubmit('Dispute')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B93535] dark:bg-[#EF5350] dark:hover:bg-[#EF5350]/90 disabled:opacity-50 rounded-md transition-colors"
              >
                {isSubmitting ? <Spinner size="sm" shade="inherit" aria-hidden="true" /> : <XCircle className="w-3.5 h-3.5" />}
                Report Dispute / Incorrect
              </MotionButton>
            )}

            {!allReceived && (hasMissing || hasIncorrectOrRejected) && (
              <MotionButton
                type="button"
                disabled={!canVerify || isSubmitting}
                onClick={() => handleSubmit('Partial')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#D97706] hover:bg-[#CF8B28] dark:bg-[#F0A030] dark:hover:bg-[#F0A030]/90 disabled:opacity-50 rounded-md transition-colors"
              >
                {isSubmitting ? <Spinner size="sm" shade="inherit" aria-hidden="true" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                Confirm Partial Receipt
              </MotionButton>
            )}

            {allReceived && (
              <MotionButton
                type="button"
                disabled={!canVerify || isSubmitting}
                onClick={() => handleSubmit('Accept')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#138A59] dark:bg-[#34C26B] dark:hover:bg-[#34C26B]/90 disabled:opacity-50 rounded-md transition-colors"
              >
                {isSubmitting ? <Spinner size="sm" shade="inherit" aria-hidden="true" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Accept All Received
              </MotionButton>
            )}
          </div>
        </div>
        </>
      )}
    </ModalTransition>
  );
};
