import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Truck,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { StudentApplication, UserProfile, VisaStage } from '../types/pms';

interface StudentDossierListProps {
  students: StudentApplication[];
  currentUser: UserProfile;
  onSelectStudent: (student: StudentApplication) => void;
  onOpenNewStudentModal: () => void;
}

const STAGE_LABELS: Record<VisaStage, { label: string; tone: string }> = {
  Document_Gathering: { label: 'Doc Prep', tone: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  Apostille_Verification: { label: 'Apostille & Notary', tone: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' },
  University_Submitted: { label: 'Univ Submitted', tone: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' },
  Admission_Granted: { label: 'Admitted', tone: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300' },
  Tuition_Paid: { label: 'Tuition Paid', tone: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
  CoA_Received: { label: 'CoA Ready', tone: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300' },
  Embassy_Visa_Filing: { label: 'Embassy Filing', tone: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' },
  Visa_Issued: { label: 'Visa Granted', tone: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
  Rejected: { label: 'Rejected', tone: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' },
};

export const StudentDossierList: React.FC<StudentDossierListProps> = ({
  students,
  currentUser,
  onSelectStudent,
  onOpenNewStudentModal,
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [degreeFilter, setDegreeFilter] = useState<string>('All');

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (stageFilter !== 'All' && s.visaStage !== stageFilter) return false;
      if (degreeFilter !== 'All' && s.degreeLevel !== degreeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.passportNumber.toLowerCase().includes(q) ||
          s.appliedUniversityName.toLowerCase().includes(q) ||
          s.major.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, search, stageFilter, degreeFilter]);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Student Application Dossiers (CRM)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentUser.role === 'Admission_Manager'
              ? `All Active International Student Candidates (${students.length} total)`
              : `Your Assigned Student Portfolio (${students.length} dossiers)`}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewStudentModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Register New Student
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name, passport, target university, or ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-500 font-medium">Stage:</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
          >
            <option value="All">All Stages</option>
            <option value="Document_Gathering">1. Document Prep</option>
            <option value="Apostille_Verification">2. Apostille & Notary</option>
            <option value="University_Submitted">3. Univ Submitted</option>
            <option value="Admission_Granted">4. Admission Granted</option>
            <option value="Tuition_Paid">5. Tuition Paid</option>
            <option value="CoA_Received">6. CoA Received</option>
            <option value="Embassy_Visa_Filing">7. Embassy Filing</option>
            <option value="Visa_Issued">8. Visa Issued</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-500 font-medium">Degree:</label>
          <select
            value={degreeFilter}
            onChange={(e) => setDegreeFilter(e.target.value)}
            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
          >
            <option value="All">All Degrees</option>
            <option value="Korean Language (D-4-1)">Korean Language (D-4-1)</option>
            <option value="Bachelor (D-2-2)">Bachelor (D-2-2)</option>
            <option value="Master (D-2-3)">Master (D-2-3)</option>
            <option value="Doctorate (D-2-4)">Doctorate (D-2-4)</option>
          </select>
        </div>
      </div>

      {/* Candidates Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase font-mono">
                <th className="px-4 py-3">ID & Candidate</th>
                <th className="px-4 py-3">Passport</th>
                <th className="px-4 py-3">Applied Institution & Major</th>
                <th className="px-4 py-3">Degree Track</th>
                <th className="px-4 py-3">Visa Stage</th>
                <th className="px-4 py-3">Assigned Consultant</th>
                <th className="px-4 py-3">DHL / Courier</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No candidate dossiers match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s, idx) => {
                  const stageInfo = STAGE_LABELS[s.visaStage] || { label: s.visaStage, tone: 'bg-slate-100 text-slate-700' };
                  const verifiedCount = (s.documentChecklist || []).filter((d) => d.status === 'Verified').length;
                  const totalDocs = (s.documentChecklist || []).length;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectStudent(s)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors animate-card-enter stagger-${Math.min(idx + 1, 12)}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {s.fullName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {s.id} · {s.intakeTerm}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {s.passportNumber}
                      </td>

                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {s.appliedUniversityName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {s.department} — {s.major}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {s.degreeLevel}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Visa: {s.visaType}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${stageInfo.tone}`}>
                          {stageInfo.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          Docs: {verifiedCount}/{totalDocs}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {s.assignedConsultantName}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {s.courierTrackingNumber ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <Truck className="w-3 h-3" />
                            {s.courierTrackingNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not Dispatched</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(s);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Dossier
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
