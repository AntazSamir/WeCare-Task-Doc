import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, GraduationCap, Building2 } from 'lucide-react';
import { DegreeLevel, IntakeProject, KoreanUniversity, UserProfile } from '../types/pms';
import { createStudent } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface NewStudentModalProps {
  isOpen: boolean;
  universities: KoreanUniversity[];
  projects: IntakeProject[];
  team: UserProfile[];
  currentUser: UserProfile;
  initialUniversityId?: string;
  initialProgramId?: string;
  initialIntakeTerm?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  isOpen,
  universities,
  projects,
  team,
  currentUser,
  initialUniversityId,
  initialProgramId,
  initialIntakeTerm,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState(initialUniversityId || universities[0]?.id || '');
  const [programId, setProgramId] = useState(initialProgramId || '');
  const [programName, setProgramName] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [department, setDepartment] = useState('College of Engineering');
  const [major, setMajor] = useState('Computer Science');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>('Bachelor (D-2-2)');
  const [assignedConsultantId, setAssignedConsultantId] = useState(
    currentUser.role === 'Consultant' ? currentUser.id : team.find((t) => t.role === 'Consultant')?.id || 'USR-CONSULTANT-1'
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props
  React.useEffect(() => {
    if (initialUniversityId) {
      setUniversityId(initialUniversityId);
      const uni = universities.find((u) => u.id === initialUniversityId);
      if (uni && uni.programs && uni.programs.length > 0) {
        const prog = initialProgramId ? uni.programs.find((p) => p.id === initialProgramId) : uni.programs[0];
        if (prog) {
          setProgramId(prog.id);
          setProgramName(prog.name);
          setDegreeLevel(prog.degreeLevel);
          setMajor(prog.name);
        }
      }
    }
  }, [initialUniversityId, initialProgramId, universities]);

  const selectedUni = universities.find((u) => u.id === universityId);
  const availablePrograms = selectedUni?.programs || [];

  const handleUniversityChange = (newUniId: string) => {
    setUniversityId(newUniId);
    const uni = universities.find((u) => u.id === newUniId);
    if (uni && uni.programs && uni.programs.length > 0) {
      const firstProg = uni.programs[0];
      setProgramId(firstProg.id);
      setProgramName(firstProg.name);
      setDegreeLevel(firstProg.degreeLevel);
      setMajor(firstProg.name);
    } else {
      setProgramId('');
      setProgramName('');
    }
  };

  const handleProgramChange = (newProgId: string) => {
    setProgramId(newProgId);
    const prog = availablePrograms.find((p) => p.id === newProgId);
    if (prog) {
      setProgramName(prog.name);
      setDegreeLevel(prog.degreeLevel);
      setMajor(prog.name);
      if (prog.code === 'KLP') {
        setDepartment('Language Education Institute');
      } else if (prog.code.includes('GSIS')) {
        setDepartment('Graduate School of International Studies');
      } else if (prog.code.includes('CS') || prog.code.includes('ENG')) {
        setDepartment('College of Engineering');
      } else if (prog.code.includes('BBA') || prog.code.includes('GBA')) {
        setDepartment('School of Business');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !passportNumber.trim() || !universityId || !projectId) {
      setError('Please fill in candidate name, passport, university, and project.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedProject = projects.find((p) => p.id === projectId);
      await createStudent({
        fullName: fullName.trim(),
        passportNumber: passportNumber.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
        appliedUniversityId: universityId,
        projectId,
        department: department.trim(),
        major: major.trim(),
        degreeLevel,
        intakeTerm: initialIntakeTerm || selectedProject?.intakeTerm || 'Spring 2027',
        programId: programId || undefined,
        programName: programName || undefined,
        visaType: degreeLevel.includes('D-4') ? 'D-4' : 'D-2',
        assignedConsultantId,
        notes: notes.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create student dossier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-2xl my-auto overflow-hidden animate-modal-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3EAF3] dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1769E8]" />
              Register New Student Candidate
            </h2>
            <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
              Initialize Korean university admission dossier and document verification checklist
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#172B4D]/50 hover:text-[#123B78] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-[#DC4545]/10 dark:bg-red-950/40 border border-[#DC4545]/35 dark:border-red-900 text-xs text-[#DC4545] dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Candidate Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Park Ji-hoon"
                className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Passport Number *
              </label>
              <input
                type="text"
                required
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                placeholder="e.g. M99218412"
                className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 font-mono text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@gmail.com"
                className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+82-10-1234-5678"
                className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 font-mono text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>
          </div>

          {/* Target University & Project Linkage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Target Korean University *
              </label>
              <MorphSelect value={universityId} onValueChange={handleUniversityChange}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select university..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {universities.map((u) => (
                    <MorphSelectItem key={u.id} value={u.id}>
                      {u.nameEn} ({u.city})
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Intake Project Campaign *
              </label>
              <MorphSelect value={projectId} onValueChange={(v) => setProjectId(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select project..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {projects.map((p) => (
                    <MorphSelectItem key={p.id} value={p.id}>
                      {p.name}
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>
          </div>

          {/* Academic / Language Program Track (Specific to Selected University) */}
          {availablePrograms.length > 0 && (
            <div className="text-xs">
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                University Academic / Language Track (Auto-populates requirements & fees)
              </label>
              <MorphSelect value={programId} onValueChange={handleProgramChange}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select program..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="">-- Custom / Direct Academic Entry --</MorphSelectItem>
                  {availablePrograms.map((prog) => (
                    <MorphSelectItem key={prog.id} value={prog.id}>
                      [{prog.code}] {prog.name} · {prog.degreeLevel} (₩{prog.tuitionFeeKrw === 0 ? 'Full Scholarship' : prog.tuitionFeeKrw.toLocaleString() + ' KRW'})
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>
          )}

          {/* Department, Major & Degree Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Degree Level & Visa Code
              </label>
              <MorphSelect value={degreeLevel} onValueChange={(v) => setDegreeLevel(v as any)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select degree level..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Bachelor (D-2-2)">Undergraduate / Bachelor (D-2-2)</MorphSelectItem>
                  <MorphSelectItem value="Master (D-2-3)">Graduate / Master (D-2-3)</MorphSelectItem>
                  <MorphSelectItem value="Doctorate (D-2-4)">Doctorate / PhD (D-2-4)</MorphSelectItem>
                  <MorphSelectItem value="Korean Language (D-4-1)">Korean Language Center (D-4-1)</MorphSelectItem>
                  <MorphSelectItem value="Exchange (D-2-6)">Pathway / Exchange (D-2-6)</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div>
              <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                Target Department / College
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. College of Engineering"
                className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
              Target Major / Field of Study *
            </label>
            <input
              type="text"
              required
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="e.g. Computer Science & Artificial Intelligence"
              className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
            />
          </div>

          {/* Assigned Consultant */}
          <div className="text-xs">
            <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
              Assigned Consultant / Case Officer
            </label>
            <MorphSelect value={assignedConsultantId} onValueChange={(v) => setAssignedConsultantId(v)}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Select consultant..." />
              </MorphSelectTrigger>
              <MorphSelectContent>
                {team.map((u) => (
                  <MorphSelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role === 'Admission_Manager' ? 'Admission Manager' : u.title})
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#172B4D] dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded hover:bg-[#DCEBFF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] disabled:opacity-50 rounded transition-colors"
            >
              {isSubmitting ? 'Registering...' : 'Register Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
