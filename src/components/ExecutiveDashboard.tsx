import React, { useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  ArrowRight,
  Clock,
  Plane,
  Building2,
  ChevronRight,
  InboxIcon,
} from 'lucide-react';
import { UserProfile } from '../types/pms';

interface ExecutiveDashboardProps {
  analytics: any;
  currentUser: UserProfile;
  onNavigateTab: (tab: any) => void;
  onOpenNewStudentModal: () => void;
  onOpenNewTaskModal: () => void;
}

// Blue ramp: stage 1 (#BFDBFE) → stage 7 (#2563EB) → stage 8 success green
const VISA_STAGES_CONFIG: {
  key: string;
  label: string;
  labelKo: string;
  stageKey: string;
  topBorderColor: string;
  isSuccess?: boolean;
}[] = [
  {
    key: 'doc',
    label: '1. Document Prep',
    labelKo: '서류 수집',
    stageKey: 'documentGathering',
    topBorderColor: '#BFDBFE',
  },
  {
    key: 'apo',
    label: '2. Apostille & Notarization',
    labelKo: '아포스티유 공증',
    stageKey: 'apostilleVerification',
    topBorderColor: '#93C5FD',
  },
  {
    key: 'sub',
    label: '3. University Submitted',
    labelKo: '원서 접수 완료',
    stageKey: 'universitySubmitted',
    topBorderColor: '#60A5FA',
  },
  {
    key: 'adm',
    label: '4. Admission Granted',
    labelKo: '합격 통지',
    stageKey: 'admissionGranted',
    topBorderColor: '#3B82F6',
  },
  {
    key: 'tui',
    label: '5. Tuition Paid',
    labelKo: '등록금 납부',
    stageKey: 'tuitionPaid',
    topBorderColor: '#2563EB',
  },
  {
    key: 'coa',
    label: '6. CoA Received',
    labelKo: '표준입학허가서',
    stageKey: 'coaReceived',
    topBorderColor: '#1D4ED8',
  },
  {
    key: 'emb',
    label: '7. Embassy Visa Filing',
    labelKo: '비자 신청',
    stageKey: 'embassyVisaFiling',
    topBorderColor: '#1E3A8A',
  },
  {
    key: 'vis',
    label: '8. Visa Issued (D-2/D-4)',
    labelKo: '비자 발급 완료',
    stageKey: 'visaIssued',
    topBorderColor: '#16A34A',
    isSuccess: true,
  },
];

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  analytics,
  currentUser,
  onNavigateTab,
  onOpenNewStudentModal,
  onOpenNewTaskModal,
}) => {
  const isAdmin = currentUser.role === 'Admission_Manager';
  const pipeline = analytics?.visaPipeline || {};

  const [workloadTeamFilter, setWorkloadTeamFilter] = useState<'All' | 'Admission Team' | 'Counseling Team'>('All');

  const rawWorkload = (analytics?.consultantWorkload || []) as any[];
  const filteredWorkload = useMemo(() => {
    if (workloadTeamFilter === 'All') return rawWorkload;
    return rawWorkload.filter((c) => (c.team || 'Admission Team') === workloadTeamFilter);
  }, [rawWorkload, workloadTeamFilter]);

  const totalPendingWorkload = useMemo(
    () => rawWorkload.reduce((sum, c) => sum + (c.pending_tasks || 0), 0),
    [rawWorkload]
  );

  return (
    <div className="space-y-6">
      {/* Compact White Hero Section (max height ~96px) */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#64748B] dark:text-slate-400">
              South Korea Student Visa & Admission PMS
            </span>
            <span className="text-[#E2E8F0] dark:text-slate-700">·</span>
            <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              {isAdmin ? 'Agency Director Console' : `Consultant: ${currentUser.name}`}
            </span>
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A] dark:text-slate-100 leading-tight">
            Executive Admission & Visa Operations Command
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 truncate">
            Managing Spring & Fall 2027 intakes, apostille verifications, DHL dispatches, and D-2/D-4 visa documentation.
          </p>
        </div>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenNewStudentModal}
            className="inline-flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2 shadow-xs"
          >
            <Users className="w-4 h-4" />
            Register Student
          </button>
        </div>
      </div>

      {/* 4 Core Operational KPI Metric Strip - 24px gap, 24px padding, 12px radius */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Active Intake Campaigns */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#1E40AF]/40 transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#64748B] dark:text-slate-400">Active Intake Campaigns</span>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-semibold tabular-nums text-[#0F172A] dark:text-slate-100 leading-tight">
            {analytics?.totalActiveProjects || 0}
          </div>
          <div className="mt-2 text-xs text-[#64748B] flex items-center justify-between">
            <span>Spring & Fall 2027</span>
            <button
              type="button"
              onClick={() => onNavigateTab('projects')}
              className="text-[#1E40AF] dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              View Projects →
            </button>
          </div>
        </div>

        {/* Card 2: Candidate Applications */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#1E40AF]/40 transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#64748B] dark:text-slate-400">Candidate Applications</span>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-semibold tabular-nums text-[#0F172A] dark:text-slate-100 leading-tight">
            {analytics?.totalStudents || 0}
          </div>
          <div className="mt-2 text-xs text-[#64748B] flex items-center justify-between">
            <span>{isAdmin ? 'Agency total' : 'Assigned to your roster'}</span>
            <button
              type="button"
              onClick={() => onNavigateTab('students')}
              className="text-[#1E40AF] dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              Student CRM →
            </button>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#1E40AF]/40 transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#64748B] dark:text-slate-400">Pending Tasks</span>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 text-[32px] font-semibold tabular-nums text-[#0F172A] dark:text-slate-100 leading-tight">
            {analytics?.taskStats?.pending || 0}
          </div>
          <div className="mt-2 text-xs text-[#64748B] flex items-center justify-between">
            <span><span className="tabular-nums">{analytics?.taskStats?.completed || 0}</span> completed</span>
            <button
              type="button"
              onClick={() => onNavigateTab('all-tasks')}
              className="text-[#1E40AF] dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              Task Board →
            </button>
          </div>
        </div>

        {/* Card 4: Visas Issued (D-2/D-4) */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#1E40AF]/40 transition-colors duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#64748B] dark:text-slate-400">Visas Issued (D-2/D-4)</span>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Plane className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
            </div>
          </div>
          <div className={`mt-3 text-[32px] font-semibold tabular-nums leading-tight ${(pipeline?.visaIssued || 0) === 0 ? 'text-[#64748B] dark:text-slate-400' : 'text-[#0F172A] dark:text-slate-100'}`}>
            {pipeline?.visaIssued || 0}
          </div>
          <div className="mt-2 text-xs text-[#64748B] flex items-center justify-between">
            <span><span className="tabular-nums">{pipeline?.coaReceived || 0}</span> CoA ready</span>
            {(pipeline?.visaIssued || 0) > 0 ? (
              <span className="text-[#16A34A] dark:text-emerald-400 font-semibold">
                {analytics?.successRate ? `${analytics.successRate}% Success` : '100% Success'}
              </span>
            ) : (
              <span className="text-[#64748B] dark:text-slate-400 font-normal">
                No visas issued yet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* PRIMARY FEATURE: South Korean Student Visa Pipeline Stage Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#1E40AF] dark:text-blue-400" />
              South Korean Student Visa Pipeline & Application Funnel
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
              Live progression of registered student dossiers from initial apostille document audit through embassy visa issuance
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('students')}
            className="text-xs text-[#1E40AF] dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 shrink-0"
          >
            Manage All Dossiers
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 8-Stage Funnel — responsive: 2 / 4 / 8 columns with chevron separators on wide screens */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-0 items-stretch">
          {VISA_STAGES_CONFIG.map((stg, idx) => {
            const count = pipeline[stg.stageKey] || 0;
            const isEmpty = count === 0;
            const isLast = idx === VISA_STAGES_CONFIG.length - 1;

            return (
              <React.Fragment key={stg.key}>
                {/* Stage Card */}
                <div
                  onClick={() => onNavigateTab('students')}
                  className="flex flex-col bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg cursor-pointer hover:border-[#1E40AF]/50 hover:bg-[#FAFCFF] dark:hover:bg-slate-800/50 transition-all duration-150 overflow-hidden"
                  style={{ borderTop: `3px solid ${stg.topBorderColor}` }}
                >
                  <div className="p-3 flex flex-col flex-1">
                    {/* Number badge */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5"
                        style={{
                          backgroundColor: stg.isSuccess ? '#DCFCE7' : '#EFF6FF',
                          color: stg.isSuccess ? '#16A34A' : '#1E40AF',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100 leading-tight">
                          {stg.label.replace(/^\d+\. /, '')}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-0.5 leading-tight">
                          {stg.labelKo}
                        </div>
                      </div>
                    </div>

                    {/* Count */}
                    <div className="mt-auto pt-2">
                      <div
                        className={`text-[28px] font-semibold tabular-nums leading-none ${
                          isEmpty
                            ? 'text-[#94A3B8] dark:text-slate-600'
                            : stg.isSuccess
                            ? 'text-[#16A34A] dark:text-emerald-400'
                            : 'text-[#0F172A] dark:text-slate-100'
                        }`}
                      >
                        {count}
                      </div>
                      {isEmpty && (
                        <div className="text-[11px] text-[#94A3B8] dark:text-slate-600 mt-0.5">
                          No students
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chevron separator (lg only, not after last) */}
                {!isLast && (
                  <div className="hidden lg:flex items-center justify-center px-0.5 text-[#CBD5E1] dark:text-slate-700">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Split Section: Upcoming Deadlines & Team Workload - 24px gap, 24px padding, 12px radius */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Urgent Korean University Deadlines (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#DC2626]" />
              <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-slate-100">
                Approaching University Intake Deadlines
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('universities')}
              className="text-xs text-[#1E40AF] dark:text-blue-400 font-medium hover:underline shrink-0"
            >
              University Directory →
            </button>
          </div>

          {(analytics?.upcomingDeadlines || []).length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Calendar className="w-8 h-8 text-[#CBD5E1] dark:text-slate-700" />
              <p className="text-sm text-[#64748B] dark:text-slate-400">No upcoming deadlines</p>
              <p className="text-xs text-[#94A3B8] dark:text-slate-600">Deadline data will appear here as intake campaigns are set.</p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto pr-1">
              {(analytics?.upcomingDeadlines || []).map((d: any) => {
                const fillPct = Math.round(((d.current_students || 0) / Math.max(d.target_quota || 20, 1)) * 100);
                const deadlineDate = new Date(d.deadline);
                const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const urgencyClass =
                  daysLeft < 30
                    ? 'text-[#DC2626] dark:text-red-400'
                    : daysLeft < 60
                    ? 'text-[#D97706] dark:text-amber-400'
                    : 'text-[#64748B] dark:text-slate-400';

                return (
                  <div key={d.id} className="py-4 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 -mx-6 px-6 transition-colors border-b border-[#E2E8F0] dark:border-slate-800/70 last:border-0">
                    {/* Row: name + deadline */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0F172A] dark:text-slate-100 truncate">
                          {d.university_name}
                        </div>
                        <div className="text-xs text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                          {d.name}
                        </div>
                      </div>
                      <div className={`text-xs font-semibold tabular-nums text-right shrink-0 ${urgencyClass}`}>
                        {d.deadline}
                      </div>
                    </div>

                    {/* Quota progress bar */}
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums mb-1.5">
                      {d.current_students || 0}/{d.target_quota || 20} quota · {fillPct}%
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1E40AF] transition-all duration-300"
                        style={{ width: `${Math.min(fillPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Team Workload & Consultant Allocation (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1E40AF]" />
              <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-slate-100">
                Team Workload & Accountability
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('all-tasks')}
              className="text-xs text-[#1E40AF] dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Manage Teams</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Segmented control tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex p-0.5 bg-[#F1F5F9] dark:bg-slate-800 rounded-lg gap-0.5">
              {(['All', 'Admission Team', 'Counseling Team'] as const).map((filter) => {
                const label = filter === 'All' ? `All (${rawWorkload.length})` : filter.replace(' Team', '');
                const isActive = workloadTeamFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setWorkloadTeamFilter(filter)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.08)] border border-[#E2E8F0] dark:border-slate-600'
                        : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-[#64748B] dark:text-slate-400 tabular-nums">
              <span className="font-semibold text-[#D97706] dark:text-amber-400">{totalPendingWorkload}</span> pending
            </div>
          </div>

          {/* Workload List */}
          {filteredWorkload.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <InboxIcon className="w-7 h-7 text-[#CBD5E1] dark:text-slate-700" />
              <p className="text-sm text-[#64748B] dark:text-slate-400">No team members</p>
              <p className="text-xs text-[#94A3B8] dark:text-slate-600">No active members in this roster view.</p>
            </div>
          ) : (
            <div className="max-h-[220px] overflow-y-auto pr-1">
              {filteredWorkload.map((c: any, idx: number) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateTab('all-tasks')}
                  className={`flex items-center gap-3 py-2.5 px-2 rounded-lg cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors group ${
                    idx > 0 ? 'border-t border-[#F1F5F9] dark:border-slate-800/60' : ''
                  }`}
                >
                  {/* Avatar */}
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#E2E8F0] dark:border-slate-700"
                  />

                  {/* Name + file count */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-200 group-hover:text-[#1E40AF] dark:group-hover:text-blue-400 transition-colors truncate block">
                      {c.name}
                    </span>
                    <span className="text-xs text-[#94A3B8] dark:text-slate-500 tabular-nums">
                      {c.dossiers} {c.dossiers === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  {/* Pending + Done pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-[#FEF3C7] dark:bg-amber-950/50 text-[#D97706] dark:text-amber-400"
                      title="Pending Tasks"
                    >
                      {c.pending_tasks} pending
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-[#DCFCE7] dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-400"
                      title="Completed Tasks"
                    >
                      {c.completed_tasks} done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
