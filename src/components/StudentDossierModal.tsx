import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  Truck,
  CheckCircle2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import { DocumentChecklistItem, StudentApplication, UserProfile, VisaStage } from '../types/pms';
import { updateStudent, updateStudentStage } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { ModalTransition, MotionButton } from './animations';

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
  const [visaStage, setVisaStage] = useState<VisaStage>(student?.visaStage || 'Document_Gathering');
  const [dhlTracking, setDhlTracking] = useState(student?.courierTrackingNumber || '');
  const [courierName, setCourierName] = useState(student?.courierName || 'DHL Express');
  const [coaNumber, setCoaNumber] = useState(student?.certificateOfAdmissionNo || '');
  const [notes, setNotes] = useState(student?.notes || '');
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>(student?.documentChecklist || []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setVisaStage(student.visaStage);
      setDhlTracking(student.courierTrackingNumber || '');
      setCourierName(student.courierName || 'DHL Express');
      setCoaNumber(student.certificateOfAdmissionNo || '');
      setNotes(student.notes || '');
      setChecklist(student.documentChecklist || []);
    }
  }, [student]);

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
    if (!student) return;
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
    if (!student) return;
    setVisaStage(nextStage);
    try {
      await updateStudentStage(student.id, nextStage);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ModalTransition
      isOpen={isOpen && Boolean(student)}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 bg-[#0F172A]/40 dark:bg-black/70 backdrop-blur-xs"
      cardClassName="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[12px] bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-2xl dark:shadow-none overflow-hidden"
    >
      {student && (
        <>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between shrink-0 bg-[#F8FAFC] dark:bg-[#161616]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B] dark:text-[#9A9AA2] tabular-nums">Passport: {student.passportNumber}</span>
              <span className="text-[#E2E8F0] dark:text-[#2E2E32]">·</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E40AF] dark:text-[#4C8DF6] font-medium">
                {student.degreeLevel}
              </span>
            </div>
            <h2 className="text-[16px] font-semibold text-[#0F172A] dark:text-[#ECECEE] mt-1">
              {student.fullName}
            </h2>
            <div className="text-xs text-[#64748B] dark:text-[#9A9AA2]">
              {student.appliedUniversityName} · {student.major} ({student.intakeTerm})
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MotionButton
              onClick={() => onCreateTaskForStudent(student)}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors duration-150 shadow-xs dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2 dark:focus:ring-offset-[#161616]"
            >
              <Plus className="w-4 h-4" />
              Assign Task
            </MotionButton>
            <MotionButton
              onClick={onClose}
              className="p-2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] dark:hover:bg-[#252528] rounded-lg transition-colors"
              aria-label="Close student dossier"
            >
              <X className="w-4 h-4" />
            </MotionButton>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSaveChanges} className="p-6 overflow-y-auto scrollbar-stable space-y-6 flex-1">
          {/* Korean Visa Stage Progression Radio / Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE]">
              Korean Visa Stage Progression
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {VISA_STAGES.filter((s) => s.id !== 'Rejected').map((stage) => {
                const isSelected = visaStage === stage.id;
                return (
                  <MotionButton
                    key={stage.id}
                    onClick={() => handleQuickAdvanceStage(stage.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] border-[#1E40AF] dark:border-[#4C8DF6] text-[#1E40AF] dark:text-[#ECECEE] ring-2 ring-[#1E40AF]/25 dark:ring-[#4C8DF6]/30'
                        : 'bg-[#FFFFFF] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32] text-[#0F172A]/75 dark:text-[#9A9AA2] hover:bg-[#F8FAFC] hover:border-[#1E40AF]/40 dark:hover:bg-[#2E2E32] dark:hover:border-[#3A3A3F]'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate flex items-center justify-between">
                      <span>{stage.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />}
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? 'text-[#1E40AF]/80 dark:text-[#ECECEE]/80' : 'text-[#64748B] dark:text-[#66666E]'}`}>
                      {stage.desc}
                    </div>
                  </MotionButton>
                );
              })}
            </div>
          </div>

          {/* Student Dossier Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] text-xs">
            <div>
              <span className="text-[#64748B] dark:text-[#9A9AA2] block text-[10px] uppercase font-semibold">Assigned Consultant</span>
              <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE] mt-0.5 block">
                {student.assignedConsultantName}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] dark:text-[#9A9AA2] block text-[10px] uppercase font-semibold">Contact Details</span>
              <span className="text-[#0F172A] dark:text-[#ECECEE] tabular-nums block mt-0.5 truncate font-medium">
                {student.contactEmail}
              </span>
              <span className="text-[#64748B] dark:text-[#9A9AA2] tabular-nums block text-[11px]">{student.contactPhone}</span>
            </div>
            <div>
              <span className="text-[#64748B] dark:text-[#9A9AA2] block text-[10px] uppercase font-semibold">Certificate of Admission (CoA)</span>
              <input
                type="text"
                value={coaNumber}
                onChange={(e) => setCoaNumber(e.target.value)}
                placeholder="e.g. COA-2027-SNU-0841"
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] px-2.5 py-1 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] dark:placeholder:text-[#66666E] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6]"
              />
            </div>
          </div>

          {/* DHL / Courier Dispatch Tracking Section */}
          <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5 uppercase">
                <Truck className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Physical Document Courier Tracking (To Korea)
              </span>
              {dhlTracking && (
                <a
                  href={`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(dhlTracking)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#1E40AF] dark:text-[#4C8DF6] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Track on DHL.com
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#64748B] dark:text-[#9A9AA2] mb-1">Courier Service</label>
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
                <label className="block text-[#64748B] dark:text-[#9A9AA2] mb-1">AWB Tracking Number</label>
                <input
                  type="text"
                  value={dhlTracking}
                  onChange={(e) => setDhlTracking(e.target.value)}
                  placeholder="e.g. DHL-9921-8840-KR"
                  className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] px-3 py-1.5 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] dark:placeholder:text-[#66666E] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6]"
                />
              </div>
            </div>
          </div>

          {/* South Korean University Document Verification Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Admission & Visa Document Verification Checklist
              </h3>
              <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                {checklist.filter((i) => i.status === 'Verified').length}/{checklist.length} verified
              </span>
            </div>

            <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden text-xs">
              {checklist.map((doc) => (
                <div key={doc.id} className="p-3 flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E]">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                      <span>{doc.name}</span>
                      {doc.required && (
                        <span className="text-[10px] text-[#DC2626] dark:text-[#EF5350] font-semibold">*Required</span>
                      )}
                    </div>
                    {doc.verifiedBy && (
                      <div className="text-[10px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5">
                        Verified by {doc.verifiedBy}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(['Pending', 'Collected', 'Notarized', 'Apostilled', 'Verified'] as const).map((st) => (
                      <MotionButton
                        key={st}
                        onClick={() => handleDocumentStatusToggle(doc.id, st)}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${
                          doc.status === st
                            ? st === 'Verified'
                              ? 'bg-[#16A34A] dark:bg-[#34C26B] text-white font-semibold shadow-xs dark:shadow-none'
                              : st === 'Apostilled'
                              ? 'bg-[#1E40AF] dark:bg-[#4C8DF6] text-white font-semibold'
                              : st === 'Notarized'
                              ? 'bg-[#1E40AF] dark:bg-[#4C8DF6] text-white font-semibold'
                              : 'bg-[#D97706] dark:bg-[#F0A030] text-white font-semibold'
                            : 'bg-[#F8FAFC] dark:bg-[#252528] text-[#64748B] dark:text-[#9A9AA2] hover:bg-[#EFF6FF] hover:text-[#1E40AF] dark:hover:bg-[#2E2E32] dark:hover:text-[#ECECEE]'
                        }`}
                      >
                        {st}
                      </MotionButton>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] mb-1">
              Internal Case Notes & Visa Guidance
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Candidate interview preparation, Shinhan wire receipt confirmation, apostille submission dates..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] p-2.5 text-xs text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B]/60 dark:placeholder:text-[#66666E] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6]"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
            <MotionButton
              onClick={onClose}
              className="h-9 px-4 text-sm font-medium text-[#0F172A] dark:text-[#ECECEE] bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg hover:bg-slate-50 dark:hover:bg-[#2E2E32] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2 dark:focus:ring-offset-[#1C1C1E]"
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] disabled:opacity-50 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2 dark:focus:ring-offset-[#1C1C1E]"
            >
              {isSaving && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              {isSaving ? 'Saving...' : 'Save Dossier Updates'}
            </MotionButton>
          </div>
        </form>
        </>
      )}
    </ModalTransition>
  );
};
