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
    bgDark: 'dark:bg-slate-800/80',
    textLight: 'text-[#64748B]',
    textDark: 'dark:text-slate-300',
    borderColor: 'border-[#E2E8F0] dark:border-slate-700',
  },
  Apostille_Verification: {
    label: 'Apostille & Notary',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-blue-950/60',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  University_Submitted: {
    label: 'Univ Submitted',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-blue-950/50',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  Admission_Granted: {
    label: 'Admitted',
    dotColor: 'bg-[#16A34A]',
    bgLight: 'bg-[#DCFCE7]',
    bgDark: 'dark:bg-emerald-950/50',
    textLight: 'text-[#16A34A]',
    textDark: 'dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  Tuition_Paid: {
    label: 'Tuition Paid',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-blue-950/50',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  CoA_Received: {
    label: 'CoA Ready',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-blue-950/70',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-blue-700',
  },
  Embassy_Visa_Filing: {
    label: 'Embassy Filing',
    dotColor: 'bg-[#1E40AF]',
    bgLight: 'bg-[#EFF6FF]',
    bgDark: 'dark:bg-blue-900/50',
    textLight: 'text-[#1E40AF]',
    textDark: 'dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-blue-700',
  },
  Visa_Issued: {
    label: 'Visa Granted',
    dotColor: 'bg-[#16A34A]',
    bgLight: 'bg-[#DCFCE7]',
    bgDark: 'dark:bg-emerald-950/70',
    textLight: 'text-[#16A34A]',
    textDark: 'dark:text-emerald-200',
    borderColor: 'border-emerald-300 dark:border-emerald-600',
  },
  Rejected: {
    label: 'Rejected',
    dotColor: 'bg-[#DC2626]',
    bgLight: 'bg-[#FEE2E2]',
    bgDark: 'dark:bg-red-950/50',
    textLight: 'text-[#DC2626]',
    textDark: 'dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800',
  },
};

type SortField = 'name' | 'university' | 'progress' | 'term' | 'stage';

export const StudentDossierList: React.FC<StudentDossierListProps> = ({
  students,
  currentUser,
  onSelectStudent,
  onOpenNewStudentModal,
}) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [stageFilter, setStageFilter] = useState<string>('All');
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 border border-blue-100 flex items-center justify-center text-[#1E40AF] dark:text-blue-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[24px] font-semibold text-[#0F172A] dark:text-slate-100 leading-tight">
                Student Application Dossiers
              </h1>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
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
            className="inline-flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2 shadow-xs whitespace-nowrap"
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
        className="gap-2 pb-1 pt-0 scrollbar-thin"
        indicatorClassName="rounded-md bg-[#1E40AF] dark:bg-blue-600 shadow-xs"
        buttonClassName="px-3 h-[30px] rounded-md text-xs font-medium"
        activeButtonClassName="text-white"
        inactiveButtonClassName="bg-white dark:bg-slate-900 text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]"
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
              'CoA_Received',
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
                    isActive ? 'bg-white' : cfg.dotColor
                  }`}
                />
              ),
              trailing: (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] dark:text-slate-400'
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
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-4 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate name, passport, university, major, or courier #..."
              className="w-full pl-9 pr-8 h-9 text-xs rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1E40AF] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
            />
            {search && (
              <MotionButton
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
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
            <div className="inline-flex items-center gap-1 pl-1 border-l border-[#E2E8F0] dark:border-slate-800">
              <span className="text-[#64748B] dark:text-slate-400 text-[11px] font-medium hidden sm:inline">
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
                className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-[#1E40AF] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </MotionButton>
            </div>

            {hasActiveFilters && (
              <MotionButton
                onClick={resetAllFilters}
                className="h-9 px-3 text-xs text-[#DC2626] dark:text-red-400 hover:bg-[#DC2626]/10 rounded-lg font-medium transition-colors"
              >
                Reset
              </MotionButton>
            )}
          </div>
        </div>

        {/* Results Counter and Active Indicators */}
        <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 pt-2 border-t border-[#E2E8F0] dark:border-slate-800/70">
          <span>
            Showing <strong className="text-[#0F172A] dark:text-slate-100 font-semibold">{filteredAndSorted.length}</strong> of{' '}
            {students.length} candidate dossiers
          </span>
          <FadeTransition show={Boolean(copiedText)} className="text-[#16A34A] dark:text-emerald-400 font-medium inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Copied {copiedText} to clipboard
          </FadeTransition>
        </div>
      </div>

      {/* 4. REDESIGNED CONTENT: Table View or Cards View */}
      <TabTransition viewKey={viewMode}>
      {viewMode === 'table' ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E2E8F0] dark:border-slate-700/80 text-[11px] font-semibold text-[#0F172A] dark:text-slate-300">
                  <th className="py-3 px-4 min-w-[250px]">Candidate</th>
                  <th className="py-3 px-4 min-w-[260px]">Applied University & Program</th>
                  <th className="py-3 px-4 min-w-[210px]">Visa Stage & Checklist</th>
                  <th className="py-3 px-4 min-w-[190px]">Consultant & Courier</th>
                  <th className="py-3 px-4 text-right min-w-[110px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-[#64748B] dark:text-slate-400 bg-white dark:bg-slate-900"
                    >
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                          No candidate dossiers match the active filters
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Try adjusting your keyword search, degree track, or visa stage criteria.
                        </p>
                        {hasActiveFilters && (
                          <div className="pt-2">
                            <MotionButton
                              onClick={resetAllFilters}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
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
                        className="group hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* COLUMN 1: CANDIDATE */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 min-w-0">
                            {/* Full Name - whitespace-nowrap prevents broken hyphens */}
                            <div className="font-semibold text-sm text-[#0F172A] dark:text-slate-100 group-hover:text-[#1E40AF] dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
                              {student.fullName}
                            </div>

                            {/* Passport & Term */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B]">
                              <MotionButton
                                onClick={(e) => handleCopy(e, student.passportNumber)}
                                title="Click to copy passport number"
                                className="inline-flex items-center gap-1 text-xs tabular-nums text-[#64748B] dark:text-slate-300 hover:text-[#1E40AF] dark:hover:text-blue-400 transition-colors rounded"
                              >
                                <span>{student.passportNumber}</span>
                                {copiedText === student.passportNumber ? (
                                  <Check className="w-3 h-3 text-[#16A34A]" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-[#64748B] group-hover:text-[#0F172A]" />
                                )}
                              </MotionButton>
                              <span className="text-[#64748B]" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-[#64748B] dark:text-slate-400 font-medium">
                                {student.intakeTerm}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 2: APPLIED UNIVERSITY & PROGRAM */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="font-semibold text-xs text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
                              <span className="truncate">{student.appliedUniversityName}</span>
                            </div>

                            <div className="text-xs text-[#64748B] dark:text-slate-400 truncate max-w-[260px]">
                              {student.department ? `${student.department} — ` : ''}
                              {student.major}
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-medium text-[#1E40AF] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                {student.degreeLevel}
                              </span>
                              <span className="text-[#64748B]">
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
                              <div className="flex items-center justify-between text-xs font-medium text-[#64748B] dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <FileCheck2 className="w-3.5 h-3.5 text-[#64748B]" />
                                  Docs: {verifiedCount}/{student.documentChecklist?.length || 0}
                                </span>
                                <span className="tabular-nums font-semibold">{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-[#E2E8F0] dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    progressPercent === 100
                                      ? 'bg-[#16A34A]'
                                      : 'bg-[#1E40AF]'
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
                            <div className="flex items-center gap-1 text-xs font-medium text-[#0F172A] dark:text-slate-200">
                              <User className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                              <span className="truncate">{student.assignedConsultantName}</span>
                            </div>

                            <div className="pt-0.5">
                              {student.courierTrackingNumber ? (
                                <MotionButton
                                  onClick={(e) => handleCopy(e, student.courierTrackingNumber!)}
                                  title="Click to copy tracking number"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs tabular-nums font-semibold bg-[#DCFCE7] text-[#16A34A] dark:text-emerald-400 border border-[#16A34A]/20 hover:bg-[#bbf7d0] transition-colors"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>{student.courierTrackingNumber}</span>
                                  {copiedText === student.courierTrackingNumber ? (
                                    <Check className="w-2.5 h-2.5 text-[#16A34A]" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </MotionButton>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-[#64748B] dark:text-slate-400">
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-blue-400 bg-[#EFF6FF] dark:bg-blue-950/40 hover:bg-[#1E40AF] hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-colors duration-150 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
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
            <div className="col-span-full py-16 text-center text-[#64748B] dark:text-slate-400 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                No candidate dossiers match the active filters
              </p>
              <MotionButton
                onClick={resetAllFilters}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
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
                  className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 space-y-4 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#1E40AF]/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Card Header: Name, ID & Stage */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base text-[#0F172A] dark:text-slate-100 leading-tight">
                          {student.fullName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                          <span>{student.intakeTerm}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stageConfig.bgLight} ${stageConfig.bgDark} ${stageConfig.textLight} ${stageConfig.textDark} ${stageConfig.borderColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`} />
                        {stageConfig.label}
                      </span>
                    </div>

                    {/* Passport Tag */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E2E8F0] dark:border-slate-800/60">
                      <span className="text-[#64748B] dark:text-slate-400 text-xs">
                        Passport:
                      </span>
                      <MotionButton
                        onClick={(e) => handleCopy(e, student.passportNumber)}
                        title="Click to copy"
                        className="text-xs tabular-nums font-medium text-[#0F172A] dark:text-slate-200 hover:text-[#1E40AF] inline-flex items-center gap-1 rounded"
                      >
                        <span>{student.passportNumber}</span>
                        <Copy className="w-2.5 h-2.5 text-[#64748B]" />
                      </MotionButton>
                    </div>
                  </div>

                  {/* University & Degree */}
                  <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700/60 space-y-1">
                    <div className="font-semibold text-xs text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                      <span className="truncate">{student.appliedUniversityName}</span>
                    </div>
                    <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                      {student.department ? `${student.department} — ` : ''}
                      {student.major}
                    </div>
                    <div className="text-[11px] text-[#1E40AF] dark:text-blue-300 font-medium pt-0.5">
                      {student.degreeLevel} (Visa: {student.visaType})
                    </div>
                  </div>

                  {/* Checklist Meter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#64748B]" />
                        Document Verification
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-[#0F172A] dark:text-slate-200">
                        {verifiedCount}/{student.documentChecklist?.length || 0} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progressPercent === 100
                            ? 'bg-[#16A34A]'
                            : 'bg-[#1E40AF]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: Consultant, Courier & Action */}
                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                        Consultant: <strong className="text-[#0F172A] dark:text-slate-200">{student.assignedConsultantName}</strong>
                      </div>
                      {student.courierTrackingNumber ? (
                        <div className="text-xs text-[#16A34A] dark:text-emerald-400 tabular-nums font-medium truncate flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{student.courierTrackingNumber}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-[#64748B]">
                          Pending Dispatch
                        </div>
                      )}
                    </div>

                    <MotionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(student);
                      }}
                      className="inline-flex items-center gap-1 px-3 h-8 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors shadow-xs shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
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
