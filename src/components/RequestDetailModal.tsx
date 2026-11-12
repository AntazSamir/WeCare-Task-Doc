import React, { useEffect, useState } from 'react';
import {
  X,
  ClipboardList,
  Calendar,
  Flag,
  FileCheck2,
  AlertCircle,
  Ban,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';
import { DocumentRequest, UserProfile } from '../types/pms';
import {
  cancelDocumentRequestApi,
  fetchDocumentRequestDetails,
} from '../services/pmsService';
import { formatTimestamp } from '../utils/dateUtils';

interface RequestDetailModalProps {
  requestId: string | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onFulfillRequest?: (request: DocumentRequest) => void;
  onOpenLinkedHandover?: (handoverId: string) => void;
  onCancelled?: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  requestId,
  currentUser,
  isOpen,
  onClose,
  onFulfillRequest,
  onOpenLinkedHandover,
  onCancelled,
}) => {
  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isOpen || !requestId) return;
    setLoading(true);
    setErrorMsg(null);
    setShowCancelConfirm(false);
    setCancelReason('');
    fetchDocumentRequestDetails(requestId)
      .then((data) => setRequest(data))
      .catch((err: any) => setErrorMsg(err?.message || 'Failed to load document request'))
      .finally(() => setLoading(false));
  }, [isOpen, requestId]);

  if (!isOpen || !requestId) return null;

  const isCounselor = currentUser.team === 'Counseling Team';
  const isAdmin = currentUser.role === 'Admission_Manager';
  const canFulfill =
    !!request &&
    isCounselor &&
    request.assignedCounselorId === currentUser.id &&
    request.status === 'Open' &&
    !request.linkedHandoverId;
  const canCancel =
    !!request &&
    request.status === 'Open' &&
    !request.linkedHandoverId &&
    (request.requestedById === currentUser.id || isAdmin);

  const handleConfirmCancel = async () => {
    if (!request) return;
    setIsCancelling(true);
    setErrorMsg(null);
    try {
      await cancelDocumentRequestApi(request.id, cancelReason);
      if (onCancelled) onCancelled();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to cancel document request');
    } finally {
      setIsCancelling(false);
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'text-[#DC4545] dark:text-rose-400';
      case 'High':
        return 'text-[#E9A23B] dark:text-amber-400';
      case 'Normal':
        return 'text-[#1769E8] dark:text-[#36A5F5]';
      default:
        return 'text-[#172B4D]/60 dark:text-slate-400';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-[#16A36A] dark:text-emerald-400';
      case 'Partially Fulfilled':
        return 'text-[#E9A23B] dark:text-amber-400';
      case 'Disputed':
        return 'text-[#DC4545] dark:text-rose-400';
      case 'Handover Submitted':
      case 'In Verification':
        return 'text-[#1769E8] dark:text-[#36A5F5]';
      case 'Cancelled':
        return 'text-[#172B4D]/45 dark:text-slate-400';
      default:
        return 'text-[#123B78] dark:text-[#36A5F5]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-950/60">
      <div className="w-full max-w-3xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#DCEBFF] dark:bg-blue-950 border border-[#36A5F5]/40 dark:border-blue-800 flex items-center justify-center text-[#123B78] dark:text-[#36A5F5]">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <h2 className="text-sm font-bold font-mono text-[#172B4D] dark:text-slate-100">
                  {request?.id || requestId}
                </h2>
                {request && (
                  <span className={`font-semibold ${getStatusClass(request.status)}`}>
                    · {request.status}
                  </span>
                )}
              </div>
              {request && (
                <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                  {request.studentName} ({request.studentPassport}) · {request.universityName || request.intakeTerm}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#172B4D]/50 hover:text-[#172B4D] dark:hover:text-slate-200 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="py-12 text-center text-xs text-[#172B4D]/60 dark:text-slate-400">
              Loading document request details...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/40 border border-[#DC4545]/35 dark:border-rose-800 text-xs text-[#DC4545] dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {request && (
            <>
              {/* Overview Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#F5F8FC] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-[#172B4D]/55 dark:text-slate-400">
                    Requested By (Admission)
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#172B4D] dark:text-slate-100">
                    {request.requestedByName}
                  </div>
                  <div className="text-[11px] font-mono text-[#172B4D]/65 dark:text-slate-400 mt-0.5">
                    ID: {request.requestedById}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F5F8FC] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-[#172B4D]/55 dark:text-slate-400">
                    Assigned Counselor
                  </div>
                  <div className="mt-1 text-xs font-bold text-[#172B4D] dark:text-slate-100">
                    {request.assignedCounselorName}
                  </div>
                  <div className="text-[11px] font-mono text-[#172B4D]/65 dark:text-slate-400 mt-0.5">
                    ID: {request.assignedCounselorId}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F5F8FC] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-[#172B4D]/55 dark:text-slate-400">
                    Priority & Deadline
                  </div>
                  <div className={`mt-1 text-xs font-bold flex items-center gap-1.5 ${getPriorityClass(request.priority)}`}>
                    <Flag className="w-3.5 h-3.5" />
                    <span>{request.priority} Priority</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#172B4D]/70 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due {request.deadline}</span>
                  </div>
                </div>
              </div>

              {/* Linked Handover Link */}
              <div className="p-3.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-[#172B4D]/60 dark:text-slate-400">
                    Linked Physical Handover Record
                  </div>
                  {request.linkedHandoverId ? (
                    <div className="text-xs font-semibold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                      <span className="font-mono text-[#1769E8] dark:text-[#36A5F5]">
                        {request.linkedHandoverId}
                      </span>
                      <span className="text-[#172B4D]/40">·</span>
                      <span>Handover Status: {request.linkedHandoverStatus}</span>
                      {request.completedAt && (
                        <>
                          <span className="text-[#172B4D]/40">·</span>
                          <span className="text-[#16A36A] dark:text-emerald-400">
                            Verified {formatTimestamp(request.completedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#172B4D]/70 dark:text-slate-400">
                      No handover submitted yet. Completion requires physical receipt verification by Admission Team.
                    </div>
                  )}
                </div>

                {request.linkedHandoverId && onOpenLinkedHandover && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLinkedHandover(request.linkedHandoverId!);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#123B78] dark:text-[#36A5F5] bg-[#DCEBFF] dark:bg-blue-950/60 hover:bg-[#36A5F5]/25 border border-[#36A5F5]/40 dark:border-blue-800 rounded-md transition-colors"
                  >
                    <span>Open Handover {request.linkedHandoverId}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {request.remarks && (
                <div className="p-3.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 text-xs space-y-1">
                  <div className="font-semibold text-[#172B4D] dark:text-slate-300">
                    Admission Remarks & Instructions
                  </div>
                  <div className="text-[#172B4D]/75 dark:text-slate-400">{request.remarks}</div>
                </div>
              )}

              {/* Required Documents Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#172B4D] dark:text-slate-300">
                  Requested Physical Documents ({request.requiredDocuments.length})
                </h3>
                <div className="border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F8FC] dark:bg-slate-800/60 text-[11px] font-semibold text-[#172B4D]/65 dark:text-slate-400 border-b border-[#E3EAF3] dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Required Document</th>
                        <th className="px-3 py-2">Format</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Instructions / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
                      {request.requiredDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[#F5F8FC] dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-mono text-[11px] text-[#172B4D]/55 dark:text-slate-400">{doc.id}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-[#172B4D] dark:text-slate-100">
                              {doc.documentName}
                            </div>
                            <div className="text-[11px] text-[#172B4D]/60 dark:text-slate-400">{doc.documentType}</div>
                          </td>
                          <td className="px-3 py-2 text-[#172B4D] dark:text-slate-300">{doc.format}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-[#172B4D] dark:text-slate-200">{doc.quantity}x</td>
                          <td className="px-3 py-2 text-[11px] text-[#172B4D]/70 dark:text-slate-400">
                            {doc.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {showCancelConfirm && (
                <div className="p-3.5 rounded-lg bg-[#DC4545]/10 dark:bg-rose-950/30 border border-[#DC4545]/35 dark:border-rose-800 space-y-2.5">
                  <div className="text-xs font-bold text-[#DC4545] dark:text-rose-200">
                    Confirm Request Cancellation
                  </div>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancelling this open document request..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DC4545]/40 dark:border-rose-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#DC4545] focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#172B4D] bg-[#FFFFFF] border border-[#E3EAF3] rounded-md"
                    >
                      Keep Open
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleConfirmCancel}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#DC4545] hover:bg-[#B93535] rounded-md"
                    >
                      {isCancelling ? 'Cancelling...' : 'Confirm Cancel Request'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#F5F8FC] dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-mono text-[#172B4D]/60 dark:text-slate-400">
            Created: {request ? formatTimestamp(request.createdAt) : '—'}
          </div>
          <div className="flex items-center gap-2">
            {canCancel && !showCancelConfirm && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#DC4545] dark:text-rose-300 bg-[#DC4545]/10 dark:bg-rose-950/50 border border-[#DC4545]/30 dark:border-rose-800 hover:bg-[#DC4545]/20 rounded-md"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel Request
              </button>
            )}

            {canFulfill && onFulfillRequest && request && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFulfillRequest(request);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Submit Requested Documents
              </button>
            )}

            {request &&
              request.linkedHandoverId &&
              (request.status === 'Partially Fulfilled' || request.status === 'Disputed') &&
              isCounselor &&
              request.assignedCounselorId === currentUser.id &&
              onOpenLinkedHandover && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLinkedHandover(request.linkedHandoverId!);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E9A23B] hover:bg-[#CF8B28] rounded-md transition-colors"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  Submit Missing / Corrected Docs
                </button>
              )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#172B4D] dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md hover:bg-[#DCEBFF]/40"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
