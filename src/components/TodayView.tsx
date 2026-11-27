import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  FileCheck2,
  FolderKanban,
  Plane,
} from 'lucide-react';
import { AnimateIcon } from '@animate-ui/react/icons';
import { CircleCheckBig } from './animate-ui/icons/circle-check-big';
import { Plus } from './animate-ui/icons/plus';
import { Sun } from './animate-ui/icons/sun';
import {
  NavigationTab,
  Task,
  TaskCategory,
  TaskPriority,
} from '../types/task';
import {
  HandoverStats,
  IntakeProject,
  KoreanUniversity,
  StudentApplication,
  UserProfile,
} from '../types/pms';
import {
  addDaysToIsoDate,
  formatFullHeaderDate,
  formatReadableDate,
  getDaysDifference,
  isTaskOverdue,
  isTaskToday,
} from '../utils/dateUtils';
import type { CalendarTabMode } from './CalendarView';
import { TaskCard } from './TaskCard';
import { BulkTaskActionBar } from './BulkTaskActionBar';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';
import {
  MorphSelect,
  MorphSelectContent,
  MorphSelectItem,
  MorphSelectTrigger,
  MorphSelectValue,
} from './ui/MorphSelect';
import { MotionButton, StaggerContainer, StaggerItem, TabTransition } from './animations';

export type TodayFocusTab = 'today' | 'overdue' | 'completed';

interface TodayViewProps {
  tasks: Task[];
  todayIso: string;
  currentUser: UserProfile;
  team: UserProfile[];
  students: StudentApplication[];
  projects: IntakeProject[];
  universities: KoreanUniversity[];
  handoverStats: HandoverStats | null;
  defaultCategory: TaskCategory;
  defaultPriority: TaskPriority;
  onCreateTaskForDate: (dateIso: string) => void;
  onQuickAddTodayTask: (data: {
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    taskDate: string;
    deadline: string;
  }) => void;
  onRequestComplete: (task: Task) => void;
  onRestorePending: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
  onRescheduleToToday: (task: Task) => void;
  onRescheduleAllOverdueToToday: () => void;
  onReorderTasks: (sourceTaskId: string, targetTaskId: string, position: 'before' | 'after') => void;
  onMoveTask: (task: Task, direction: 'up' | 'down', listScope: Task[]) => void;
  onBulkCompleteTasks: (taskIds: string[]) => void;
  onBulkPostponeTasks: (taskIds: string[], mode: 'plus1' | 'today') => void;
  onBulkReassignTasks: (taskIds: string[], targetUserId: string) => void;
  onNavigateTo: (
    target: NavigationTab,
    options?: {
      calendarView?: CalendarTabMode;
      studentStage?: string;
      studentId?: string | null;
      projectId?: string | null;
      universityId?: string | null;
    }
  ) => void;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function priorityTextColor(priority: TaskPriority): string {
  switch (priority) {
    case 'Urgent':
    case 'High':
      return 'text-[#DC2626] dark:text-[#EF5350]';
    case 'Medium':
      return 'text-[#D97706] dark:text-[#F0A030]';
    default:
      return 'text-[#16A34A] dark:text-[#34C26B]';
  }
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  todayIso,
  currentUser,
  team,
  students,
  projects,
  universities,
  handoverStats,
  defaultCategory,
  defaultPriority,
  onCreateTaskForDate,
  onQuickAddTodayTask,
  onRequestComplete,
  onRestorePending,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onQuickReschedule,
  onRescheduleToToday,
  onRescheduleAllOverdueToToday,
  onReorderTasks,
  onMoveTask,
  onBulkCompleteTasks,
  onBulkPostponeTasks,
  onBulkReassignTasks,
  onNavigateTo,
}) => {
  const [focusTab, setFocusTab] = useState<TodayFocusTab>('today');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Minimal 1-line Quick Add
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>(defaultPriority);

  const tomorrowIso = useMemo(() => addDaysToIsoDate(todayIso, 1), [todayIso]);

  // Core task slices
  const todayTasks = useMemo(
    () => tasks.filter((t) => isTaskToday(t, todayIso)),
    [tasks, todayIso]
  );
  const todayPending = useMemo(
    () => todayTasks.filter((t) => t.status === 'Pending'),
    [todayTasks]
  );
  const todayCompleted = useMemo(
    () => todayTasks.filter((t) => t.status === 'Completed'),
    [todayTasks]
  );
  const overdueTasks = useMemo(
    () => tasks.filter((t) => isTaskOverdue(t, todayIso)),
    [tasks, todayIso]
  );
  const priorOverdueCount = useMemo(
    () => overdueTasks.filter((t) => t.taskDate < todayIso).length,
    [overdueTasks, todayIso]
  );

  const tomorrowTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'Pending' && t.taskDate === tomorrowIso)
        .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]),
    [tasks, tomorrowIso]
  );

  const completionPct = useMemo(
    () =>
      todayTasks.length > 0
        ? Math.round((todayCompleted.length / todayTasks.length) * 100)
        : 0,
    [todayTasks.length, todayCompleted.length]
  );

  const urgentHighCount = useMemo(
    () => todayPending.filter((t) => t.priority === 'Urgent' || t.priority === 'High').length,
    [todayPending]
  );

  // Operational Snapshot (Real PMS Data)
  const operationalInfo = useMemo(() => {
    const pendingHandovers =
      currentUser.team === 'Counseling Team'
        ? (handoverStats?.actionNeededRequestsAssignedToMe || 0) +
          (handoverStats?.myNeedsFollowUp || 0)
        : handoverStats?.myPendingVerifications ?? handoverStats?.pendingReceipts ?? 0;

    const embassyFilingCount = students.filter(
      (s) => s.visaStage === 'Embassy_Visa_Filing'
    ).length;

    const projectDeadlines = projects
      .filter((p) => p.status !== 'Completed' && p.status !== 'Archived' && Boolean(p.deadline))
      .map((p) => ({
        id: p.id,
        kind: 'project' as const,
        title: p.name,
        meta: p.intakeTerm,
        daysLeft: getDaysDifference(p.deadline, todayIso),
      }))
      .filter((d) => d.daysLeft <= 21 && d.daysLeft >= -7);

    const universityDeadlines = universities.flatMap((u) =>
      (u.intakes || [])
        .filter(
          (i) =>
            i.status !== 'Closed' &&
            i.status !== 'Archived' &&
            Boolean(i.applicationDeadline)
        )
        .map((i) => ({
          id: `${u.id}:${i.id}`,
          universityId: u.id,
          kind: 'university' as const,
          title: `${u.nameEn}`,
          meta: i.term,
          daysLeft: getDaysDifference(i.applicationDeadline, todayIso),
        }))
        .filter((d) => d.daysLeft <= 21 && d.daysLeft >= -7)
    );

    const upcomingDeadlines = [...projectDeadlines, ...universityDeadlines]
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);

    return {
      pendingHandovers,
      embassyFilingCount,
      upcomingDeadlines,
    };
  }, [currentUser.team, handoverStats, students, projects, universities, todayIso]);

  // Visible task list based on the 3 clean tabs + priority filter
  const sourceTasks = useMemo(() => {
    if (focusTab === 'overdue') return overdueTasks;
    if (focusTab === 'completed') return todayCompleted;
    // 'today' tab shows pending first, then completed today
    return [...todayPending, ...todayCompleted];
  }, [focusTab, overdueTasks, todayCompleted, todayPending]);

  const visibleTasks = useMemo(() => {
    const filtered =
      priorityFilter === 'All'
        ? sourceTasks
        : sourceTasks.filter((t) => t.priority === priorityFilter);

    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Pending' ? -1 : 1;
      const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (pDiff !== 0) return pDiff;
      if (a.scheduledTime && b.scheduledTime) {
        return a.scheduledTime.localeCompare(b.scheduledTime);
      }
      if (a.scheduledTime) return -1;
      if (b.scheduledTime) return 1;
      return 0;
    });
  }, [sourceTasks, priorityFilter]);

  const visibleIdSet = useMemo(() => new Set(visibleTasks.map((t) => t.id)), [visibleTasks]);
  const activeSelectedIds = useMemo(
    () => selectedIds.filter((id) => visibleIdSet.has(id)),
    [selectedIds, visibleIdSet]
  );
  const activeSelectedSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds]);
  const pendingSelectedCount = useMemo(
    () =>
      visibleTasks.filter((t) => activeSelectedSet.has(t.id) && t.status !== 'Completed')
        .length,
    [visibleTasks, activeSelectedSet]
  );

  const handleToggleSelect = (task: Task) => {
    setSelectedIds((prev) =>
      prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
    );
  };

  const handleInlineAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTodayTask({
      title: quickTitle.trim(),
      category: defaultCategory,
      priority: quickPriority,
      taskDate: todayIso,
      deadline: todayIso,
    });
    setQuickTitle('');
  };

  const tabs = useMemo(
    () => [
      {
        id: 'today',
        label: 'Today',
        trailing: <span className="tabular-nums opacity-75">{todayTasks.length}</span>,
      },
      {
        id: 'overdue',
        label: 'Overdue',
        trailing: <span className="tabular-nums opacity-75">{overdueTasks.length}</span>,
      },
      {
        id: 'completed',
        label: 'Completed',
        trailing: <span className="tabular-nums opacity-75">{todayCompleted.length}</span>,
      },
    ],
    [todayTasks.length, overdueTasks.length, todayCompleted.length]
  );

  return (
    <div className="space-y-5">
      {/* Clean Page Header (Airy, Unboxed, High Clarity) */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <Sun
              size={22}
              animateOnHover
              className="w-5 h-5 text-[#D97706] dark:text-[#F0A030] shrink-0"
            />
            <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-[#0F172A] dark:text-[#ECECEE]">
              Today
            </h1>
            <span className="text-sm text-[#64748B] dark:text-[#9A9AA2] font-normal hidden sm:inline">
              · {formatFullHeaderDate()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B] dark:text-[#9A9AA2] tabular-nums">
            <span>
              <strong className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                {todayPending.length}
              </strong>{' '}
              remaining
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="font-semibold text-[#16A34A] dark:text-[#34C26B]">
                {todayCompleted.length}
              </strong>{' '}
              completed
            </span>
            {urgentHighCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#DC2626] dark:text-[#EF5350] font-medium">
                  {urgentHighCount} urgent/high
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-20 h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#2E2E32] overflow-hidden inline-block align-middle">
                <span
                  className={`block h-full rounded-full transition-all duration-500 ${
                    todayTasks.length > 0 && completionPct === 100
                      ? 'bg-[#16A34A] dark:bg-[#34C26B]'
                      : 'bg-[#1E40AF] dark:bg-[#4C8DF6]'
                  }`}
                  style={{ width: `${completionPct}%` }}
                />
              </span>
              <span>{completionPct}%</span>
            </span>
          </div>
        </div>

        <AnimateIcon animateOnHover className="inline-flex shrink-0">
          <MotionButton
            type="button"
            onClick={() => onCreateTaskForDate(todayIso)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus size={14} className="w-3.5 h-3.5" />
            <span>New Task</span>
          </MotionButton>
        </AnimateIcon>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Focused Queue */}
        <div className="lg:col-span-8 space-y-4">
          {/* Streamlined 1-Line Quick Add + Single Toolbar */}
          <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none space-y-3.5">
            {/* Minimal Quick Add */}
            <form onSubmit={handleInlineAdd} className="flex items-center gap-2.5">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Add a task for today..."
                aria-label="Add a task for today"
                className="flex-1 min-w-0 h-9 px-3.5 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#9A9AA2] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
              <div className="w-28 shrink-0 hidden sm:block">
                <MorphSelect
                  value={quickPriority}
                  onValueChange={(v) => setQuickPriority(v as TaskPriority)}
                >
                  <MorphSelectTrigger aria-label="New task priority">
                    <MorphSelectValue placeholder="Priority" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="Urgent">Urgent</MorphSelectItem>
                    <MorphSelectItem value="High">High</MorphSelectItem>
                    <MorphSelectItem value="Medium">Medium</MorphSelectItem>
                    <MorphSelectItem value="Low">Low</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
              </div>
              <MotionButton
                type="submit"
                disabled={!quickTitle.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] disabled:opacity-45 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus size={14} className="w-3.5 h-3.5" />
                <span>Add</span>
              </MotionButton>
            </form>

            {/* Single Clean Filter Row */}
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-3">
              <RoundedSlidingTabs
                variant="segmented"
                label="Today view filter"
                tabs={tabs}
                value={focusTab}
                onValueChange={(v) => setFocusTab(v as TodayFocusTab)}
              />

              <div className="flex items-center gap-3 shrink-0">
                <div className="w-34">
                  <MorphSelect
                    value={priorityFilter}
                    onValueChange={(v) => setPriorityFilter(v as 'All' | TaskPriority)}
                  >
                    <MorphSelectTrigger aria-label="Filter by priority">
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

                {visibleTasks.length > 0 && (
                  <MotionButton
                    type="button"
                    onClick={() =>
                      activeSelectedIds.length === visibleTasks.length
                        ? setSelectedIds([])
                        : setSelectedIds(visibleTasks.map((t) => t.id))
                    }
                    className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline whitespace-nowrap shrink-0"
                  >
                    {activeSelectedIds.length === visibleTasks.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </MotionButton>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Task Action Bar (only appears when tasks are checked) */}
          <BulkTaskActionBar
            selectedCount={activeSelectedIds.length}
            totalSelectableCount={visibleTasks.length}
            pendingSelectedCount={pendingSelectedCount}
            team={team}
            onSelectAll={() => setSelectedIds(visibleTasks.map((t) => t.id))}
            onClearSelection={() => setSelectedIds([])}
            onBulkComplete={() => {
              onBulkCompleteTasks(activeSelectedIds);
              setSelectedIds([]);
            }}
            onBulkPostpone={(mode) => {
              onBulkPostponeTasks(activeSelectedIds, mode);
              setSelectedIds([]);
            }}
            onBulkReassign={(targetUserId) => {
              onBulkReassignTasks(activeSelectedIds, targetUserId);
              setSelectedIds([]);
            }}
          />

          {/* Compact Overdue Reminder Strip (when on Today tab and prior overdue exists) */}
          {focusTab === 'today' && priorOverdueCount > 0 && (
            <div className="bg-[#FEE2E2]/45 dark:bg-[rgba(239,83,80,0.10)] border border-[#DC2626]/25 dark:border-[#EF5350]/30 rounded-[12px] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#0F172A] dark:text-[#ECECEE]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF5350] shrink-0" />
                <span className="tabular-nums">
                  <strong>{priorOverdueCount}</strong> overdue{' '}
                  {priorOverdueCount === 1 ? 'task' : 'tasks'} from earlier days
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <MotionButton
                  type="button"
                  onClick={() => setFocusTab('overdue')}
                  className="font-medium text-[#DC2626] dark:text-[#EF5350] hover:underline whitespace-nowrap"
                >
                  Review
                </MotionButton>
                <span aria-hidden="true" className="text-[#CBD5E1] dark:text-[#3A3A3F]">
                  ·
                </span>
                <MotionButton
                  type="button"
                  onClick={onRescheduleAllOverdueToToday}
                  className="font-semibold text-[#1E40AF] dark:text-[#4C8DF6] hover:underline whitespace-nowrap"
                >
                  Move all to Today
                </MotionButton>
              </div>
            </div>
          )}

          {/* Overdue Action Strip (when viewing Overdue tab) */}
          {focusTab === 'overdue' && overdueTasks.length > 0 && (
            <div className="flex items-center justify-between px-1 text-xs text-[#64748B] dark:text-[#9A9AA2]">
              <span className="tabular-nums">
                Showing {visibleTasks.length} overdue{' '}
                {visibleTasks.length === 1 ? 'task' : 'tasks'}
              </span>
              <MotionButton
                type="button"
                onClick={onRescheduleAllOverdueToToday}
                className="font-semibold text-[#1E40AF] dark:text-[#4C8DF6] hover:underline whitespace-nowrap"
              >
                Move all to Today
              </MotionButton>
            </div>
          )}

          {/* All Caught Up Confirmation */}
          {focusTab === 'today' &&
            todayTasks.length > 0 &&
            todayPending.length === 0 &&
            priorityFilter === 'All' && (
              <div className="bg-[#DCFCE7]/60 dark:bg-[rgba(52,194,107,0.14)] border border-[#16A34A]/30 dark:border-[#34C26B]/30 rounded-[12px] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#15803d] dark:text-[#34C26B]">
                  <CircleCheckBig size={16} animateOnHover className="w-4 h-4 shrink-0" />
                  <span>All {todayTasks.length} tasks for today are completed.</span>
                </div>
                <MotionButton
                  type="button"
                  onClick={() => onNavigateTo('calendar', { calendarView: 'list' })}
                  className="text-xs font-medium text-[#15803d] dark:text-[#34C26B] hover:underline whitespace-nowrap shrink-0"
                >
                  View Upcoming →
                </MotionButton>
              </div>
            )}

          {/* Task List / Clean Empty State */}
          <TabTransition viewKey={`${focusTab}-${priorityFilter}`}>
            {visibleTasks.length === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-10 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] dark:bg-[#252528] flex items-center justify-center mx-auto text-[#1E40AF] dark:text-[#4C8DF6]">
                  <Sun size={18} animateOnHover className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    {priorityFilter !== 'All'
                      ? `No ${priorityFilter.toLowerCase()} priority tasks here`
                      : focusTab === 'overdue'
                      ? 'No overdue tasks'
                      : focusTab === 'completed'
                      ? 'No tasks completed today yet'
                      : 'Nothing scheduled for today yet'}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] max-w-sm mx-auto">
                    {priorityFilter !== 'All'
                      ? 'Switch back to All Priorities to see the rest of your list.'
                      : focusTab === 'overdue'
                      ? 'Everything is up to date.'
                      : 'Add a quick task above or schedule a deliverable for today.'}
                  </p>
                </div>
                <div className="pt-1">
                  {priorityFilter !== 'All' ? (
                    <MotionButton
                      type="button"
                      onClick={() => setPriorityFilter('All')}
                      className="inline-flex items-center h-8 px-3.5 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] rounded-lg hover:bg-[#DBEAFE] transition-colors"
                    >
                      Show All Priorities
                    </MotionButton>
                  ) : focusTab !== 'today' ? (
                    <MotionButton
                      type="button"
                      onClick={() => setFocusTab('today')}
                      className="inline-flex items-center h-8 px-3.5 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] rounded-lg hover:bg-[#DBEAFE] transition-colors"
                    >
                      Back to Today
                    </MotionButton>
                  ) : (
                    <MotionButton
                      type="button"
                      onClick={() => onCreateTaskForDate(todayIso)}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors"
                    >
                      <Plus size={14} className="w-3.5 h-3.5" />
                      <span>Schedule Task</span>
                    </MotionButton>
                  )}
                </div>
              </div>
            ) : (
              <StaggerContainer className="space-y-2">
                {visibleTasks.map((task, idx) => (
                  <StaggerItem key={task.id}>
                    <TaskCard
                      task={task}
                      selectable
                      selected={activeSelectedSet.has(task.id)}
                      onToggleSelect={handleToggleSelect}
                      onRequestComplete={onRequestComplete}
                      onRestorePending={onRestorePending}
                      onEdit={onEditTask}
                      onDuplicate={onDuplicateTask}
                      onDelete={onDeleteTask}
                      onQuickReschedule={onQuickReschedule}
                      onReorderTasks={onReorderTasks}
                      onMoveTask={(t, dir) => onMoveTask(t, dir, visibleTasks)}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < visibleTasks.length - 1}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </TabTransition>
        </div>

        {/* Right 4 Columns: Concise Informational Brief */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Card 1: Operations & Deadlines Pulse */}
          <section className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Operations Pulse
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTo('dashboard')}
                className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline whitespace-nowrap shrink-0"
              >
                Dashboard →
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
              <button
                type="button"
                onClick={() => onNavigateTo('document-handover')}
                className="w-full py-2.5 first:pt-0 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#252528]/60 -mx-2 px-2 rounded-md transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck2 className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                  <span className="text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                    Document Handovers Pending
                  </span>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    operationalInfo.pendingHandovers > 0
                      ? 'text-[#D97706] dark:text-[#F0A030]'
                      : 'text-[#64748B] dark:text-[#9A9AA2]'
                  }`}
                >
                  {operationalInfo.pendingHandovers}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onNavigateTo('students', { studentStage: 'Embassy_Visa_Filing' })
                }
                className="w-full py-2.5 last:pb-0 flex items-center justify-between gap-3 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#252528]/60 -mx-2 px-2 rounded-md transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Plane className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                  <span className="text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                    Embassy Visa Filing
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums text-[#0F172A] dark:text-[#ECECEE] shrink-0">
                  {operationalInfo.embassyFilingCount}
                </span>
              </button>
            </div>

            {operationalInfo.upcomingDeadlines.length > 0 && (
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] space-y-2">
                <div className="text-[11px] font-medium text-[#64748B] dark:text-[#9A9AA2]">
                  Upcoming Intake & University Deadlines
                </div>
                <div className="space-y-1.5">
                  {operationalInfo.upcomingDeadlines.map((item) => {
                    const dueLabel =
                      item.daysLeft < 0
                        ? `${Math.abs(item.daysLeft)}d overdue`
                        : item.daysLeft === 0
                        ? 'Due today'
                        : item.daysLeft === 1
                        ? 'Tomorrow'
                        : `${item.daysLeft}d left`;
                    const dueColor =
                      item.daysLeft <= 0
                        ? 'text-[#DC2626] dark:text-[#EF5350] font-semibold'
                        : item.daysLeft <= 5
                        ? 'text-[#D97706] dark:text-[#F0A030] font-semibold'
                        : 'text-[#64748B] dark:text-[#9A9AA2]';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          item.kind === 'project'
                            ? onNavigateTo('projects', { projectId: item.id })
                            : onNavigateTo('universities', {
                                universityId: item.universityId,
                              })
                        }
                        className="w-full text-left flex items-center justify-between gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-[#F8FAFC] dark:hover:bg-[#252528] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.kind === 'project' ? (
                            <FolderKanban className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
                          )}
                          <span className="text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                            {item.title}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] tabular-nums whitespace-nowrap shrink-0 ${dueColor}`}
                        >
                          {dueLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Card 2: Tomorrow Preview */}
          <section className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Tomorrow ({tomorrowTasks.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTo('calendar', { calendarView: 'list' })}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {tomorrowTasks.length === 0 ? (
              <p className="text-xs text-[#64748B] dark:text-[#9A9AA2]">
                No tasks scheduled for tomorrow yet.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {tomorrowTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] text-left truncate block w-full"
                      >
                        {task.title}
                      </button>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums">
                        <span className={priorityTextColor(task.priority)}>{task.priority}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatReadableDate(task.taskDate, todayIso)}</span>
                        {task.scheduledTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{task.scheduledTime}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <MotionButton
                      type="button"
                      onClick={() => onRescheduleToToday(task)}
                      className="text-[11px] font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline whitespace-nowrap shrink-0 mt-0.5"
                    >
                      Move to Today
                    </MotionButton>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};
