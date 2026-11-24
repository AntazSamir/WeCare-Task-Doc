import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  UserCog,
  ClipboardList,
  Users,
  X,
} from 'lucide-react';
import { PmsTask, UserProfile } from '../../types/pms';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from '../ui/MorphSelect';
import { MotionButton } from '../animations';

interface TasksTabProps {
  tasks: PmsTask[];
  taskSummary: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
  team: UserProfile[];
  currentUser: UserProfile;
  onCreateIntakeTask: () => void;
  onRequestCompleteTask: (task: PmsTask) => void;
  onRestoreTaskToPending: (task: PmsTask) => void;
  onRequestDeleteTask: (task: PmsTask) => void;
  onOpenReassignModal: (task: PmsTask) => void;
}

const PRIORITY_TEXT_CLASS: Record<string, string> = {
  Urgent: 'text-[#DC2626] dark:text-[#EF5350] font-semibold',
  High: 'text-[#D97706] dark:text-[#F0A030] font-semibold',
  Medium: 'text-[#1E40AF] dark:text-[#4C8DF6] font-medium',
  Low: 'text-[#64748B] dark:text-[#9A9AA2]',
};

export const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  taskSummary,
  team,
  currentUser,
  onCreateIntakeTask,
  onRequestCompleteTask,
  onRestoreTaskToPending,
  onRequestDeleteTask,
  onOpenReassignModal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Overdue' | 'Completed'>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  const todayStr = new Date().toISOString().slice(0, 10);
  const isAdmin = currentUser.role === 'Admission_Manager';

  const teamProgress = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        avatar?: string;
        teamLabel: string;
        total: number;
        completed: number;
        pending: number;
        overdue: number;
      }
    >();

    for (const t of tasks) {
      const uid = t.assignedToId || 'unassigned';
      const member = team.find((m) => m.id === uid);
      const existing = map.get(uid) || {
        id: uid,
        name: t.assignedToName || member?.name || 'Unassigned',
        avatar: t.assigneeAvatar || member?.avatar,
        teamLabel: t.assigneeTeam || t.team || member?.team || 'Team',
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
      };

      existing.total += 1;
      if (t.status === 'Completed') {
        existing.completed += 1;
      } else {
        existing.pending += 1;
        if (t.deadline && t.deadline < todayStr) {
          existing.overdue += 1;
        }
      }
      map.set(uid, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tasks, team, todayStr]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const isOverdue = t.status === 'Pending' && Boolean(t.deadline) && t.deadline < todayStr;
      if (statusFilter === 'Pending' && t.status !== 'Pending') return false;
      if (statusFilter === 'Completed' && t.status !== 'Completed') return false;
      if (statusFilter === 'Overdue' && !isOverdue) return false;
      if (assigneeFilter !== 'All' && t.assignedToId !== assigneeFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (q) {
        const hay = `${t.title} ${t.description || ''} ${t.studentName || ''} ${t.assignedToName || ''} ${t.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, statusFilter, assigneeFilter, priorityFilter, todayStr]);

  return (
    <div className="space-y-4">
      {/* Compact KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Total Intake Tasks</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${taskSummary.total === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
            {taskSummary.total}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">linked to this campaign</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Pending Tasks</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${taskSummary.pending === 0 ? 'text-[#D97706] dark:text-[#66666E]' : 'text-[#D97706] dark:text-[#F0A030]'}`}>
            {taskSummary.pending}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">active deliverables</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Overdue Tasks</div>
          <div
            className={`mt-1 text-xl font-bold tabular-nums ${
              taskSummary.overdue > 0 ? 'text-[#DC2626] dark:text-[#EF5350]' : 'text-[#0F172A] dark:text-[#66666E]'
            }`}
          >
            {taskSummary.overdue}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">past due date</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Completed Tasks</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${taskSummary.completed === 0 ? 'text-[#16A34A] dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}`}>
            {taskSummary.completed}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
            {taskSummary.total > 0
              ? `${Math.round((taskSummary.completed / taskSummary.total) * 100)}% completion rate`
              : 'no tasks yet'}
          </div>
        </div>
      </div>

      {/* Individual Team Member Progress Breakdown */}
      {teamProgress.length > 0 && (
        <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
              Team Workload & Completion Progress
            </h3>
            <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
              {teamProgress.length} active assignee{teamProgress.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamProgress.map((member) => {
              const pct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
              return (
                <div
                  key={member.id}
                  onClick={() => setAssigneeFilter(assigneeFilter === member.id ? 'All' : member.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    assigneeFilter === member.id
                      ? 'bg-[#EFF6FF]/60 dark:bg-[rgba(76,141,246,0.14)] border-[#1E40AF] dark:border-[#4C8DF6]'
                      : 'bg-[#F8FAFC] dark:bg-[#252528] border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF]/40 dark:hover:border-[#3A3A3F]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {member.avatar && (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-[#64748B] dark:text-[#9A9AA2] truncate">
                          {member.teamLabel}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] tabular-nums shrink-0">
                      <span className="font-bold text-[#0F172A] dark:text-[#ECECEE]">
                        {member.completed}/{member.total}
                      </span>
                      {member.overdue > 0 && (
                        <div className="text-[10px] font-semibold text-[#DC2626] dark:text-[#EF5350]">
                          {member.overdue} overdue
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-slate-200 dark:bg-[#2E2E32] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-[#16A34A] dark:bg-[#34C26B]' : 'bg-[#1E40AF] dark:bg-[#4C8DF6]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search, Filters & Create Task Toolbar */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[190px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search task title, student, assignee..."
              className="w-full h-9 pl-8 pr-8 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] transition-colors"
            />
            {search && (
              <MotionButton
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear intake task search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
              >
                <X className="w-3.5 h-3.5" />
              </MotionButton>
            )}
          </div>

          <div className="w-40">
            <MorphSelect value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Status" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Statuses</MorphSelectItem>
                <MorphSelectItem value="Pending">Pending</MorphSelectItem>
                <MorphSelectItem value="Overdue">Overdue Only</MorphSelectItem>
                <MorphSelectItem value="Completed">Completed</MorphSelectItem>
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="w-44">
            <MorphSelect value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Assignee" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Team Members</MorphSelectItem>
                {team.map((m) => (
                  <MorphSelectItem key={m.id} value={m.id}>
                    {m.name}
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="w-36">
            <MorphSelect value={priorityFilter} onValueChange={setPriorityFilter}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Priority" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Priorities</MorphSelectItem>
                <MorphSelectItem value="Urgent">Urgent</MorphSelectItem>
                <MorphSelectItem value="High">High</MorphSelectItem>
                <MorphSelectItem value="Medium">Medium</MorphSelectItem>
                <MorphSelectItem value="Low">Low</MorphSelectItem>
              </MorphSelectContent>
            </MorphSelect>
          </div>
        </div>

        <MotionButton
          type="button"
          onClick={onCreateIntakeTask}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Intake Task
        </MotionButton>
      </div>

      {/* Tasks Data Table */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <ClipboardList className="w-8 h-8 text-[#64748B] dark:text-[#66666E] mx-auto opacity-60" />
            <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              {tasks.length === 0
                ? 'No tasks assigned to this intake campaign yet'
                : 'No intake tasks match the selected filters'}
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] max-w-md mx-auto">
              {tasks.length === 0
                ? 'Create a consultancy or admission task linked directly to this intake campaign.'
                : 'Reset filters or search terms to view all intake tasks.'}
            </p>
            {tasks.length === 0 && (
              <MotionButton
                type="button"
                onClick={onCreateIntakeTask}
                className="h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors"
              >
                Create First Intake Task
              </MotionButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed text-left border-collapse text-xs">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '33%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2]">
                  <th className="py-2.5 px-4">Done</th>
                  <th className="py-2.5 px-4">Task & Context</th>
                  <th className="py-2.5 px-4">Assignee & Team</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Deadline</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {filteredTasks.map((task) => {
                  const isCompleted = task.status === 'Completed';
                  const isOverdue = !isCompleted && Boolean(task.deadline) && task.deadline < todayStr;
                  const subtasksDone = (task.subtasks || []).filter((s) => s.completed).length;
                  const subtasksTotal = (task.subtasks || []).length;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-[#F8FAFC]/80 dark:hover:bg-[#252528] transition-colors"
                    >
                      <td className="py-3 px-4 align-top">
                        <MotionButton
                          type="button"
                          onClick={() =>
                            isCompleted ? onRestoreTaskToPending(task) : onRequestCompleteTask(task)
                          }
                          title={isCompleted ? 'Restore to Pending' : 'Mark Task Completed'}
                          className="text-[#64748B] dark:text-[#9A9AA2] hover:text-[#16A34A] dark:hover:text-[#34C26B] transition-colors mt-0.5"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#34C26B]" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </MotionButton>
                      </td>

                      <td className="py-3 px-4">
                        <div
                          className={`font-semibold truncate ${
                            isCompleted
                              ? 'line-through text-[#64748B] dark:text-[#66666E]'
                              : 'text-[#0F172A] dark:text-[#ECECEE]'
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                          {task.studentName && (
                            <span className="text-[#1E40AF] dark:text-[#4C8DF6] font-medium truncate">
                              Student: {task.studentName}
                            </span>
                          )}
                          {subtasksTotal > 0 && (
                            <span className="tabular-nums">
                              Subtasks: {subtasksDone}/{subtasksTotal}
                            </span>
                          )}
                          {task.syncState === 'synced' && (
                            <span className="text-[#16A34A] dark:text-[#34C26B]">Sheet Synced</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {task.assigneeAvatar && (
                            <img
                              src={task.assigneeAvatar}
                              alt={task.assignedToName || ''}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                              {task.assignedToName || 'Unassigned'}
                            </div>
                            <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] truncate">
                              {task.assigneeTeam || task.team || 'Admission Team'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={PRIORITY_TEXT_CLASS[task.priority] || 'text-[#0F172A] dark:text-[#ECECEE]'}>
                          {task.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 tabular-nums">
                        <div
                          className={`inline-flex items-center gap-1 font-medium ${
                            isOverdue
                              ? 'text-[#DC2626] dark:text-[#EF5350] font-semibold'
                              : 'text-[#0F172A] dark:text-[#ECECEE]'
                          }`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF5350]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2]" />
                          )}
                          {task.deadline}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isCompleted ? (
                          <span className="text-[#16A34A] dark:text-[#34C26B] font-semibold">
                            Completed
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[#DC2626] dark:text-[#EF5350] font-semibold">
                            Overdue
                          </span>
                        ) : (
                          <span className="text-[#D97706] dark:text-[#F0A030] font-medium">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isAdmin && (
                            <MotionButton
                              type="button"
                              onClick={() => onOpenReassignModal(task)}
                              title="Reassign or adjust task priority/deadline"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1E40AF] dark:text-[#4C8DF6] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] rounded transition-colors"
                            >
                              <UserCog className="w-3 h-3" />
                              Reassign
                            </MotionButton>
                          )}
                          <MotionButton
                            type="button"
                            onClick={() => onRequestDeleteTask(task)}
                            title="Delete task"
                            className="p-1 text-[#64748B] dark:text-[#9A9AA2] hover:text-[#DC2626] dark:hover:text-[#EF5350] rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </MotionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
