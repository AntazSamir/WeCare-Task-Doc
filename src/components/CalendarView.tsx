import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  List,
  CalendarDays,
  AlertTriangle,
  Sun,
  CalendarRange,
  CalendarClock,
  RotateCcw,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types/task';
import {
  formatReadableDate,
  generateMonthCalendarGrid,
  getLocalTodayIso,
  isTaskOverdue,
} from '../utils/dateUtils';
import {
  computeCalendarAndDeadlineMetrics,
  CalendarStatusFilter,
  DEFAULT_CALENDAR_FILTERS,
} from '../utils/calendarStats';
import { TaskCard } from './TaskCard';
import { BulkTaskActionBar } from './BulkTaskActionBar';
import { UserProfile } from '../types/pms';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from './ui/MorphSelect';
import { TabTransition, StaggerContainer, StaggerItem, MotionButton } from './animations';

export type CalendarTabMode = 'list' | 'month';

interface CalendarViewProps {
  tasks: Task[];
  team?: UserProfile[];
  activeTab?: CalendarTabMode;
  onTabChange?: (tab: CalendarTabMode) => void;
  embedded?: boolean;
  onCreateTaskForDate: (dateIso: string) => void;
  onRequestComplete: (task: Task) => void;
  onRestorePending: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
  onRescheduleTaskToDate?: (taskId: string, targetDateIso: string) => void;
  onBulkCompleteTasks?: (taskIds: string[]) => void;
  onBulkPostponeTasks?: (taskIds: string[], mode: 'plus1' | 'today') => void;
  onBulkReassignTasks?: (taskIds: string[], targetUserId: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  team = [],
  activeTab: controlledTab,
  onTabChange,
  embedded = false,
  onCreateTaskForDate,
  onRequestComplete,
  onRestorePending,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickReschedule,
  onRescheduleTaskToDate,
  onBulkCompleteTasks,
  onBulkPostponeTasks,
  onBulkReassignTasks,
}) => {
  const todayIso = getLocalTodayIso();
  const [initYear, initMonth] = todayIso.split('-').map(Number);

  const [internalTab, setInternalTab] = useState<CalendarTabMode>('month');
  const currentTab: CalendarTabMode = embedded
    ? 'month'
    : controlledTab ?? internalTab;

  const handleSelectTab = (tab: CalendarTabMode) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Shared filters across List and Month tabs
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>(
    DEFAULT_CALENDAR_FILTERS.priority
  );
  const [categoryFilter, setCategoryFilter] = useState<'All' | TaskCategory>(
    DEFAULT_CALENDAR_FILTERS.category
  );
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>(
    DEFAULT_CALENDAR_FILTERS.status
  );

  const hasActiveFilters =
    priorityFilter !== 'All' || categoryFilter !== 'All' || statusFilter !== 'All';

  const handleResetFilters = () => {
    setPriorityFilter('All');
    setCategoryFilter('All');
    setStatusFilter('All');
  };

  // Month grid state & drag-to-reschedule
  const [viewYear, setViewYear] = useState(initYear || new Date().getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState((initMonth || 1) - 1);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [dragOverDateIso, setDragOverDateIso] = useState<string | null>(null);

  // Multi-select state for List tab bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const gridCells = useMemo(
    () => generateMonthCalendarGrid(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  const monthTitle = useMemo(
    () =>
      new Date(viewYear, viewMonthIndex, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [viewYear, viewMonthIndex]
  );

  const handlePrevMonth = () => {
    if (viewMonthIndex === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIndex(11);
    } else {
      setViewMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIndex(0);
    } else {
      setViewMonthIndex((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const [y, m] = todayIso.split('-').map(Number);
    setViewYear(y);
    setViewMonthIndex(m - 1);
    setSelectedDateIso(todayIso);
  };

  const handleSelectCalendarCell = (dateIso: string, isCurrentMonth: boolean) => {
    setSelectedDateIso(dateIso);
    if (!isCurrentMonth) {
      const [y, m] = dateIso.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonthIndex(m - 1);
      }
    }
  };

  // Single shared calculation function for summary stats, List groups, and Month cell counts
  const metrics = useMemo(
    () =>
      computeCalendarAndDeadlineMetrics(tasks, todayIso, {
        priority: priorityFilter,
        category: categoryFilter,
        status: statusFilter,
      }),
    [tasks, todayIso, priorityFilter, categoryFilter, statusFilter]
  );

  const selectedDayMetrics = metrics.getCellMetrics(selectedDateIso);

  const allListTasks = useMemo(
    () => [
      ...metrics.overdueTasks,
      ...metrics.todayTasks,
      ...metrics.thisWeekTasks,
      ...metrics.laterTasks,
    ],
    [metrics.overdueTasks, metrics.todayTasks, metrics.thisWeekTasks, metrics.laterTasks]
  );

  const listTaskIdSet = useMemo(() => new Set(allListTasks.map((t) => t.id)), [allListTasks]);
  const activeSelectedIds = useMemo(
    () => selectedTaskIds.filter((id) => listTaskIdSet.has(id)),
    [selectedTaskIds, listTaskIdSet]
  );
  const activeSelectedSet = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds]);
  const pendingSelectedCount = useMemo(
    () => allListTasks.filter((t) => activeSelectedSet.has(t.id) && t.status !== 'Completed').length,
    [allListTasks, activeSelectedSet]
  );

  const canBulkAct = Boolean(onBulkCompleteTasks || onBulkPostponeTasks || onBulkReassignTasks);

  const handleToggleSelectTask = (task: Task) => {
    setSelectedTaskIds((prev) =>
      prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
    );
  };

  const handleSelectAllListTasks = () => {
    setSelectedTaskIds(allListTasks.map((t) => t.id));
  };

  const handleClearSelection = () => {
    setSelectedTaskIds([]);
  };

  return (
    <div className="space-y-5">
      {/* Unified Shared Header + Controls + Filters */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none space-y-4">
        {/* Top Row: Title + View Tabs + Month Nav (in Month view) + Single Add Task Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />
              <h1 className="text-xl font-bold text-[#0F172A] dark:text-[#ECECEE] leading-tight">
                {embedded ? monthTitle : 'Calendar'}
              </h1>
            </div>
            {!embedded && (
              <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] mt-1">
                Deadlines, schedule, and daily deliverables synchronized with Google Sheets
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* List / Month Switcher */}
            {!embedded && (
              <RoundedSlidingTabs
                variant="segmented"
                value={currentTab}
                stretch={0}
                blur={10}
                label="Calendar view mode"
                onValueChange={(id) => handleSelectTab(id as CalendarTabMode)}
                tabs={[
                  {
                    id: 'list',
                    label: 'List',
                    icon: <List className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'month',
                    label: 'Month',
                    icon: <CalendarDays className="w-3.5 h-3.5" />,
                  },
                ]}
              />
            )}

            {/* Month Controls (only in Month view) */}
            {currentTab === 'month' && (
              <>
                <MotionButton
                  type="button"
                  onClick={handleJumpToday}
                  className="h-8 px-3 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-white border border-[#E2E8F0] dark:border-[#2E2E32] dark:bg-[#252528] hover:bg-slate-50 dark:hover:bg-[#2E2E32] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  Today
                </MotionButton>
                <div className="flex items-center border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden h-8 bg-white dark:bg-[#252528]">
                  <MotionButton
                    type="button"
                    onClick={handlePrevMonth}
                    className="px-2 h-full text-[#64748B] dark:text-[#9A9AA2] hover:bg-slate-50 dark:hover:bg-[#2E2E32] transition-colors"
                    aria-label="Previous month"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </MotionButton>
                  <span className="px-2.5 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] font-numeric tabular-nums whitespace-nowrap border-l border-[#E2E8F0] dark:border-[#2E2E32]">
                    {monthTitle}
                  </span>
                  <MotionButton
                    type="button"
                    onClick={handleNextMonth}
                    className="px-2 h-full text-[#64748B] dark:text-[#9A9AA2] hover:bg-slate-50 dark:hover:bg-[#2E2E32] transition-colors border-l border-[#E2E8F0] dark:border-[#2E2E32]"
                    aria-label="Next month"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </MotionButton>
                </div>
              </>
            )}

            {/* Single Primary Add Task Action */}
            <MotionButton
              type="button"
              onClick={() =>
                onCreateTaskForDate(currentTab === 'month' ? selectedDateIso : todayIso)
              }
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </MotionButton>
          </div>
        </div>

        {/* Shared Filters Bar (Applies to Both List & Month Tabs) */}
        <div className="pt-3.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-36">
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

            <div className="w-40">
              <MorphSelect
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as 'All' | TaskCategory)}
              >
                <MorphSelectTrigger aria-label="Filter by category">
                  <MorphSelectValue placeholder="Category" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="All">All Categories</MorphSelectItem>
                  <MorphSelectItem value="Work">Work</MorphSelectItem>
                  <MorphSelectItem value="Study">Study</MorphSelectItem>
                  <MorphSelectItem value="Business">Business</MorphSelectItem>
                  <MorphSelectItem value="Personal">Personal</MorphSelectItem>
                  <MorphSelectItem value="Other">Other</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div className="w-36">
              <MorphSelect
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as CalendarStatusFilter)}
              >
                <MorphSelectTrigger aria-label="Filter by status">
                  <MorphSelectValue placeholder="Status" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="All">All Statuses</MorphSelectItem>
                  <MorphSelectItem value="Pending">Pending</MorphSelectItem>
                  <MorphSelectItem value="Completed">Completed</MorphSelectItem>
                  <MorphSelectItem value="Overdue">Overdue</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            {hasActiveFilters && (
              <MotionButton
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 h-9 px-2.5 text-xs font-medium text-[#64748B] dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] rounded-lg border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#2E2E32] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset filters</span>
              </MotionButton>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentTab === 'list' && canBulkAct && allListTasks.length > 0 && (
              <MotionButton
                type="button"
                onClick={
                  activeSelectedIds.length === allListTasks.length
                    ? handleClearSelection
                    : handleSelectAllListTasks
                }
                className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
              >
                {activeSelectedIds.length === allListTasks.length
                  ? 'Deselect all'
                  : `Select all (${allListTasks.length})`}
              </MotionButton>
            )}
            <div className="text-xs text-[#64748B] dark:text-[#9A9AA2] font-numeric tabular-nums">
              Showing {metrics.filteredTasks.length} of {tasks.length}{' '}
              {tasks.length === 1 ? 'task' : 'tasks'}
            </div>
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <TabTransition viewKey={currentTab}>
        {currentTab === 'list' ? (
          <div className="space-y-6">
            {/* List Summary Stats Strip (Single Source of Truth) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#DC2626] dark:text-[#EF5350]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Overdue</span>
                </div>
                <div
                  className={`mt-1.5 text-2xl font-bold font-numeric tabular-nums ${
                    metrics.overdueCount === 0
                      ? 'text-[#0F172A] dark:text-[#66666E]'
                      : 'text-[#DC2626] dark:text-[#EF5350]'
                  }`}
                >
                  {metrics.overdueCount}
                </div>
              </div>

              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6]">
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                  <span>Today</span>
                </div>
                <div
                  className={`mt-1.5 text-2xl font-bold font-numeric tabular-nums ${
                    metrics.todayCount === 0
                      ? 'text-[#0F172A] dark:text-[#66666E]'
                      : 'text-[#1E40AF] dark:text-[#ECECEE]'
                  }`}
                >
                  {metrics.todayCount}
                </div>
              </div>

              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#D97706] dark:text-[#F0A030]">
                  <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                  <span>This Week (1–7d)</span>
                </div>
                <div
                  className={`mt-1.5 text-2xl font-bold font-numeric tabular-nums ${
                    metrics.thisWeekCount === 0
                      ? 'text-[#0F172A] dark:text-[#66666E]'
                      : 'text-[#D97706] dark:text-[#F0A030]'
                  }`}
                >
                  {metrics.thisWeekCount}
                </div>
              </div>

              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-[#9A9AA2]">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  <span>Later (8d+)</span>
                </div>
                <div
                  className={`mt-1.5 text-2xl font-bold font-numeric tabular-nums ${
                    metrics.laterCount === 0
                      ? 'text-[#0F172A] dark:text-[#66666E]'
                      : 'text-[#0F172A] dark:text-[#ECECEE]'
                  }`}
                >
                  {metrics.laterCount}
                </div>
              </div>
            </div>

            {/* Bulk Task Action Bar (List Tab) */}
            {canBulkAct && (
              <BulkTaskActionBar
                selectedCount={activeSelectedIds.length}
                totalSelectableCount={allListTasks.length}
                pendingSelectedCount={pendingSelectedCount}
                team={team}
                onSelectAll={handleSelectAllListTasks}
                onClearSelection={handleClearSelection}
                onBulkComplete={() => {
                  onBulkCompleteTasks?.(activeSelectedIds);
                  handleClearSelection();
                }}
                onBulkPostpone={(mode) => {
                  onBulkPostponeTasks?.(activeSelectedIds, mode);
                  handleClearSelection();
                }}
                onBulkReassign={
                  onBulkReassignTasks
                    ? (targetUserId) => {
                        onBulkReassignTasks(activeSelectedIds, targetUserId);
                        handleClearSelection();
                      }
                    : undefined
                }
              />
            )}

            {metrics.totalGroupedCount === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-12 text-center space-y-2.5">
                <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                  {hasActiveFilters
                    ? 'No matching tasks found for the selected filters'
                    : 'No overdue, today, or upcoming tasks scheduled'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] max-w-md mx-auto">
                  {hasActiveFilters
                    ? 'Try resetting the priority, category, or status filters above, or switch to the Month view.'
                    : 'Use the Add Task button in the header to schedule a new deadline and sync with Google Sheets.'}
                </p>
                {hasActiveFilters && (
                  <div className="pt-1">
                    <MotionButton
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] rounded-lg hover:bg-[#dbeafe] transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Filters
                    </MotionButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group 1: Overdue (Top of List View) */}
                {metrics.overdueTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#DC2626]/25 dark:border-[#EF5350]/30">
                      <h2 className="text-sm font-semibold text-[#DC2626] dark:text-[#EF5350] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Overdue</span>
                        <span className="font-numeric tabular-nums text-xs text-[#DC2626]/80 dark:text-[#EF5350]/80">
                          ({metrics.overdueTasks.length})
                        </span>
                      </h2>
                    </div>
                    <div className="space-y-2.5">
                      {metrics.overdueTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onRequestComplete={onRequestComplete}
                          onRestorePending={onRestorePending}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          onQuickReschedule={onQuickReschedule}
                          selectable={canBulkAct}
                          selected={activeSelectedSet.has(task.id)}
                          onToggleSelect={handleToggleSelectTask}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Group 2: Today */}
                {metrics.todayTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                      <h2 className="text-sm font-semibold text-[#1E40AF] dark:text-[#4C8DF6] flex items-center gap-2">
                        <span>Today</span>
                        <span className="font-numeric tabular-nums text-xs text-[#64748B] dark:text-[#9A9AA2]">
                          ({metrics.todayTasks.length}) · {formatReadableDate(todayIso, todayIso)}
                        </span>
                      </h2>
                    </div>
                    <div className="space-y-2.5">
                      {metrics.todayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onRequestComplete={onRequestComplete}
                          onRestorePending={onRestorePending}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          onQuickReschedule={onQuickReschedule}
                          selectable={canBulkAct}
                          selected={activeSelectedSet.has(task.id)}
                          onToggleSelect={handleToggleSelectTask}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Group 3: This Week */}
                {metrics.thisWeekTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                      <h2 className="text-sm font-semibold text-[#D97706] dark:text-[#F0A030] flex items-center gap-2">
                        <span>This Week (Next 1–7 Days)</span>
                        <span className="font-numeric tabular-nums text-xs text-[#64748B] dark:text-[#9A9AA2]">
                          ({metrics.thisWeekTasks.length})
                        </span>
                      </h2>
                    </div>
                    <div className="space-y-2.5">
                      {metrics.thisWeekTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onRequestComplete={onRequestComplete}
                          onRestorePending={onRestorePending}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          onQuickReschedule={onQuickReschedule}
                          selectable={canBulkAct}
                          selected={activeSelectedSet.has(task.id)}
                          onToggleSelect={handleToggleSelectTask}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Group 4: Later */}
                {metrics.laterTasks.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                      <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                        <span>Later Milestones</span>
                        <span className="font-numeric tabular-nums text-xs text-[#64748B] dark:text-[#9A9AA2]">
                          ({metrics.laterTasks.length})
                        </span>
                      </h2>
                    </div>
                    <div className="space-y-2.5">
                      {metrics.laterTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onRequestComplete={onRequestComplete}
                          onRestorePending={onRestorePending}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          onQuickReschedule={onQuickReschedule}
                          selectable={canBulkAct}
                          selected={activeSelectedSet.has(task.id)}
                          onToggleSelect={handleToggleSelectTask}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MONTH TAB: Compact Calendar Grid + Selected-Day Task Panel */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Month Grid */}
            <div className="lg:col-span-5 xl:col-span-5 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
              <div className="grid grid-cols-7 border-b border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#161616]">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2.5 text-center text-[12px] font-semibold text-[#64748B] dark:text-[#9A9AA2]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {gridCells.map((cell) => {
                  const cellMetrics = metrics.getCellMetrics(cell.dateIso);
                  const isToday = cell.dateIso === todayIso;
                  const isSelected = cell.dateIso === selectedDateIso;
                  const isDragTarget = dragOverDateIso === cell.dateIso;

                  return (
                    <button
                      key={cell.dateIso}
                      type="button"
                      onClick={() =>
                        handleSelectCalendarCell(cell.dateIso, cell.isCurrentMonth)
                      }
                      onDragOver={(e) => {
                        if (!onRescheduleTaskToDate) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverDateIso !== cell.dateIso) {
                          setDragOverDateIso(cell.dateIso);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverDateIso === cell.dateIso) {
                          setDragOverDateIso(null);
                        }
                      }}
                      onDrop={(e) => {
                        if (!onRescheduleTaskToDate) return;
                        e.preventDefault();
                        const taskId = e.dataTransfer.getData('text/plain');
                        setDragOverDateIso(null);
                        if (taskId) {
                          onRescheduleTaskToDate(taskId, cell.dateIso);
                          handleSelectCalendarCell(cell.dateIso, cell.isCurrentMonth);
                        }
                      }}
                      aria-label={`${cell.dateIso}${
                        cellMetrics.total > 0 ? `, ${cellMetrics.tooltip}` : ''
                      }`}
                      className={`min-h-[64px] sm:min-h-[70px] p-2 text-left flex flex-col justify-between transition-colors ${
                        !cell.isCurrentMonth
                          ? 'bg-[#F8FAFC] dark:bg-[#161616] text-[#64748B]/50 dark:text-[#66666E]'
                          : 'bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#0F172A] dark:text-[#ECECEE]'
                      } ${
                        isDragTarget
                          ? 'ring-2 ring-inset ring-dashed ring-[#1E40AF] dark:ring-[#4C8DF6] bg-[#EFF6FF]/90 dark:bg-[rgba(76,141,246,0.22)]'
                          : isSelected
                          ? 'ring-2 ring-inset ring-[#1E40AF] dark:ring-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)]'
                          : 'hover:bg-slate-50 dark:hover:bg-[#252528]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-[12px] font-numeric tabular-nums w-5 h-5 rounded flex items-center justify-center ${
                            isToday
                              ? 'bg-[#1E40AF] dark:bg-[#4C8DF6] text-white font-semibold'
                              : 'font-medium'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cellMetrics.total > 0 && (
                          <span
                            title={cellMetrics.tooltip}
                            className="text-[10px] font-numeric tabular-nums text-[#64748B] dark:text-[#9A9AA2] px-0.5 rounded hover:text-[#0F172A] dark:hover:text-[#ECECEE]"
                          >
                            {cellMetrics.completed}/{cellMetrics.total}
                          </span>
                        )}
                      </div>

                      {/* Colored Dot Indicators */}
                      {cellMetrics.total > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {cellMetrics.tasks.slice(0, 3).map((t) => {
                            const isComp = t.status === 'Completed';
                            const isOver = isTaskOverdue(t, todayIso);
                            const dotBg = isComp
                              ? 'bg-[#16A34A] dark:bg-[#34C26B]'
                              : isOver || t.priority === 'Urgent' || t.priority === 'High'
                              ? 'bg-[#DC2626] dark:bg-[#EF5350]'
                              : t.priority === 'Medium'
                              ? 'bg-[#D97706] dark:bg-[#F0A030]'
                              : 'bg-[#1E40AF] dark:bg-[#4C8DF6]';
                            return (
                              <span
                                key={t.id}
                                className={`w-1.5 h-1.5 rounded-full ${dotBg}`}
                                title={`${t.title} (${t.status})`}
                              />
                            );
                          })}
                          {cellMetrics.total > 3 && (
                            <span className="text-[9px] font-numeric tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                              +{cellMetrics.total - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dot Legend */}
              <div className="px-3.5 py-2.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#161616] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] dark:bg-[#EF5350]" />
                  <span>High priority / Overdue</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D97706] dark:bg-[#F0A030]" />
                  <span>Medium</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#34C26B]" />
                  <span>Completed</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6]" />
                  <span>Low</span>
                </span>
              </div>
            </div>

            {/* Selected Date Agenda Panel (Uses Shared TaskCard Component) */}
            <div className="lg:col-span-7 xl:col-span-7 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
              <TabTransition viewKey={selectedDateIso} className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#2E2E32] pb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[16px] font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                        {formatReadableDate(selectedDateIso, todayIso)}
                      </h2>
                      {selectedDateIso === todayIso && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] dark:bg-[rgba(239,83,80,0.14)] dark:text-[#EF5350] rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-numeric tabular-nums text-[#64748B] dark:text-[#9A9AA2] mt-0.5">
                      {selectedDateIso} · {selectedDayMetrics.total}{' '}
                      {selectedDayMetrics.total === 1 ? 'task' : 'tasks'}
                      {selectedDayMetrics.total > 0 && (
                        <span>
                          {' '}
                          ({selectedDayMetrics.pending} pending, {selectedDayMetrics.completed}{' '}
                          completed)
                        </span>
                      )}
                    </p>
                  </div>
                  {onRescheduleTaskToDate && selectedDayMetrics.tasks.length > 0 && (
                    <span className="hidden sm:inline-flex items-center text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                      Drag a task onto any day to reschedule
                    </span>
                  )}
                </div>

                {selectedDayMetrics.tasks.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      {hasActiveFilters
                        ? `No matching tasks on ${formatReadableDate(selectedDateIso, todayIso)}`
                        : `No tasks scheduled for ${formatReadableDate(selectedDateIso, todayIso)}`}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#9A9AA2]">
                      {hasActiveFilters
                        ? 'Try adjusting or resetting the active filters above.'
                        : 'Use the Add Task button above to schedule a task for this date.'}
                    </p>
                    {hasActiveFilters && (
                      <div className="pt-2">
                        <MotionButton
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] rounded-lg hover:bg-[#dbeafe] transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset Filters
                        </MotionButton>
                      </div>
                    )}
                  </div>
                ) : (
                  <StaggerContainer className="space-y-3">
                    {selectedDayMetrics.tasks.map((task) => (
                      <StaggerItem key={task.id}>
                        <TaskCard
                          task={task}
                          draggable={Boolean(onRescheduleTaskToDate)}
                          onRequestComplete={onRequestComplete}
                          onRestorePending={onRestorePending}
                          onEdit={onEdit}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          onQuickReschedule={onQuickReschedule}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </TabTransition>
            </div>
          </div>
        )}
      </TabTransition>
    </div>
  );
};
