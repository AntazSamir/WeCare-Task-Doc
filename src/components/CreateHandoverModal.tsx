import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileCheck2,
  UserCheck,
  GraduationCap,
  Calendar,
  Clock,
  AlertCircle,
  Package,
  ClipboardList,
} from 'lucide-react';
import {
  DocumentFormat,
  DocumentRequest,
  HandoverContextData,
  UserProfile,
} from '../types/pms';
import { createDocumentHandoverApi } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface CreateHandoverModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  contextData: HandoverContextData | null;
  linkedRequest?: DocumentRequest | null;
  onClose: () => void;
  onSuccess: (handoverId: string) => void;
}

interface DraftDocumentRow {
  documentName: string;
  documentType: string;
  quantity: number;
  pageCount: number;
  format: DocumentFormat;
  conditionRemarks: string;
}

const PRESET_DOCUMENTS: Array<{
  label: string;
  documentName: string;
  documentType: string;
  quantity: number;
  pageCount: number;
  format: DocumentFormat;
}> = [
  {
    label: '+ Apostilled Diploma',
    documentName: 'Apostilled High School / Degree Diploma',
    documentType: 'Academic Credential',
    quantity: 1,
    pageCount: 2,
    format: 'Apostilled',
  },
  {
    label: '+ Official Transcripts',
    documentName: 'Official Sealed Academic Transcripts',
    documentType: 'Academic Record',
    quantity: 1,
    pageCount: 4,
    format: 'Apostilled',
  },
  {
    label: '+ Bank Balance Cert ($20k)',
    documentName: 'Bank Balance Certificate ($20,000 USD)',
    documentType: 'Financial Proof',
    quantity: 1,
    pageCount: 1,
    format: 'Original',
  },
  {
    label: '+ Family Relation Cert',
    documentName: 'Family Relationship / Birth Certificate',
    documentType: 'Civil Document',
    quantity: 1,
    pageCount: 2,
    format: 'Notarized',
  },
  {
    label: '+ Passport Copy',
    documentName: 'Valid Passport Biometric Page Copy',
    documentType: 'Identity',
    quantity: 2,
    pageCount: 1,
    format: 'Certified Copy',
  },
  {
    label: '+ TOPIK / IELTS Score',
    documentName: 'Official Language Proficiency Certificate (TOPIK / IELTS)',
    documentType: 'Language Score',
    quantity: 1,
    pageCount: 1,
    format: 'Original',
  },
];

export const CreateHandoverModal: React.FC<CreateHandoverModalProps> = ({
  isOpen,
  currentUser,
  contextData,
  linkedRequest,
  onClose,
  onSuccess,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const [studentId, setStudentId] = useState('');
  const [receivingEmployeeId, setReceivingEmployeeId] = useState('');
  const [handoverDate, setHandoverDate] = useState(todayStr);
  const [handoverTime, setHandoverTime] = useState(timeStr);
  const [packageSealNumber, setPackageSealNumber] = useState('');
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [documents, setDocuments] = useState<DraftDocumentRow[]>([
    {
      documentName: 'Apostilled High School / Degree Diploma',
      documentType: 'Academic Credential',
      quantity: 1,
      pageCount: 2,
      format: 'Apostilled',
      conditionRemarks: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    const freshNow = new Date();
    setHandoverDate(freshNow.toISOString().slice(0, 10));
    setHandoverTime(freshNow.toTimeString().slice(0, 5));
    setPackageSealNumber('');

    if (linkedRequest) {
      setStudentId(linkedRequest.studentId);
      setReceivingEmployeeId(linkedRequest.requestedById);
      setGeneralRemarks(
        linkedRequest.remarks
          ? `Fulfilling ${linkedRequest.id}: ${linkedRequest.remarks}`
          : `Fulfilling Admission Request ${linkedRequest.id}`
      );
      setDocuments(
        linkedRequest.requiredDocuments.length > 0
          ? linkedRequest.requiredDocuments.map((d) => ({
              documentName: d.documentName,
              documentType: d.documentType || 'Academic / Legal',
              quantity: d.quantity || 1,
              pageCount: d.pageCount || 1,
              format: d.format || 'Original',
              conditionRemarks: d.notes || '',
            }))
          : [
              {
                documentName: '',
                documentType: 'Academic / Legal',
                quantity: 1,
                pageCount: 1,
                format: 'Original',
                conditionRemarks: '',
              },
            ]
      );
    } else if (contextData) {
      setStudentId(contextData.students[0]?.id || '');
      const preferred =
        contextData.admissionTeam.find((m) => m.id !== currentUser.id) ||
        contextData.admissionTeam[0];
      setReceivingEmployeeId(preferred?.id || '');
      setGeneralRemarks('');
      setDocuments([
        {
          documentName: 'Apostilled High School / Degree Diploma',
          documentType: 'Academic Credential',
          quantity: 1,
          pageCount: 2,
          format: 'Apostilled',
          conditionRemarks: '',
        },
      ]);
    }
  }, [isOpen, linkedRequest, contextData, currentUser.id]);

  if (!isOpen) return null;

  const isCounselor = currentUser.team === 'Counseling Team';

  const handleAddRow = () => {
    setDocuments((prev) => [
      ...prev,
      {
        documentName: '',
        documentType: 'Academic / Legal',
        quantity: 1,
        pageCount: 1,
        format: 'Original',
        conditionRemarks: '',
      },
    ]);
  };

  const handleAddPreset = (preset: (typeof PRESET_DOCUMENTS)[number]) => {
    setDocuments((prev) => [
      ...prev,
      {
        documentName: preset.documentName,
        documentType: preset.documentType,
        quantity: preset.quantity,
        pageCount: preset.pageCount,
        format: preset.format,
        conditionRemarks: '',
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (documents.length <= 1) return;
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateRow = (idx: number, patch: Partial<DraftDocumentRow>) => {
    setDocuments((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const totalPages = documents.reduce(
    (sum, d) => sum + (Number(d.quantity) || 1) * (Number(d.pageCount) || 1),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isCounselor) {
      setErrorMsg('Only Counseling Team members can initiate document handovers.');
      return;
    }
    if (!studentId || !receivingEmployeeId) {
      setErrorMsg('Please select both a student dossier and a receiving Admission Team member.');
      return;
    }
    const cleanedDocs = documents
      .map((d) => ({ ...d, documentName: d.documentName.trim() }))
      .filter((d) => d.documentName.length > 0);
    if (cleanedDocs.length === 0) {
      setErrorMsg('Please add at least one valid document item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createDocumentHandoverApi({
        studentId,
        receivingEmployeeId,
        handoverDate,
        handoverTime,
        requestId: linkedRequest?.id,
        packageSealNumber,
        generalRemarks,
        documents: cleanedDocs,
      });
      onSuccess(created.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit document handover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#DCEBFF] dark:bg-blue-950 border border-[#36A5F5]/40 dark:border-blue-800 flex items-center justify-center text-[#123B78] dark:text-[#36A5F5]">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172B4D] dark:text-slate-100">
                Create Physical Document Handover
              </h2>
              <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                Initiated by <span className="font-semibold text-[#172B4D] dark:text-slate-300">{currentUser.name}</span> ({currentUser.team || 'Counseling Team'}) · Auto-generates collision-safe Handover ID
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {!isCounselor && (
            <div className="p-3 rounded-md bg-[#E9A23B]/10 dark:bg-amber-950/40 border border-[#E9A23B]/35 dark:border-amber-800 text-xs text-[#172B4D] dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E9A23B]" />
              <span>
                Creation permissions are counselor-focused. Switch to a Counseling Team member to submit physical handovers.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/40 border border-[#DC4545]/35 dark:border-rose-800 text-xs text-[#DC4545] dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {linkedRequest && (
            <div className="p-3 rounded-md bg-[#DCEBFF]/70 dark:bg-blue-950/40 border border-[#36A5F5]/40 dark:border-blue-800 text-xs text-[#123B78] dark:text-blue-200 flex items-start gap-2.5">
              <ClipboardList className="w-4 h-4 shrink-0 mt-0.5 text-[#1769E8] dark:text-[#36A5F5]" />
              <div className="space-y-0.5">
                <div className="font-bold font-mono">
                  Fulfilling Request {linkedRequest.id} · {linkedRequest.priority} Priority · Due {linkedRequest.deadline}
                </div>
                <div className="text-[11px] text-[#172B4D]/80 dark:text-blue-300">
                  Requested by {linkedRequest.requestedByName} for {linkedRequest.studentName}. Submitting links this handover directly to the request.
                </div>
              </div>
            </div>
          )}

          {/* Student & Receiver Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <GraduationCap className="w-3.5 h-3.5 text-[#16A36A]" />
                Student Candidate Dossier <span className="text-[#DC4545]">*</span>
              </label>
              <MorphSelect value={studentId} onValueChange={(v) => setStudentId(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="-- Select Student --" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {(contextData?.students || []).map((stu) => (
                    <MorphSelectItem key={stu.id} value={stu.id}>
                      {stu.fullName} ({stu.passportNumber}) — {stu.universityName || stu.intakeTerm} [{stu.id}]
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <UserCheck className="w-3.5 h-3.5 text-[#1769E8]" />
                Receiving Admission Team Member <span className="text-[#DC4545]">*</span>
              </label>
              <MorphSelect value={receivingEmployeeId} onValueChange={(v) => setReceivingEmployeeId(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="-- Select Admission Officer --" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {(contextData?.admissionTeam || []).map((emp) => (
                    <MorphSelectItem key={emp.id} value={emp.id}>
                      {emp.name} — {emp.title} [{emp.id}]
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-[#172B4D]/55" />
                  Handover Date
                </label>
                <input
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-[#172B4D]/55" />
                  Time
                </label>
                <input
                  type="time"
                  value={handoverTime}
                  onChange={(e) => setHandoverTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <Package className="w-3.5 h-3.5 text-[#172B4D]/55" />
                Envelope / Folder Seal # (Optional)
              </label>
              <input
                type="text"
                value={packageSealNumber}
                onChange={(e) => setPackageSealNumber(e.target.value)}
                placeholder="e.g. ENV-SNU-2026-04"
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Preset Quick Add Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B4D] dark:text-slate-200 uppercase tracking-wide">
                Physical Document Manifest ({documents.length} items · {totalPages} total sheets)
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#123B78] dark:text-[#36A5F5] bg-[#DCEBFF] dark:bg-blue-950/60 hover:bg-[#36A5F5]/25 rounded-md border border-[#36A5F5]/40 dark:border-blue-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Row
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_DOCUMENTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="px-2.5 py-1 text-[11px] font-medium text-[#172B4D] dark:text-slate-300 bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] hover:text-[#123B78] dark:hover:bg-slate-700 rounded-md border border-[#E3EAF3] dark:border-slate-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Documents Table */}
          <div className="border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F4F2EE] dark:bg-slate-900/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start"
                >
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">
                      Document #{idx + 1} Name *
                    </label>
                    <input
                      type="text"
                      value={doc.documentName}
                      onChange={(e) => handleUpdateRow(idx, { documentName: e.target.value })}
                      placeholder="e.g. Original Bank Balance Certificate"
                      required
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Format</label>
                    <MorphSelect value={doc.format} onValueChange={(v) => handleUpdateRow(idx, { format: v as DocumentFormat })}>
                      <MorphSelectTrigger>
                        <MorphSelectValue placeholder="Select..." />
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

                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Qty</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={doc.quantity}
                      onChange={(e) => handleUpdateRow(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">Pages</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={doc.pageCount}
                      onChange={(e) => handleUpdateRow(idx, { pageCount: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400 uppercase">
                      Physical Condition / Notes
                    </label>
                    <input
                      type="text"
                      value={doc.conditionRemarks}
                      onChange={(e) => handleUpdateRow(idx, { conditionRemarks: e.target.value })}
                      placeholder="e.g. Embossed stamp verified"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end justify-end pt-4">
                    <button
                      type="button"
                      disabled={documents.length <= 1}
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 text-[#172B4D]/45 hover:text-[#DC4545] disabled:opacity-30 rounded-md"
                      title="Remove document item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#172B4D] dark:text-slate-300">
              General Handover Remarks
            </label>
            <textarea
              rows={2}
              value={generalRemarks}
              onChange={(e) => setGeneralRemarks(e.target.value)}
              placeholder="Desk location, deadline urgency, or special verification instructions for Admission Team..."
              className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#172B4D]/60 dark:text-slate-400 font-mono">
            Syncs automatically to tabs: <span className="font-semibold text-[#123B78] dark:text-slate-200">HND_{currentUser.id}</span> & receiver tab
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#172B4D] dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md hover:bg-[#DCEBFF]/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isCounselor}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] disabled:opacity-50 rounded-md transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting Handover...' : 'Submit Handover & Notify Receiver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
