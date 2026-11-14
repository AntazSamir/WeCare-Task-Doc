import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ClipboardList,
  UserCheck,
  GraduationCap,
  Calendar,
  AlertCircle,
  Flag,
} from 'lucide-react';
import {
  DocumentFormat,
  HandoverContextData,
  RequestPriority,
  UserProfile,
} from '../types/pms';
import { createDocumentRequestApi } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface CreateDocumentRequestModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  contextData: HandoverContextData | null;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

interface DraftRequestedDoc {
  documentName: string;
  documentType: string;
  format: DocumentFormat;
  quantity: number;
  pageCount: number;
  notes: string;
}

const PRESET_REQUIRED_DOCS: Array<{
  label: string;
  documentName: string;
  documentType: string;
  format: DocumentFormat;
  quantity: number;
  pageCount: number;
}> = [
  {
    label: '+ Apostilled Diploma',
    documentName: 'Apostilled High School / Degree Diploma',
    documentType: 'Academic Credential',
    format: 'Apostilled',
    quantity: 1,
    pageCount: 2,
  },
  {
    label: '+ Official Transcripts',
    documentName: 'Official Sealed Academic Transcripts',
    documentType: 'Academic Record',
    format: 'Apostilled',
    quantity: 1,
    pageCount: 4,
  },
  {
    label: '+ Bank Balance Cert ($20k)',
    documentName: 'Bank Balance Certificate ($20,000 USD)',
    documentType: 'Financial Proof',
    format: 'Original',
    quantity: 1,
    pageCount: 1,
  },
  {
    label: '+ Family Relation Cert',
    documentName: 'Family Relationship / Birth Certificate',
    documentType: 'Civil Document',
    format: 'Notarized',
    quantity: 1,
    pageCount: 2,
  },
  {
    label: '+ Valid Passport Copy',
    documentName: 'Valid Passport Biometric Page Copy',
    documentType: 'Identity',
    format: 'Certified Copy',
    quantity: 2,
    pageCount: 1,
  },
  {
    label: '+ TOPIK / IELTS Cert',
    documentName: 'Official Language Proficiency Certificate (TOPIK / IELTS)',
    documentType: 'Language Score',
    format: 'Original',
    quantity: 1,
    pageCount: 1,
  },
];

export const CreateDocumentRequestModal: React.FC<CreateDocumentRequestModalProps> = ({
  isOpen,
  currentUser,
  contextData,
  onClose,
  onSuccess,
}) => {
  const defaultDeadline = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  const [studentId, setStudentId] = useState('');
  const [assignedCounselorId, setAssignedCounselorId] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('High');
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [remarks, setRemarks] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState<DraftRequestedDoc[]>([
    {
      documentName: 'Apostilled High School / Degree Diploma',
      documentType: 'Academic Credential',
      format: 'Apostilled',
      quantity: 1,
      pageCount: 2,
      notes: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contextData) {
      if (!studentId && contextData.students.length > 0) {
        setStudentId(contextData.students[0].id);
      }
      if (!assignedCounselorId && contextData.counselingTeam.length > 0) {
        setAssignedCounselorId(contextData.counselingTeam[0].id);
      }
      setErrorMsg(null);
    }
  }, [isOpen, contextData, studentId, assignedCounselorId]);

  if (!isOpen) return null;

  const isAdmissionAuthorized =
    currentUser.team === 'Admission Team' || currentUser.role === 'Admission_Manager';

  const handleAddRow = () => {
    setRequiredDocuments((prev) => [
      ...prev,
      {
        documentName: '',
        documentType: 'Academic / Legal',
        format: 'Original',
        quantity: 1,
        pageCount: 1,
        notes: '',
      },
    ]);
  };

  const handleAddPreset = (preset: (typeof PRESET_REQUIRED_DOCS)[number]) => {
    setRequiredDocuments((prev) => [
      ...prev,
      {
        documentName: preset.documentName,
        documentType: preset.documentType,
        format: preset.format,
        quantity: preset.quantity,
        pageCount: preset.pageCount,
        notes: '',
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (requiredDocuments.length <= 1) return;
    setRequiredDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateRow = (idx: number, patch: Partial<DraftRequestedDoc>) => {
    setRequiredDocuments((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isAdmissionAuthorized) {
      setErrorMsg('Only Admission Team members or Administrators can send document requests.');
      return;
    }
    if (!studentId || !assignedCounselorId || !deadline) {
      setErrorMsg('Please select a student dossier, target counselor, and due deadline.');
      return;
    }
    const cleanedDocs = requiredDocuments
      .map((d) => ({ ...d, documentName: d.documentName.trim() }))
      .filter((d) => d.documentName.length > 0);

    if (cleanedDocs.length === 0) {
      setErrorMsg('Add at least one required physical document item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createDocumentRequestApi({
        studentId,
        assignedCounselorId,
        priority,
        deadline,
        remarks,
        requiredDocuments: cleanedDocs,
      });
      onSuccess(created.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send document request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs animate-modal-backdrop">
      <div className="w-full max-w-4xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh] animate-modal-card">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#DCEBFF] dark:bg-blue-950 border border-[#36A5F5]/40 dark:border-blue-800 flex items-center justify-center text-[#123B78] dark:text-[#36A5F5]">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172B4D] dark:text-slate-100">
                Request Physical Documents from Counselor
              </h2>
              <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                Requested by <span className="font-semibold text-[#172B4D] dark:text-slate-300">{currentUser.name}</span> · Request completes automatically once physical receipt is verified
              </p>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {!isAdmissionAuthorized && (
            <div className="p-3 rounded-md bg-[#E9A23B]/10 dark:bg-amber-950/40 border border-[#E9A23B]/35 dark:border-amber-800 text-xs text-[#172B4D] dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E9A23B]" />
              <span>Only Admission Team members can request documents from counselors.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-rose-950/40 border border-[#DC4545]/35 dark:border-rose-800 text-xs text-[#DC4545] dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <GraduationCap className="w-3.5 h-3.5 text-[#16A36A]" />
                Student Dossier <span className="text-[#DC4545]">*</span>
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
                Target Counselor (Counseling Team) <span className="text-[#DC4545]">*</span>
              </label>
              <MorphSelect value={assignedCounselorId} onValueChange={(v) => setAssignedCounselorId(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="-- Select Counselor --" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {(contextData?.counselingTeam || []).map((c) => (
                    <MorphSelectItem key={c.id} value={c.id}>
                      {c.name} — {c.title} [{c.id}]
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <Flag className="w-3.5 h-3.5 text-[#E9A23B]" />
                Request Priority <span className="text-[#DC4545]">*</span>
              </label>
              <MorphSelect value={priority} onValueChange={(v) => setPriority(v as RequestPriority)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select priority..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Urgent">Urgent (Immediate University/Visa Deadline)</MorphSelectItem>
                  <MorphSelectItem value="High">High Priority</MorphSelectItem>
                  <MorphSelectItem value="Normal">Normal</MorphSelectItem>
                  <MorphSelectItem value="Low">Low</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#172B4D] dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-[#172B4D]/55" />
                Required Submission Deadline <span className="text-[#DC4545]">*</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B4D] dark:text-slate-200">
                Required Physical Documents ({requiredDocuments.length} items)
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#123B78] dark:text-[#36A5F5] bg-[#DCEBFF] dark:bg-blue-950/60 hover:bg-[#36A5F5]/25 rounded-md border border-[#36A5F5]/40 dark:border-blue-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Document
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_REQUIRED_DOCS.map((preset) => (
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

          {/* Required Documents List */}
          <div className="border border-[#E3EAF3] dark:border-slate-800 rounded-lg divide-y divide-[#E3EAF3] dark:divide-slate-800 overflow-hidden">
            {requiredDocuments.map((doc, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#F4F2EE] dark:bg-slate-900/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start"
              >
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400">
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
                  <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400">Format</label>
                  <MorphSelect
                    value={doc.format}
                    onValueChange={(v) => handleUpdateRow(idx, { format: v as DocumentFormat })}
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

                <div className="sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={doc.quantity}
                    onChange={(e) =>
                      handleUpdateRow(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono tabular-nums focus:border-[#1769E8] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[10px] font-semibold text-[#172B4D]/60 dark:text-slate-400">
                    Requirement / Stamp Instructions
                  </label>
                  <input
                    type="text"
                    value={doc.notes}
                    onChange={(e) => handleUpdateRow(idx, { notes: e.target.value })}
                    placeholder="e.g. Must be issued within 30 days of embassy filing"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end justify-end pt-4">
                  <button
                    type="button"
                    disabled={requiredDocuments.length <= 1}
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#172B4D] dark:text-slate-300">
              Admission Team Remarks & University Context
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain university submission deadline, apostille specification, or desk delivery instructions..."
              className="w-full px-3 py-2 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#172B4D]/60 dark:text-slate-400">
            Counselor receives an immediate operational notification with these requirements
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
              disabled={isSubmitting || !isAdmissionAuthorized}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] disabled:opacity-50 rounded-md transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              {isSubmitting ? 'Sending Request...' : 'Send Document Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
