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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Submit Missing / Corrected Documents — {handover.id} (Batch #{nextBatchNum})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Student: <span className="font-semibold text-slate-700 dark:text-slate-300">{handover.studentName}</span> · To Receiver: <span className="font-semibold">{handover.receivingEmployeeName}</span>
                {handover.requestId ? (
                  <span className="font-mono text-indigo-600 dark:text-indigo-400"> · Request: {handover.requestId}</span>
                ) : null}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isCounselor && (
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Follow-up delivery submissions are restricted to Counseling Team members.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {handover.disputeReason && (
            <div className="p-3 rounded-md bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-bold">Receiver Dispute / Issue Summary:</div>
                <div className="mt-0.5">{handover.disputeReason}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Delivery Time
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Outstanding Documents to Deliver */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
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
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.documentName}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400">
                            Previously: {item.status}
                          </span>
                        </div>
                        {item.verificationNotes && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            Receiver Note: "{item.verificationNotes}"
                          </div>
                        )}
                      </div>
                    </label>

                    {checked && (
                      <div className="mt-2.5 pl-6 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Format</label>
                          <select
                            value={meta.format}
                            onChange={(e) =>
                              setItemMeta((prev) => ({
                                ...prev,
                                [item.id]: { ...meta, format: e.target.value as DocumentFormat },
                              }))
                            }
                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          >
                            <option value="Original">Original</option>
                            <option value="Apostilled">Apostilled</option>
                            <option value="Notarized">Notarized</option>
                            <option value="Certified Copy">Certified Copy</option>
                            <option value="Photocopy">Photocopy</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Qty</label>
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
                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Pages</label>
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
                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Correction Note</label>
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
                            className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
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
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                Already Received in Earlier Custody ({receivedItems.length})
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-emerald-700 dark:text-emerald-400">
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
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Follow-Up Delivery Notes
            </label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Explain where/how missing items were handed over to Admission Team..."
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isCounselor || isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            {isSubmitting ? 'Submitting Batch...' : `Submit Batch #${nextBatchNum} Under ${handover.id}`}
          </button>
        </div>
      </div>
    </div>
  );
};
