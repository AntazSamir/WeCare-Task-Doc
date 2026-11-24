import React, { useState, useMemo } from 'react';
import {
  Activity,
  UserPlus,
  FileCheck2,
  GitBranch,
  ClipboardCheck,
  Calendar,
  MessageSquarePlus,
  Search,
  Clock,
  Send,
  X,
} from 'lucide-react';
import { AuditLogEntry } from '../../types/pms';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from '../ui/MorphSelect';
import { MotionButton } from '../animations';

interface ActivityTabProps {
  activities: AuditLogEntry[];
  onOpenLogActivity: () => void;
}

type ActivityCategory =
  | 'All'
  | 'Assignments'
  | 'Documents'
  | 'Workflow'
  | 'Tasks'
  | 'Deadlines'
  | 'Remarks';

function classifyAction(action: string): Exclude<ActivityCategory, 'All'> {
  if (
    action.includes('ASSIGN_STUDENT') ||
    action.includes('REMOVE_STUDENT') ||
    action.includes('CREATE_STUDENT') ||
    action.includes('REGISTER_STUDENT')
  ) {
    return 'Assignments';
  }
  if (action.includes('DOCUMENT') || action.includes('HANDOVER')) {
    return 'Documents';
  }
  if (
    action.includes('WORKFLOW') ||
    action.includes('SUBMIT_APPLICATION') ||
    action.includes('COMPLETE_APPLICATION') ||
    action.includes('COA_RECORDED') ||
    action.includes('VISA_STAGE')
  ) {
    return 'Workflow';
  }
  if (action.includes('TASK')) {
    return 'Tasks';
  }
  if (
    action.includes('DEADLINE') ||
    action.includes('PROJECT')
  ) {
    return 'Deadlines';
  }
  return 'Remarks';
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    ASSIGN_STUDENT_TO_INTAKE: 'Student Assigned to Intake',
    REMOVE_STUDENT_FROM_INTAKE: 'Student Detached from Intake',
    CREATE_STUDENT: 'New Student Registered',
    DOCUMENT_STATUS_UPDATED: 'Document Status Updated',
    WORKFLOW_STAGE_UPDATED: 'Workflow Stage Recorded',
    APPLICATION_SUBMITTED: 'Submitted to University',
    SUBMIT_APPLICATION: 'Submitted to University',
    COA_RECORDED: 'CoA / Completion Recorded',
    ADVANCE_VISA_STAGE: 'Visa Stage Updated',
    CREATE_TASK: 'Task Assigned',
    COMPLETE_TASK: 'Task Completed',
    RESTORE_TASK: 'Task Reopened',
    REASSIGN_TASK: 'Task Reassigned',
    UPDATE_TASK: 'Task Updated',
    DELETE_TASK: 'Task Deleted',
    DEADLINE_CHANGED: 'Deadline Updated',
    UPDATE_PROJECT_STATUS: 'Campaign Status Updated',
    UPDATE_PROJECT_TEAM: 'Team Assignment Updated',
    UPDATE_PROJECT: 'Campaign Configuration Updated',
    CREATE_PROJECT: 'Intake Campaign Created',
    INTAKE_REMARK: 'Team Remark',
    UNIVERSITY_RESPONSE: 'University Response',
    TEAM_ACTIVITY: 'Team Activity',
    CREATE_HANDOVER: 'Document Handover Created',
    ACKNOWLEDGE_HANDOVER: 'Handover Acknowledged',
    FOLLOWUP_HANDOVER: 'Handover Follow-up',
  };
  return labels[action] || action.replace(/_/g, ' ');
}

function renderActionIcon(category: Exclude<ActivityCategory, 'All'>, action: string) {
  if (action.includes('SUBMIT_APPLICATION')) {
    return <Send className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />;
  }
  switch (category) {
    case 'Assignments':
      return <UserPlus className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />;
    case 'Documents':
      return <FileCheck2 className="w-4 h-4 text-[#16A34A] dark:text-[#34C26B] shrink-0" />;
    case 'Workflow':
      return <GitBranch className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />;
    case 'Tasks':
      return <ClipboardCheck className="w-4 h-4 text-[#D97706] dark:text-[#F0A030] shrink-0" />;
    case 'Deadlines':
      return <Calendar className="w-4 h-4 text-[#DC2626] dark:text-[#EF5350] shrink-0" />;
    default:
      return <MessageSquarePlus className="w-4 h-4 text-[#0F172A] dark:text-[#ECECEE] shrink-0" />;
  }
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ activities, onOpenLogActivity }) => {
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory>('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((entry) => {
        const cat = classifyAction(entry.action);
        if (categoryFilter !== 'All' && cat !== categoryFilter) return false;
        if (q) {
          const hay = `${entry.actorName} ${entry.action} ${entry.details}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [activities, categoryFilter, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, remark, university update..."
              className="w-full h-9 pl-8 pr-8 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] transition-colors"
            />
            {search && (
              <MotionButton
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear activity search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
              >
                <X className="w-3.5 h-3.5" />
              </MotionButton>
            )}
          </div>

          <div className="w-52">
            <MorphSelect value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ActivityCategory)}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="All Activity Types" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Activity Events</MorphSelectItem>
                <MorphSelectItem value="Assignments">Student Assignments</MorphSelectItem>
                <MorphSelectItem value="Documents">Document Updates & Handovers</MorphSelectItem>
                <MorphSelectItem value="Workflow">Submissions & Stage Actions</MorphSelectItem>
                <MorphSelectItem value="Tasks">Task Assignments & Completions</MorphSelectItem>
                <MorphSelectItem value="Deadlines">Deadlines & Campaign Config</MorphSelectItem>
                <MorphSelectItem value="Remarks">Remarks & University Responses</MorphSelectItem>
              </MorphSelectContent>
            </MorphSelect>
          </div>
        </div>

        <MotionButton
          type="button"
          onClick={onOpenLogActivity}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Log Remark / University Response
        </MotionButton>
      </div>

      {/* Chronological Timeline */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Activity className="w-8 h-8 text-[#64748B] dark:text-[#66666E] mx-auto opacity-60" />
            <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              {activities.length === 0
                ? 'No intake activity recorded yet'
                : 'No activity entries match the active filters'}
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#9A9AA2]">
              Student assignments, document status updates, task changes, submissions, and team remarks appear here chronologically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
            {filtered.map((entry) => {
              const cat = classifyAction(entry.action);
              const ts = entry.timestamp ? entry.timestamp.replace('T', ' ').slice(0, 16) : '';
              return (
                <div
                  key={entry.id}
                  className="p-4 flex items-start justify-between gap-4 hover:bg-[#F8FAFC]/60 dark:hover:bg-[#252528] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{renderActionIcon(cat, entry.action)}</div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                          {getActionLabel(entry.action)}
                        </span>
                        <span className="text-slate-300 dark:text-[#3A3A3F]">·</span>
                        <span className="font-medium text-[#1E40AF] dark:text-[#4C8DF6]">
                          {entry.actorName}
                        </span>
                        <span className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                          ({entry.actorRole === 'Admission_Manager' ? 'Admission Manager' : 'Consultant'})
                        </span>
                      </div>
                      <p className="text-xs text-[#0F172A]/85 dark:text-[#ECECEE] leading-relaxed">
                        {entry.details}
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ts}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
