import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Check,
  Clock,
  Trash2,
  CalendarPlus,
  Briefcase,
  GraduationCap,
  Building2,
  User,
  ArrowRight,
  Plane,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { Task } from '../types/task';
import {
  formatReadableDate,
  generateMonthCalendarGrid,
  getLocalTodayIso,
  isTaskOverdue,
  addDaysToIsoDate,
  formatMonthDayYear,
} from '../utils/dateUtils';

interface CalendarViewProps {
  tasks: Task[];
  onCreateTaskForDate: (dateIso: string) => void;
  onRequestComplete: (task: Task) => void;
  onRestorePending: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarAgendaTaskItemProps {
  task: Task;
  selectedDateIso: string;
  todayIso: string;
  onRequestComplete: (task: Task) => void;
  onRestorePending: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
}

const CalendarAgendaTaskItem: React.FC<CalendarAgendaTaskItemProps> = ({
  task,
  selectedDateIso: _selectedDateIso,
  todayIso,
  onRequestComplete,
  onRestorePending,
  onEdit,
  onDuplicate: _onDuplicate,
  onDelete,
  onQuickReschedule,
}) => {
  const isCompleted = task.status === 'Completed';
  const overdue = isTaskOverdue(task, todayIso);

  const stripeColor = isCompleted
    ? 'bg-[#16A34A]'
    : overdue || task.priority === 'Urgent' || task.priority === 'High'
    ? 'bg-[#DC2626]'
    : task.priority === 'Medium'
    ? 'bg-[#D97706]'
    : 'bg-[#1E40AF]';

  // Dynamic context icon matching user's mockup (FileText for STEM/Proposals, Plane for records/visa/travel, GraduationCap for forms/universities)
  const getTaskContextIcon = () => {
    const text = `${task.title} ${task.description || ''} ${task.category}`.toLowerCase();
    if (
      text.includes('vietnam') ||
      text.includes('translate') ||
      text.includes('legalize') ||
      text.includes('visa') ||
      text.includes('embassy') ||
      text.includes('apostille') ||
      text.includes('courier') ||
      text.includes('flight') ||
      text.includes('abroad')
    ) {
      return <Plane className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    if (
      text.includes('i-20') ||
      text.includes('degree') ||
      text.includes('admission') ||
      text.includes('snu') ||
      text.includes('yonsei') ||
      text.includes('kaist') ||
      text.includes('university') ||
      text.includes('college') ||
      text.includes('intake') ||
      text.includes('academic') ||
      text.includes('study')
    ) {
      return <GraduationCap className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    if (
      text.includes('proposal') ||
      text.includes('research') ||
      text.includes('statement') ||
      text.includes('stem') ||
      text.includes('portfolio') ||
      text.includes('form') ||
      text.includes('document') ||
      text.includes('file') ||
      text.includes('transcript')
    ) {
      return <FileText className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    if (task.category === 'Work') {
      return <Briefcase className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    if (task.category === 'Study') {
      return <GraduationCap className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    if (task.category === 'Business') {
      return <Building2 className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    if (task.category === 'Personal') {
      return <User className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
    }
    return <CheckSquare className="w-5 h-5 text-slate-700 dark:text-slate-200 shrink-0 mt-0.5" />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Work':
        return <Briefcase className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />;
      case 'Study':
        return <GraduationCap className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />;
      case 'Business':
        return <Building2 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />;
      case 'Personal':
        return <User className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />;
    }
  };

  const getRelativeDayTag = () => {
    if (task.taskDate === todayIso || task.deadline === todayIso) {
      return <span className="text-xs font-bold text-[#DC2626] dark:text-red-400 tracking-tight">Today</span>;
    }
    const tomorrow = addDaysToIsoDate(todayIso, 1);
    if (task.taskDate === tomorrow || task.deadline === tomorrow) {
      return <span className="text-xs font-bold text-[#1E40AF] dark:text-blue-400 tracking-tight">Tomorrow</span>;
    }
    const yesterday = addDaysToIsoDate(todayIso, -1);
    if (task.taskDate === yesterday || task.deadline === yesterday) {
      return <span className="text-xs font-bold text-[#DC2626] tracking-tight">Yesterday</span>;
    }
    if (task.taskDate < todayIso) {
      return <span className="text-xs font-bold text-[#DC2626] tracking-tight">Past Due</span>;
    }
    return (
      <span className="text-xs font-medium text-[#64748B] dark:text-slate-400">
        {formatReadableDate(task.taskDate, todayIso)}
      </span>
    );
  };

  return (
    <div className="relative bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#1E40AF]/40 dark:hover:border-slate-700 overflow-hidden animate-card-enter">
      {/* 1. Left Vertical Stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[12px] ${stripeColor}`} />

      {/* 2. Top Header Row: Priority Pill + Category Pill + Status Pill + Relative Date */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Pill */}
          {task.priority === 'Urgent' || task.priority === 'High' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] dark:bg-rose-950/50 dark:text-rose-400">
              <span className="text-[10px]">◆</span>
              <span>{task.priority === 'Urgent' ? 'Urgent Priority' : 'High Priority'}</span>
            </span>
          ) : task.priority === 'Medium' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] dark:bg-amber-950/50 dark:text-amber-300">
              <span className="text-[10px]">◆</span>
              <span>Medium Priority</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-950/50 dark:text-blue-400">
              <span className="text-[10px]">◆</span>
              <span>Low Priority</span>
            </span>
          )}

          {/* Category Pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1E40AF] dark:bg-blue-950/40 dark:text-blue-300">
            {getCategoryIcon(task.category)}
            <span>{task.category}</span>
          </span>

          {/* Status Pill */}
          {overdue ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] dark:bg-rose-950/50 dark:text-rose-400">
              Overdue
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-300">
              Completed
            </span>
          ) : task.taskDate === todayIso ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1E40AF] dark:bg-sky-950/50 dark:text-sky-300">
              In Progress
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] dark:bg-amber-950/50 dark:text-amber-300">
              Pending
            </span>
          )}
        </div>

        {/* Relative Day on Right */}
        <div className="shrink-0">{getRelativeDayTag()}</div>
      </div>

      {/* 3. Middle Content Row: Icon + Title + Description */}
      <div className="flex items-start gap-3 my-2.5 pl-1">
        {getTaskContextIcon()}
        <div className="min-w-0 flex-1">
          <h4
            onClick={() => onEdit(task)}
            className={`text-[16px] font-semibold leading-snug cursor-pointer transition-colors hover:text-[#1E40AF] dark:hover:text-blue-400 ${
              isCompleted
                ? 'line-through text-[#64748B] dark:text-slate-500'
                : 'text-[#0F172A] dark:text-slate-100'
            }`}
          >
            {task.title}
          </h4>

          {task.description && (
            <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {task.notes && (
            <div className="mt-2 text-xs text-[#0F172A] dark:text-amber-300 bg-[#FEF3C7] dark:bg-amber-950/30 rounded-lg p-2 border border-[#D97706]/20 dark:border-amber-900/40">
              <span className="font-semibold text-[#D97706]">Note: </span>
              <span>{task.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Row: Schedule Time + View Details Action Button */}
      <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 pl-1">
        <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400 font-medium">
          <Clock className="w-4 h-4 text-[#1E40AF] shrink-0" />
          <span>
            Schedule: {formatMonthDayYear(task.taskDate)}
            {task.scheduledTime ? ` · ${task.scheduledTime}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Complete / Restore Button */}
          <button
            type="button"
            onClick={() => (isCompleted ? onRestorePending(task) : onRequestComplete(task))}
            title={isCompleted ? 'Restore to Pending' : 'Mark as Completed'}
            className={`p-1.5 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2 ${
              isCompleted
                ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'text-[#64748B] hover:text-[#16A34A] hover:bg-[#DCFCE7] dark:hover:bg-emerald-950/40'
            }`}
            aria-label={isCompleted ? 'Restore task' : 'Mark task complete'}
          >
            <Check className={`w-3.5 h-3.5 ${isCompleted ? 'stroke-[2.5]' : ''}`} />
          </button>

          {/* Quick Reschedule +1 Day */}
          {!isCompleted && (
            <button
              type="button"
              onClick={() => onQuickReschedule(task, 1)}
              title="Postpone deadline +1 Day"
              className="p-1.5 text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-blue-950/40 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
              aria-label="Postpone +1 day"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Primary View Details Button */}
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors duration-150 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Delete Task */}
          <button
            type="button"
            onClick={() => onDelete(task)}
            title="Delete task"
            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-rose-950/40 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
            aria-label="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onCreateTaskForDate,
  onRequestComplete,
  onRestorePending,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickReschedule,
}) => {
  const todayIso = getLocalTodayIso();
  const [initYear, initMonth] = todayIso.split('-').map(Number);
  const [viewYear, setViewYear] = useState(initYear || new Date().getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState((initMonth || 1) - 1);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);

  const gridCells = generateMonthCalendarGrid(viewYear, viewMonthIndex);

  const monthTitle = new Date(viewYear, viewMonthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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

  const selectedDateTasks = useMemo(() => {
    return tasks
      .filter((t) => t.taskDate === selectedDateIso || t.deadline === selectedDateIso)
      .sort((a, b) => {
        // Pending first, completed last
        if (a.status !== b.status) {
          return a.status === 'Completed' ? 1 : -1;
        }
        // Then by priority
        const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        const rankA = priorityRank[a.priority as keyof typeof priorityRank] ?? 2;
        const rankB = priorityRank[b.priority as keyof typeof priorityRank] ?? 2;
        if (rankA !== rankB) return rankA - rankB;
        // Then by scheduled time if present
        if (a.scheduledTime && b.scheduledTime) {
          return a.scheduledTime.localeCompare(b.scheduledTime);
        }
        return 0;
      });
  }, [tasks, selectedDateIso]);

  const completedTasksCount = selectedDateTasks.filter((t) => t.status === 'Completed').length;
  const pendingTasksCount = selectedDateTasks.length - completedTasksCount;

  return (
    <div className="space-y-6">
      {/* Calendar Header & Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-[#1E40AF]" />
          <h2 className="text-[24px] font-semibold text-[#0F172A] dark:text-slate-100 leading-tight">
            {monthTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleJumpToday}
            className="h-9 px-4 text-sm font-medium text-[#0F172A] dark:text-slate-300 bg-white border border-[#E2E8F0] dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
          >
            Today
          </button>
          <div className="flex items-center border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden h-9">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="px-2.5 h-full text-[#64748B] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="px-2.5 h-full text-[#64748B] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-l border-[#E2E8F0] dark:border-slate-800"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onCreateTaskForDate(selectedDateIso)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Main Split: Compact Month Calendar + Full Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Compact Month Grid (Reduced Size) */}
        <div className="lg:col-span-5 xl:col-span-5 bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-7 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[12px] font-semibold text-[#64748B] dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-[#E2E8F0] dark:divide-slate-800">
            {gridCells.map((cell) => {
              const dayTasks = tasks.filter((t) => t.taskDate === cell.dateIso);
              const isToday = cell.dateIso === todayIso;
              const isSelected = cell.dateIso === selectedDateIso;
              const completedCount = dayTasks.filter((t) => t.status === 'Completed').length;

              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  onClick={() => setSelectedDateIso(cell.dateIso)}
                  className={`min-h-[64px] sm:min-h-[70px] p-2 text-left flex flex-col justify-between transition-colors ${
                    !cell.isCurrentMonth
                      ? 'bg-[#F8FAFC] dark:bg-slate-950/40 text-[#64748B]/50 dark:text-slate-600'
                      : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#0F172A] dark:text-slate-100'
                  } ${
                    isSelected
                      ? 'ring-2 ring-inset ring-[#1E40AF] dark:ring-blue-500 bg-[#EFF6FF] dark:bg-blue-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[12px] tabular-nums w-5 h-5 rounded flex items-center justify-center ${
                        isToday
                          ? 'bg-[#1E40AF] text-white font-semibold'
                          : 'font-medium'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] tabular-nums text-[#64748B] dark:text-slate-500">
                        {completedCount}/{dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Clean Dot Indicators for tasks */}
                  {dayTasks.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {dayTasks.slice(0, 3).map((t) => {
                        const isComp = t.status === 'Completed';
                        const isOver = isTaskOverdue(t, todayIso);
                        const dotBg = isComp
                          ? 'bg-[#16A34A]'
                          : isOver
                          ? 'bg-[#DC2626]'
                          : t.priority === 'Urgent' || t.priority === 'High'
                          ? 'bg-[#DC2626]'
                          : t.priority === 'Medium'
                          ? 'bg-[#D97706]'
                          : 'bg-[#1E40AF]';
                        return (
                          <span
                            key={t.id}
                            className={`w-1.5 h-1.5 rounded-full ${dotBg}`}
                            title={`${t.title} (${t.status})`}
                          />
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <span className="text-[9px] tabular-nums text-[#64748B]">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda Panel (Expanded to lg:col-span-7 xl:col-span-7) */}
        <div className="lg:col-span-7 xl:col-span-7 bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div key={selectedDateIso} className="animate-tab-enter space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-slate-100">
                  {formatReadableDate(selectedDateIso, todayIso)}
                </h3>
                {selectedDateIso === todayIso && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] dark:bg-red-950/60 dark:text-red-400 rounded-full">
                    Today
                  </span>
                )}
              </div>
              <p className="text-xs tabular-nums text-[#64748B] dark:text-slate-400 mt-0.5">
                {selectedDateIso} · {selectedDateTasks.length}{' '}
                {selectedDateTasks.length === 1 ? 'task' : 'tasks'}
                {selectedDateTasks.length > 0 && (
                  <span>
                    {' '}({pendingTasksCount} pending, {completedTasksCount} completed)
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCreateTaskForDate(selectedDateIso)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-[#1E40AF] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/60 hover:bg-[#1E40AF] hover:text-white dark:hover:bg-blue-900/70 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>

          {selectedDateTasks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-300">
                No tasks scheduled for {formatReadableDate(selectedDateIso, todayIso)}
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Click the button below to schedule a task on this date and sync with Google Sheets.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onCreateTaskForDate(selectedDateIso)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Task for {selectedDateIso}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => (
                <CalendarAgendaTaskItem
                  key={task.id}
                  task={task}
                  selectedDateIso={selectedDateIso}
                  todayIso={todayIso}
                  onRequestComplete={onRequestComplete}
                  onRestorePending={onRestorePending}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onQuickReschedule={onQuickReschedule}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
