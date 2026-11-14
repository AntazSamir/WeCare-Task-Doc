import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileCheck2,
  Truck,
  CheckCircle2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { DocumentChecklistItem, StudentApplication, UserProfile, VisaStage } from '../types/pms';
import { updateStudent, updateStudentStage } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface StudentDossierModalProps {
  student: StudentApplication | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onCreateTaskForStudent: (student: StudentApplication) => void;
}

const VISA_STAGES: { id: VisaStage; label: string; desc: string }[] = [
  { id: 'Document_Gathering', label: '1. Document Gathering', desc: 'Candidate compiling passport, transcripts & bank docs' },
  { id: 'Apostille_Verification', label: '2. Apostille & Notarization', desc: 'Diplomas & affidavits undergoing government apostille' },
  { id: 'University_Submitted', label: '3. University Submitted', desc: 'Online application submitted & hardcopy dispatched' },
  { id: 'Admission_Granted', label: '4. Admission Granted', desc: 'Acceptance notice issued by Korean university' },
  { id: 'Tuition_Paid', label: '5. Tuition Paid', desc: 'Shinhan/Woori wire transfer confirmed' },
  { id: 'CoA_Received', label: '6. CoA Received', desc: 'Standard Certificate of Admission issued for visa' },
  { id: 'Embassy_Visa_Filing', label: '7. Embassy Visa Filing', desc: 'Visa application filed at Korean Embassy / Consular KVAC' },
  { id: 'Visa_Issued', label: '8. Visa Issued (D-2/D-4)', desc: 'Korean visa grant notice issued, flights booking' },
  { id: 'Rejected', label: 'Rejected / Withdrawn', desc: 'Application withdrawn or denied' },
];

export const StudentDossierModal: React.FC<StudentDossierModalProps> = ({
  student,
  currentUser,
  isOpen,
  onClose,
  onRefresh,
  onCreateTaskForStudent,
}) => {
  if (!isOpen || !student) return null;

  const [visaStage, setVisaStage] = useState<VisaStage>(student.visaStage);
  const [dhlTracking, setDhlTracking] = useState(student.courierTrackingNumber || '');
  const [courierName, setCourierName] = useState(student.courierName || 'DHL Express');
  const [coaNumber, setCoaNumber] = useState(student.certificateOfAdmissionNo || '');
  const [notes, setNotes] = useState(student.notes || '');
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>(student.documentChecklist || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleDocumentStatusToggle = (docId: string, newStatus: any) => {
    const updated = checklist.map((item) =>
      item.id === docId
        ? {
            ...item,
            status: newStatus,
            verifiedBy: currentUser.name,
            verifiedAt: new Date().toISOString(),
          }
        : item
    );
    setChecklist(updated);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStudent(student.id, {
        visaStage,
        courierName: courierName as any,
        courierTrackingNumber: dhlTracking.trim() || null,
        certificateOfAdmissionNo: coaNumber.trim() || null,
        documentChecklist: checklist,
        notes: notes.trim(),
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdvanceStage = async (nextStage: VisaStage) => {
    setVisaStage(nextStage);
    try {
      await updateStudentStage(student.id, nextStage);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl max-h-[90vh] my-auto flex flex-col rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-2xl overflow-hidden animate-modal-card">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between shrink-0 bg-[#F4F2EE] dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#172B4D]/65 dark:text-slate-400 font-mono">Passport: {student.passportNumber}</span>
              <span className="text-[#E3EAF3] dark:text-slate-700">·</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#DCEBFF] dark:bg-slate-800 text-[#123B78] dark:text-slate-300 font-medium">
                {student.degreeLevel}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#172B4D] dark:text-slate-100 mt-1">
              {student.fullName}
            </h2>
            <div className="text-xs text-[#172B4D]/65 dark:text-slate-400">
              {student.appliedUniversityName} · {student.major} ({student.intakeTerm})
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCreateTaskForStudent(student)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Assign Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#172B4D]/50 hover:text-[#172B4D] dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSaveChanges} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Korean Visa Stage Progression Radio / Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] dark:text-slate-300 font-mono">
              Korean Visa Stage Progression
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {VISA_STAGES.filter((s) => s.id !== 'Rejected').map((stage) => {
                const isSelected = visaStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleQuickAdvanceStage(stage.id)}
                    className={`p-2.5 rounded-md border text-left transition-all ${
                      isSelected
                        ? 'bg-[#DCEBFF] dark:bg-blue-950/60 border-[#1769E8] dark:border-blue-500 text-[#123B78] dark:text-blue-100 ring-2 ring-[#1769E8]/25'
                        : 'bg-[#FFFFFF] dark:bg-slate-950/40 border-[#E3EAF3] dark:border-slate-800 text-[#172B4D]/75 dark:text-slate-400 hover:bg-[#F4F2EE] hover:border-[#36A5F5]/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate flex items-center justify-between">
                      <span>{stage.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1769E8] dark:text-[#36A5F5] shrink-0" />}
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? 'text-[#123B78]/80 dark:text-blue-200/80' : 'text-[#172B4D]/60 dark:text-slate-500'}`}>
                      {stage.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student Dossier Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-md bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800 text-xs">
            <div>
              <span className="text-[#172B4D]/55 dark:text-slate-400 block text-[10px] uppercase font-mono">Assigned Consultant</span>
              <span className="font-semibold text-[#172B4D] dark:text-slate-200 mt-0.5 block">
                {student.assignedConsultantName}
              </span>
            </div>
            <div>
              <span className="text-[#172B4D]/55 dark:text-slate-400 block text-[10px] uppercase font-mono">Contact Details</span>
              <span className="text-[#172B4D]/85 dark:text-slate-300 font-mono block mt-0.5 truncate">
                {student.contactEmail}
              </span>
              <span className="text-[#172B4D]/65 dark:text-slate-400 font-mono block text-[11px]">{student.contactPhone}</span>
            </div>
            <div>
              <span className="text-[#172B4D]/55 dark:text-slate-400 block text-[10px] uppercase font-mono">Certificate of Admission (CoA)</span>
              <input
                type="text"
                value={coaNumber}
                onChange={(e) => setCoaNumber(e.target.value)}
                placeholder="e.g. COA-2027-SNU-0841"
                className="mt-1 w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-2.5 py-1 text-xs font-mono tabular-nums text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#1769E8]"
              />
            </div>
          </div>

          {/* DHL / Courier Dispatch Tracking Section */}
          <div className="p-4 rounded-md border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B4D] dark:text-slate-200 flex items-center gap-1.5 uppercase font-mono">
                <Truck className="w-4 h-4 text-[#E9A23B]" />
                Physical Document Courier Tracking (To Korea)
              </span>
              {dhlTracking && (
                <a
                  href={`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(dhlTracking)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#1769E8] dark:text-[#36A5F5] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Track on DHL.com
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#172B4D]/70 dark:text-slate-400 mb-1">Courier Service</label>
                <MorphSelect value={courierName} onValueChange={(v) => setCourierName(v as any)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select courier..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="DHL Express">DHL Express Korea</MorphSelectItem>
                    <MorphSelectItem value="EMS">Korea Post EMS</MorphSelectItem>
                    <MorphSelectItem value="FedEx">FedEx International Priority</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
              </div>

              <div>
                <label className="block text-[#172B4D]/70 dark:text-slate-400 mb-1">AWB Tracking Number</label>
                <input
                  type="text"
                  value={dhlTracking}
                  onChange={(e) => setDhlTracking(e.target.value)}
                  placeholder="e.g. DHL-9921-8840-KR"
                  className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 px-3 py-1.5 text-xs font-mono tabular-nums text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#1769E8]"
                />
              </div>
            </div>
          </div>

          {/* South Korean University Document Verification Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] dark:text-slate-300 font-mono flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-[#1769E8]" />
                Admission & Visa Document Verification Checklist
              </h3>
              <span className="text-[11px] font-mono text-[#172B4D]/60 dark:text-slate-400">
                {checklist.filter((i) => i.status === 'Verified').length}/{checklist.length} verified
              </span>
            </div>

            <div className="divide-y divide-[#E3EAF3] dark:divide-slate-800 border border-[#E3EAF3] dark:border-slate-800 rounded-md overflow-hidden text-xs">
              {checklist.map((doc) => (
                <div key={doc.id} className="p-3 flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-slate-900">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#172B4D] dark:text-slate-100 flex items-center gap-1.5">
                      <span>{doc.name}</span>
                      {doc.required && (
                        <span className="text-[10px] text-[#DC4545] font-mono font-bold">*Required</span>
                      )}
                    </div>
                    {doc.verifiedBy && (
                      <div className="text-[10px] text-[#172B4D]/55 dark:text-slate-400 font-mono mt-0.5">
                        Verified by {doc.verifiedBy}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(['Pending', 'Collected', 'Notarized', 'Apostilled', 'Verified'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleDocumentStatusToggle(doc.id, st)}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${
                          doc.status === st
                            ? st === 'Verified'
                              ? 'bg-[#16A36A] text-white font-semibold shadow-xs'
                              : st === 'Apostilled'
                              ? 'bg-[#123B78] text-white font-semibold'
                              : st === 'Notarized'
                              ? 'bg-[#1769E8] text-white font-semibold'
                              : 'bg-[#E9A23B] text-white font-semibold'
                            : 'bg-[#F4F2EE] dark:bg-slate-800 text-[#172B4D]/70 dark:text-slate-400 hover:bg-[#DCEBFF] hover:text-[#123B78] dark:hover:bg-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1">
              Internal Case Notes & Visa Guidance
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Candidate interview preparation, Shinhan wire receipt confirmation, apostille submission dates..."
              className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 p-2.5 text-xs text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/40 dark:placeholder:text-slate-400 focus:outline-none focus:border-[#1769E8]"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#172B4D]/75 dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded hover:bg-[#F4F2EE] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] disabled:opacity-50 rounded transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Dossier Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
