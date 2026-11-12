import React, { useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Plane,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, VisaStage } from '../types/pms';

interface ExecutiveDashboardProps {
  analytics: any;
  currentUser: UserProfile;
  onNavigateTab: (tab: any) => void;
  onOpenNewStudentModal: () => void;
  onOpenNewTaskModal: () => void;
}

const VISA_STAGES_CONFIG: {
  key: string;
  label: string;
  labelKo: string;
  stageKey: string;
  color: string;
  bgLight: string;
  bgDark: string;
}[] = [
  {
    key: 'doc',
    label: '1. Document Prep',
    labelKo: '서류 수집',
    stageKey: 'documentGathering',
    color: 'text-slate-600 dark:text-slate-300',
    bgLight: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800',
  },
  {
    key: 'apo',
    label: '2. Apostille & Notarization',
    labelKo: '아포스티유 공증',
    stageKey: 'apostilleVerification',
    color: 'text-purple-600 dark:text-purple-400',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-950/50',
  },
  {
    key: 'sub',
    label: '3. University Submitted',
    labelKo: '원서 접수 완료',
    stageKey: 'universitySubmitted',
    color: 'text-blue-600 dark:text-blue-400',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-950/50',
  },
  {
    key: 'adm',
    label: '4. Admission Granted',
    labelKo: '합격 통지',
    stageKey: 'admissionGranted',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-950/50',
  },
  {
    key: 'tui',
    label: '5. Tuition Paid',
    labelKo: '등록금 납부',
    stageKey: 'tuitionPaid',
    color: 'text-amber-600 dark:text-amber-400',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/50',
  },
  {
    key: 'coa',
    label: '6. CoA Received',
    labelKo: '표준입학허가서',
    stageKey: 'coaReceived',
    color: 'text-orange-600 dark:text-orange-400',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-950/50',
  },
  {
    key: 'emb',
    label: '7. Embassy Visa Filing',
    labelKo: '비자 신청',
    stageKey: 'embassyVisaFiling',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-950/50',
  },
  {
    key: 'vis',
    label: '8. Visa Issued (D-2/D-4)',
    labelKo: '비자 발급 완료',
    stageKey: 'visaIssued',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/50',
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
    <div className="space-y-4">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-blue-400">
              South Korea Student Visa & Admission PMS
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300 font-medium">
              {isAdmin ? 'Agency Director Console' : `Consultant Workspace: ${currentUser.name}`}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Executive Admission & Visa Operations Command
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Managing Spring 2027 & Fall 2027 intakes, apostille verifications, DHL courier dispatches, and D-2/D-4 visa documentation for top South Korean partner institutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenNewStudentModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            Register Student
          </button>
          <button
            type="button"
            onClick={onOpenNewTaskModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors shadow-sm"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Assign Task
          </button>
        </div>
      </div>

      {/* 4 Core Operational KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors animate-card-enter stagger-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Active Intake Campaigns</span>
            <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {analytics?.totalActiveProjects || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Spring & Fall 2027</span>
            <button
              type="button"
              onClick={() => onNavigateTab('projects')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              View Projects →
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors animate-card-enter stagger-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Candidate Applications</span>
            <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400">
            {analytics?.totalStudents || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{isAdmin ? 'Agency total' : 'Assigned to your roster'}</span>
            <button
              type="button"
              onClick={() => onNavigateTab('students')}
              className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
            >
              Student CRM →
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors animate-card-enter stagger-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Pending Tasks</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {analytics?.taskStats?.pending || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{analytics?.taskStats?.completed || 0} completed</span>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks-pms')}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Task Board →
            </button>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors animate-card-enter stagger-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Visas Issued (D-2/D-4)</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {pipeline?.visaIssued || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{pipeline?.coaReceived || 0} CoA ready</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% Success</span>
          </div>
        </div>
      </div>

      {/* PRIMARY FEATURE: South Korean Student Visa Pipeline Stage Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              South Korean Student Visa Pipeline & Application Funnel
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live progression of registered student dossiers from initial apostille document audit through embassy visa issuance
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('students')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
          >
            Manage All Dossiers
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 8-Stage Funnel Horizontal Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {VISA_STAGES_CONFIG.map((stg, idx) => {
            const count = pipeline[stg.stageKey] || 0;
            return (
              <div
                key={stg.key}
                onClick={() => onNavigateTab('students')}
                className={`p-3 rounded-md border border-slate-200/80 dark:border-slate-800/80 ${stg.bgLight} ${stg.bgDark} flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all animate-card-enter stagger-${Math.min(idx + 1, 12)}`}
              >
                <div>
                  <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {stg.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {stg.labelKo}
                  </div>
                </div>
                <div className={`mt-3 text-xl font-mono font-bold tabular-nums ${stg.color}`}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Section: Upcoming Korean University Deadlines & Consultant Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Urgent Korean University Deadlines (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Approaching University Intake Deadlines
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('universities')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              University Directory →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/70 max-h-[280px] overflow-y-auto pr-1">
            {(analytics?.upcomingDeadlines || []).map((d: any) => {
              const fillPct = Math.round(((d.current_students || 0) / (d.target_quota || 20)) * 100);
              return (
                <div key={d.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {d.university_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {d.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-[11px] text-red-600 dark:text-red-400 font-semibold">
                        Deadline: {d.deadline}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {d.current_students || 0}/{d.target_quota} quota ({fillPct}%)
                      </div>
                    </div>

                    <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(fillPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Team Workload & Consultant Allocation (5 Cols) - Compact Design */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Team Workload & Accountability
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks-pms')}
              className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Teams</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Team Filter Tabs & Workload Summary */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setWorkloadTeamFilter('All')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  workloadTeamFilter === 'All'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({rawWorkload.length})
              </button>
              <button
                type="button"
                onClick={() => setWorkloadTeamFilter('Admission Team')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  workloadTeamFilter === 'Admission Team'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Admission
              </button>
              <button
                type="button"
                onClick={() => setWorkloadTeamFilter('Counseling Team')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  workloadTeamFilter === 'Counseling Team'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Counseling
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-amber-600 dark:text-amber-400">{totalPendingWorkload}</span> pending tasks
            </div>
          </div>

          {/* Compact, Scrollable Workload List */}
          <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 pr-1">
            {filteredWorkload.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No active team members found in this roster.
              </div>
            ) : (
              filteredWorkload.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateTab('tasks-pms')}
                  className="py-1.5 px-2 rounded flex items-center justify-between gap-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {c.name}
                      </span>
                      <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                        · {c.dossiers} {c.dossiers === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                    <span
                      className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold"
                      title="Pending Tasks"
                    >
                      {c.pending_tasks} pending
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold"
                      title="Completed Tasks"
                    >
                      {c.completed_tasks} done
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
