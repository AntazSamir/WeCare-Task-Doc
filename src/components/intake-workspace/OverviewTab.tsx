import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FileCheck2,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { INTAKE_WORKFLOW_STAGES, IntakeWorkspaceData } from '../../types/pms';
import { MotionButton } from '../animations';

interface OverviewTabProps {
  workspace: IntakeWorkspaceData;
  onSwitchTab: (tab: 'students' | 'workflow' | 'documents' | 'tasks' | 'university' | 'activity') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ workspace, onSwitchTab }) => {
  const { project, admissionIntake, applications, taskSummary } = workspace;
  const todayStr = new Date().toISOString().slice(0, 10);

  const daysUntilDeadline = Math.ceil(
    (new Date(project.deadline).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
  );

  const quotaPct = project.targetQuota > 0
    ? Math.min(100, Math.round((project.studentCount / project.targetQuota) * 100))
    : 0;

  const docReadyCount = applications.filter((a) => a.readiness.isSubmissionReady).length;
  const missingDocsTotal = applications.reduce(
    (acc, a) => acc + a.readiness.missingCount + a.readiness.incorrectCount,
    0
  );

  const importantDates = [
    { label: 'Campaign Start', value: project.startDate },
    { label: 'Application Open', value: admissionIntake?.applicationStart },
    { label: 'Application Deadline', value: project.deadline || admissionIntake?.applicationDeadline, highlight: true },
    { label: 'Document Cutoff', value: admissionIntake?.documentDeadline },
    { label: 'Interview Window', value: admissionIntake?.interviewDates },
    { label: 'Result Announcement', value: admissionIntake?.resultAnnouncementDate },
    { label: 'Tuition Payment Deadline', value: admissionIntake?.tuitionPaymentDeadline },
    { label: 'Visa Submission Deadline', value: admissionIntake?.visaSubmissionDeadline },
    { label: 'Classes Commence', value: admissionIntake?.classesStartDate },
  ].filter((d) => Boolean(d.value));

  const stageCounts = INTAKE_WORKFLOW_STAGES.map((stage) => ({
    stage,
    count: applications.filter((a) => a.workflowStage === stage).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="space-y-4">
      {/* Compact Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#9A9AA2]">
            <span>Application Quota & Seats</span>
            <Users className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
              {project.studentCount} / {project.targetQuota}
            </span>
            <span className="text-xs font-medium tabular-nums text-[#1E40AF] dark:text-[#4C8DF6]">
              ({quotaPct}%)
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-[#EFF6FF] dark:bg-[#252528] rounded-full overflow-hidden">
            <div className="h-full bg-[#1E40AF] dark:bg-[#4C8DF6] rounded-full" style={{ width: `${quotaPct}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums">
            {project.enrolledCount ?? 0} enrolled · {project.availableSeats ?? 0} seats available
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#9A9AA2]">
            <span>Application Progress</span>
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#34C26B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums text-[#0F172A] ${project.progressPercentage === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'}`}>
              {project.progressPercentage}%
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#9A9AA2]">avg pipeline</span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-[#252528] rounded-full overflow-hidden">
            <div className="h-full bg-[#16A34A] dark:bg-[#34C26B] rounded-full" style={{ width: `${project.progressPercentage}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums">
            {project.submittedCount ?? 0} submitted · {docReadyCount}/{applications.length} docs ready
          </div>
        </div>

        <div
          onClick={() => onSwitchTab('tasks')}
          className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF]/50 dark:hover:border-[#4C8DF6]/60 rounded-lg p-4 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#9A9AA2]">
            <span>Tasks & Overdue Items</span>
            <ClipboardList className="w-4 h-4 text-[#D97706] dark:text-[#F0A030]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums text-[#0F172A] ${taskSummary.pending === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'}`}>
              {taskSummary.pending}
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#9A9AA2]">pending tasks</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] tabular-nums">
            <span className={taskSummary.overdue > 0 ? 'text-[#DC2626] dark:text-[#EF5350] font-semibold' : 'text-[#64748B] dark:text-[#66666E]'}>
              {taskSummary.overdue} overdue
            </span>
            <span className="text-slate-300 dark:text-[#3A3A3F]">·</span>
            <span className={taskSummary.completed === 0 ? 'text-[#16A34A] dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}>{taskSummary.completed} completed</span>
          </div>
          <div className="mt-1 text-[11px] text-[#1E40AF] dark:text-[#4C8DF6] font-medium">
            View intake tasks →
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-[#9A9AA2]">
            <span>Submission Deadline</span>
            <Clock className="w-4 h-4 text-[#DC2626] dark:text-[#EF5350]" />
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
            {project.deadline}
          </div>
          <div className={`mt-1 text-xs font-medium tabular-nums ${
            daysUntilDeadline < 0
              ? 'text-[#DC2626] dark:text-[#EF5350]'
              : daysUntilDeadline <= 14
              ? 'text-[#D97706] dark:text-[#F0A030]'
              : 'text-[#16A34A] dark:text-[#34C26B]'
          }`}>
            {daysUntilDeadline < 0
              ? `${Math.abs(daysUntilDeadline)} day(s) past deadline`
              : daysUntilDeadline === 0
              ? 'Due today'
              : `${daysUntilDeadline} day(s) remaining`}
          </div>
          <div className="mt-1.5 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
            Overall status: <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">{project.status}</span>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left (Important Dates + Pipeline Snapshot) | Right (Team & Notes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          {/* Important Dates Table */}
          <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Intake Schedule & Key Deadlines
              </h3>
              {admissionIntake?.id && (
                <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                  Intake Ref: {admissionIntake.id}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] dark:divide-[#2E2E32]">
              {importantDates.map((d) => (
                <div key={d.label} className="p-3.5 border-b border-[#E2E8F0] dark:border-[#2E2E32] last:border-b-0">
                  <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">{d.label}</div>
                  <div className={`mt-1 text-xs font-semibold tabular-nums ${
                    d.highlight ? 'text-[#DC2626] dark:text-[#EF5350]' : 'text-[#0F172A] dark:text-[#ECECEE]'
                  }`}>
                    {d.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Workflow Stage Breakdown */}
          <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Cohort Stage Distribution & Readiness
              </h3>
              <MotionButton
                type="button"
                onClick={() => onSwitchTab('workflow')}
                className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
              >
                Open Workflow Board →
              </MotionButton>
            </div>
            <div className="p-4">
              {applications.length === 0 ? (
                <div className="text-xs text-[#64748B] dark:text-[#9A9AA2] py-3">
                  No candidates assigned to this intake yet. Use the Students tab to assign existing students or register new candidates.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stageCounts.map(({ stage, count }) => {
                    const pct = Math.round((count / applications.length) * 100);
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#0F172A] dark:text-[#ECECEE]">{stage}</span>
                          <span className="tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                            {count} {count === 1 ? 'student' : 'students'} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-[#252528] rounded-full overflow-hidden">
                          <div className="h-full bg-[#1E40AF] dark:bg-[#4C8DF6] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}

                  {missingDocsTotal > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#DC2626] dark:text-[#EF5350] font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{missingDocsTotal}</span> missing or incorrect document item(s) flagged
                      </span>
                      <MotionButton
                        type="button"
                        onClick={() => onSwitchTab('documents')}
                        className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
                      >
                        Review Documents →
                      </MotionButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right 5 Columns: Assigned Team & Notes */}
        <div className="lg:col-span-5 space-y-4">
          <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Assigned Admission & Counseling Team
              </h3>
            </div>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
              {/* Admission Manager */}
              <div className="p-3.5 flex items-center justify-between gap-3 bg-[#F8FAFC]/60 dark:bg-[#252528]">
                <div className="flex items-center gap-2.5 min-w-0">
                  {project.managerAvatar && (
                    <img
                      src={project.managerAvatar}
                      alt={project.managerName}
                      className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0] dark:border-[#2E2E32] shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                      {project.managerName}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] truncate">
                      {project.managerTitle || 'Admission Manager'}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#1E40AF] dark:text-[#4C8DF6] shrink-0">
                  Intake Lead
                </span>
              </div>

              {/* Assigned Consultants */}
              {(project.consultants || []).length === 0 ? (
                <div className="p-3.5 text-xs text-[#64748B] dark:text-[#9A9AA2]">
                  No consultants assigned to this intake campaign yet.
                </div>
              ) : (
                (project.consultants || []).map((c) => {
                  const assignedCount = applications.filter(
                    (a) => a.student.assignedConsultantId === c.id
                  ).length;
                  return (
                    <div key={c.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0] dark:border-[#2E2E32] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] truncate">
                            {c.title} · {c.team || 'Counseling Team'}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[11px] tabular-nums shrink-0 ${assignedCount === 0 ? 'text-[#64748B] dark:text-[#66666E]' : 'text-[#64748B] dark:text-[#9A9AA2]'}`}>
                        {assignedCount} {assignedCount === 1 ? 'case' : 'cases'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Operational Notes */}
          <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE]">
              Intake Guidelines & Internal Notes
            </h3>
            <p className="text-xs text-[#0F172A]/80 dark:text-[#9A9AA2] leading-relaxed whitespace-pre-line">
              {project.notes?.trim() || 'No campaign notes recorded.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
