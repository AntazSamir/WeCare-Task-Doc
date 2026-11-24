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
import { Spinner } from '@astryxdesign/core/Spinner';
import { DocumentHandover, DocumentItemStatus } from '../types/pms';
import { fetchHandoverDetails } from '../services/pmsService';
import { formatTimestamp } from '../utils/dateUtils';
import { ModalTransition, MotionButton } from './animations';

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

  const getItemStatusColor = (st: DocumentItemStatus) => {
    switch (st) {
      case 'Received':
        return 'text-[#16A34A] dark:text-[#34C26B]';
      case 'Missing':
        return 'text-[#D97706] dark:text-[#F0A030]';
      case 'Incorrect':
      case 'Rejected':
        return 'text-[#DC2626] dark:text-[#EF5350]';
      default:
        return 'text-[#0F172A]/70 dark:text-[#9A9AA2]';
    }
  };

  const getSyncTextClass = (st: string) => {
    if (st === 'Synced') return 'text-[#16A34A] dark:text-[#34C26B]';
    if (st === 'Failed') return 'text-[#DC2626] dark:text-[#EF5350]';
    return 'text-[#D97706] dark:text-[#F0A030]';
  };

  const handlePrint = () => {
    setShowPrintSlip(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <ModalTransition
      isOpen={isOpen && Boolean(handoverId)}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/70 backdrop-blur-xs"
      cardClassName="w-full max-w-4xl bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg shadow-2xl dark:shadow-none flex flex-col max-h-[92vh]"
    >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/30 flex items-center justify-center text-[#1E3A8A] dark:text-[#4C8DF6]">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                  {handover?.id || handoverId}
                </h2>
                {handover && (
                  <span className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2]">
                    v{handover.version} · {handover.status}
                  </span>
                )}
              </div>
              {handover && (
                <p className="text-[11px] text-[#0F172A]/65 dark:text-[#9A9AA2]">
                  {handover.studentName} ({handover.studentPassport}) · {handover.universityName || handover.intakeTerm}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {handover && (
              <>
                <MotionButton
                  type="button"
                  onClick={() => setShowPrintSlip(!showPrintSlip)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {showPrintSlip ? 'Back to Audit View' : 'Printable Slip'}
                </MotionButton>
                {showPrintSlip && (
                  <MotionButton
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-md transition-colors"
                  >
                    Print
                  </MotionButton>
                )}
              </>
            )}
            <MotionButton
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#0F172A]/50 dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] rounded-md transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </MotionButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-stable p-5">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-center text-xs text-[#0F172A]/60 dark:text-[#9A9AA2]">
              <Spinner size="lg" aria-label="Loading handover audit manifest" />
              <span>Loading handover audit manifest...</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/35 dark:border-[#EF5350]/30 text-xs text-[#DC2626] dark:text-[#EF5350]">
              {errorMsg}
            </div>
          )}

          {handover && !showPrintSlip && (
            <div className="space-y-5">
              {/* Custody Chain Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32]">
                  <div className="text-[10px] font-bold uppercase text-[#0F172A]/55 dark:text-[#9A9AA2]">Counselor (Sender)</div>
                  <div className="mt-1 text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                    {handover.counselorName}
                  </div>
                  <div className="text-[11px] tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2]">
                    Tab: HND_{handover.counselorId}
                  </div>
                  <div className={`text-[11px] tabular-nums font-semibold mt-1 ${getSyncTextClass(handover.counselorSheetSyncStatus)}`}>
                    Sheet: {handover.counselorSheetSyncStatus}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32]">
                  <div className="text-[10px] font-bold uppercase text-[#0F172A]/55 dark:text-[#9A9AA2]">Admission Officer (Receiver)</div>
                  <div className="mt-1 text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                    {handover.receivingEmployeeName}
                  </div>
                  <div className="text-[11px] tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2]">
                    Tab: HND_{handover.receivingEmployeeId}
                  </div>
                  <div className={`text-[11px] tabular-nums font-semibold mt-1 ${getSyncTextClass(handover.receiverSheetSyncStatus)}`}>
                    Sheet: {handover.receiverSheetSyncStatus}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32]">
                  <div className="text-[10px] font-bold uppercase text-[#0F172A]/55 dark:text-[#9A9AA2]">Transfer & Custody Status</div>
                  <div className="mt-1 text-xs font-bold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                    <span>{handover.status}</span>
                    {handover.packageSealNumber && (
                      <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2]">
                        <Package className="w-3 h-3" /> {handover.packageSealNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2]">
                    {handover.handoverDate} at {handover.handoverTime}
                  </div>
                  <div className={`text-[11px] tabular-nums font-semibold mt-1 ${getSyncTextClass(handover.masterSheetSyncStatus)}`}>
                    Master Tab: {handover.masterSheetSyncStatus}
                  </div>
                </div>
              </div>

              {handover.requestId && (
                <div className="p-3.5 rounded-lg bg-[#EFF6FF]/60 dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <ClipboardList className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                    <div>
                      <span className="font-bold tabular-nums text-[#1E3A8A] dark:text-[#ECECEE]">
                        Linked Request: {handover.requestId}
                      </span>
                      <span className="text-[#0F172A]/75 dark:text-[#9A9AA2]">
                        {handover.requestPriority ? ` · ${handover.requestPriority} Priority` : ''}
                        {handover.requestDeadline ? ` · Due ${handover.requestDeadline}` : ''}
                        {handover.requestStatus ? ` · Status: ${handover.requestStatus}` : ''}
                      </span>
                    </div>
                  </div>
                  {onOpenRequest && (
                    <MotionButton
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRequest(handover.requestId!);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-[#4C8DF6] bg-[#FFFFFF] dark:bg-[#1C1C1E] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/40 rounded-md transition-colors"
                    >
                      <span>View Request {handover.requestId}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </MotionButton>
                  )}
                </div>
              )}

              {handover.lastSyncError && (
                <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/35 dark:border-[#EF5350]/30 text-xs text-[#DC2626] dark:text-[#EF5350]">
                  <span className="font-bold">Google Sheets Outbox Warning:</span> {handover.lastSyncError}
                </div>
              )}

              {(handover.disputeReason || handover.generalRemarks || handover.acknowledgementNotes) && (
                <div className="p-3.5 rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-transparent dark:bg-[#252528] space-y-1.5 text-xs">
                  {handover.generalRemarks && (
                    <div>
                      <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">Counselor Remarks:</span>{' '}
                      <span className="text-[#0F172A]/75 dark:text-[#9A9AA2]">{handover.generalRemarks}</span>
                    </div>
                  )}
                  {handover.acknowledgementNotes && (
                    <div>
                      <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">Receiver Verification Notes:</span>{' '}
                      <span className="text-[#0F172A]/75 dark:text-[#9A9AA2]">{handover.acknowledgementNotes}</span>
                    </div>
                  )}
                  {handover.disputeReason && (
                    <div className="text-[#DC2626] dark:text-[#EF5350]">
                      <span className="font-bold">Dispute / Discrepancy Report:</span> {handover.disputeReason}
                    </div>
                  )}
                </div>
              )}

              {/* Per-Document Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#0F172A] dark:text-[#ECECEE]">
                  Itemized Physical Document Manifest ({handover.documents.length})
                </h3>
                <div className="border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] dark:bg-[#252528] text-[11px] font-semibold text-[#0F172A]/65 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
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
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                      {handover.documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528]">
                          <td className="px-3 py-2.5 tabular-nums text-[11px] text-[#0F172A]/55 dark:text-[#9A9AA2]">{doc.id}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                              {doc.documentName}
                            </div>
                            <div className="text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2]">{doc.documentType}</div>
                          </td>
                          <td className="px-3 py-2.5 text-[#0F172A] dark:text-[#ECECEE]">{doc.format}</td>
                          <td className="px-3 py-2.5 tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                            {doc.quantity}x ({doc.pageCount}p)
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2]">
                            Batch #{doc.deliveryBatch}
                          </td>
                          <td className={`px-3 py-2.5 tabular-nums font-bold ${getItemStatusColor(doc.status)}`}>
                            {doc.status}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-[#0F172A]/70 dark:text-[#9A9AA2]">
                            {doc.verificationNotes || doc.conditionRemarks || '—'}
                            {doc.verifiedByName && (
                              <div className="text-[10px] text-[#0F172A]/50 dark:text-[#9A9AA2] tabular-nums mt-0.5">
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
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#0F172A] dark:text-[#ECECEE]">
                    Follow-Up Delivery Batches Under {handover.id}
                  </h3>
                  <div className="space-y-2">
                    {handover.followUpDeliveries.map((fb) => (
                      <div
                        key={fb.batchNumber}
                        className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-[#0F172A] dark:text-[#ECECEE]">
                            Batch #{fb.batchNumber} — Delivered {fb.deliveryDate} at {fb.deliveryTime} by {fb.deliveredByName}
                          </div>
                          <div className="text-[#0F172A]/70 dark:text-[#9A9AA2] mt-0.5">
                            Items: {fb.documentNamesDelivered.join(', ')}
                            {fb.deliveryNotes ? ` · "${fb.deliveryNotes}"` : ''}
                          </div>
                        </div>
                        <span className="tabular-nums text-[11px] font-semibold text-[#1E3A8A] dark:text-[#ECECEE]">
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
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
                    Immutable Custody Audit Trail (Append-Only)
                  </h3>
                  <div className="border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                    {handover.events.map((ev) => (
                      <div key={ev.id} className="p-3 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                            <span className="tabular-nums text-[11px] text-[#1E40AF] dark:text-[#4C8DF6]">
                              [{ev.actionType}]
                            </span>
                            <span>{ev.actorName}</span>
                          </div>
                          <div className="text-[#0F172A]/70 dark:text-[#9A9AA2]">{ev.details}</div>
                        </div>
                        <div className="tabular-nums text-[11px] text-[#0F172A]/50 dark:text-[#9A9AA2] shrink-0">
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
            <div className="p-6 border border-slate-300 dark:border-[#2E2E32] rounded-md bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-[#ECECEE] print:bg-white print:text-black space-y-5">
              <div className="flex items-start justify-between border-b-2 border-slate-900 dark:border-[#3A3A3F] pb-4">
                <div>
                  <div className="text-lg font-bold tracking-tight">KOREA STUDY HUB PMS — PHYSICAL DOCUMENT HANDOVER SLIP</div>
                  <div className="text-xs text-slate-600 dark:text-[#9A9AA2] mt-0.5">
                    In-Office Chain of Custody Record · File inside student physical dossier folder
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="text-base font-bold">{handover.id}</div>
                  <div className="text-xs text-slate-600 dark:text-[#9A9AA2]">Status: {handover.status} (v{handover.version})</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div><strong>Student Name:</strong> {handover.studentName}</div>
                  <div><strong>Passport No:</strong> {handover.studentPassport}</div>
                  <div><strong>Target University:</strong> {handover.universityName || handover.intakeTerm}</div>
                  {handover.requestId && (
                    <div><strong>Linked Admission Request:</strong> <span className="tabular-nums">{handover.requestId}</span></div>
                  )}
                </div>
                <div className="space-y-1">
                  <div><strong>Counselor (Sender):</strong> {handover.counselorName} ({handover.counselorId})</div>
                  <div><strong>Admission Receiver:</strong> {handover.receivingEmployeeName} ({handover.receivingEmployeeId})</div>
                  <div><strong>Handover Date & Time:</strong> {handover.handoverDate} at {handover.handoverTime}</div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 dark:border-[#2E2E32] text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[#252528]">
                    <th className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 text-left">ID</th>
                    <th className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 text-left">Physical Document Name</th>
                    <th className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 text-left">Format</th>
                    <th className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 text-center">Qty / Pages</th>
                    <th className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {handover.documents.map((d) => (
                    <tr key={d.id}>
                      <td className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 tabular-nums">{d.id}</td>
                      <td className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5">{d.documentName}</td>
                      <td className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5">{d.format}</td>
                      <td className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 text-center tabular-nums">
                        {d.quantity} / {d.pageCount}p
                      </td>
                      <td className="border border-slate-400 dark:border-[#2E2E32] px-2.5 py-1.5 tabular-nums font-bold">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-8 text-xs">
                <div className="border-t border-slate-900 dark:border-[#3A3A3F] pt-2">
                  <div className="font-bold">Counselor Signature & Date</div>
                  <div className="text-slate-500 dark:text-[#9A9AA2] mt-1">{handover.counselorName}</div>
                </div>
                <div className="border-t border-slate-900 dark:border-[#3A3A3F] pt-2">
                  <div className="font-bold">Admission Receiver Verification Signature & Date</div>
                  <div className="text-slate-500 dark:text-[#9A9AA2] mt-1">
                    {handover.lastAcknowledgedByName || handover.receivingEmployeeName}
                    {handover.lastAcknowledgedAt ? ` · Verified ${formatTimestamp(handover.lastAcknowledgedAt)}` : ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#161616] flex items-center justify-between gap-3">
          <div className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2]">
            Created: {handover ? formatTimestamp(handover.createdAt) : '—'}
          </div>
          <div className="flex items-center gap-2">
            {handover && canFollowUp && canFollowUp(handover) && onOpenFollowUp && (
              <MotionButton
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFollowUp(handover);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#D97706] hover:bg-[#CF8B28] dark:bg-[#F0A030] dark:hover:bg-[#F0A030]/90 rounded-md transition-colors"
              >
                Deliver Missing / Corrected Items
              </MotionButton>
            )}
            {handover && canVerify && canVerify(handover) && onOpenVerify && (
              <MotionButton
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVerify(handover);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#138A59] dark:bg-[#34C26B] dark:hover:bg-[#34C26B]/90 rounded-md transition-colors"
              >
                Inspect & Acknowledge Receipt
              </MotionButton>
            )}
            <MotionButton
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md hover:bg-[#EFF6FF]/40 dark:hover:bg-[#2E2E32] transition-colors"
            >
              Close
            </MotionButton>
          </div>
        </div>
    </ModalTransition>
  );
};
