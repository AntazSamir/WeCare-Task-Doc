import React, { useEffect, useState } from 'react';
import {
  X,
  FileCheck2,
  Printer,
  ArrowRight,
  History,
  Package,
  ClipboardList,
} from 'lucide-react';
import { DocumentHandover, DocumentItemStatus } from '../types/pms';
import { fetchHandoverDetails } from '../services/pmsService';
import { formatTimestamp } from '../utils/dateUtils';

interface HandoverDetailModalProps {
  handoverId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenVerify?: (handover: DocumentHandover) => void;
  onOpenFollowUp?: (handover: DocumentHandover) => void;
  onOpenRequest?: (requestId: string) => void;
  canVerify?: (handover: DocumentHandover) => boolean;
  canFollowUp?: (handover: DocumentHandover) => boolean;
}

export const HandoverDetailModal: React.FC<HandoverDetailModalProps> = ({
  handoverId,
  isOpen,
  onClose,
  onOpenVerify,
  onOpenFollowUp,
  onOpenRequest,
  canVerify,
  canFollowUp,
}) => {
  const [handover, setHandover] = useState<DocumentHandover | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  useEffect(() => {
    if (!isOpen || !handoverId) return;
    setLoading(true);
    setErrorMsg(null);
    setShowPrintSlip(false);
    fetchHandoverDetails(handoverId)
      .then((data) => setHandover(data))
      .catch((err: any) => setErrorMsg(err?.message || 'Failed to load handover manifest'))
      .finally(() => setLoading(false));
  }, [isOpen, handoverId]);

  if (!isOpen || !handoverId) return null;

  const getItemStatusColor = (st: DocumentItemStatus) => {
    switch (st) {
      case 'Received':
        return 'text-[#16A36A] dark:text-emerald-400';
      case 'Missing':
        return 'text-[#E9A23B] dark:text-amber-400';
      case 'Incorrect':
      case 'Rejected':
        return 'text-[#DC4545] dark:text-rose-400';
      default:
        return 'text-[#172B4D]/70 dark:text-slate-400';
    }
  };

  const getSyncTextClass = (st: string) => {
    if (st === 'Synced') return 'text-[#16A36A] dark:text-emerald-400';
    if (st === 'Failed') return 'text-[#DC4545] dark:text-rose-400';
    return 'text-[#E9A23B] dark:text-amber-400';
  };

  const handlePrint = () => {
    setShowPrintSlip(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs animate-modal-backdrop">
      <div className="w-full max-w-4xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[92vh] animate-modal-card">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#DCEBFF] dark:bg-slate-800 border border-[#36A5F5]/40 dark:border-slate-700 flex items-center justify-center text-[#123B78] dark:text-[#36A5F5]">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono text-[#172B4D] dark:text-slate-100">
                  {handover?.id || handoverId}
                </h2>
                {handover && (
                  <span className="text-[11px] font-mono text-[#172B4D]/60 dark:text-slate-400">
                    v{handover.version} · {handover.status}
                  </span>
                )}
              </div>
              {handover && (
                <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                  {handover.studentName} ({handover.studentPassport}) · {handover.universityName || handover.intakeTerm}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {handover && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPrintSlip(!showPrintSlip)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#123B78] dark:text-slate-300 bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] border border-[#E3EAF3] dark:border-slate-700 rounded-md transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {showPrintSlip ? 'Back to Audit View' : 'Printable Slip'}
                </button>
                {showPrintSlip && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors"
                  >
                    Print
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#172B4D]/50 hover:text-[#172B4D] dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="py-12 text-center text-xs text-[#172B4D]/60 dark:text-slate-400">Loading handover audit manifest...</div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/40 border border-[#DC4545]/35 text-xs text-[#DC4545]">
              {errorMsg}
            </div>
          )}

          {handover && !showPrintSlip && (
            <div className="space-y-5">
              {/* Custody Chain Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-[#172B4D]/55 dark:text-slate-400">Counselor (Sender)</div>
                  <div className="mt-1 text-xs font-bold text-[#172B4D] dark:text-slate-100">
                    {handover.counselorName}
                  </div>
                  <div className="text-[11px] font-mono text-[#172B4D]/65 dark:text-slate-400">
                    Tab: HND_{handover.counselorId}
                  </div>
                  <div className={`text-[11px] font-mono font-semibold mt-1 ${getSyncTextClass(handover.counselorSheetSyncStatus)}`}>
                    Sheet: {handover.counselorSheetSyncStatus}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-[#172B4D]/55 dark:text-slate-400">Admission Officer (Receiver)</div>
                  <div className="mt-1 text-xs font-bold text-[#172B4D] dark:text-slate-100">
                    {handover.receivingEmployeeName}
                  </div>
                  <div className="text-[11px] font-mono text-[#172B4D]/65 dark:text-slate-400">
                    Tab: HND_{handover.receivingEmployeeId}
                  </div>
                  <div className={`text-[11px] font-mono font-semibold mt-1 ${getSyncTextClass(handover.receiverSheetSyncStatus)}`}>
                    Sheet: {handover.receiverSheetSyncStatus}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase text-[#172B4D]/55 dark:text-slate-400">Transfer & Custody Status</div>
                  <div className="mt-1 text-xs font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-1.5">
                    <span>{handover.status}</span>
                    {handover.packageSealNumber && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#172B4D]/60 dark:text-slate-400">
                        <Package className="w-3 h-3" /> {handover.packageSealNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[#172B4D]/65 dark:text-slate-400">
                    {handover.handoverDate} at {handover.handoverTime}
                  </div>
                  <div className={`text-[11px] font-mono font-semibold mt-1 ${getSyncTextClass(handover.masterSheetSyncStatus)}`}>
                    Master Tab: {handover.masterSheetSyncStatus}
                  </div>
                </div>
              </div>

              {handover.requestId && (
                <div className="p-3.5 rounded-lg bg-[#DCEBFF]/60 dark:bg-blue-950/30 border border-[#36A5F5]/40 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <ClipboardList className="w-4 h-4 text-[#1769E8] dark:text-[#36A5F5] shrink-0" />
                    <div>
                      <span className="font-bold font-mono text-[#123B78] dark:text-blue-200">
                        Linked Request: {handover.requestId}
                      </span>
                      <span className="text-[#172B4D]/75 dark:text-blue-300">
                        {handover.requestPriority ? ` · ${handover.requestPriority} Priority` : ''}
                        {handover.requestDeadline ? ` · Due ${handover.requestDeadline}` : ''}
                        {handover.requestStatus ? ` · Status: ${handover.requestStatus}` : ''}
                      </span>
                    </div>
                  </div>
                  {onOpenRequest && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRequest(handover.requestId!);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#123B78] dark:text-blue-300 bg-[#FFFFFF] dark:bg-slate-900 hover:bg-[#DCEBFF] border border-[#36A5F5]/40 dark:border-blue-700 rounded-md transition-colors"
                    >
                      <span>View Request {handover.requestId}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {handover.lastSyncError && (
                <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/30 border border-[#DC4545]/35 dark:border-rose-800 text-xs text-[#DC4545] dark:text-rose-300">
                  <span className="font-bold">Google Sheets Outbox Warning:</span> {handover.lastSyncError}
                </div>
              )}

              {(handover.disputeReason || handover.generalRemarks || handover.acknowledgementNotes) && (
                <div className="p-3.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 space-y-1.5 text-xs">
                  {handover.generalRemarks && (
                    <div>
                      <span className="font-semibold text-[#172B4D] dark:text-slate-300">Counselor Remarks:</span>{' '}
                      <span className="text-[#172B4D]/75 dark:text-slate-400">{handover.generalRemarks}</span>
                    </div>
                  )}
                  {handover.acknowledgementNotes && (
                    <div>
                      <span className="font-semibold text-[#172B4D] dark:text-slate-300">Receiver Verification Notes:</span>{' '}
                      <span className="text-[#172B4D]/75 dark:text-slate-400">{handover.acknowledgementNotes}</span>
                    </div>
                  )}
                  {handover.disputeReason && (
                    <div className="text-[#DC4545] dark:text-rose-400">
                      <span className="font-bold">Dispute / Discrepancy Report:</span> {handover.disputeReason}
                    </div>
                  )}
                </div>
              )}

              {/* Per-Document Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#172B4D] dark:text-slate-300">
                  Itemized Physical Document Manifest ({handover.documents.length})
                </h3>
                <div className="border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F4F2EE] dark:bg-slate-800/60 text-[11px] font-semibold text-[#172B4D]/65 dark:text-slate-400 border-b border-[#E3EAF3] dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Document Name</th>
                        <th className="px-3 py-2">Format</th>
                        <th className="px-3 py-2">Qty / Pages</th>
                        <th className="px-3 py-2">Batch</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Verification & Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
                      {handover.documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[#F4F2EE] dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2.5 font-mono text-[11px] text-[#172B4D]/55 dark:text-slate-400">{doc.id}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-[#172B4D] dark:text-slate-100">
                              {doc.documentName}
                            </div>
                            <div className="text-[11px] text-[#172B4D]/60 dark:text-slate-400">{doc.documentType}</div>
                          </td>
                          <td className="px-3 py-2.5 text-[#172B4D] dark:text-slate-300">{doc.format}</td>
                          <td className="px-3 py-2.5 font-mono text-[#172B4D] dark:text-slate-300">
                            {doc.quantity}x ({doc.pageCount}p)
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-[#172B4D]/60 dark:text-slate-400">
                            Batch #{doc.deliveryBatch}
                          </td>
                          <td className={`px-3 py-2.5 font-mono font-bold ${getItemStatusColor(doc.status)}`}>
                            {doc.status}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-[#172B4D]/70 dark:text-slate-400">
                            {doc.verificationNotes || doc.conditionRemarks || '—'}
                            {doc.verifiedByName && (
                              <div className="text-[10px] text-[#172B4D]/50 dark:text-slate-400 font-mono mt-0.5">
                                Checked by {doc.verifiedByName}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up Deliveries History */}
              {handover.followUpDeliveries && handover.followUpDeliveries.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#172B4D] dark:text-slate-300">
                    Follow-Up Delivery Batches Under {handover.id}
                  </h3>
                  <div className="space-y-2">
                    {handover.followUpDeliveries.map((fb) => (
                      <div
                        key={fb.batchNumber}
                        className="p-3 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-[#172B4D] dark:text-slate-100">
                            Batch #{fb.batchNumber} — Delivered {fb.deliveryDate} at {fb.deliveryTime} by {fb.deliveredByName}
                          </div>
                          <div className="text-[#172B4D]/70 dark:text-slate-400 mt-0.5">
                            Items: {fb.documentNamesDelivered.join(', ')}
                            {fb.deliveryNotes ? ` · "${fb.deliveryNotes}"` : ''}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[#123B78] dark:text-slate-300">
                          {fb.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immutable Custody Event Audit Timeline */}
              {handover.events && handover.events.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#172B4D] dark:text-slate-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#1769E8]" />
                    Immutable Custody Audit Trail (Append-Only)
                  </h3>
                  <div className="border border-[#E3EAF3] dark:border-slate-800 rounded-lg divide-y divide-[#E3EAF3] dark:divide-slate-800">
                    {handover.events.map((ev) => (
                      <div key={ev.id} className="p-3 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                            <span className="font-mono text-[11px] text-[#1769E8] dark:text-[#36A5F5]">
                              [{ev.actionType}]
                            </span>
                            <span>{ev.actorName}</span>
                          </div>
                          <div className="text-[#172B4D]/70 dark:text-slate-400">{ev.details}</div>
                        </div>
                        <div className="font-mono text-[11px] text-[#172B4D]/50 dark:text-slate-400 shrink-0">
                          {formatTimestamp(ev.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Printable Physical Slip Preview */}
          {handover && showPrintSlip && (
            <div className="p-6 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:bg-white print:text-black space-y-5">
              <div className="flex items-start justify-between border-b-2 border-slate-900 dark:border-slate-700 pb-4">
                <div>
                  <div className="text-lg font-bold tracking-tight">KOREA STUDY HUB PMS — PHYSICAL DOCUMENT HANDOVER SLIP</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    In-Office Chain of Custody Record · File inside student physical dossier folder
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-base font-bold">{handover.id}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Status: {handover.status} (v{handover.version})</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div><strong>Student Name:</strong> {handover.studentName}</div>
                  <div><strong>Passport No:</strong> {handover.studentPassport}</div>
                  <div><strong>Target University:</strong> {handover.universityName || handover.intakeTerm}</div>
                  {handover.requestId && (
                    <div><strong>Linked Admission Request:</strong> <span className="font-mono">{handover.requestId}</span></div>
                  )}
                </div>
                <div className="space-y-1">
                  <div><strong>Counselor (Sender):</strong> {handover.counselorName} ({handover.counselorId})</div>
                  <div><strong>Admission Receiver:</strong> {handover.receivingEmployeeName} ({handover.receivingEmployeeId})</div>
                  <div><strong>Handover Date & Time:</strong> {handover.handoverDate} at {handover.handoverTime}</div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 dark:border-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800">
                    <th className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 text-left">ID</th>
                    <th className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 text-left">Physical Document Name</th>
                    <th className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 text-left">Format</th>
                    <th className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 text-center">Qty / Pages</th>
                    <th className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {handover.documents.map((d) => (
                    <tr key={d.id}>
                      <td className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 font-mono">{d.id}</td>
                      <td className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5">{d.documentName}</td>
                      <td className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5">{d.format}</td>
                      <td className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 text-center font-mono">
                        {d.quantity} / {d.pageCount}p
                      </td>
                      <td className="border border-slate-400 dark:border-slate-700 px-2.5 py-1.5 font-mono font-bold">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-8 text-xs">
                <div className="border-t border-slate-900 dark:border-slate-700 pt-2">
                  <div className="font-bold">Counselor Signature & Date</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">{handover.counselorName}</div>
                </div>
                <div className="border-t border-slate-900 dark:border-slate-700 pt-2">
                  <div className="font-bold">Admission Receiver Verification Signature & Date</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">
                    {handover.lastAcknowledgedByName || handover.receivingEmployeeName}
                    {handover.lastAcknowledgedAt ? ` · Verified ${formatTimestamp(handover.lastAcknowledgedAt)}` : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-[#172B4D]/60 dark:text-slate-400">
            Created: {handover ? formatTimestamp(handover.createdAt) : '—'}
          </div>
          <div className="flex items-center gap-2">
            {handover && canFollowUp && canFollowUp(handover) && onOpenFollowUp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFollowUp(handover);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#E9A23B] hover:bg-[#CF8B28] rounded-md transition-colors"
              >
                Deliver Missing / Corrected Items
              </button>
            )}
            {handover && canVerify && canVerify(handover) && onOpenVerify && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVerify(handover);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#138A59] rounded-md transition-colors"
              >
                Inspect & Acknowledge Receipt
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
