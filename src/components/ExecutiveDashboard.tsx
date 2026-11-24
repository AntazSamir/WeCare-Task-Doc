import React, { useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  ArrowRight,
  FileCheck2,
  Clock,
  Plane,
  Building2,
} from 'lucide-react';
import { UserProfile } from '../types/pms';
import { StaggerContainer, StaggerItem, MotionButton } from './animations';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';

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
  colorDark: string;
  bgLight: string;
  topBorderDark: string;
}[] = [
  {
    key: 'doc',
    label: '1. Document Prep',
    labelKo: '서류 수집',
    stageKey: 'documentGathering',
    color: 'text-[#172B4D]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#F4F2EE]',
    topBorderDark: 'dark:border-t-[#3A3A3F]',
  },
  {
    key: 'apo',
    label: '2. Apostille & Notarization',
    labelKo: '아포스티유 공증',
    stageKey: 'apostilleVerification',
    color: 'text-[#123B78]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#F4F2EE]',
    topBorderDark: 'dark:border-t-[#3C4659]',
  },
  {
    key: 'sub',
    label: '3. University Submitted',
    labelKo: '원서 접수 완료',
    stageKey: 'universitySubmitted',
    color: 'text-[#1769E8]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#DCEBFF]/60',
    topBorderDark: 'dark:border-t-[#3F5274]',
  },
  {
    key: 'adm',
    label: '4. Admission Granted',
    labelKo: '합격 통지',
    stageKey: 'admissionGranted',
    color: 'text-[#1769E8]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#DCEBFF]/80',
    topBorderDark: 'dark:border-t-[#425E8E]',
  },
  {
    key: 'tui',
    label: '5. Tuition Paid',
    labelKo: '등록금 납부',
    stageKey: 'tuitionPaid',
    color: 'text-[#E9A23B]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#E9A23B]/10',
    topBorderDark: 'dark:border-t-[#446AA8]',
  },
  {
    key: 'coa',
    label: '6. CoA Received',
    labelKo: '표준입학허가서',
    stageKey: 'coaReceived',
    color: 'text-[#123B78]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#DCEBFF]',
    topBorderDark: 'dark:border-t-[#4776C2]',
  },
  {
    key: 'emb',
    label: '7. Embassy Visa Filing',
    labelKo: '비자 신청',
    stageKey: 'embassyVisaFiling',
    color: 'text-[#1769E8]',
    colorDark: 'dark:text-[#ECECEE]',
    bgLight: 'bg-[#F4F2EE]',
    topBorderDark: 'dark:border-t-[#4982DC]',
  },
  {
    key: 'vis',
    label: '8. Visa Issued (D-2/D-4)',
    labelKo: '비자 발급 완료',
    stageKey: 'visaIssued',
    color: 'text-[#16A36A]',
    colorDark: 'dark:text-[#34C26B]',
    bgLight: 'bg-[#16A36A]/10',
    topBorderDark: 'dark:border-t-[#4C8DF6]',
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
    <div className="space-y-2">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-[var(--color-deep-blue)] dark:bg-[#1C1C1E] border border-[var(--color-deep-blue)] dark:border-[#2E2E32] rounded-lg p-3.5 sm:p-4 text-white shadow-sm dark:shadow-none flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[var(--color-sky-blue)] dark:text-[#9A9AA2]">
              South Korea Student Visa & Admission PMS
            </span>
            <span className="text-[#DCEBFF]/50 dark:text-[#66666E]">·</span>
            <span className="text-xs text-[#DCEBFF] dark:text-[#9A9AA2] font-medium">
              {isAdmin ? 'Agency Director Console' : `Consultant Workspace: ${currentUser.name}`}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white dark:text-[#ECECEE]">
            Executive Admission & Visa Operations Command
          </h1>
          <p className="text-xs text-[#DCEBFF]/90 dark:text-[#9A9AA2] max-w-2xl">
            Managing Spring 2027 & Fall 2027 intakes, apostille verifications, DHL courier dispatches, and D-2/D-4 visa documentation for top South Korean partner institutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <MotionButton
            onClick={onOpenNewStudentModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#36A5F5] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-md transition-colors shadow-sm dark:shadow-none"
          >
            <Users className="w-3.5 h-3.5" />
            Register Student
          </MotionButton>
          <MotionButton
            onClick={onOpenNewTaskModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#123B78] dark:text-[#ECECEE] bg-[#DCEBFF] dark:bg-[#252528] hover:bg-white dark:hover:bg-[#2E2E32] dark:border dark:border-[#3A3A3F] rounded-md transition-colors shadow-sm dark:shadow-none"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Assign Task
          </MotionButton>
        </div>
      </div>

      {/* 4 Core Operational KPI Metric Strip */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <StaggerItem>
          <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-lg shadow-xs dark:shadow-none hover:border-[#36A5F5] dark:hover:border-[#3A3A3F] transition-colors h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9A9AA2]">
              <span className="font-medium">Active Intake Campaigns</span>
              <Building2 className="w-6 h-6 text-[#1769E8] shrink-0" />
            </div>
            <div
              className={`mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#172B4D] ${
                (analytics?.totalActiveProjects || 0) === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'
              }`}
            >
              {analytics?.totalActiveProjects || 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2] flex items-center justify-between">
              <span>Spring & Fall 2027</span>
              <MotionButton
                onClick={() => onNavigateTab('projects')}
                className="text-[#1769E8] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] font-semibold hover:underline"
              >
                View Projects →
              </MotionButton>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-lg shadow-xs dark:shadow-none hover:border-[#36A5F5] dark:hover:border-[#3A3A3F] transition-colors h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9A9AA2]">
              <span className="font-medium">Candidate Applications</span>
              <Users className="w-6 h-6 text-[#123B78] shrink-0" />
            </div>
            <div
              className={`mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#123B78] ${
                (analytics?.totalStudents || 0) === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'
              }`}
            >
              {analytics?.totalStudents || 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2] flex items-center justify-between">
              <span>{isAdmin ? 'Agency total' : 'Assigned to your roster'}</span>
              <MotionButton
                onClick={() => onNavigateTab('students')}
                className="text-[#1769E8] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] font-semibold hover:underline"
              >
                Student CRM →
              </MotionButton>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-lg shadow-xs dark:shadow-none hover:border-[#E9A23B] dark:hover:border-[#3A3A3F] transition-colors h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9A9AA2]">
              <span className="font-medium">Pending Tasks</span>
              <Clock className="w-6 h-6 text-[#E9A23B] shrink-0" />
            </div>
            <div
              className={`mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#E9A23B] ${
                (analytics?.taskStats?.pending || 0) === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#F0A030]'
              }`}
            >
              {analytics?.taskStats?.pending || 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2] flex items-center justify-between">
              <span>{analytics?.taskStats?.completed || 0} completed</span>
              <MotionButton
                onClick={() => onNavigateTab('all-tasks')}
                className="text-[#1769E8] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] font-semibold hover:underline"
              >
                Task Board →
              </MotionButton>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-lg shadow-xs dark:shadow-none hover:border-[#16A36A] dark:hover:border-[#3A3A3F] transition-colors h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9A9AA2]">
              <span className="font-medium">Visas Issued (D-2/D-4)</span>
              <Plane className="w-6 h-6 text-[#16A36A] shrink-0" />
            </div>
            <div
              className={`mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#16A36A] ${
                (pipeline?.visaIssued || 0) === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#34C26B]'
              }`}
            >
              {pipeline?.visaIssued || 0}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2] flex items-center justify-between">
              <span>{pipeline?.coaReceived || 0} CoA ready</span>
              <span className="text-[#16A36A] dark:text-[#34C26B] font-semibold">100% Success</span>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* PRIMARY FEATURE: South Korean Student Visa Pipeline Stage Matrix */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-md p-4 shadow-xs dark:shadow-none space-y-3">
        <div className="flex items-center justify-between border-b border-[#E3EAF3] dark:border-[#2E2E32] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#172B4D] dark:text-[#ECECEE] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#1769E8]" />
              South Korean Student Visa Pipeline & Application Funnel
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-[#9A9AA2] mt-0.5">
              Live progression of registered student dossiers from initial apostille document audit through embassy visa issuance
            </p>
          </div>
          <MotionButton
            onClick={() => onNavigateTab('students')}
            className="text-xs text-[#1769E8] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] hover:underline font-medium inline-flex items-center gap-1"
          >
            Manage All Dossiers
            <ArrowRight className="w-3.5 h-3.5" />
          </MotionButton>
        </div>

        {/* 8-Stage Funnel Horizontal Matrix */}
        <StaggerContainer staggerDelay={0.03} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {VISA_STAGES_CONFIG.map((stg) => {
            const count = pipeline[stg.stageKey] || 0;
            return (
              <StaggerItem key={stg.key}>
                <div
                  onClick={() => onNavigateTab('students')}
                  className={`p-3 rounded-md border border-[#E3EAF3] dark:border-[#2E2E32] dark:border-t-2 ${stg.topBorderDark} ${stg.bgLight} dark:bg-[#1C1C1E] flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-[#1769E8]/40 dark:hover:ring-0 dark:hover:border-x-[#3A3A3F] dark:hover:border-b-[#3A3A3F] dark:hover:bg-[#252528] transition-all h-full`}
                >
                  <div>
                    <div className="text-[11px] font-semibold text-[#172B4D] dark:text-[#ECECEE] leading-tight">
                      {stg.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-[#9A9AA2] font-mono mt-0.5">
                      {stg.labelKo}
                    </div>
                  </div>
                  <div
                    className={`mt-3 text-xl font-mono font-bold tabular-nums ${stg.color} ${
                      count === 0 ? 'dark:text-[#66666E]' : stg.colorDark
                    }`}
                  >
                    {count}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>

      {/* Split Section: Upcoming Korean University Deadlines & Consultant Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
        {/* Left: Urgent Korean University Deadlines (7 Cols) */}
        <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-md p-5 space-y-4 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between border-b border-[#E3EAF3] dark:border-[#2E2E32] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#DC4545]" />
              <h3 className="text-sm font-semibold text-[#172B4D] dark:text-[#ECECEE]">
                Approaching University Intake Deadlines
              </h3>
            </div>
            <MotionButton
              onClick={() => onNavigateTab('universities')}
              className="text-xs text-[#1769E8] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] font-medium hover:underline"
            >
              University Directory →
            </MotionButton>
          </div>

          <div className="divide-y divide-[#E3EAF3] dark:divide-[#2E2E32] max-h-[280px] overflow-y-auto pr-1">
            {(analytics?.upcomingDeadlines || []).map((d: any) => {
              const fillPct = Math.round(((d.current_students || 0) / (d.target_quota || 20)) * 100);
              return (
                <div key={d.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#172B4D] dark:text-[#ECECEE] truncate">
                      {d.university_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] truncate mt-0.5">
                      {d.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-[11px] text-[#DC4545] dark:text-[#EF5350] font-semibold">
                        Deadline: {d.deadline}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-[#9A9AA2] font-mono mt-0.5">
                        {d.current_students || 0}/{d.target_quota} quota ({fillPct}%)
                      </div>
                    </div>

                    <div className="w-16 bg-[#F4F2EE] dark:bg-[#252528] border border-[#E3EAF3] dark:border-[#2E2E32] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1769E8] dark:bg-[#4C8DF6] h-full rounded-full transition-all"
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
        <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E3EAF3] dark:border-[#2E2E32] rounded-lg p-4 sm:p-5 space-y-3 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between border-b border-[#E3EAF3] dark:border-[#2E2E32] pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1769E8]" />
              <h3 className="text-sm font-semibold text-[#172B4D] dark:text-[#ECECEE]">
                Team Workload & Accountability
              </h3>
            </div>
            <MotionButton
              onClick={() => onNavigateTab('all-tasks')}
              className="text-xs text-[#1769E8] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Teams</span>
              <ArrowRight className="w-3 h-3" />
            </MotionButton>
          </div>

          {/* Quick Team Filter Tabs & Workload Summary */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <RoundedSlidingTabs
              variant="segmented"
              value={workloadTeamFilter}
              stretch={0}
              blur={10}
              label="Team workload filter"
              onValueChange={(id) =>
                setWorkloadTeamFilter(id as 'All' | 'Admission Team' | 'Counseling Team')
              }
              className="p-0.5 bg-[#F4F2EE] dark:bg-[#161616] border-[#E3EAF3] dark:border-[#2E2E32] rounded-md text-[11px]"
              indicatorClassName="rounded bg-white dark:bg-[#252528] shadow-2xs dark:shadow-none"
              buttonClassName="px-2 h-[22px] text-[11px] rounded font-medium"
              activeButtonClassName="text-[#123B78] dark:text-[#ECECEE] font-semibold"
              inactiveButtonClassName="text-slate-600 dark:text-[#9A9AA2] hover:text-[#172B4D] dark:hover:text-[#ECECEE]"
              tabs={[
                { id: 'All', label: `All (${rawWorkload.length})` },
                { id: 'Admission Team', label: 'Admission' },
                { id: 'Counseling Team', label: 'Counseling' },
              ]}
            />

            <div className="text-[11px] font-mono text-slate-500 dark:text-[#9A9AA2]">
              <span
                className={`font-semibold text-[#E9A23B] ${
                  totalPendingWorkload === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#F0A030]'
                }`}
              >
                {totalPendingWorkload}
              </span>{' '}
              pending tasks
            </div>
          </div>

          {/* Compact, Scrollable Workload List */}
          <div className="max-h-[220px] overflow-y-auto divide-y divide-[#E3EAF3] dark:divide-[#2E2E32] pr-1">
            {filteredWorkload.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-[#66666E]">
                No active team members found in this roster.
              </div>
            ) : (
              filteredWorkload.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateTab('all-tasks')}
                  className="py-1.5 px-2 rounded flex items-center justify-between gap-2.5 text-xs hover:bg-[#F4F2EE] dark:hover:bg-[#252528] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-[#E3EAF3] dark:border-[#2E2E32]"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-[#172B4D] dark:text-[#ECECEE] group-hover:text-[#1769E8] dark:group-hover:text-[#4C8DF6] transition-colors">
                        {c.name}
                      </span>
                      <span className="ml-1.5 text-[10px] text-slate-400 dark:text-[#9A9AA2] font-mono">
                        · {c.dossiers} {c.dossiers === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                    <span
                      className={`px-1.5 py-0.5 rounded bg-[#E9A23B]/15 text-[#B45309] font-semibold ${
                        (c.pending_tasks || 0) === 0
                          ? 'dark:bg-[#252528] dark:text-[#66666E]'
                          : 'dark:bg-[rgba(240,160,48,0.14)] dark:text-[#F0A030]'
                      }`}
                      title="Pending Tasks"
                    >
                      {c.pending_tasks} pending
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded bg-[#16A36A]/15 text-[#16A36A] font-semibold ${
                        (c.completed_tasks || 0) === 0
                          ? 'dark:bg-[#252528] dark:text-[#66666E]'
                          : 'dark:bg-[rgba(52,194,107,0.14)] dark:text-[#34C26B]'
                      }`}
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
