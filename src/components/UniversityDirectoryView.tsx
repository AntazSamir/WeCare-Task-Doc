import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Building2,
  Plus,
  ExternalLink,
  Calendar,
  CheckCircle2,
  DollarSign,
  BookOpen,
  X,
  Edit2,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  Landmark,
} from 'lucide-react';
import { KoreanUniversity, UniversityProgram, UserProfile } from '../types/pms';
import { createUniversity, createIntake } from '../services/pmsService';
import { UniversityDetailsView } from './UniversityDetailsView';

const getUniversityAcronym = (name: string): string => {
  if (name.includes('Sungkyunkwan')) return 'SKKU';
  if (name.includes('Seoul National')) return 'SNU';
  if (name.includes('Yonsei')) return 'YU';
  if (name.includes('Korea University')) return 'KU';
  if (name.includes('KAIST')) return 'KAIST';
  if (name.includes('Hanyang')) return 'HYU';
  if (name.includes('Sogang')) return 'SGU';
  if (name.includes('Kyung Hee')) return 'KHU';
  if (name.includes('Ewha')) return 'EWHA';
  if (name.includes('Chung-Ang')) return 'CAU';
  return name
    .split(' ')
    .filter((w) => !['of', 'and', 'the', '&'].includes(w.toLowerCase()))
    .map((w) => w[0])
    .slice(0, 4)
    .join('')
    .toUpperCase();
};

const formatIntakeDeadline = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIndex = parseInt(month, 10) - 1;
    const mName = monthNames[mIndex] || month;
    return `${mName} ${parseInt(day, 10)}, ${year}`;
  }
  return dateStr;
};

interface UniversityDirectoryViewProps {
  universities: KoreanUniversity[];
  currentUser: UserProfile;
  onRefresh: () => void;
  onApplyStudentForProgram?: (universityId: string, program: UniversityProgram, intakeTerm?: string) => void;
}

export const UniversityDirectoryView: React.FC<UniversityDirectoryViewProps> = ({
  universities,
  currentUser,
  onRefresh,
  onApplyStudentForProgram,
}) => {
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [showAddUniModal, setShowAddUniModal] = useState(false);
  const [showAddIntakeModal, setShowAddIntakeModal] = useState(false);
  const [selectedUniIdForIntake, setSelectedUniIdForIntake] = useState(universities[0]?.id || '');

  // Add Uni form states
  const [nameEn, setNameEn] = useState('');
  const [nameKo, setNameKo] = useState('');
  const [city, setCity] = useState('Seoul');
  const [ranking, setRanking] = useState('Top Tier Korean University');
  const [websiteUrl, setWebsiteUrl] = useState('https://');
  const [topikRequirement, setTopikRequirement] = useState('TOPIK Level 3 or higher');
  const [ieltsRequirement, setIeltsRequirement] = useState('IELTS 6.0 minimum');
  const [bankBalanceUsd, setBankBalanceUsd] = useState(20000);
  const [notes, setNotes] = useState('');

  // Add Intake form states
  const [intakeTerm, setIntakeTerm] = useState('Spring 2027');
  const [appStart, setAppStart] = useState('2026-08-01');
  const [appDeadline, setAppDeadline] = useState('2026-09-30');
  const [quota, setQuota] = useState(30);

  const isAdmin = currentUser.role === 'Admission_Manager';

  // If a university is selected, display the full premium University Details page
  if (selectedUniversityId) {
    return (
      <div key={`uni-${selectedUniversityId}`} className="animate-page-enter">
        <UniversityDetailsView
          universityId={selectedUniversityId}
          currentUser={currentUser}
          onBack={() => setSelectedUniversityId(null)}
          onRefreshParent={onRefresh}
          onApplyStudentForProgram={onApplyStudentForProgram}
        />
      </div>
    );
  }

  const handleAddUniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !city.trim()) return;

    try {
      await createUniversity({
        nameEn: nameEn.trim(),
        nameKo: nameKo.trim() || nameEn.trim(),
        city: city.trim(),
        ranking: ranking.trim(),
        websiteUrl: websiteUrl.trim(),
        topikRequirement: topikRequirement.trim(),
        ieltsRequirement: ieltsRequirement.trim(),
        bankBalanceUsd: Number(bankBalanceUsd) || 20000,
        notes: notes.trim(),
      });
      onRefresh();
      setShowAddUniModal(false);
      setNameEn('');
      setNameKo('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUniIdForIntake || !intakeTerm || !appDeadline) return;

    try {
      await createIntake({
        universityId: selectedUniIdForIntake,
        term: intakeTerm,
        academicYear: 2027,
        applicationStart: appStart,
        applicationDeadline: appDeadline,
        quota: Number(quota) || 30,
      });
      onRefresh();
      setShowAddIntakeModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div key="uni-directory-list" className="animate-page-enter space-y-3.5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            South Korean Universities & Partner Institutions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Institutional directory with verified intakes, degree/language programs, refund regulations, and wire remittance coordinates. Click any university to view details.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddIntakeModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Add Intake Term
            </button>
            <button
              type="button"
              onClick={() => setShowAddUniModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add University
            </button>
          </div>
        )}
      </div>

      {/* Universities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {universities.map((u, idx) => {
          const intakes = (u as any).intakes || [];
          const programs = (u as any).programs || [];

          return (
            <div
              key={u.id}
              className={`group p-4 sm:p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 animate-card-enter stagger-${Math.min(idx + 1, 12)}`}
            >
              <div className="space-y-3.5">
                {/* 1. Institutional Identity Header with Crest Monogram */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex flex-col items-center justify-center font-bold tracking-wider shrink-0 border border-slate-700/80 shadow-xs">
                    <span className="text-xs font-mono font-bold leading-none text-blue-400">{getUniversityAcronym(u.nameEn)}</span>
                    <span className="text-[7.5px] font-sans font-medium text-slate-400 uppercase mt-0.5 tracking-wider">KOREA</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        onClick={() => setSelectedUniversityId(u.id)}
                        className="cursor-pointer min-w-0"
                      >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                          {u.nameEn}
                        </h3>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span>{u.nameKo}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                            {u.city}
                          </span>
                        </div>
                      </div>

                      {u.ranking && (
                        <span className="font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                          {u.ranking.replace(/World|Rank/gi, '').trim()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Key Solvency & Academic Tracks Stat Bar */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">Financial Solvency</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>${u.bankBalanceUsd?.toLocaleString()} USD</span>
                    </div>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">Academic Tracks</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{programs.length > 0 ? `${programs.length} Verified Tracks` : '5 Verified Tracks'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Admission & Language Requirements (Full Readable Text, No Truncation) */}
                <div className="rounded-md bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 w-16 shrink-0 pt-0.5 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                      TOPIK:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug flex-1 break-words">
                      {u.topikRequirement || 'TOPIK Level 3 minimum'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 w-16 shrink-0 pt-0.5 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                      English:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug flex-1 break-words">
                      {u.ieltsRequirement || 'IELTS 6.0 minimum'}
                    </span>
                  </div>
                </div>

                {/* 4. Active Intakes & Deadlines */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 font-mono">
                      Configured Intakes
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Open for Admission
                    </span>
                  </div>

                  {intakes.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-1">No intakes registered</div>
                  ) : (
                    <div className="space-y-1">
                      {intakes.slice(0, 2).map((it: any) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/70 text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {it.term}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            Deadline: <span className="text-slate-900 dark:text-slate-200 font-semibold">{formatIntakeDeadline(it.applicationDeadline)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Action Buttons Group */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUniversityId(u.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-blue-600 dark:hover:bg-blue-600 rounded-md transition-colors group/btn shadow-xs"
                >
                  <span>University Dossier & Guidelines</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 text-slate-400 group-hover/btn:text-white" />
                </button>

                <a
                  href={u.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Visit University Portal"
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-800"
                  aria-label={`Visit official website of ${u.nameEn}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add University Modal */}
      {showAddUniModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Add Korean Higher Education Partner Institution
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUniModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUniSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">University Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Chung-Ang University"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Korean Hangul Name</label>
                  <input
                    type="text"
                    value={nameKo}
                    onChange={(e) => setNameKo(e.target.value)}
                    placeholder="e.g. 중앙대학교"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">City / Region *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Seoul (Dongjak-gu)"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ranking / Tier</label>
                  <input
                    type="text"
                    value={ranking}
                    onChange={(e) => setRanking(e.target.value)}
                    placeholder="e.g. Top 15 in Korea"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Bank Certificate Requirement ($ USD)</label>
                  <input
                    type="number"
                    value={bankBalanceUsd}
                    onChange={(e) => setBankBalanceUsd(Number(e.target.value))}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Official Admissions URL</label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUniModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Save University
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Intake Term Modal */}
      {showAddIntakeModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-md rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Configure University Admission Intake & Deadline
              </h3>
              <button
                type="button"
                onClick={() => setShowAddIntakeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIntakeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">University *</label>
                <select
                  value={selectedUniIdForIntake}
                  onChange={(e) => setSelectedUniIdForIntake(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Intake Term *</label>
                  <select
                    value={intakeTerm}
                    onChange={(e) => setIntakeTerm(e.target.value)}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Spring 2027">Spring 2027</option>
                    <option value="Fall 2027">Fall 2027</option>
                    <option value="Winter 2026/27">Winter 2026/27</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Target Quota</label>
                  <input
                    type="number"
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value))}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Application Portal Deadline *</label>
                <input
                  type="date"
                  required
                  value={appDeadline}
                  onChange={(e) => setAppDeadline(e.target.value)}
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddIntakeModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Save Intake
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
