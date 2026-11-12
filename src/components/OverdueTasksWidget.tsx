import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Edit3,
  Trash2,
  AlertTriangle,
  CalendarPlus,
  Calendar,
  GripVertical,
  Sun,
  Tag,
} from 'lucide-react';
import { Task, TaskPriority, TaskCategory } from '../types/task';
import {
  formatReadableDate,
  getDaysDifference,
  getLocalTodayIso,
} from '../utils/dateUtils';

const PriorityIndicator: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const dotColor =
    priority === 'High'
      ? 'bg-rose-500'
      : priority === 'Medium'
      ? 'bg-amber-500'
      : 'bg-slate-400';
  return (
    <span className="inline-flex items-center gap-1 font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{priority}</span>
    </span>
  );
};

const CategoryIndicator: React.FC<{ category: TaskCategory }> = ({ category }) => {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
      <Tag className="w-3 h-3 text-slate-400 shrink-0" />
      <span>{category}</span>
    </span>
  );
};

interface OverdueTasksWidgetProps {
  tasks: Task[];
  onRequestComplete: (task: Task) => void;
  onRestorePending: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
  onRescheduleToToday: (task: Task) => void;
  onRescheduleAllToToday: () => void;
  onReorderTasks?: (sourceTaskId: string, targetTaskId: string, position: 'before' | 'after') => void;
}

export const OverdueTasksWidget: React.FC<OverdueTasksWidgetProps> = ({
  tasks,
  onRequestComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickReschedule,
  onRescheduleToToday,
  onRescheduleAllToToday,
  onReorderTasks,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'top' | 'bottom' } | null>(null);
  const todayIso = getLocalTodayIso();

  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-lg overflow-hidden shadow-xs">
      {/* Widget Header - Minimal, Refined */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Overdue Tasks
          </h2>
          <span className="font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded font-medium">
            {tasks.length}
          </span>
        </div>

        {tasks.length > 1 && (
          <button
            type="button"
            onClick={onRescheduleAllToToday}
            className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline transition-colors inline-flex items-center gap-1"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Move all to Today</span>
          </button>
        )}
      </div>

      {/* Task Rows - Focused on Typography & Clean Hierarchy */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {tasks.map((task) => {
          const targetDate = task.deadline || task.taskDate;
          const daysDiff = getDaysDifference(targetDate, todayIso);
          const overdueDaysText =
            daysDiff === -1 ? 'Yesterday' : `${Math.abs(daysDiff)}d overdue`;

          const isHigh = task.priority === 'High';
          const isMedium = task.priority === 'Medium';

          const isDragging = draggingId === task.id;
          const isDropTop = dropTarget?.id === task.id && dropTarget?.position === 'top';
          const isDropBottom = dropTarget?.id === task.id && dropTarget?.position === 'bottom';

          return (
            <div
              key={task.id}
              draggable={Boolean(onReorderTasks)}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'move';
                setDraggingId(task.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              onDragOver={(e) => {
                if (!onReorderTasks) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = e.currentTarget.getBoundingClientRect();
                const isTop = e.clientY < rect.top + rect.height / 2;
                setDropTarget({ id: task.id, position: isTop ? 'top' : 'bottom' });
              }}
              onDragLeave={() => {
                if (dropTarget?.id === task.id) setDropTarget(null);
              }}
              onDrop={(e) => {
                if (!onReorderTasks) return;
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain');
                const pos = dropTarget?.position === 'top' ? 'before' : 'after';
                setDraggingId(null);
                setDropTarget(null);
                if (sourceId && sourceId !== task.id) {
                  onReorderTasks(sourceId, task.id, pos);
                }
              }}
              className={`group relative p-3 sm:px-4 transition-all duration-150 ${
                isDragging
                  ? 'opacity-40 border-dashed border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                  : 'hover:bg-rose-50/20 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Drop placement indicator */}
              {isDropTop && (
                <div className="absolute -top-0.5 left-2 right-2 h-1 bg-rose-500 rounded-full z-20 pointer-events-none shadow-xs ring-1 ring-rose-300 dark:ring-rose-800" />
              )}
              {isDropBottom && (
                <div className="absolute -bottom-0.5 left-2 right-2 h-1 bg-rose-500 rounded-full z-20 pointer-events-none shadow-xs ring-1 ring-rose-300 dark:ring-rose-800" />
              )}

              <div className="flex items-start gap-2.5 sm:gap-3">
                {/* Drag Handle */}
                {onReorderTasks && (
                  <div
                    title="Drag to reorder overdue task"
                    className="mt-0.5 -ml-1 text-slate-300 dark:text-slate-600 group-hover:text-cyan-400 dark:group-hover:text-cyan-400 cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded transition-colors shrink-0"
                    aria-label="Drag handle"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Minimal Circular Checkbox */}
                <button
                  type="button"
                  onClick={() => onRequestComplete(task)}
                  title="Click to complete task"
                  className="mt-0.5 w-4 h-4 rounded-full border border-rose-300 dark:border-rose-700/80 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-white dark:bg-slate-900 flex items-center justify-center transition-colors shrink-0 group/check focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-500"
                  aria-label={`Complete task ${task.title}`}
                >
                  <Check className="w-2.5 h-2.5 text-transparent group-hover/check:text-emerald-500 dark:group-hover/check:text-emerald-400 transition-colors stroke-[2.5]" />
                </button>

                {/* Main Content Area */}
                <div className="min-w-0 flex-1">
                  {/* Task Title (Primary Visual Focus) */}
                  <h3
                    onClick={() => onEdit(task)}
                    className="text-[14px] sm:text-[15px] font-medium text-slate-900 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors leading-snug break-words"
                  >
                    {task.title}
                  </h3>

                  {/* Concise Secondary Description */}
                  {task.description && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Compact, Organized Metadata Row */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {/* Subtle Red Overdue Date Indicator */}
                    <span className="inline-flex items-center gap-1 font-mono text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                      <Calendar className="w-3 h-3 shrink-0 text-rose-500" />
                      <span>{overdueDaysText}</span>
                      <span className="text-slate-400 dark:text-slate-500">
                        ({formatReadableDate(targetDate, todayIso)})
                      </span>
                    </span>

                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>

                    {/* Priority Indicator */}
                    <PriorityIndicator priority={task.priority} />

                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>

                    {/* Category */}
                    <CategoryIndicator category={task.category} />

                    {task.scheduledTime && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                          <Clock className="w-3 h-3 text-sky-500" />
                          <span>{task.scheduledTime}</span>
                        </span>
                      </>
                    )}

                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500">
                      {task.id}
                    </span>
                  </div>
                </div>

                {/* Quick Actions (Reveal on Hover) */}
                <div className="flex items-center gap-0.5 shrink-0 pt-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onRescheduleToToday(task)}
                    title="Reschedule to Today"
                    className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    aria-label="Move to today"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickReschedule(task, 1)}
                    title="Postpone +1 Day"
                    className="p-1.5 text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    aria-label="Postpone 1 day"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-purple-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    title="Edit Task"
                    className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    aria-label="Edit task"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(task)}
                    title="Duplicate Task"
                    className="p-1.5 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    aria-label="Duplicate task"
                  >
                    <Copy className="w-3.5 h-3.5 text-sky-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    title="Delete Task"
                    className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
