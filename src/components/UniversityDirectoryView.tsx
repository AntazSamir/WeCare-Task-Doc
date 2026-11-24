import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from '../utils/useDebounce';
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
import { createIntake } from '../services/pmsService';
import { UniversityDetailsView } from './UniversityDetailsView';
import { AddUniversityModal } from './AddUniversityModal';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { PageTransition, TabTransition, ToastTransition, ModalTransition, MotionButton } from './animations';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';
import { AnimatePresence } from 'motion/react';

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
  selectedUniversityId?: string | null;
  onSelectUniversity?: (id: string | null) => void;
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
  selectedUniversityId: controlledUniversityId,
  onSelectUniversity,
  onApplyStudentForProgram,
}) => {
  const [internalUniversityId, setInternalUniversityId] = useState<string | null>(null);
  const selectedUniversityId =
    controlledUniversityId !== undefined ? controlledUniversityId : internalUniversityId;
  const setSelectedUniversityId = (id: string | null) => {
    if (controlledUniversityId === undefined) {
      setInternalUniversityId(id);
    }
    onSelectUniversity?.(id);
  };
  const [showAddUniModal, setShowAddUniModal] = useState(false);
  const [showAddIntakeModal, setShowAddIntakeModal] = useState(false);
  const [selectedUniIdForIntake, setSelectedUniIdForIntake] = useState(universities[0]?.id || '');

  // Search, Filter & Layout Mode
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [cityFilter, setCityFilter] = useState('All');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // AddUniversityModal success toast state
  const [addUniSuccessMsg, setAddUniSuccessMsg] = useState<string | null>(null);

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
    const q = debouncedSearchQuery.trim().toLowerCase();
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
  }, [universities, debouncedSearchQuery, cityFilter]);

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

  if (selectedUniversityId) {
    return (
      <PageTransition viewKey={`uni-${selectedUniversityId}`}>
        <UniversityDetailsView
          universityId={selectedUniversityId}
          currentUser={currentUser}
          onBack={() => setSelectedUniversityId(null)}
          onRefreshParent={onRefresh}
          onApplyStudentForProgram={onApplyStudentForProgram}
        />
      </PageTransition>
    );
  }

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
    <PageTransition viewKey="uni-directory-list" className="space-y-6">
      {/* Header & Operational Summary */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-center text-[#1E40AF] dark:text-[#ECECEE] shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[24px] font-semibold text-[#0F172A] dark:text-[#ECECEE] leading-tight">
                South Korean Partner Universities
              </h1>
              <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] mt-1">
                {summaryMetrics.totalUniversities} partner institutions · {summaryMetrics.openIntakes} open admission intakes · Select any institution for full guidelines, tuition, refund rules &amp; wire details
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <MotionButton
                type="button"
                onClick={() => {
                  if (!selectedUniIdForIntake && universities[0]?.id) {
                    setSelectedUniIdForIntake(universities[0].id);
                  }
                  setShowAddIntakeModal(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-[#0F172A] dark:text-[#ECECEE] bg-white dark:bg-[#252528] hover:bg-slate-50 dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
              >
                <Calendar className="w-4 h-4 text-[#1E40AF]" />
                Add Intake Term
              </MotionButton>
              <MotionButton
                type="button"
                onClick={() => setShowAddUniModal(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors duration-150 shadow-xs dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
              >
                <Plus className="w-4 h-4" />
                Add University
              </MotionButton>
            </div>
          )}
        </div>

        {/* Clean Toolbar: Search, Region Filter & View Switcher */}
        <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search university, Hangul name, city, TOPIK, or IELTS..."
                className="w-full pl-8 pr-8 h-9 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <MotionButton
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear university search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </MotionButton>
              )}
            </div>

            <div className="w-48">
              <MorphSelect value={cityFilter} onValueChange={(v) => setCityFilter(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="All Cities" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="All">All Cities ({universities.length})</MorphSelectItem>
                  {cities.map((c) => (
                    <MorphSelectItem key={c} value={c}>
                      {c}
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            {(searchQuery || cityFilter !== 'All') && (
              <MotionButton
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCityFilter('All');
                }}
                className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:text-[#1E3A8A] dark:hover:text-[#6BA1F8] px-2 h-9 inline-flex items-center"
              >
                Reset
              </MotionButton>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] dark:text-[#9A9AA2] tabular-nums hidden sm:inline">
              Showing {filteredUniversities.length} of {universities.length}
            </span>

            <RoundedSlidingTabs
              variant="segmented"
              value={viewLayout}
              stretch={0}
              blur={10}
              label="University directory layout"
              onValueChange={(id) => setViewLayout(id as 'grid' | 'table')}
              className="dark:bg-[#252528]"
              buttonClassName="h-[30px] px-3"
              tabs={[
                { id: 'grid', label: 'Cards', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                { id: 'table', label: 'Table', icon: <Table2 className="w-3.5 h-3.5" /> },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredUniversities.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-10 text-center space-y-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
          <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
            No matching Korean universities
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#9A9AA2]">
            Adjust your search term or city filter to view partner institutions.
          </p>
        </div>
      ) : (
        <TabTransition viewKey={viewLayout}>
          {viewLayout === 'table' ? (
        /* Comparison Table View */
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] overflow-x-auto shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
          <table className="w-full min-w-[1040px] table-fixed text-left text-xs">
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-[#0F172A] dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
              <tr>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Location &amp; Tier</th>
                <th className="px-4 py-3">Language Requirements</th>
                <th className="px-4 py-3">Bank Solvency</th>
                <th className="px-4 py-3">Configured Intakes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
              {filteredUniversities.map((u) => {
                const intakes = (u as any).intakes || [];
                const programs = (u as any).programs || [];
                const acronym = getUniversityAcronym(u.nameEn);

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528] transition-colors"
                  >
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#3A3A3F] flex items-center justify-center text-[11px] font-bold tabular-nums text-[#1E40AF] dark:text-[#ECECEE] shrink-0">
                          {acronym}
                        </div>
                        <div className="min-w-0 flex-1">
                          <MotionButton
                            type="button"
                            onClick={() => setSelectedUniversityId(u.id)}
                            title={u.nameEn}
                            className="font-bold text-[#0F172A] dark:text-[#ECECEE] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] text-left truncate block max-w-full"
                          >
                            {u.nameEn}
                          </MotionButton>
                          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 truncate">
                            {u.nameKo} ·{' '}
                            <span className="tabular-nums">
                              {programs.length > 0 ? `${programs.length} tracks` : '5 tracks'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1E40AF] shrink-0" />
                        <span>{u.city}</span>
                      </div>
                      {u.ranking && (
                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 tabular-nums">
                          {u.ranking.replace(/World|Rank/gi, '').trim()}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top max-w-xs space-y-0.5">
                      <div className="text-[#0F172A] dark:text-[#ECECEE]">
                        <span className="text-[#64748B] dark:text-[#9A9AA2] font-semibold">TOPIK:</span>{' '}
                        {u.topikRequirement || 'TOPIK Level 3+'}
                      </div>
                      <div className="text-[#0F172A] dark:text-[#ECECEE]">
                        <span className="text-[#64748B] dark:text-[#9A9AA2] font-semibold">English:</span>{' '}
                        {u.ieltsRequirement || 'IELTS 6.0+'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top font-bold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                      ${u.bankBalanceUsd?.toLocaleString()} USD
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      {intakes.length === 0 ? (
                        <span className="text-[#64748B] dark:text-[#66666E] italic">No intakes registered</span>
                      ) : (
                        <div className="space-y-1">
                          {intakes.slice(0, 2).map((it: any) => (
                            <div key={it.id} className="text-[11px] tabular-nums">
                              <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                                {it.term}
                              </span>{' '}
                              <span className="text-[#64748B] dark:text-[#66666E]">·</span>{' '}
                              <span className="text-[#64748B] dark:text-[#9A9AA2]">
                                Due {formatIntakeDeadline(it.applicationDeadline)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <MotionButton
                          type="button"
                          onClick={() => setSelectedUniversityId(u.id)}
                          className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
                        >
                          <span>University Dossier &amp; Guidelines</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </MotionButton>
                        <a
                          href={u.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Visit University Portal"
                          className="p-1.5 text-[#64748B] hover:text-[#1E40AF] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-lg hover:bg-slate-50 dark:hover:bg-[#252528] transition-colors"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((u) => {
            const intakes = (u as any).intakes || [];
            const programs = (u as any).programs || [];
            const acronym = getUniversityAcronym(u.nameEn);
            const isVerified = u.verificationStatus === 'Verified';

            return (
              <article
                key={u.id}
                className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF]/40 dark:hover:border-[#3A3A3F] rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none flex flex-col justify-between gap-6 transition-all"
              >
                <div className="space-y-4">
                  {/* Top Identity Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#252528] text-[#1E40AF] dark:text-[#ECECEE] flex flex-col items-center justify-center shrink-0 border border-[#E2E8F0] dark:border-[#3A3A3F]">
                        <span className="text-[12px] font-bold leading-none tabular-nums">
                          {acronym}
                        </span>
                        <span className="text-[8px] uppercase mt-0.5 tracking-wider font-semibold">
                          KR
                        </span>
                      </div>

                      <div className="min-w-0">
                        <MotionButton
                          type="button"
                          onClick={() => setSelectedUniversityId(u.id)}
                          className="text-left text-[16px] font-semibold text-[#0F172A] dark:text-[#ECECEE] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] leading-snug block"
                        >
                          {u.nameEn}
                        </MotionButton>
                        <div className="mt-0.5 text-xs text-[#64748B] dark:text-[#9A9AA2] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span>{u.nameKo}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-[#1E40AF] shrink-0" />
                            {u.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isVerified && (
                      <span
                        title="Verified university criteria"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A] dark:text-[#34C26B] shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Ranking & Solvency Hairline Strip */}
                  <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-[#E2E8F0] dark:border-[#2E2E32] text-xs">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#9A9AA2]">
                        Bank Solvency
                      </div>
                      <div className="mt-0.5 font-bold tabular-nums text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-[#1E40AF] shrink-0" />
                        <span>${u.bankBalanceUsd?.toLocaleString()} USD</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#9A9AA2]">
                        Tracks &amp; Tier
                      </div>
                      <div className="mt-0.5 font-medium text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-[#1E40AF] shrink-0" />
                        <span className="truncate tabular-nums">
                          {programs.length > 0 ? `${programs.length} Tracks` : '5 Tracks'}
                          {u.ranking ? ` · ${u.ranking.replace(/World|Rank/gi, '').trim()}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Language & Admission Requirements (Unboxed Key-Value Lines) */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#9A9AA2] w-16 shrink-0 flex items-center gap-1 pt-0.5">
                        <BookOpen className="w-3 h-3 text-[#1E40AF] shrink-0" />
                        TOPIK
                      </span>
                      <span className="text-[#0F172A] dark:text-[#ECECEE] leading-snug flex-1">
                        {u.topikRequirement || 'TOPIK Level 3 minimum'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#9A9AA2] w-16 shrink-0 flex items-center gap-1 pt-0.5">
                        <GraduationCap className="w-3 h-3 text-[#1E40AF] shrink-0" />
                        English
                      </span>
                      <span className="text-[#0F172A] dark:text-[#ECECEE] leading-snug flex-1">
                        {u.ieltsRequirement || 'IELTS 6.0 minimum'}
                      </span>
                    </div>
                  </div>

                  {/* Intakes & Application Deadlines */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#9A9AA2] text-[10px]">
                        Configured Intakes
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#16A34A] dark:text-[#34C26B] text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#34C26B] shrink-0" />
                        Open
                      </span>
                    </div>

                    {intakes.length === 0 ? (
                      <div className="text-xs text-[#64748B] dark:text-[#66666E] italic py-0.5">
                        No intakes registered
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                        {intakes.slice(0, 2).map((it: any) => (
                          <div
                            key={it.id}
                            className="py-1.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#1E40AF] shrink-0" />
                              {it.term}
                            </span>
                            <span className="tabular-nums text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                              Due{' '}
                              <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
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
                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center gap-2">
                  <MotionButton
                    type="button"
                    onClick={() => setSelectedUniversityId(u.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2 group"
                  >
                    <span>University Dossier &amp; Guidelines</span>
                    <ChevronRight className="w-4 h-4 text-white/80 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                  </MotionButton>

                  <a
                    href={u.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Visit University Portal"
                    className="h-9 w-9 flex items-center justify-center text-[#64748B] hover:text-[#1E40AF] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] hover:bg-slate-50 dark:hover:bg-[#252528] rounded-lg transition-colors border border-[#E2E8F0] dark:border-[#2E2E32]"
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
      </TabTransition>
      )}

      {/* Add University Modal — replaced with AddUniversityModal component */}
      {showAddUniModal && (
        <AddUniversityModal
          onClose={() => setShowAddUniModal(false)}
          onSuccess={(msg) => {
            setShowAddUniModal(false);
            onRefresh();
            setAddUniSuccessMsg(msg);
            setTimeout(() => setAddUniSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* Success toast for Add University */}
      {createPortal(
        <AnimatePresence>
          {addUniSuccessMsg && (
            <ToastTransition className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 dark:bg-[#1C1C1E] dark:border dark:border-[#34C26B] text-white dark:text-[#34C26B] text-xs font-semibold shadow-xl dark:shadow-none">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {addUniSuccessMsg}
            </ToastTransition>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add Intake anchor placeholder */}
      {false && null /* dead anchor */}

      {/* Add Intake Term Modal */}
      <ModalTransition
        isOpen={showAddIntakeModal}
        onClose={() => setShowAddIntakeModal(false)}
        backdropClassName="fixed inset-0 z-50 bg-[#0F172A]/40 dark:bg-black/75 backdrop-blur-xs"
        cardClassName="w-full max-w-md rounded-[12px] bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-2xl dark:shadow-none p-6 space-y-4"
      >
              <div className="flex items-center justify-between border-b pb-3 border-[#E2E8F0] dark:border-[#2E2E32]">
                <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1E40AF]" />
                  Configure University Admission Intake &amp; Deadline
                </h3>
                <MotionButton
                  type="button"
                  onClick={() => setShowAddIntakeModal(false)}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </MotionButton>
              </div>

              <form onSubmit={handleAddIntakeSubmit} className="space-y-3 text-xs text-[#0F172A] dark:text-[#ECECEE]">
                <div>
                  <label className="block font-medium mb-1">University *</label>
                  <MorphSelect value={selectedUniIdForIntake} onValueChange={(v) => setSelectedUniIdForIntake(v)}>
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select university..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      {universities.map((u) => (
                        <MorphSelectItem key={u.id} value={u.id}>
                          {u.nameEn}
                        </MorphSelectItem>
                      ))}
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Intake Term *</label>
                    <MorphSelect value={intakeTerm} onValueChange={(v) => setIntakeTerm(v)}>
                      <MorphSelectTrigger>
                        <MorphSelectValue placeholder="Select term..." />
                      </MorphSelectTrigger>
                      <MorphSelectContent>
                        <MorphSelectItem value="Spring 2027">Spring 2027</MorphSelectItem>
                        <MorphSelectItem value="Fall 2027">Fall 2027</MorphSelectItem>
                        <MorphSelectItem value="Winter 2026/27">Winter 2026/27</MorphSelectItem>
                      </MorphSelectContent>
                    </MorphSelect>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Target Quota</label>
                    <input
                      type="number"
                      value={quota}
                      onChange={(e) => setQuota(Number(e.target.value))}
                      className="w-full rounded-lg border px-3 py-1.5 border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Application Start Date</label>
                    <input
                      type="date"
                      value={appStart}
                      onChange={(e) => setAppStart(e.target.value)}
                      className="w-full rounded-lg border px-3 py-1.5 border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Application Portal Deadline *</label>
                    <input
                      type="date"
                      required
                      value={appDeadline}
                      onChange={(e) => setAppDeadline(e.target.value)}
                      className="w-full rounded-lg border px-3 py-1.5 border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                  <MotionButton
                    type="button"
                    onClick={() => setShowAddIntakeModal(false)}
                    className="h-9 px-4 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] border border-[#E2E8F0] dark:border-[#3A3A3F] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
                  >
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="submit"
                    className="h-9 px-4 text-sm font-medium rounded-lg bg-[#1E40AF] text-white hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
                  >
                    Save Intake
                  </MotionButton>
                </div>
              </form>
      </ModalTransition>
    </PageTransition>
  );
};
