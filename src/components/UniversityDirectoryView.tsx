import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Building2,
  Plus,
  ExternalLink,
  Calendar,
  BookOpen,
  X,
  ChevronRight,
  MapPin,
  Landmark,
  Search,
  LayoutGrid,
  Table2,
  CheckCircle2,
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
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
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
  onApplyStudentForProgram?: (
    universityId: string,
    program: UniversityProgram,
    intakeTerm?: string
  ) => void;
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

  // Search, Filter & Layout Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

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

  const cities = useMemo(() => {
    const set = new Set<string>();
    universities.forEach((u) => {
      if (u.city) set.add(u.city);
    });
    return Array.from(set);
  }, [universities]);

  const filteredUniversities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return universities.filter((u) => {
      if (cityFilter !== 'All' && u.city !== cityFilter) return false;
      if (!q) return true;
      return (
        u.nameEn.toLowerCase().includes(q) ||
        (u.nameKo || '').toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q) ||
        (u.ranking || '').toLowerCase().includes(q) ||
        (u.topikRequirement || '').toLowerCase().includes(q) ||
        (u.ieltsRequirement || '').toLowerCase().includes(q)
      );
    });
  }, [universities, searchQuery, cityFilter]);

  const summaryMetrics = useMemo(() => {
    let totalIntakes = 0;
    let openIntakes = 0;
    let totalPrograms = 0;
    let verifiedCount = 0;

    universities.forEach((u) => {
      const intakes = (u as any).intakes || [];
      const programs = (u as any).programs || [];
      totalIntakes += intakes.length;
      openIntakes += intakes.filter((it: any) => it.status === 'Open').length || intakes.length;
      totalPrograms += programs.length;
      if (u.verificationStatus === 'Verified') verifiedCount += 1;
    });

    return {
      totalUniversities: universities.length,
      verifiedCount,
      openIntakes,
      totalIntakes,
      totalPrograms,
    };
  }, [universities]);

  // Preserve University Dossier & Guidelines view untouched
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
    <div key="uni-directory-list" className="space-y-4">
      {/* Header & Operational Summary */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-[#DCEBFF] dark:bg-blue-950/60 border border-[#36A5F5]/40 dark:border-blue-800 flex items-center justify-center text-[#123B78] dark:text-[#36A5F5] shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-[#172B4D] dark:text-slate-100">
                South Korean Partner Universities
              </h1>
              <p className="text-xs text-[#172B4D]/70 dark:text-slate-400 mt-0.5">
                {summaryMetrics.totalUniversities} partner institutions · {summaryMetrics.openIntakes} open admission intakes · Select any institution for full guidelines, tuition, refund rules &amp; wire details
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedUniIdForIntake && universities[0]?.id) {
                    setSelectedUniIdForIntake(universities[0].id);
                  }
                  setShowAddIntakeModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#172B4D] dark:text-slate-200 bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] dark:hover:bg-slate-700 border border-[#E3EAF3] dark:border-slate-700 rounded-md transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[#1769E8]" />
                Add Intake Term
              </button>
              <button
                type="button"
                onClick={() => setShowAddUniModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add University
              </button>
            </div>
          )}
        </div>

        {/* Clean Toolbar: Search, Region Filter & View Switcher */}
        <div className="pt-3.5 border-t border-[#E3EAF3] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#172B4D]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search university, Hangul name, city, TOPIK, or IELTS..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/45 focus:bg-[#FFFFFF] dark:focus:bg-slate-900 focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              aria-label="Filter by city"
              className="px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-300 focus:border-[#1769E8] focus:outline-none"
            >
              <option value="All">All Cities ({universities.length})</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {(searchQuery || cityFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCityFilter('All');
                }}
                className="text-xs font-semibold text-[#1769E8] hover:text-[#123B78] dark:hover:text-slate-100 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#172B4D]/65 dark:text-slate-400 tabular-nums hidden sm:inline">
              Showing {filteredUniversities.length} of {universities.length}
            </span>

            <div className="inline-flex items-center p-0.5 rounded-md bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  viewLayout === 'grid'
                    ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                    : 'text-[#172B4D]/60 dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  viewLayout === 'table'
                    ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                    : 'text-[#172B4D]/60 dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredUniversities.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-10 text-center space-y-2">
          <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-200">
            No matching Korean universities
          </div>
          <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
            Adjust your search term or city filter to view partner institutions.
          </p>
        </div>
      ) : viewLayout === 'table' ? (
        /* Comparison Table View */
        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F2EE] dark:bg-slate-800/60 text-[11px] font-semibold text-[#172B4D]/70 dark:text-slate-400 border-b border-[#E3EAF3] dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Location &amp; Tier</th>
                <th className="px-4 py-3">Language Requirements</th>
                <th className="px-4 py-3">Bank Solvency</th>
                <th className="px-4 py-3">Configured Intakes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
              {filteredUniversities.map((u) => {
                const intakes = (u as any).intakes || [];
                const programs = (u as any).programs || [];
                const acronym = getUniversityAcronym(u.nameEn);

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-[#F4F2EE] dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-md bg-[#DCEBFF] dark:bg-slate-800 border border-[#36A5F5]/40 dark:border-slate-700 flex items-center justify-center font-mono text-[11px] font-bold text-[#123B78] dark:text-[#36A5F5] shrink-0">
                          {acronym}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedUniversityId(u.id)}
                            className="font-bold text-[#172B4D] dark:text-slate-100 hover:text-[#1769E8] dark:hover:text-[#36A5F5] text-left"
                          >
                            {u.nameEn}
                          </button>
                          <div className="text-[11px] text-[#172B4D]/65 dark:text-slate-400 mt-0.5">
                            {u.nameKo} ·{' '}
                            <span className="font-mono tabular-nums">
                              {programs.length > 0 ? `${programs.length} tracks` : '5 tracks'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium text-[#172B4D] dark:text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1769E8] shrink-0" />
                        <span>{u.city}</span>
                      </div>
                      {u.ranking && (
                        <div className="text-[11px] font-mono text-[#172B4D]/60 dark:text-slate-400 mt-0.5">
                          {u.ranking.replace(/World|Rank/gi, '').trim()}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top max-w-xs space-y-0.5">
                      <div className="text-[#172B4D] dark:text-slate-200">
                        <span className="text-[#172B4D]/55 dark:text-slate-400 font-semibold">TOPIK:</span>{' '}
                        {u.topikRequirement || 'TOPIK Level 3+'}
                      </div>
                      <div className="text-[#172B4D]/85 dark:text-slate-300">
                        <span className="text-[#172B4D]/55 dark:text-slate-400 font-semibold">English:</span>{' '}
                        {u.ieltsRequirement || 'IELTS 6.0+'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-100">
                      ${u.bankBalanceUsd?.toLocaleString()} USD
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      {intakes.length === 0 ? (
                        <span className="text-[#172B4D]/45 italic">No intakes registered</span>
                      ) : (
                        <div className="space-y-1">
                          {intakes.slice(0, 2).map((it: any) => (
                            <div key={it.id} className="font-mono text-[11px] tabular-nums">
                              <span className="font-semibold text-[#172B4D] dark:text-slate-200">
                                {it.term}
                              </span>{' '}
                              <span className="text-[#172B4D]/40">·</span>{' '}
                              <span className="text-[#172B4D]/70 dark:text-slate-400">
                                Due {formatIntakeDeadline(it.applicationDeadline)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedUniversityId(u.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#123B78] dark:bg-[#1769E8] hover:bg-[#1769E8] dark:hover:bg-[#36A5F5] rounded-md transition-colors"
                        >
                          <span>University Dossier &amp; Guidelines</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={u.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Visit University Portal"
                          className="p-1.5 text-[#172B4D]/65 hover:text-[#1769E8] dark:text-slate-400 dark:hover:text-slate-100 border border-[#E3EAF3] dark:border-slate-700 rounded-md"
                          aria-label={`Visit official website of ${u.nameEn}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Clean Minimalist 3-Column Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUniversities.map((u) => {
            const intakes = (u as any).intakes || [];
            const programs = (u as any).programs || [];
            const acronym = getUniversityAcronym(u.nameEn);
            const isVerified = u.verificationStatus === 'Verified';

            return (
              <article
                key={u.id}
                className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#36A5F5] dark:hover:border-slate-700 rounded-lg p-5 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-4">
                  {/* Top Identity Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-[#123B78] dark:bg-slate-800 text-white flex flex-col items-center justify-center shrink-0 border border-[#123B78] dark:border-slate-700">
                        <span className="text-[11px] font-mono font-bold leading-none text-[#36A5F5]">
                          {acronym}
                        </span>
                        <span className="text-[7px] font-sans text-[#DCEBFF] uppercase mt-0.5 tracking-wider">
                          KR
                        </span>
                      </div>

                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedUniversityId(u.id)}
                          className="text-left text-sm font-bold text-[#172B4D] dark:text-slate-100 hover:text-[#1769E8] dark:hover:text-[#36A5F5] leading-snug block"
                        >
                          {u.nameEn}
                        </button>
                        <div className="mt-0.5 text-xs text-[#172B4D]/65 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span>{u.nameKo}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-[#1769E8] shrink-0" />
                            {u.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isVerified && (
                      <span
                        title="Verified university criteria"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A36A] dark:text-emerald-400 shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Ranking & Solvency Hairline Strip */}
                  <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-[#E3EAF3] dark:border-slate-800 text-xs">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#172B4D]/55 dark:text-slate-400">
                        Bank Solvency
                      </div>
                      <div className="mt-0.5 font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-100 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-[#1769E8] shrink-0" />
                        <span>${u.bankBalanceUsd?.toLocaleString()} USD</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#172B4D]/55 dark:text-slate-400">
                        Tracks &amp; Tier
                      </div>
                      <div className="mt-0.5 font-medium text-[#172B4D] dark:text-slate-200 flex items-center gap-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-[#1769E8] shrink-0" />
                        <span className="truncate font-mono tabular-nums">
                          {programs.length > 0 ? `${programs.length} Tracks` : '5 Tracks'}
                          {u.ranking ? ` · ${u.ranking.replace(/World|Rank/gi, '').trim()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Language & Admission Requirements (Unboxed Key-Value Lines) */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-semibold text-[#172B4D]/65 dark:text-slate-400 w-16 shrink-0 flex items-center gap-1 pt-0.5">
                        <BookOpen className="w-3 h-3 text-[#1769E8] shrink-0" />
                        TOPIK
                      </span>
                      <span className="text-[#172B4D] dark:text-slate-200 leading-snug flex-1">
                        {u.topikRequirement || 'TOPIK Level 3 minimum'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-semibold text-[#172B4D]/65 dark:text-slate-400 w-16 shrink-0 flex items-center gap-1 pt-0.5">
                        <GraduationCap className="w-3 h-3 text-[#1769E8] shrink-0" />
                        English
                      </span>
                      <span className="text-[#172B4D] dark:text-slate-200 leading-snug flex-1">
                        {u.ieltsRequirement || 'IELTS 6.0 minimum'}
                      </span>
                    </div>
                  </div>

                  {/* Intakes & Application Deadlines */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold uppercase tracking-wide text-[#172B4D]/55 dark:text-slate-400 text-[10px]">
                        Configured Intakes
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#16A36A] dark:text-emerald-400 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A] shrink-0" />
                        Open
                      </span>
                    </div>

                    {intakes.length === 0 ? (
                      <div className="text-xs text-[#172B4D]/45 italic py-0.5">
                        No intakes registered
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E3EAF3] dark:divide-slate-800 border-t border-[#E3EAF3] dark:border-slate-800">
                        {intakes.slice(0, 2).map((it: any) => (
                          <div
                            key={it.id}
                            className="py-1.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-semibold text-[#172B4D] dark:text-slate-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#1769E8] shrink-0" />
                              {it.term}
                            </span>
                            <span className="font-mono tabular-nums text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                              Due{' '}
                              <span className="font-semibold text-[#172B4D] dark:text-slate-200">
                                {formatIntakeDeadline(it.applicationDeadline)}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer (Preserves University Dossier & Guidelines Trigger) */}
                <div className="pt-3 border-t border-[#E3EAF3] dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUniversityId(u.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#123B78] dark:bg-slate-800 hover:bg-[#1769E8] dark:hover:bg-[#1769E8] rounded-md transition-colors group"
                  >
                    <span>University Dossier &amp; Guidelines</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#DCEBFF] group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <a
                    href={u.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Visit University Portal"
                    className="p-2 text-[#172B4D]/65 hover:text-[#1769E8] dark:text-slate-400 dark:hover:text-slate-100 hover:bg-[#F4F2EE] dark:hover:bg-slate-800 rounded-md transition-colors border border-[#E3EAF3] dark:border-slate-800"
                    aria-label={`Visit official website of ${u.nameEn}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add University Modal */}
      {showAddUniModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/45 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
              <div className="flex items-center justify-between border-b pb-3 border-[#E3EAF3] dark:border-slate-800">
                <h3 className="text-sm font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1769E8]" />
                  Add Korean Higher Education Partner Institution
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddUniModal(false)}
                  className="p-1 text-[#172B4D]/50 hover:text-[#172B4D] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddUniSubmit} className="space-y-3 text-xs text-[#172B4D] dark:text-slate-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">University Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder="e.g. Chung-Ang University"
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Korean Hangul Name</label>
                    <input
                      type="text"
                      value={nameKo}
                      onChange={(e) => setNameKo(e.target.value)}
                      placeholder="e.g. 중앙대학교"
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
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
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Ranking / Tier</label>
                    <input
                      type="text"
                      value={ranking}
                      onChange={(e) => setRanking(e.target.value)}
                      placeholder="e.g. Top 15 in Korea"
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">
                      Bank Certificate Requirement ($ USD)
                    </label>
                    <input
                      type="number"
                      value={bankBalanceUsd}
                      onChange={(e) => setBankBalanceUsd(Number(e.target.value))}
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Official Admissions URL</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E3EAF3] dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddUniModal(false)}
                    className="px-3 py-1.5 rounded hover:bg-[#F4F2EE] text-[#172B4D]/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#1769E8] text-white font-semibold hover:bg-[#123B78]"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/45 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-md rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
              <div className="flex items-center justify-between border-b pb-3 border-[#E3EAF3] dark:border-slate-800">
                <h3 className="text-sm font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1769E8]" />
                  Configure University Admission Intake &amp; Deadline
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddIntakeModal(false)}
                  className="p-1 text-[#172B4D]/50 hover:text-[#172B4D] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddIntakeSubmit} className="space-y-3 text-xs text-[#172B4D] dark:text-slate-200">
                <div>
                  <label className="block font-medium mb-1">University *</label>
                  <select
                    value={selectedUniIdForIntake}
                    onChange={(e) => setSelectedUniIdForIntake(e.target.value)}
                    className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
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
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none"
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
                      className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none font-mono"
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
                    className="w-full rounded border px-3 py-1.5 border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 focus:border-[#1769E8] focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E3EAF3] dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddIntakeModal(false)}
                    className="px-3 py-1.5 rounded hover:bg-[#F4F2EE] text-[#172B4D]/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#1769E8] text-white font-semibold hover:bg-[#123B78]"
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
