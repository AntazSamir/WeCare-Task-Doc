import React, { useState, useMemo } from 'react';
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
    bgLight: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800/80',
    textLight: 'text-slate-700',
    textDark: 'dark:text-slate-300',
    borderColor: 'border-slate-300 dark:border-slate-700',
  },
  Apostille_Verification: {
    label: 'Apostille & Notary',
    dotColor: 'bg-[#1769E8]',
    bgLight: 'bg-[#DCEBFF]',
    bgDark: 'dark:bg-blue-950/60',
    textLight: 'text-[#123B78]',
    textDark: 'dark:text-[#60B8F5]',
    borderColor: 'border-[#36A5F5]/30 dark:border-blue-800',
  },
  University_Submitted: {
    label: 'Univ Submitted',
    dotColor: 'bg-[#36A5F5]',
    bgLight: 'bg-sky-50',
    bgDark: 'dark:bg-sky-950/50',
    textLight: 'text-sky-800',
    textDark: 'dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800',
  },
  Admission_Granted: {
    label: 'Admitted',
    dotColor: 'bg-[#16A36A]',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/50',
    textLight: 'text-emerald-800',
    textDark: 'dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  Tuition_Paid: {
    label: 'Tuition Paid',
    dotColor: 'bg-[#E9A23B]',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/50',
    textLight: 'text-amber-800',
    textDark: 'dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  CoA_Received: {
    label: 'CoA Ready',
    dotColor: 'bg-[#E9A23B]',
    bgLight: 'bg-amber-100/70',
    bgDark: 'dark:bg-amber-950/70',
    textLight: 'text-amber-900',
    textDark: 'dark:text-amber-200',
    borderColor: 'border-amber-300 dark:border-amber-700',
  },
  Embassy_Visa_Filing: {
    label: 'Embassy Filing',
    dotColor: 'bg-[#123B78] dark:bg-blue-400',
    bgLight: 'bg-[#123B78]/10',
    bgDark: 'dark:bg-blue-900/50',
    textLight: 'text-[#123B78]',
    textDark: 'dark:text-blue-200',
    borderColor: 'border-[#123B78]/20 dark:border-blue-700',
  },
  Visa_Issued: {
    label: 'Visa Granted',
    dotColor: 'bg-[#16A36A]',
    bgLight: 'bg-emerald-100',
    bgDark: 'dark:bg-emerald-950/70',
    textLight: 'text-emerald-900',
    textDark: 'dark:text-emerald-200',
    borderColor: 'border-emerald-300 dark:border-emerald-600',
  },
  Rejected: {
    label: 'Rejected',
    dotColor: 'bg-[#DC4545]',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-950/50',
    textLight: 'text-red-800',
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
      if (search.trim()) {
        const q = search.toLowerCase();
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
  }, [students, search, stageFilter, degreeFilter, termFilter, sortField, sortAsc]);

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
    <div className="space-y-4">
      {/* 1. Header Bar with Register Action and View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#1769E8]/10 dark:bg-blue-950/60 border border-[#1769E8]/20 flex items-center justify-center text-[#1769E8] dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D] dark:text-slate-100 leading-tight">
                Student Application Dossiers
              </h2>
              <p className="text-xs text-[#172B4D]/65 dark:text-slate-400 mt-0.5">
                {currentUser.role === 'Admission_Manager'
                  ? `All Active International Student Candidates (${students.length} dossiers)`
                  : `Assigned Candidate Portfolio (${students.length} dossiers assigned to you)`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-[#F4F2EE] dark:bg-slate-800/80 border border-[#E3EAF3] dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-[#1769E8] dark:text-blue-400 shadow-xs'
                  : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-[#1769E8] dark:text-blue-400 shadow-xs'
                  : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#172B4D] dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenNewStudentModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Student</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Quick-Filter Stage Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
        <button
          type="button"
          onClick={() => setStageFilter('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
            stageFilter === 'All'
              ? 'bg-[#123B78] dark:bg-blue-600 text-white border-[#123B78] dark:border-blue-600 shadow-xs'
              : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D]/75 dark:text-slate-300 border-[#E3EAF3] dark:border-slate-800 hover:border-[#1769E8]/40'
          }`}
        >
          All Stages ({stageCounts.All || 0})
        </button>

        {(
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

          return (
            <button
              key={stg}
              type="button"
              onClick={() => setStageFilter(isActive ? 'All' : stg)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#1769E8] text-white border-[#1769E8] shadow-xs'
                  : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D]/80 dark:text-slate-300 border-[#E3EAF3] dark:border-slate-800 hover:border-[#1769E8]/50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-white' : cfg.dotColor
                }`}
              />
              <span>{cfg.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white font-bold'
                    : 'bg-[#F4F2EE] dark:bg-slate-800 text-[#172B4D]/70 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Comprehensive Search, Filters & Sorting Toolbar */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-3 text-xs shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate name, passport, university, major, or courier #..."
              className="w-full pl-9 pr-8 h-[28px] text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#1769E8] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
            <div className="inline-flex items-center gap-1 pl-1 border-l border-[#E3EAF3] dark:border-slate-800">
              <span className="text-[#172B4D]/60 dark:text-slate-400 text-[11px] font-medium hidden sm:inline">
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
              <button
                type="button"
                onClick={() => setSortAsc(!sortAsc)}
                title={sortAsc ? 'Ascending' : 'Descending'}
                className="p-1.5 text-slate-500 hover:text-[#1769E8] rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1.5 text-xs text-[#DC4545] dark:text-red-400 hover:bg-[#DC4545]/10 rounded font-medium transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Counter and Active Indicators */}
        <div className="flex items-center justify-between text-[11px] text-[#172B4D]/65 dark:text-slate-400 pt-1 border-t border-[#E3EAF3]/70 dark:border-slate-800/70">
          <span>
            Showing <strong className="text-[#172B4D] dark:text-slate-100 font-semibold">{filteredAndSorted.length}</strong> of{' '}
            {students.length} candidate dossiers
          </span>
          {copiedText && (
            <span className="text-[#16A36A] dark:text-emerald-400 font-medium inline-flex items-center gap-1 animate-fade-in">
              <Check className="w-3 h-3" /> Copied {copiedText} to clipboard
            </span>
          )}
        </div>
      </div>

      {/* 4. REDESIGNED CONTENT: Table View or Cards View */}
      <div key={viewMode} className="animate-tab-enter">
      {viewMode === 'table' ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4F2EE] dark:bg-slate-800/70 border-b border-[#E3EAF3] dark:border-slate-700/80 text-[11px] font-semibold text-[#172B4D]/75 dark:text-slate-300">
                  <th className="py-3 px-4 min-w-[250px]">Candidate</th>
                  <th className="py-3 px-4 min-w-[260px]">Applied University & Program</th>
                  <th className="py-3 px-4 min-w-[210px]">Visa Stage & Checklist</th>
                  <th className="py-3 px-4 min-w-[190px]">Consultant & Courier</th>
                  <th className="py-3 px-4 text-right min-w-[110px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAF3] dark:divide-slate-800/80">
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-[#172B4D]/60 dark:text-slate-400 bg-white dark:bg-slate-900"
                    >
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold text-[#172B4D] dark:text-slate-200">
                          No candidate dossiers match the active filters
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Try adjusting your keyword search, degree track, or visa stage criteria.
                        </p>
                        {hasActiveFilters && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={resetAllFilters}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded transition-colors"
                            >
                              Reset All Filters
                            </button>
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
                        className="group hover:bg-[#F4F2EE]/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* COLUMN 1: CANDIDATE */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 min-w-0">
                            {/* Full Name - whitespace-nowrap prevents broken hyphens */}
                            <div className="font-bold text-sm text-[#172B4D] dark:text-slate-100 group-hover:text-[#1769E8] dark:group-hover:text-[#60B8F5] transition-colors whitespace-nowrap">
                              {student.fullName}
                            </div>

                            {/* Passport & Term */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, student.passportNumber)}
                                title="Click to copy passport number"
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-[#172B4D]/75 dark:text-slate-300 hover:text-[#1769E8] dark:hover:text-blue-400 transition-colors"
                              >
                                <span>{student.passportNumber}</span>
                                {copiedText === student.passportNumber ? (
                                  <Check className="w-3 h-3 text-[#16A36A]" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                                )}
                              </button>
                              <span className="text-slate-400" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-[#172B4D]/60 dark:text-slate-400 font-medium">
                                {student.intakeTerm}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 2: APPLIED UNIVERSITY & PROGRAM */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="font-semibold text-xs text-[#172B4D] dark:text-slate-200 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#1769E8] dark:text-[#36A5F5] shrink-0" />
                              <span className="truncate">{student.appliedUniversityName}</span>
                            </div>

                            <div className="text-[11px] text-[#172B4D]/70 dark:text-slate-400 truncate max-w-[260px]">
                              {student.department ? `${student.department} — ` : ''}
                              {student.major}
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-medium text-[#123B78] dark:text-[#60B8F5] bg-[#DCEBFF]/50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded border border-[#36A5F5]/20">
                                {student.degreeLevel}
                              </span>
                              <span className="text-slate-400 font-mono">
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
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stageConfig.bgLight} ${stageConfig.bgDark} ${stageConfig.textLight} ${stageConfig.textDark} ${stageConfig.borderColor}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`}
                                />
                                {stageConfig.label}
                              </span>
                            </div>

                            {/* Document Readiness Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-medium text-[#172B4D]/65 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <FileCheck2 className="w-3 h-3 text-slate-400" />
                                  Docs: {verifiedCount}/{student.documentChecklist?.length || 0}
                                </span>
                                <span className="font-mono tabular-nums">{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-[#E3EAF3] dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    progressPercent === 100
                                      ? 'bg-[#16A36A]'
                                      : progressPercent >= 50
                                      ? 'bg-[#1769E8]'
                                      : 'bg-[#E9A23B]'
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
                            <div className="flex items-center gap-1 text-[11px] font-medium text-[#172B4D] dark:text-slate-200">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{student.assignedConsultantName}</span>
                            </div>

                            <div className="pt-0.5">
                              {student.courierTrackingNumber ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, student.courierTrackingNumber!)}
                                  title="Click to copy tracking number"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#16A36A]/10 text-[#16A36A] dark:text-emerald-400 border border-[#16A36A]/20 hover:bg-[#16A36A]/20 transition-colors"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>{student.courierTrackingNumber}</span>
                                  {copiedText === student.courierTrackingNumber ? (
                                    <Check className="w-2.5 h-2.5 text-[#16A36A]" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#172B4D]/50 dark:text-slate-400 font-mono">
                                  <Clock className="w-2.5 h-2.5" />
                                  Pending Dispatch
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 5: ACTION */}
                        <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1769E8] dark:text-blue-400 bg-[#1769E8]/10 dark:bg-blue-950/40 hover:bg-[#1769E8] hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-md transition-all shadow-xs"
                          >
                            <span>Dossier</span>
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
      ) : (
        /* 5. CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSorted.length === 0 ? (
            <div className="col-span-full py-16 text-center text-[#172B4D]/60 dark:text-slate-400 bg-white dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#172B4D] dark:text-slate-200">
                No candidate dossiers match the active filters
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded transition-colors"
              >
                Reset All Filters
              </button>
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
                  className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-4 space-y-3 hover:shadow-md hover:border-[#1769E8]/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Card Header: Name, ID & Stage */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[#172B4D] dark:text-slate-100 leading-tight">
                          {student.fullName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#172B4D]/60 dark:text-slate-400 font-mono mt-0.5">
                          <span>{student.intakeTerm}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stageConfig.bgLight} ${stageConfig.bgDark} ${stageConfig.textLight} ${stageConfig.textDark} ${stageConfig.borderColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`} />
                        {stageConfig.label}
                      </span>
                    </div>

                    {/* Passport Tag */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E3EAF3]/60 dark:border-slate-800/60">
                      <span className="text-[#172B4D]/60 dark:text-slate-400 text-[11px]">
                        Passport:
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, student.passportNumber)}
                        title="Click to copy"
                        className="font-mono text-xs font-semibold text-[#172B4D] dark:text-slate-200 hover:text-[#1769E8] inline-flex items-center gap-1"
                      >
                        <span>{student.passportNumber}</span>
                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* University & Degree */}
                  <div className="p-2.5 rounded-md bg-[#F4F2EE] dark:bg-slate-800/60 border border-[#E3EAF3]/70 dark:border-slate-700/60 space-y-1">
                    <div className="font-semibold text-xs text-[#172B4D] dark:text-slate-200 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#1769E8] dark:text-[#36A5F5]" />
                      <span className="truncate">{student.appliedUniversityName}</span>
                    </div>
                    <div className="text-[11px] text-[#172B4D]/70 dark:text-slate-400 truncate">
                      {student.department ? `${student.department} — ` : ''}
                      {student.major}
                    </div>
                    <div className="text-[10px] text-[#123B78] dark:text-[#60B8F5] font-medium pt-0.5">
                      {student.degreeLevel} (Visa: {student.visaType})
                    </div>
                  </div>

                  {/* Checklist Meter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#172B4D]/70 dark:text-slate-400 flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                        Document Verification
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#172B4D] dark:text-slate-200">
                        {verifiedCount}/{student.documentChecklist?.length || 0} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E3EAF3] dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          progressPercent === 100
                            ? 'bg-[#16A36A]'
                            : progressPercent >= 50
                            ? 'bg-[#1769E8]'
                            : 'bg-[#E9A23B]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: Consultant, Courier & Action */}
                  <div className="pt-2 border-t border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] text-[#172B4D]/60 dark:text-slate-400 truncate">
                        Consultant: <strong>{student.assignedConsultantName}</strong>
                      </div>
                      {student.courierTrackingNumber ? (
                        <div className="text-[10px] text-[#16A36A] dark:text-emerald-400 font-mono font-medium truncate flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{student.courierTrackingNumber}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Pending Dispatch
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(student);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors shadow-xs shrink-0"
                    >
                      <span>Dossier</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      </div>
    </div>
  );
};
