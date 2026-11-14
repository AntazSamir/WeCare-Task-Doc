import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Edit3,
  CalendarPlus,
  Calendar,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Task, TaskPriority, TaskCategory } from '../types/task';
import {
  getDeadlineUrgency,
  getDaysDifference,
  getLocalTodayIso,
} from '../utils/dateUtils';
const PriorityIndicator: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const dotColor =
    priority === 'High'
      ? 'bg-[#DC4545]'
      : priority === 'Medium'
      ? 'bg-[#E9A23B]'
      : 'bg-[#172B4D]/40 dark:bg-slate-400';
  return (
    <span className="inline-flex items-center gap-1 font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{priority}</span>
    </span>
  );
};

const CategoryIndicator: React.FC<{ category: TaskCategory }> = ({ category }) => {
  return (
    <span className="inline-flex items-center gap-1 text-[#172B4D]/75 dark:text-slate-400">
      <Tag className="w-3 h-3 text-[#1769E8] shrink-0" />
      <span>{category}</span>
    </span>
  );
};

interface UpcomingDeadlinesWidgetProps {
  tasks: Task[];
  onViewAll: () => void;
  onRequestComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
  onCreateTaskWithDate: (dateIso: string) => void;
}

type FilterOption = 'all' | '7days' | 'high';

export const UpcomingDeadlinesWidget: React.FC<UpcomingDeadlinesWidgetProps> = ({
  tasks,
  onViewAll,
  onRequestComplete,
  onEdit,
  onQuickReschedule,
  onCreateTaskWithDate,
}) => {
  const todayIso = getLocalTodayIso();
  const [filter, setFilter] = useState<FilterOption>('all');

  // Filter pending tasks that have upcoming deadlines (today or future)
  const upcomingTasks = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'Pending');

    // Sort chronologically by deadline, then time, then priority
    const sorted = [...pending].sort((a, b) => {
      const dateA = a.deadline || a.taskDate || todayIso;
      const dateB = b.deadline || b.taskDate || todayIso;
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = a.scheduledTime || '23:59';
      const timeB = b.scheduledTime || '23:59';
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      const prioWeight: Record<TaskPriority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      return prioWeight[b.priority] - prioWeight[a.priority];
    });

    const futureOrToday = sorted.filter((t) => {
      const d = t.deadline || t.taskDate;
      return d >= todayIso;
    });

    if (filter === '7days') {
      return futureOrToday.filter((t) => {
        const d = t.deadline || t.taskDate;
        const diff = getDaysDifference(d, todayIso);
        return diff >= 0 && diff <= 7;
      });
    }

    if (filter === 'high') {
      return futureOrToday.filter((t) => t.priority === 'High');
    }

    return futureOrToday;
  }, [tasks, todayIso, filter]);

  // Display top 5 upcoming deadlines
  const displayedTasks = upcomingTasks.slice(0, 5);

  return (
    <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800/80 rounded-lg overflow-hidden shadow-xs">
      {/* Widget Header - Minimal, Refined */}
      <div className="px-4 py-3 border-b border-[#E3EAF3] dark:border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-4 h-4 text-[#1769E8] shrink-0" />
          <h2 className="text-sm font-semibold text-[#172B4D] dark:text-slate-100 tracking-tight">
            Upcoming Deadlines
          </h2>
          <span className="font-mono text-xs tabular-nums text-[#123B78] dark:text-blue-400 bg-[#DCEBFF] dark:bg-blue-950/50 border border-[#36A5F5]/40 dark:border-transparent px-1.5 py-0.5 rounded font-medium">
            {upcomingTasks.length}
          </span>
        </div>

        {/* Minimal Text Filter Tabs & View All */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'all'
                  ? 'text-[#123B78] dark:text-slate-100 font-semibold bg-[#DCEBFF] dark:bg-slate-800'
                  : 'text-[#172B4D]/65 hover:text-[#123B78] dark:hover:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('7days')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === '7days'
                  ? 'text-[#123B78] dark:text-slate-100 font-semibold bg-[#DCEBFF] dark:bg-slate-800'
                  : 'text-[#172B4D]/65 hover:text-[#123B78] dark:hover:text-slate-300'
              }`}
            >
              Next 7d
            </button>
            <button
              type="button"
              onClick={() => setFilter('high')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'high'
                  ? 'text-[#123B78] dark:text-slate-100 font-semibold bg-[#DCEBFF] dark:bg-slate-800'
                  : 'text-[#172B4D]/65 hover:text-[#123B78] dark:hover:text-slate-300'
              }`}
            >
              High
            </button>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1769E8] dark:text-blue-400 hover:text-[#123B78] dark:hover:text-blue-300 transition-colors whitespace-nowrap shrink-0 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Deadlines List - Clean Typography & Lightweight Visuals */}
      <div className="divide-y divide-[#E3EAF3] dark:divide-slate-800/60">
        {displayedTasks.length === 0 ? (
          <div className="py-8 px-5 text-center space-y-2">
            <div className="w-8 h-8 mx-auto rounded-md bg-[#DCEBFF] dark:bg-slate-800 text-[#1769E8] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#1769E8]" />
            </div>
            <p className="text-xs font-medium text-[#172B4D] dark:text-slate-300">
              {filter === 'high'
                ? 'No upcoming high-priority deadlines'
                : 'No upcoming deadlines on your radar'}
            </p>
            <button
              type="button"
              onClick={() => onCreateTaskWithDate(todayIso)}
              className="text-[11px] font-medium text-[#1769E8] dark:text-blue-400 hover:underline"
            >
              + Schedule a new deadline
            </button>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const urgency = getDeadlineUrgency(task, todayIso);
            const targetDate = task.deadline || task.taskDate;
            const daysDiff = getDaysDifference(targetDate, todayIso);

            const isTomorrow = daysDiff === 1;
            const isSoon = daysDiff >= 2 && daysDiff <= 3;

            return (
              <div
                key={task.id}
                className="group relative p-3 sm:px-4 hover:bg-[#F4F2EE] dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Minimal Circular Checkbox */}
                  <button
                    type="button"
                    onClick={() => onRequestComplete(task)}
                    title="Click to complete task"
                    className="mt-0.5 w-4 h-4 rounded-full border border-[#E3EAF3] dark:border-slate-600 hover:border-[#16A36A] hover:bg-[#16A36A]/10 dark:hover:bg-emerald-950/40 bg-[#FFFFFF] dark:bg-slate-900 flex items-center justify-center transition-colors shrink-0 group/check focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1769E8]"
                    aria-label={`Complete task ${task.title}`}
                  >
                    <Check className="w-2.5 h-2.5 text-transparent group-hover/check:text-[#16A36A] dark:group-hover/check:text-emerald-400 transition-colors stroke-[2.5]" />
                  </button>

                  {/* Main Content Area */}
                  <div className="min-w-0 flex-1">
                    {/* Task Title (Primary Visual Focus) */}
                    <h3
                      onClick={() => onEdit(task)}
                      className="text-[14px] sm:text-[15px] font-medium text-[#172B4D] dark:text-slate-100 hover:text-[#1769E8] dark:hover:text-blue-400 cursor-pointer transition-colors leading-snug break-words"
                    >
                      {task.title}
                    </h3>

                    {/* Concise Secondary Description */}
                    {task.description && (
                      <p className="mt-0.5 text-xs text-[#172B4D]/70 dark:text-slate-400 line-clamp-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Compact, Organized Metadata Row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#172B4D]/65 dark:text-slate-400">
                      {/* Due Date with Elegant Accent Colors */}
                      <span
                        className={`inline-flex items-center gap-1 font-mono tabular-nums font-medium ${
                          isTomorrow
                            ? 'text-[#E9A23B] dark:text-amber-400'
                            : isSoon
                            ? 'text-[#1769E8] dark:text-blue-400'
                            : 'text-[#172B4D]/75 dark:text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>
                          {isTomorrow
                            ? 'Tomorrow'
                            : daysDiff === 0
                            ? 'Today'
                            : `In ${daysDiff}d`}
                        </span>
                        <span className="text-[#172B4D]/50 dark:text-slate-500">
                          ({urgency.formattedDeadline})
                        </span>
                      </span>

                      <span className="text-[#E3EAF3] dark:text-slate-700" aria-hidden="true">
                        ·
                      </span>

                      {/* Priority Indicator */}
                      <PriorityIndicator priority={task.priority} />

                      <span className="text-[#E3EAF3] dark:text-slate-700" aria-hidden="true">
                        ·
                      </span>

                      {/* Category */}
                      <CategoryIndicator category={task.category} />

                      {task.scheduledTime && (
                        <>
                          <span className="text-[#E3EAF3] dark:text-slate-700" aria-hidden="true">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[#172B4D]/70 dark:text-slate-400">
                            <Clock className="w-3 h-3 text-[#36A5F5]" />
                            <span>{task.scheduledTime}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions (Reveal on Hover) */}
                  <div className="flex items-center gap-0.5 shrink-0 pt-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onQuickReschedule(task, 1)}
                      title="Postpone +1 Day"
                      className="p-1.5 text-[#172B4D]/50 hover:text-[#1769E8] dark:hover:text-blue-400 hover:bg-[#DCEBFF]/70 dark:hover:bg-slate-800 rounded-md transition-colors"
                      aria-label="Postpone 1 day"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#1769E8]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      title="Edit task"
                      className="p-1.5 text-[#172B4D]/50 hover:text-[#E9A23B] dark:hover:text-amber-400 hover:bg-[#E9A23B]/10 dark:hover:bg-slate-800 rounded-md transition-colors"
                      aria-label="Edit task"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#E9A23B]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Widget Footer */}
      <div className="px-5 py-2.5 bg-[#F4F2EE] dark:bg-slate-900/60 border-t border-[#E3EAF3] dark:border-slate-800/80 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => onCreateTaskWithDate(todayIso)}
          className="text-[11px] font-medium text-[#172B4D]/70 hover:text-[#123B78] dark:hover:text-slate-200 transition-colors"
        >
          + Schedule a deadline
        </button>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[11px] font-medium text-[#1769E8] dark:text-blue-400 hover:underline"
        >
          Open Schedule →
        </button>
      </div>
    </div>
  );
};
