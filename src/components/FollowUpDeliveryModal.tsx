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
import { Spinner } from '@astryxdesign/core/Spinner';
import { DocumentFormat, DocumentHandover, UserProfile } from '../types/pms';
import { submitHandoverFollowUpApi } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { ModalTransition, MotionButton } from './animations';

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

  const isCounselor = currentUser.team === 'Counseling Team';
  const outstandingItems = (handover?.documents || []).filter((d) => d.status !== 'Received');
  const receivedItems = (handover?.documents || []).filter((d) => d.status === 'Received');
  const nextBatchNum = (handover?.followUpDeliveries?.length || 0) + 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!handover) return;

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
    <ModalTransition
      isOpen={isOpen && Boolean(handover)}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/70 backdrop-blur-xs"
      cardClassName="w-full max-w-3xl bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg shadow-2xl dark:shadow-none flex flex-col max-h-[90vh]"
    >
      {handover && (
        <>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#D97706]/15 dark:bg-[rgba(240,160,48,0.14)] border border-[#D97706]/40 dark:border-[#F0A030]/30 flex items-center justify-center text-[#D97706] dark:text-[#F0A030]">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#ECECEE]">
                Submit Missing / Corrected Documents — {handover.id} (Batch #{nextBatchNum})
              </h2>
              <p className="text-[11px] text-[#0F172A]/65 dark:text-[#9A9AA2]">
                Student: <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">{handover.studentName}</span> · To Receiver: <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">{handover.receivingEmployeeName}</span>
                {handover.requestId ? (
                  <span className="tabular-nums text-[#1E40AF] dark:text-[#4C8DF6]"> · Request: {handover.requestId}</span>
                ) : null}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-stable p-5 space-y-4">
          {!isCounselor && (
            <div className="p-3 rounded-md bg-[#D97706]/10 dark:bg-[rgba(240,160,48,0.14)] border border-[#D97706]/35 dark:border-[#F0A030]/30 text-xs text-[#0F172A] dark:text-[#F0A030] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706] dark:text-[#F0A030]" />
              <span>Follow-up delivery submissions are restricted to Counseling Team members.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/35 dark:border-[#EF5350]/30 text-xs text-[#DC2626] dark:text-[#EF5350] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {handover.disputeReason && (
            <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/30 dark:border-[#EF5350]/30 text-xs text-[#0F172A] dark:text-[#ECECEE] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626] dark:text-[#EF5350]" />
              <div>
                <div className="font-bold text-[#DC2626] dark:text-[#EF5350]">Receiver Dispute / Issue Summary:</div>
                <div className="mt-0.5">{handover.disputeReason}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                <Calendar className="w-3.5 h-3.5 text-[#0F172A]/55 dark:text-[#9A9AA2]" />
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] tabular-nums focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                <Clock className="w-3.5 h-3.5 text-[#0F172A]/55 dark:text-[#9A9AA2]" />
                Delivery Time
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] tabular-nums focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
          </div>

          {/* Outstanding Documents to Deliver */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE] uppercase tracking-wide">
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
                        ? 'bg-[#EFF6FF]/40 dark:bg-[rgba(76,141,246,0.14)] border-[#1E40AF]/50 dark:border-[#4C8DF6]'
                        : 'bg-[#FFFFFF] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32] opacity-75'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="mt-1 rounded border-[#E2E8F0] dark:border-[#3A3A3F] text-[#1E40AF] dark:text-[#4C8DF6] focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                            {item.documentName}
                          </span>
                          <span className="text-[11px] tabular-nums font-semibold text-[#DC2626] dark:text-[#EF5350]">
                            Previously: {item.status}
                          </span>
                        </div>
                        {item.verificationNotes && (
                          <div className="text-[11px] text-[#0F172A]/70 dark:text-[#9A9AA2] mt-0.5">
                            Receiver Note: "{item.verificationNotes}"
                          </div>
                        )}
                      </div>
                    </label>

                    {checked && (
                      <div className="mt-2.5 pl-6 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">Format</label>
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
                          <label className="text-[10px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">Qty</label>
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
                            className="w-full px-2 py-1 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] tabular-nums focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">Pages</label>
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
                            className="w-full px-2 py-1 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] tabular-nums focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">Correction Note</label>
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
                            className="w-full px-2 py-1 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-slate-400 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
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
            <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] space-y-1">
              <div className="text-[11px] font-bold text-[#0F172A]/65 dark:text-[#9A9AA2] uppercase">
                Already Received in Earlier Custody ({receivedItems.length})
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#16A34A] dark:text-[#34C26B]">
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
            <label className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              Follow-Up Delivery Notes
            </label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Explain where/how missing items were handed over to Admission Team..."
              className="w-full px-3 py-2 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-slate-400 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#161616] flex items-center justify-end gap-2">
          <MotionButton
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md hover:bg-[#EFF6FF]/40 dark:hover:bg-[#2E2E32] transition-colors"
          >
            Cancel
          </MotionButton>
          <MotionButton
            type="button"
            disabled={!isCounselor || isSubmitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] disabled:opacity-50 rounded-md transition-colors"
          >
            {isSubmitting ? (
              <Spinner size="sm" shade="inherit" aria-hidden="true" />
            ) : (
              <PackageCheck className="w-3.5 h-3.5" />
            )}
            {isSubmitting ? 'Submitting Batch...' : `Submit Batch #${nextBatchNum} Under ${handover.id}`}
          </MotionButton>
        </div>
        </>
      )}
    </ModalTransition>
  );
};
