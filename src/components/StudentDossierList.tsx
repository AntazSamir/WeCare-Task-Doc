import React, { useState, useMemo } from 'react';
import { useDebounce } from '../utils/useDebounce';
import {
  Users,
  Search,
  Plus,
  Truck,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  Copy,
  Check,
  LayoutGrid,
  List,
  Building2,
  User,
  X,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { StudentApplication, UserProfile, VisaStage } from '../types/pms';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { TabTransition, FadeTransition, MotionButton } from './animations';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';

interface StudentDossierListProps {
  students: StudentApplication[];
  currentUser: UserProfile;
  selectedStage?: string;
  onStageChange?: (stage: string) => void;
  onSelectStudent: (student: StudentApplication) => void;
  onOpenNewStudentModal: () => void;
}

interface StageBadgeConfig {
  label: string;
  dotColor: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderColor: string;
}

const STAGE_CONFIG: Record<VisaStage, StageBadgeConfig> = {
  Document_Gathering: {
    label: 'Doc Prep',
    dotColor: 'bg-slate-400',
    bgLight: 'bg-[#F8FAFC]',
    bgDark: 'dark:bg-[#252528]',
    textLight: 'text-[#64748B]',
    textDark: 'dark:text-[#9A9AA2]',
    borderColor: 'border-[#E2E8F0] dark:border-[#3A3A3F]',
  },
  Apostille_Verification: {
    label: 'Apostille & Notary',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-[rgba(76,141,246,0.14)]',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-[#4C8DF6]',
    borderColor: 'border-blue-200 dark:border-[#4C8DF6]/30',
  },
  University_Submitted: {
    label: 'Univ Submitted',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-[rgba(76,141,246,0.14)]',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-[#4C8DF6]',
    borderColor: 'border-blue-200 dark:border-[#4C8DF6]/30',
  },
  Admission_Granted: {
    label: 'Admitted',
    dotColor: 'bg-[#16A34A]',
    bgLight: 'bg-[#DCFCE7]',
    bgDark: 'dark:bg-[rgba(52,194,107,0.14)]',
    textLight: 'text-[#16A34A]',
    textDark: 'dark:text-[#34C26B]',
    borderColor: 'border-emerald-200 dark:border-[#34C26B]/30',
  },
  Tuition_Paid: {
    label: 'Tuition Paid',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-[rgba(76,141,246,0.14)]',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-[#4C8DF6]',
    borderColor: 'border-blue-200 dark:border-[#4C8DF6]/30',
  },
  CoA_Received: {
    label: 'CoA Ready',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-[rgba(76,141,246,0.14)]',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-[#4C8DF6]',
    borderColor: 'border-blue-200 dark:border-[#4C8DF6]/30',
  },
  Embassy_Visa_Filing: {
    label: 'Embassy Filing',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-[rgba(76,141,246,0.14)]',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-[#4C8DF6]',
    borderColor: 'border-blue-200 dark:border-[#4C8DF6]/30',
  },
  Visa_Issued: {
    label: 'Visa Granted',
    dotColor: 'bg-[#16A34A]',
    bgLight: 'bg-[#DCFCE7]',
    bgDark: 'dark:bg-[rgba(52,194,107,0.14)]',
    textLight: 'text-[#16A34A]',
    textDark: 'dark:text-[#34C26B]',
    borderColor: 'border-emerald-300 dark:border-[#34C26B]/30',
  },
  Rejected: {
    label: 'Rejected',
    dotColor: 'bg-[#DC2626]',
    bgLight: 'bg-[#FEE2E2]',
    bgDark: 'dark:bg-[rgba(239,83,80,0.14)]',
    textLight: 'text-[#DC2626]',
    textDark: 'dark:text-[#EF5350]',
    borderColor: 'border-red-200 dark:border-[#EF5350]/30',
  },
};

type SortField = 'name' | 'university' | 'progress' | 'term' | 'stage';

export const StudentDossierList: React.FC<StudentDossierListProps> = ({
  students,
  currentUser,
  selectedStage,
  onStageChange,
  onSelectStudent,
  onOpenNewStudentModal,
}) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [internalStageFilter, setInternalStageFilter] = useState<string>('All');
  const stageFilter = selectedStage !== undefined ? selectedStage : internalStageFilter;
  const setStageFilter = (stage: string) => {
    if (onStageChange) {
      onStageChange(stage);
    } else {
      setInternalStageFilter(stage);
    }
  };
  const [degreeFilter, setDegreeFilter] = useState<string>('All');
  const [termFilter, setTermFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // Unique intake terms from dataset
  const availableTerms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.intakeTerm) set.add(s.intakeTerm);
    });
    return Array.from(set);
  }, [students]);

  // Stage breakdown counts for quick-filter tabs
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { All: students.length };
    students.forEach((s) => {
      counts[s.visaStage] = (counts[s.visaStage] || 0) + 1;
    });
    return counts;
  }, [students]);

  // Filtering and sorting
  const filteredAndSorted = useMemo(() => {
    const filtered = students.filter((s) => {
      if (stageFilter !== 'All' && s.visaStage !== stageFilter) return false;
      if (degreeFilter !== 'All' && s.degreeLevel !== degreeFilter) return false;
      if (termFilter !== 'All' && s.intakeTerm !== termFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.passportNumber.toLowerCase().includes(q) ||
          s.appliedUniversityName.toLowerCase().includes(q) ||
          s.major.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.assignedConsultantName.toLowerCase().includes(q) ||
          (s.courierTrackingNumber && s.courierTrackingNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.fullName.localeCompare(b.fullName);
      } else if (sortField === 'university') {
        cmp = a.appliedUniversityName.localeCompare(b.appliedUniversityName);
      } else if (sortField === 'term') {
        cmp = a.intakeTerm.localeCompare(b.intakeTerm);
      } else if (sortField === 'progress') {
        const aVerified = (a.documentChecklist || []).filter((d) => d.status === 'Verified').length;
        const aTotal = Math.max((a.documentChecklist || []).length, 1);
        const bVerified = (b.documentChecklist || []).filter((d) => d.status === 'Verified').length;
        const bTotal = Math.max((b.documentChecklist || []).length, 1);
        cmp = aVerified / aTotal - bVerified / bTotal;
      } else if (sortField === 'stage') {
        cmp = a.visaStage.localeCompare(b.visaStage);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [students, debouncedSearch, stageFilter, degreeFilter, termFilter, sortField, sortAsc]);

  const hasActiveFilters =
    search.trim() !== '' ||
    stageFilter !== 'All' ||
    degreeFilter !== 'All' ||
    termFilter !== 'All';

  const resetAllFilters = () => {
    setSearch('');
    setStageFilter('All');
    setDegreeFilter('All');
    setTermFilter('All');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Register Action and View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#252528] border border-blue-100 dark:border-[#2E2E32] flex items-center justify-center text-[#1E40AF] dark:text-[#ECECEE] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[24px] font-semibold text-[#0F172A] dark:text-[#ECECEE] leading-tight">
                Students
              </h1>
              <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] mt-1">
                {currentUser.role === 'Admission_Manager'
                  ? `All Active International Student Candidates (${students.length} dossiers)`
                  : `Assigned Candidate Portfolio (${students.length} dossiers assigned to you)`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <RoundedSlidingTabs
            variant="segmented"
            value={viewMode}
            stretch={0}
            blur={10}
            label="Dossier view mode"
            onValueChange={(id) => setViewMode(id as 'table' | 'cards')}
            className="h-9"
            buttonClassName="h-full px-3"
            tabs={[
              { id: 'table', label: 'Table', icon: <List className="w-3.5 h-3.5" />, title: 'Table View' },
              { id: 'cards', label: 'Cards', icon: <LayoutGrid className="w-3.5 h-3.5" />, title: 'Cards View' },
            ]}
          />

          <MotionButton
            onClick={onOpenNewStudentModal}
            className="inline-flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2 shadow-xs dark:shadow-none whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Student</span>
          </MotionButton>
        </div>
      </div>

      {/* 2. Interactive Quick-Filter Stage Ribbon */}
      <RoundedSlidingTabs
        variant="cards"
        value={stageFilter}
        stretch={0}
        blur={10}
        label="Visa stage filter"
        onValueChange={setStageFilter}
        className="gap-2 pb-1 pt-0 scrollbar-none"
        indicatorClassName="rounded-md bg-[#1E40AF] dark:bg-[rgba(76,141,246,0.14)] dark:border dark:border-[#4C8DF6]/40 shadow-xs dark:shadow-none"
        buttonClassName="px-3 h-[30px] rounded-md text-xs font-medium"
        activeButtonClassName="text-white dark:text-[#4C8DF6]"
        inactiveButtonClassName="bg-white dark:bg-[#1C1C1E] text-[#64748B] dark:text-[#9A9AA2] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#3A3A3F] dark:hover:text-[#ECECEE]"
        tabs={[
          {
            id: 'All',
            label: `All Stages (${stageCounts.All || 0})`,
          },
          ...(
            [
              'Document_Gathering',
              'Apostille_Verification',
              'University_Submitted',
              'Admission_Granted',
              'Tuition_Paid',
              'CoA_Received',
              'Embassy_Visa_Filing',
              'Visa_Issued',
            ] as VisaStage[]
          ).map((stg) => {
            const cfg = STAGE_CONFIG[stg];
            const count = stageCounts[stg] || 0;
            const isActive = stageFilter === stg;
            return {
              id: stg,
              label: cfg.label,
              icon: (
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-white dark:bg-[#4C8DF6]' : cfg.dotColor
                  }`}
                />
              ),
              trailing: (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums ${
                    isActive
                      ? 'bg-white/20 dark:bg-[rgba(76,141,246,0.2)] text-white dark:text-[#4C8DF6] font-bold'
                      : count === 0
                      ? 'bg-[#F8FAFC] dark:bg-[#252528] text-[#64748B] dark:text-[#66666E]'
                      : 'bg-[#F8FAFC] dark:bg-[#252528] text-[#64748B] dark:text-[#9A9AA2]'
                  }`}
                >
                  {count}
                </span>
              ),
            };
          }),
        ]}
      />

      {/* 3. Comprehensive Search, Filters & Sorting Toolbar */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-4 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate name, passport, university, major, or courier #..."
              className="w-full pl-9 pr-8 h-9 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:outline-none transition-colors"
            />
            {search && (
              <MotionButton
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </MotionButton>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <MorphSelect value={degreeFilter} onValueChange={(v) => setDegreeFilter(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Filter Degree" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="All">All Degrees</MorphSelectItem>
                  <MorphSelectItem value="Korean Language (D-4-1)">Korean Language (D-4-1)</MorphSelectItem>
                  <MorphSelectItem value="Bachelor (D-2-2)">Bachelor (D-2-2)</MorphSelectItem>
                  <MorphSelectItem value="Master (D-2-3)">Master (D-2-3)</MorphSelectItem>
                  <MorphSelectItem value="Doctorate (D-2-4)">Doctorate (D-2-4)</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            {availableTerms.length > 0 && (
              <div className="w-36">
                <MorphSelect value={termFilter} onValueChange={(v) => setTermFilter(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Filter Term" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="All">All Terms</MorphSelectItem>
                    {availableTerms.map((t) => (
                      <MorphSelectItem key={t} value={t}>
                        {t}
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>
            )}

            {/* Sort Dropdown */}
            <div className="inline-flex items-center gap-1 pl-1 border-l border-[#E2E8F0] dark:border-[#2E2E32]">
              <span className="text-[#64748B] dark:text-[#9A9AA2] text-[11px] font-medium hidden sm:inline">
                Sort:
              </span>
              <div className="w-40">
                <MorphSelect value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Sort by..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="name">Candidate Name</MorphSelectItem>
                    <MorphSelectItem value="university">University</MorphSelectItem>
                    <MorphSelectItem value="progress">Docs Verified</MorphSelectItem>
                    <MorphSelectItem value="stage">Visa Stage</MorphSelectItem>
                    <MorphSelectItem value="term">Intake Term</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
              </div>
              <MotionButton
                onClick={() => setSortAsc(!sortAsc)}
                title={sortAsc ? 'Ascending' : 'Descending'}
                aria-label={sortAsc ? 'Sort Ascending' : 'Sort Descending'}
                className="h-9 w-9 flex items-center justify-center text-slate-500 dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#ECECEE] rounded-lg hover:bg-slate-100 dark:hover:bg-[#252528] transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </MotionButton>
            </div>

            {hasActiveFilters && (
              <MotionButton
                onClick={resetAllFilters}
                className="h-9 px-3 text-xs text-[#DC2626] dark:text-[#EF5350] hover:bg-[#DC2626]/10 dark:hover:bg-[rgba(239,83,80,0.14)] rounded-lg font-medium transition-colors"
              >
                Reset
              </MotionButton>
            )}
          </div>
        </div>

        {/* Results Counter and Active Indicators */}
        <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#9A9AA2] pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
          <span>
            Showing <strong className="text-[#0F172A] dark:text-[#ECECEE] font-semibold">{filteredAndSorted.length}</strong> of{' '}
            {students.length} candidate dossiers
          </span>
          <FadeTransition show={Boolean(copiedText)} className="text-[#16A34A] dark:text-[#34C26B] font-medium inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Copied {copiedText} to clipboard
          </FadeTransition>
        </div>
      </div>

      {/* 4. REDESIGNED CONTENT: Table View or Cards View */}
      <TabTransition viewKey={viewMode}>
      {viewMode === 'table' ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed text-left text-xs border-collapse">
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '21%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#161616] border-b border-[#E2E8F0] dark:border-[#2E2E32] text-[11px] font-semibold text-[#0F172A] dark:text-[#9A9AA2]">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Applied University & Program</th>
                  <th className="py-3 px-4">Visa Stage & Checklist</th>
                  <th className="py-3 px-4">Consultant & Courier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-[#64748B] dark:text-[#9A9AA2] bg-white dark:bg-[#1C1C1E]"
                    >
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-slate-300 dark:text-[#66666E] mx-auto" />
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                          No candidate dossiers match the active filters
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#9A9AA2] max-w-sm mx-auto">
                          Try adjusting your keyword search, degree track, or visa stage criteria.
                        </p>
                        {hasActiveFilters && (
                          <div className="pt-2">
                            <MotionButton
                              onClick={resetAllFilters}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
                            >
                              Reset All Filters
                            </MotionButton>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((student) => {
                    const stageConfig =
                      STAGE_CONFIG[student.visaStage] || STAGE_CONFIG.Document_Gathering;
                    const verifiedCount = (student.documentChecklist || []).filter(
                      (d) => d.status === 'Verified'
                    ).length;
                    const totalDocs = Math.max((student.documentChecklist || []).length, 1);
                    const progressPercent = Math.round((verifiedCount / totalDocs) * 100);

                    return (
                      <tr
                        key={student.id}
                        onClick={() => onSelectStudent(student)}
                        className="group hover:bg-[#F8FAFC] dark:hover:bg-[#252528] cursor-pointer transition-colors"
                      >
                        {/* COLUMN 1: CANDIDATE */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 min-w-0">
                            {/* Full Name - truncated inside fixed column so it never pushes adjacent columns */}
                            <div
                              title={student.fullName}
                              className="font-semibold text-sm text-[#0F172A] dark:text-[#ECECEE] group-hover:text-[#1E40AF] dark:group-hover:text-[#4C8DF6] transition-colors truncate"
                            >
                              {student.fullName}
                            </div>

                            {/* Passport & Term */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B] dark:text-[#9A9AA2]">
                              <MotionButton
                                onClick={(e) => handleCopy(e, student.passportNumber)}
                                title="Click to copy passport number"
                                className="inline-flex items-center gap-1 text-xs tabular-nums text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] transition-colors rounded"
                              >
                                <span>{student.passportNumber}</span>
                                {copiedText === student.passportNumber ? (
                                  <Check className="w-3 h-3 text-[#16A34A] dark:text-[#34C26B]" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-[#64748B] dark:text-[#9A9AA2] group-hover:text-[#0F172A] dark:group-hover:text-[#ECECEE]" />
                                )}
                              </MotionButton>
                              <span className="text-[#64748B] dark:text-[#66666E]" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-[#64748B] dark:text-[#9A9AA2] font-medium">
                                {student.intakeTerm}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 2: APPLIED UNIVERSITY & PROGRAM */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold text-xs text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-[#1E40AF] shrink-0" />
                              <span className="truncate">{student.appliedUniversityName}</span>
                            </div>

                            <div className="text-xs text-[#64748B] dark:text-[#9A9AA2] truncate">
                              {student.department ? `${student.department} — ` : ''}
                              {student.major}
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-medium text-[#1E40AF] dark:text-[#ECECEE] bg-[#EFF6FF] dark:bg-[#252528] px-2 py-0.5 rounded border border-blue-200 dark:border-[#3A3A3F]">
                                {student.degreeLevel}
                              </span>
                              <span className="text-[#64748B] dark:text-[#9A9AA2]">
                                Visa: {student.visaType}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 3: VISA STAGE & DOCUMENT CHECKLIST */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5">
                            {/* Stage Badge with colored dot */}
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stageConfig.bgLight} ${stageConfig.bgDark} ${stageConfig.textLight} ${stageConfig.textDark} ${stageConfig.borderColor}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`}
                                />
                                {stageConfig.label}
                              </span>
                            </div>

                            {/* Document Readiness Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-medium text-[#64748B] dark:text-[#9A9AA2]">
                                <span className="flex items-center gap-1">
                                  <FileCheck2 className="w-3.5 h-3.5 text-[#64748B]" />
                                  Docs: {verifiedCount}/{student.documentChecklist?.length || 0}
                                </span>
                                <span className={`tabular-nums font-semibold ${progressPercent === 0 ? 'dark:text-[#66666E]' : ''}`}>{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-[#E2E8F0] dark:bg-[#252528] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    progressPercent === 100
                                      ? 'bg-[#16A34A] dark:bg-[#34C26B]'
                                      : 'bg-[#1E40AF] dark:bg-[#4C8DF6]'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 4: CONSULTANT & COURIER */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE]">
                              <User className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                              <span className="truncate">{student.assignedConsultantName}</span>
                            </div>

                            <div className="pt-0.5">
                              {student.courierTrackingNumber ? (
                                <MotionButton
                                  onClick={(e) => handleCopy(e, student.courierTrackingNumber!)}
                                  title="Click to copy tracking number"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs tabular-nums font-semibold bg-[#DCFCE7] dark:bg-[rgba(52,194,107,0.14)] text-[#16A34A] dark:text-[#34C26B] border border-[#16A34A]/20 dark:border-[#34C26B]/30 hover:bg-[#bbf7d0] dark:hover:bg-[rgba(52,194,107,0.22)] transition-colors"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>{student.courierTrackingNumber}</span>
                                  {copiedText === student.courierTrackingNumber ? (
                                    <Check className="w-2.5 h-2.5 text-[#16A34A] dark:text-[#34C26B]" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </MotionButton>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-[#64748B] dark:text-[#66666E]">
                                  <Clock className="w-3 h-3" />
                                  Pending Dispatch
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 5: ACTION */}
                        <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                          <MotionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#1E40AF] hover:text-white dark:hover:bg-[#4C8DF6] dark:hover:text-white rounded-lg transition-colors duration-150 shadow-xs dark:shadow-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </MotionButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 5. CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.length === 0 ? (
            <div className="col-span-full py-16 text-center text-[#64748B] dark:text-[#9A9AA2] bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
              <Users className="w-8 h-8 text-slate-300 dark:text-[#66666E] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                No candidate dossiers match the active filters
              </p>
              <MotionButton
                onClick={resetAllFilters}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
              >
                Reset All Filters
              </MotionButton>
            </div>
          ) : (
            filteredAndSorted.map((student) => {
              const stageConfig =
                STAGE_CONFIG[student.visaStage] || STAGE_CONFIG.Document_Gathering;
              const verifiedCount = (student.documentChecklist || []).filter(
                (d) => d.status === 'Verified'
              ).length;
              const totalDocs = Math.max((student.documentChecklist || []).length, 1);
              const progressPercent = Math.round((verifiedCount / totalDocs) * 100);

              return (
                <div
                  key={student.id}
                  onClick={() => onSelectStudent(student)}
                  className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-6 space-y-4 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:hover:shadow-none hover:border-[#1E40AF]/40 dark:hover:border-[#3A3A3F] transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Card Header: Name, ID & Stage */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base text-[#0F172A] dark:text-[#ECECEE] leading-tight truncate">
                          {student.fullName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#9A9AA2] mt-0.5">
                          <span>{student.intakeTerm}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${stageConfig.bgLight} ${stageConfig.bgDark} ${stageConfig.textLight} ${stageConfig.textDark} ${stageConfig.borderColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`} />
                        {stageConfig.label}
                      </span>
                    </div>

                    {/* Passport Tag */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                      <span className="text-[#64748B] dark:text-[#9A9AA2] text-xs">
                        Passport:
                      </span>
                      <MotionButton
                        onClick={(e) => handleCopy(e, student.passportNumber)}
                        title="Click to copy"
                        className="text-xs tabular-nums font-medium text-[#0F172A] dark:text-[#ECECEE] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] inline-flex items-center gap-1 rounded"
                      >
                        <span>{student.passportNumber}</span>
                        <Copy className="w-2.5 h-2.5 text-[#64748B]" />
                      </MotionButton>
                    </div>
                  </div>

                  {/* University & Degree */}
                  <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] space-y-1">
                    <div className="font-semibold text-xs text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#1E40AF]" />
                      <span className="truncate">{student.appliedUniversityName}</span>
                    </div>
                    <div className="text-xs text-[#64748B] dark:text-[#9A9AA2] truncate">
                      {student.department ? `${student.department} — ` : ''}
                      {student.major}
                    </div>
                    <div className="text-[11px] text-[#1E40AF] dark:text-[#9A9AA2] font-medium pt-0.5">
                      {student.degreeLevel} (Visa: {student.visaType})
                    </div>
                  </div>

                  {/* Checklist Meter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B] dark:text-[#9A9AA2] flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#64748B]" />
                        Document Verification
                      </span>
                      <span className={`text-xs font-semibold tabular-nums ${progressPercent === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
                        {verifiedCount}/{student.documentChecklist?.length || 0} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] dark:bg-[#252528] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progressPercent === 100
                            ? 'bg-[#16A34A] dark:bg-[#34C26B]'
                            : 'bg-[#1E40AF] dark:bg-[#4C8DF6]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: Consultant, Courier & Action */}
                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs text-[#64748B] dark:text-[#9A9AA2] truncate">
                        Consultant: <strong className="text-[#0F172A] dark:text-[#ECECEE]">{student.assignedConsultantName}</strong>
                      </div>
                      {student.courierTrackingNumber ? (
                        <div className="text-xs text-[#16A34A] dark:text-[#34C26B] tabular-nums font-medium truncate flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{student.courierTrackingNumber}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-[#64748B] dark:text-[#66666E]">
                          Pending Dispatch
                        </div>
                      )}
                    </div>

                    <MotionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(student);
                      }}
                      className="inline-flex items-center gap-1 px-3 h-8 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors shadow-xs dark:shadow-none shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
                    >
                      <span>Dossier</span>
                      <ChevronRight className="w-3 h-3" />
                    </MotionButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      </TabTransition>
    </div>
  );
};
