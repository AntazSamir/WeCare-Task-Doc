import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { DocumentFormat, DocumentHandover, UserProfile } from '../types/pms';
import { submitHandoverFollowUpApi } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface FollowUpDeliveryModalProps {
  handover: DocumentHandover | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FollowUpDeliveryModal: React.FC<FollowUpDeliveryModalProps> = ({
  handover,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const now = new Date();
  const [deliveryDate, setDeliveryDate] = useState(now.toISOString().slice(0, 10));
  const [deliveryTime, setDeliveryTime] = useState(now.toTimeString().slice(0, 5));
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [itemMeta, setItemMeta] = useState<
    Record<string, { quantity: number; pageCount: number; format: DocumentFormat; conditionRemarks: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && handover) {
      const initSel: Record<string, boolean> = {};
      const initMeta: Record<
        string,
        { quantity: number; pageCount: number; format: DocumentFormat; conditionRemarks: string }
      > = {};

      for (const item of handover.documents) {
        const isOutstanding = item.status !== 'Received';
        initSel[item.id] = isOutstanding;
        initMeta[item.id] = {
          quantity: item.quantity,
          pageCount: item.pageCount,
          format: item.format,
          conditionRemarks: item.conditionRemarks || '',
        };
      }
      setSelectedIds(initSel);
      setItemMeta(initMeta);
      setDeliveryNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, handover]);

  if (!isOpen || !handover) return null;

  const isCounselor = currentUser.team === 'Counseling Team';
  const outstandingItems = handover.documents.filter((d) => d.status !== 'Received');
  const receivedItems = handover.documents.filter((d) => d.status === 'Received');
  const nextBatchNum = (handover.followUpDeliveries?.length || 0) + 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isCounselor) {
      setErrorMsg('Only Counseling Team members can submit follow-up deliveries.');
      return;
    }

    const deliveredItems = outstandingItems
      .filter((item) => selectedIds[item.id])
      .map((item) => ({
        itemId: item.id,
        quantity: itemMeta[item.id]?.quantity || item.quantity,
        pageCount: itemMeta[item.id]?.pageCount || item.pageCount,
        format: itemMeta[item.id]?.format || item.format,
        conditionRemarks: itemMeta[item.id]?.conditionRemarks || '',
      }));

    if (deliveredItems.length === 0) {
      setErrorMsg('Select at least one missing or corrected document to submit.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitHandoverFollowUpApi(handover.id, {
        deliveryDate,
        deliveryTime,
        deliveryNotes,
        deliveredItems,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit follow-up delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#E9A23B]/15 dark:bg-amber-950 border border-[#E9A23B]/40 dark:border-amber-800 flex items-center justify-center text-[#E9A23B] dark:text-amber-400">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172B4D] dark:text-slate-100">
                Submit Missing / Corrected Documents — {handover.id} (Batch #{nextBatchNum})
              </h2>
              <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                Student: <span className="font-semibold text-[#172B4D] dark:text-slate-300">{handover.studentName}</span> · To Receiver: <span className="font-semibold text-[#172B4D] dark:text-slate-200">{handover.receivingEmployeeName}</span>
                {handover.requestId ? (
                  <span className="font-mono text-[#1769E8] dark:text-[#36A5F5]"> · Request: {handover.requestId}</span>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#172B4D]/50 hover:text-[#172B4D] dark:hover:text-slate-200 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isCounselor && (
            <div className="p-3 rounded-md bg-[#E9A23B]/10 dark:bg-amber-950/40 border border-[#E9A23B]/35 dark:border-amber-800 text-xs text-[#172B4D] dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E9A23B]" />
              <span>Follow-up delivery submissions are restricted to Counseling Team members.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/40 border border-[#DC4545]/35 dark:border-rose-800 text-xs text-[#DC4545] dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {handover.disputeReason && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/25 border border-[#DC4545]/30 dark:border-rose-900/50 text-xs text-[#172B4D] dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC4545]" />
              <div>
                <div className="font-bold text-[#DC4545] dark:text-rose-300">Receiver Dispute / Issue Summary:</div>
                <div className="mt-0.5">{handover.disputeReason}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-[#172B4D]/55" />
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-[#172B4D]/55" />
                Delivery Time
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
              />
            </div>
          </div>

          {/* Outstanding Documents to Deliver */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#172B4D] dark:text-slate-200 uppercase tracking-wide">
              Outstanding Documents Ready for Delivery ({outstandingItems.length})
            </div>

            <div className="space-y-2">
              {outstandingItems.map((item) => {
                const checked = !!selectedIds[item.id];
                const meta = itemMeta[item.id] || {
                  quantity: item.quantity,
                  pageCount: item.pageCount,
                  format: item.format,
                  conditionRemarks: item.conditionRemarks || '',
                };

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      checked
                        ? 'bg-[#DCEBFF]/40 dark:bg-blue-950/20 border-[#36A5F5]/50 dark:border-blue-800'
                        : 'bg-[#FFFFFF] dark:bg-slate-900 border-[#E3EAF3] dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="mt-1 rounded border-[#E3EAF3] text-[#1769E8] focus:ring-[#1769E8]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#172B4D] dark:text-slate-100">
                            {item.documentName}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-[#DC4545] dark:text-rose-400">
                            Previously: {item.status}
                          </span>
                        </div>
                        {item.verificationNotes && (
                          <div className="text-[11px] text-[#172B4D]/70 dark:text-slate-400 mt-0.5">
                            Receiver Note: "{item.verificationNotes}"
                          </div>
                        )}
                      </div>
                    </label>

                    {checked && (
                      <div className="mt-2.5 pl-6 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Format</label>
                          <MorphSelect
                            value={meta.format}
                            onValueChange={(v) =>
                              setItemMeta((prev) => ({
                                ...prev,
                                [item.id]: { ...meta, format: v as DocumentFormat },
                              }))
                            }
                          >
                            <MorphSelectTrigger>
                              <MorphSelectValue placeholder="Format" />
                            </MorphSelectTrigger>
                            <MorphSelectContent>
                              <MorphSelectItem value="Original">Original</MorphSelectItem>
                              <MorphSelectItem value="Apostilled">Apostilled</MorphSelectItem>
                              <MorphSelectItem value="Notarized">Notarized</MorphSelectItem>
                              <MorphSelectItem value="Certified Copy">Certified Copy</MorphSelectItem>
                              <MorphSelectItem value="Photocopy">Photocopy</MorphSelectItem>
                            </MorphSelectContent>
                          </MorphSelect>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={meta.quantity}
                            onChange={(e) =>
                              setItemMeta((prev) => ({
                                ...prev,
                                [item.id]: { ...meta, quantity: Math.max(1, Number(e.target.value) || 1) },
                              }))
                            }
                            className="w-full px-2 py-1 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Pages</label>
                          <input
                            type="number"
                            min={1}
                            value={meta.pageCount}
                            onChange={(e) =>
                              setItemMeta((prev) => ({
                                ...prev,
                                [item.id]: { ...meta, pageCount: Math.max(1, Number(e.target.value) || 1) },
                              }))
                            }
                            className="w-full px-2 py-1 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Correction Note</label>
                          <input
                            type="text"
                            value={meta.conditionRemarks}
                            onChange={(e) =>
                              setItemMeta((prev) => ({
                                ...prev,
                                [item.id]: { ...meta, conditionRemarks: e.target.value },
                              }))
                            }
                            placeholder="Updated stamp/copy"
                            className="w-full px-2 py-1 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {receivedItems.length > 0 && (
            <div className="p-3 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-[#172B4D]/65 dark:text-slate-400 uppercase">
                Already Received in Earlier Custody ({receivedItems.length})
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#16A36A] dark:text-emerald-400">
                {receivedItems.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {r.documentName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#172B4D] dark:text-slate-300">
              Follow-Up Delivery Notes
            </label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Explain where/how missing items were handed over to Admission Team..."
              className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-900/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-[#172B4D] dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md hover:bg-[#DCEBFF]/40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isCounselor || isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] disabled:opacity-50 rounded-md transition-colors"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            {isSubmitting ? 'Submitting Batch...' : `Submit Batch #${nextBatchNum} Under ${handover.id}`}
          </button>
        </div>
      </div>
    </div>
  );
};
