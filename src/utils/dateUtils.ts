import { Task } from '../types/task';

export function getLocalTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, (d || 1) + days);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(task: Task, todayIso = getLocalTodayIso()): boolean {
  if (task.status === 'Completed') return false;
  const targetDate = task.deadline || task.taskDate;
  if (targetDate < todayIso) return true;
  if (targetDate === todayIso && task.scheduledTime) {
    const now = new Date();
    const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    return task.scheduledTime < currentHm;
  }
  return false;
}

export function isTaskToday(task: Task, todayIso = getLocalTodayIso()): boolean {
  return task.taskDate === todayIso;
}

export function isTaskUpcoming(task: Task, todayIso = getLocalTodayIso()): boolean {
  return task.status === 'Pending' && task.taskDate > todayIso;
}

export function formatReadableDate(isoDate: string, todayIso = getLocalTodayIso()): string {
  if (!isoDate) return 'Unscheduled';
  if (isoDate === todayIso) return 'Today';
  const tomorrow = addDaysToIsoDate(todayIso, 1);
  if (isoDate === tomorrow) return 'Tomorrow';
  const yesterday = addDaysToIsoDate(todayIso, -1);
  if (isoDate === yesterday) return 'Yesterday';

  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: y !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFullHeaderDate(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function generateMonthCalendarGrid(year: number, monthIndex: number): {
  dateIso: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: {
    dateIso: string;
    dayNumber: number;
    isCurrentMonth: boolean;
  }[] = [];

  // Leading days from previous month
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const dObj = new Date(year, monthIndex - 1, dayNum);
    const iso = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(
      dObj.getDate()
    ).padStart(2, '0')}`;
    cells.push({ dateIso: iso, dayNumber: dayNum, isCurrentMonth: false });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(
      2,
      '0'
    )}`;
    cells.push({ dateIso: iso, dayNumber: dayNum, isCurrentMonth: true });
  }

  // Trailing days to complete 42 cells (6 weeks)
  const remaining = 42 - cells.length;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const dObj = new Date(year, monthIndex + 1, dayNum);
    const iso = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(
      dObj.getDate()
    ).padStart(2, '0')}`;
    cells.push({ dateIso: iso, dayNumber: dayNum, isCurrentMonth: false });
  }

  return cells;
}

export function getDaysDifference(targetDateIso: string, fromDateIso = getLocalTodayIso()): number {
  if (!targetDateIso) return 0;
  const [ty, tm, td] = targetDateIso.split('-').map(Number);
  const [fy, fm, fd] = fromDateIso.split('-').map(Number);
  const targetUtc = Date.UTC(ty, (tm || 1) - 1, td || 1);
  const fromUtc = Date.UTC(fy, (fm || 1) - 1, fd || 1);
  return Math.round((targetUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export function getDeadlineUrgency(
  task: Task,
  todayIso = getLocalTodayIso()
): {
  daysLeft: number;
  label: string;
  urgencyLevel: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later';
  formattedDeadline: string;
} {
  const targetDate = task.deadline || task.taskDate || todayIso;
  const days = getDaysDifference(targetDate, todayIso);

  const [y, m, d] = targetDate.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  const formattedDeadline = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (days < 0 || isTaskOverdue(task, todayIso)) {
    return {
      daysLeft: days,
      label: days === -1 ? '1 day overdue' : `${Math.abs(days)} days overdue`,
      urgencyLevel: 'overdue',
      formattedDeadline,
    };
  }
  if (days === 0) {
    return {
      daysLeft: 0,
      label: task.scheduledTime ? `Due today at ${task.scheduledTime}` : 'Due today',
      urgencyLevel: 'today',
      formattedDeadline,
    };
  }
  if (days === 1) {
    return {
      daysLeft: 1,
      label: task.scheduledTime ? `Tomorrow at ${task.scheduledTime}` : 'Tomorrow',
      urgencyLevel: 'tomorrow',
      formattedDeadline,
    };
  }
  if (days <= 3) {
    return {
      daysLeft: days,
      label: `In ${days} days`,
      urgencyLevel: 'soon',
      formattedDeadline,
    };
  }
  return {
    daysLeft: days,
    label: `In ${days} days`,
    urgencyLevel: 'later',
    formattedDeadline,
  };
}

export function formatMonthDayYear(isoDate: string): string {
  if (!isoDate) return 'Unscheduled';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
