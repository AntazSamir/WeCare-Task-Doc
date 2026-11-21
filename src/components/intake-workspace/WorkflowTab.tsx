import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import {
  INTAKE_WORKFLOW_STAGES,
  IntakeApplicationRecord,
  IntakeWorkflowStage,
} from '../../types/pms';

interface WorkflowTabProps {
  applications: IntakeApplicationRecord[];
  onRecordStage: (app: IntakeApplicationRecord, preselectStage?: IntakeWorkflowStage) => void;
}

export const WorkflowTab: React.FC<WorkflowTabProps> = ({ applications, onRecordStage }) => {
  const [stageFilter, setStageFilter] = useState<'All' | IntakeWorkflowStage>('All');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const stageCounts = INTAKE_WORKFLOW_STAGES.map((stage, idx) => ({
    index: idx + 1,
    stage,
    count: applications.filter((a) => a.workflowStage === stage).length,
  }));

  const filtered =
    stageFilter === 'All'
      ? applications
      : applications.filter((a) => a.workflowStage === stageFilter);

  return (
    <div className="space-y-4">
      {/* Manual Governance Notice */}
      <div className="bg-[#EFF6FF]/60 dark:bg-blue-950/30 border border-[#1E40AF]/20 dark:border-blue-800/50 rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs">
        <ShieldAlert className="w-4 h-4 text-[#1E40AF] dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[#0F172A] dark:text-slate-200">
          <span className="font-semibold">Explicit Authorized Stage Governance:</span> Applications are never automatically marked Submitted or Completed when checklists finish. An authorized officer must explicitly record university submission, additional document requests, admission decisions, tuition payments, and CoA issuance.
        </div>
      </div>

      {/* 11-Stage Pipeline Strip */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-slate-200">
            11-Stage Intake Application Pipeline
          </h3>
          {stageFilter !== 'All' && (
            <button
              type="button"
              onClick={() => setStageFilter('All')}
              className="text-xs font-medium text-[#1E40AF] dark:text-blue-400 hover:underline"
            >
              Show all stages ({applications.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {stageCounts.map(({ index, stage, count }) => {
            const isSelected = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(isSelected ? 'All' : stage)}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#EFF6FF] dark:bg-blue-950/60 border-[#1E40AF] dark:border-blue-500'
                    : 'bg-[#F8FAFC] dark:bg-slate-950/50 border-[#E2E8F0] dark:border-slate-800 hover:border-[#1E40AF]/40'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-slate-400 tabular-nums">
                  <span>Stage {index}</span>
                  <span className={`font-bold text-xs ${
                    count > 0 ? 'text-[#1E40AF] dark:text-blue-400' : 'text-[#64748B]'
                  }`}>
                    {count}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-[#0F172A] dark:text-slate-100 line-clamp-2 leading-tight">
                  {stage}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-Student Stage Progress & Dates Table */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B] dark:text-slate-400">
            No candidates currently in {stageFilter === 'All' ? 'this intake' : `"${stageFilter}"`}.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
            {filtered.map((app) => {
              const stageIdx = INTAKE_WORKFLOW_STAGES.indexOf(app.workflowStage);
              const nextStage =
                stageIdx >= 0 && stageIdx < INTAKE_WORKFLOW_STAGES.length - 1
                  ? INTAKE_WORKFLOW_STAGES[stageIdx + 1]
                  : undefined;
              const isExpanded = expandedHistoryId === app.intakeAppId;
              const dates = app.workflowDates || {};

              return (
                <div key={app.intakeAppId} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                          {app.student.fullName}
                        </span>
                        <span className="text-[11px] tabular-nums text-[#64748B] dark:text-slate-400">
                          ({app.student.id})
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                        {app.student.programName || app.student.major} · Consultant: {app.student.assignedConsultantName}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-[#1E40AF] dark:text-blue-400">
                          Stage {stageIdx + 1}/11: {app.workflowStage}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-slate-400 tabular-nums">
                          Status: {app.stageStatus} · Progress: {app.workflowProgress}%
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRecordStage(app, nextStage || app.workflowStage)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        Record Action
                      </button>
                    </div>
                  </div>

                  {/* Stepper Progress Bar */}
                  <div className="grid grid-cols-11 gap-1">
                    {INTAKE_WORKFLOW_STAGES.map((st, i) => {
                      const done = i < stageIdx || (app.workflowStage === 'CoA Received' && i === stageIdx);
                      const current = i === stageIdx && !done;
                      return (
                        <div key={st} title={`${i + 1}. ${st}`} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              done
                                ? 'bg-[#16A34A]'
                                : current
                                ? 'bg-[#1E40AF]'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Recorded Milestone Dates & Sign-off */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-slate-400 pt-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                      {dates.registeredDate && <span>Registered: {dates.registeredDate}</span>}
                      {dates.apostilleDate && <span>Apostille: {dates.apostilleDate}</span>}
                      {dates.submittedDate && (
                        <span className="text-[#1E40AF] dark:text-blue-400 font-medium">
                          Submitted: {dates.submittedDate}
                          {app.submittedBy ? ` (by ${app.submittedBy})` : ''}
                        </span>
                      )}
                      {dates.resultDate && <span>Result: {dates.resultDate} ({app.student.admissionResult})</span>}
                      {dates.tuitionPaidDate && <span>Tuition Paid: {dates.tuitionPaidDate}</span>}
                      {dates.coaReceivedDate && (
                        <span className="text-[#16A34A] dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          CoA: {dates.coaReceivedDate}
                          {app.student.certificateOfAdmissionNo ? ` · #${app.student.certificateOfAdmissionNo}` : ''}
                        </span>
                      )}
                      {!dates.submittedDate && app.readiness.isSubmissionReady && (
                        <span className="text-[#16A34A] dark:text-emerald-400 font-medium">
                          Documents 100% verified — awaiting officer submission sign-off
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedHistoryId(isExpanded ? null : app.intakeAppId)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F172A] dark:text-slate-300 hover:text-[#1E40AF]"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Stage History ({app.stageHistory.length})
                    </button>
                  </div>

                  {/* Stage History Drawer */}
                  {isExpanded && (
                    <div className="mt-2 bg-[#F8FAFC] dark:bg-slate-950/60 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-3 space-y-2">
                      {app.stageHistory.length === 0 ? (
                        <div className="text-[11px] text-[#64748B]">No stage transition records yet.</div>
                      ) : (
                        app.stageHistory.map((h) => (
                          <div key={h.id} className="flex items-start justify-between gap-3 text-xs border-b last:border-b-0 border-[#E2E8F0] dark:border-slate-800 pb-1.5 last:pb-0">
                            <div>
                              <span className="font-semibold text-[#0F172A] dark:text-slate-100">{h.stage}</span>
                              <span className="mx-1.5 text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-[11px] text-[#64748B] dark:text-slate-400">{h.status}</span>
                              {h.notes && (
                                <p className="text-[11px] text-[#0F172A]/75 dark:text-slate-300 mt-0.5">{h.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-[11px] text-[#64748B] dark:text-slate-400 shrink-0 tabular-nums">
                              <div className="flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" />
                                {h.date}
                              </div>
                              <div>{h.actorName}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
