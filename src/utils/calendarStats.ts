import { Task, TaskCategory, TaskPriority } from '../types/task';
import {
  getDaysDifference,
  getLocalTodayIso,
  isTaskOverdue,
} from './dateUtils';

export type CalendarStatusFilter = 'All' | 'Pending' | 'Completed' | 'Overdue';

export interface CalendarTaskFilters {
  priority: 'All' | TaskPriority;
  category: 'All' | TaskCategory;
  status: CalendarStatusFilter;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarTaskFilters = {
  priority: 'All',
  category: 'All',
  status: 'All',
};

export interface CalendarCellMetrics {
  tasks: Task[];
  total: number;
  completed: number;
  pending: number;
  tooltip: string;
}

export interface CalendarSidebarBadge {
  count: number;
  tone: 'red' | 'blue';
  tooltip: string;
}

export interface CalendarAndDeadlineMetrics {
  todayIso: string;
  filteredTasks: Task[];
  overdueTasks: Task[];
  todayTasks: Task[];
  thisWeekTasks: Task[];
  laterTasks: Task[];
  overdueCount: number;
  todayCount: number;
  dueTodayCount: number;
  thisWeekCount: number;
  laterCount: number;
  totalGroupedCount: number;
  sidebarBadge?: CalendarSidebarBadge;
  getCellMetrics: (dateIso: string) => CalendarCellMetrics;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function sortTasksForAgenda(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'Completed' ? 1 : -1;
    }
    const prioDiff = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
    if (prioDiff !== 0) return prioDiff;

    const dateA = a.deadline || a.taskDate || '';
    const dateB = b.deadline || b.taskDate || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    if (a.scheduledTime && b.scheduledTime) {
      return a.scheduledTime.localeCompare(b.scheduledTime);
    }
    return 0;
  });
}

function sortTasksChronologically(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'Completed' ? 1 : -1;
    }
    const dateA = a.deadline || a.taskDate || '';
    const dateB = b.deadline || b.taskDate || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const timeA = a.scheduledTime || '23:59';
    const timeB = b.scheduledTime || '23:59';
    if (timeA !== timeB) return timeA.localeCompare(timeB);

    return (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
  });
}

export function getTaskPrimaryDate(task: Task): string {
  return task.deadline || task.taskDate || '';
}

export function doesTaskBelongToDate(task: Task, dateIso: string): boolean {
  return task.taskDate === dateIso || task.deadline === dateIso;
}

export function filterCalendarTasks(
  tasks: Task[],
  filters: Partial<CalendarTaskFilters> = {},
  todayIso = getLocalTodayIso()
): Task[] {
  const priority = filters.priority ?? 'All';
  const category = filters.category ?? 'All';
  const status = filters.status ?? 'All';

  return tasks.filter((task) => {
    if (priority !== 'All' && task.priority !== priority) return false;
    if (category !== 'All' && task.category !== category) return false;
    if (status === 'Pending' && task.status !== 'Pending') return false;
    if (status === 'Completed' && task.status !== 'Completed') return false;
    if (status === 'Overdue' && !isTaskOverdue(task, todayIso)) return false;
    return true;
  });
}

/**
 * Single source of truth for sidebar Calendar badge, List view summary stats & groups,
 * and Month view calendar cell counts / selected-day agenda.
 */
export function computeCalendarAndDeadlineMetrics(
  tasks: Task[],
  todayIso = getLocalTodayIso(),
  filters?: Partial<CalendarTaskFilters>
): CalendarAndDeadlineMetrics {
  const filteredTasks = filterCalendarTasks(tasks, filters, todayIso);

  const overdueRaw: Task[] = [];
  const todayRaw: Task[] = [];
  const thisWeekRaw: Task[] = [];
  const laterRaw: Task[] = [];

  const dateMap = new Map<string, Task[]>();
  const addToDateMap = (dateIso: string | undefined, task: Task) => {
    if (!dateIso) return;
    const list = dateMap.get(dateIso);
    if (list) {
      list.push(task);
    } else {
      dateMap.set(dateIso, [task]);
    }
  };

  for (const task of filteredTasks) {
    // Index for Month grid & selected-day agenda (avoid duplicating if taskDate === deadline)
    addToDateMap(task.taskDate, task);
    if (task.deadline && task.deadline !== task.taskDate) {
      addToDateMap(task.deadline, task);
    }

    // Group for List view: Overdue -> Today -> This Week -> Later
    if (isTaskOverdue(task, todayIso)) {
      overdueRaw.push(task);
      continue;
    }

    if (doesTaskBelongToDate(task, todayIso)) {
      todayRaw.push(task);
      continue;
    }

    const targetDate = getTaskPrimaryDate(task);
    if (!targetDate) continue;

    const diff = getDaysDifference(targetDate, todayIso);
    if (diff >= 1 && diff <= 7) {
      thisWeekRaw.push(task);
    } else if (diff > 7) {
      laterRaw.push(task);
    }
  }

  const overdueTasks = sortTasksChronologically(overdueRaw);
  const todayTasks = sortTasksForAgenda(todayRaw);
  const thisWeekTasks = sortTasksChronologically(thisWeekRaw);
  const laterTasks = sortTasksChronologically(laterRaw);

  const overdueCount = overdueTasks.length;
  const todayCount = todayTasks.length;
  const dueTodayCount = todayTasks.filter((t) => t.status === 'Pending').length;
  const thisWeekCount = thisWeekTasks.length;
  const laterCount = laterTasks.length;
  const totalGroupedCount = overdueCount + todayCount + thisWeekCount + laterCount;

  const sidebarBadge: CalendarSidebarBadge | undefined =
    overdueCount > 0
      ? {
          count: overdueCount,
          tone: 'red',
          tooltip: `${overdueCount} overdue ${overdueCount === 1 ? 'task' : 'tasks'}`,
        }
      : dueTodayCount > 0
      ? {
          count: dueTodayCount,
          tone: 'blue',
          tooltip: `${dueTodayCount} ${dueTodayCount === 1 ? 'task' : 'tasks'} due today`,
        }
      : undefined;

  const sortedCellCache = new Map<string, CalendarCellMetrics>();
  const getCellMetrics = (dateIso: string): CalendarCellMetrics => {
    const cached = sortedCellCache.get(dateIso);
    if (cached) return cached;

    const raw = dateMap.get(dateIso) || [];
    const sorted = sortTasksForAgenda(raw);
    const total = sorted.length;
    const completed = sorted.filter((t) => t.status === 'Completed').length;
    const pending = total - completed;
    const metrics: CalendarCellMetrics = {
      tasks: sorted,
      total,
      completed,
      pending,
      tooltip: `${completed} of ${total} completed`,
    };
    sortedCellCache.set(dateIso, metrics);
    return metrics;
  };

  return {
    todayIso,
    filteredTasks,
    overdueTasks,
    todayTasks,
    thisWeekTasks,
    laterTasks,
    overdueCount,
    todayCount,
    dueTodayCount,
    thisWeekCount,
    laterCount,
    totalGroupedCount,
    sidebarBadge,
    getCellMetrics,
  };
}
