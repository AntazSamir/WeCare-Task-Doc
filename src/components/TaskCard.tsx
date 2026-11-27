import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Check,
  Copy,
  Edit3,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Clock,
  GripVertical,
  CalendarPlus,
} from 'lucide-react';
import { Task } from '../types/task';
import {
  formatReadableDate,
  formatTimestamp,
  getLocalTodayIso,
  isTaskOverdue,
} from '../utils/dateUtils';
import { CollapseTransition, MotionButton } from './animations';

interface TaskCardProps {
  task: Task;
  onRequestComplete: (task: Task) => void;
  onRestorePending: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (task: Task) => void;
  onQuickReschedule: (task: Task, daysToAdd: number) => void;
  onReorderTasks?: (sourceTaskId: string, targetTaskId: string, position: 'before' | 'after') => void;
  onMoveTask?: (task: Task, direction: 'up' | 'down') => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (task: Task) => void;
}

function priorityDotAndText(priority: string): { dot: string; text: string } {
  switch (priority) {
    case 'Urgent':
    case 'High':
      return {
        dot: 'bg-[#DC2626] dark:bg-[#EF5350]',
        text: 'text-[#DC2626] dark:text-[#EF5350]',
      };
    case 'Medium':
      return {
        dot: 'bg-[#D97706] dark:bg-[#F0A030]',
        text: 'text-[#D97706] dark:text-[#F0A030]',
      };
    default:
      return {
        dot: 'bg-[#16A34A] dark:bg-[#34C26B]',
        text: 'text-[#16A34A] dark:text-[#34C26B]',
      };
  }
}

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  onRequestComplete,
  onRestorePending,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickReschedule,
  onReorderTasks,
  onMoveTask,
  canMoveUp,
  canMoveDown,
  draggable = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<'top' | 'bottom' | null>(null);

  const todayIso = getLocalTodayIso();
  const overdue = isTaskOverdue(task, todayIso);
  const isCompleted = task.status === 'Completed';
  const priorityStyle = priorityDotAndText(task.priority);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDropIndicator(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!onReorderTasks) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    setDropIndicator(isTopHalf ? 'top' : 'bottom');
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!onReorderTasks) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    const position = dropIndicator === 'top' ? 'before' : 'after';
    setDropIndicator(null);
    setIsDragging(false);
    if (sourceId && sourceId !== task.id) {
      onReorderTasks(sourceId, task.id, position);
    }
  };

  const isCardDraggable = Boolean(onReorderTasks || draggable);
  const effectiveDate = task.deadline || task.taskDate;
  const dueLabel = `${formatReadableDate(effectiveDate, todayIso)}${
    task.scheduledTime ? ` · ${task.scheduledTime}` : ''
  }`;

  return (
    <div
      draggable={isCardDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative rounded-[10px] border transition-all duration-150 ${
        isDragging
          ? 'opacity-40 border-dashed border-[#1E40AF] dark:border-[#4C8DF6] scale-[0.99]'
          : selected
          ? 'bg-[#EFF6FF]/65 dark:bg-[rgba(76,141,246,0.10)] border-[#1E40AF] dark:border-[#4C8DF6]'
          : isCompleted
          ? 'bg-[#F8FAFC] dark:bg-[#1C1C1E]/75 border-[#E2E8F0] dark:border-[#2E2E32]'
          : overdue
          ? 'bg-[#FFFFFF] dark:bg-[#1C1C1E] border-[#DC2626]/35 dark:border-[#EF5350]/40 hover:border-[#DC2626]/65 dark:hover:border-[#EF5350]/70'
          : 'bg-[#FFFFFF] dark:bg-[#1C1C1E] border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#CBD5E1] dark:hover:border-[#3A3A3F]'
      } px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:shadow-none`}
    >
      {/* Visual Drop Placement Indicators */}
      {dropIndicator === 'top' && (
        <div className="absolute -top-1 left-2 right-2 h-1 bg-[#1E40AF] dark:bg-[#4C8DF6] rounded-full z-30 pointer-events-none" />
      )}
      {dropIndicator === 'bottom' && (
        <div className="absolute -bottom-1 left-2 right-2 h-1 bg-[#1E40AF] dark:bg-[#4C8DF6] rounded-full z-30 pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Left: Selection / Drag / Complete Circle + Compact Content */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Bulk Selection Checkbox (Square) */}
          {selectable && onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(task)}
              aria-label={`Select ${task.title}`}
              title="Select for bulk actions"
              className={`mt-1 w-3.5 h-3.5 rounded-[4px] border-[#CBD5E1] dark:border-[#3A3A3F] cursor-pointer shrink-0 accent-[#1E40AF] dark:accent-[#4C8DF6] transition-opacity ${
                selected
                  ? 'opacity-100'
                  : 'opacity-45 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100'
              }`}
            />
          )}

          {/* Drag Handle (Subtle on hover) */}
          {isCardDraggable && (
            <div
              title={onReorderTasks ? 'Drag to reorder' : 'Drag onto a calendar day'}
              className="mt-0.5 -mx-1 text-[#94A3B8] dark:text-[#66666E] sm:opacity-0 sm:group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded transition-opacity shrink-0"
              aria-label="Drag handle"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Complete Toggle (Distinct Circle) */}
          {isCompleted ? (
            <MotionButton
              onClick={() => onRestorePending(task)}
              title="Completed — Click to reopen"
              className="mt-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center bg-[#16A34A] dark:bg-[#34C26B] text-white hover:bg-[#15803d] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
              aria-label={`Restore ${task.title} to Pending`}
            >
              <Check className="w-3 h-3 stroke-[2.75]" />
            </MotionButton>
          ) : (
            <MotionButton
              onClick={() => onRequestComplete(task)}
              title="Mark as completed"
              className={`mt-0.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-colors shrink-0 group/check focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] ${
                overdue
                  ? 'border-[#DC2626]/70 dark:border-[#EF5350]/70 hover:border-[#DC2626]'
                  : 'border-[#CBD5E1] dark:border-[#4A4A52] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6]'
              } bg-white dark:bg-[#252528]`}
              aria-label={`Complete task ${task.title}`}
            >
              <Check className="w-2.5 h-2.5 text-transparent group-hover/check:text-[#1E40AF] dark:group-hover/check:text-[#4C8DF6] transition-colors stroke-[2.5]" />
            </MotionButton>
          )}

          {/* Task Content (Tight 2-3 Line Hierarchy) */}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-left w-full group/title focus:outline-none"
            >
              <h3
                className={`text-sm font-semibold leading-snug break-words ${
                  isCompleted
                    ? 'line-through text-[#64748B] dark:text-[#66666E]'
                    : 'text-[#0F172A] dark:text-[#ECECEE] group-hover/title:text-[#1E40AF] dark:group-hover/title:text-[#4C8DF6] transition-colors'
                }`}
              >
                {task.title}
              </h3>
            </button>

            {task.description && (
              <p
                className={`mt-0.5 text-xs leading-relaxed ${
                  isCompleted
                    ? 'text-[#94A3B8] dark:text-[#66666E]'
                    : 'text-[#64748B] dark:text-[#9A9AA2]'
                } ${expanded ? '' : 'line-clamp-1'}`}
              >
                {task.description}
              </p>
            )}

            {/* Concise Single-Line Essential Metadata */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums">
              <span className={`inline-flex items-center gap-1 font-medium ${priorityStyle.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                <span>{task.priority}</span>
              </span>

              <span aria-hidden="true" className="text-[#CBD5E1] dark:text-[#3A3A3F]">·</span>

              <span>{task.category}</span>

              <span aria-hidden="true" className="text-[#CBD5E1] dark:text-[#3A3A3F]">·</span>

              {isCompleted ? (
                <span className="text-[#16A34A] dark:text-[#34C26B] font-medium">
                  Done {task.completedAt ? formatReadableDate(task.completedAt.slice(0, 10), todayIso) : ''}
                </span>
              ) : overdue ? (
                <span className="inline-flex items-center gap-1 text-[#DC2626] dark:text-[#EF5350] font-semibold">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Overdue · {dueLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0 text-[#64748B] dark:text-[#9A9AA2]" />
                  <span>Due {dueLabel}</span>
                </span>
              )}
            </div>

            {/* Expandable Notes & Full Details */}
            <CollapseTransition isOpen={expanded}>
              <div className="mt-2.5 pt-2.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] text-xs text-[#64748B] dark:text-[#9A9AA2] space-y-1">
                {task.notes && (
                  <p className="text-[#0F172A]/85 dark:text-[#ECECEE]/90">
                    <span className="font-medium text-[#0F172A] dark:text-[#ECECEE]">Notes: </span>
                    {task.notes}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] tabular-nums">
                  <span>Scheduled: {formatReadableDate(task.taskDate, todayIso)}</span>
                  {task.completedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Completed: {formatTimestamp(task.completedAt)}</span>
                    </>
                  )}
                  {task.sheetRowNumber && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Sheet Row {task.sheetRowNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </CollapseTransition>
          </div>
        </div>

        {/* Right: Clean Primary Action + Hover Secondary Tools */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Hover / Focus Secondary Actions */}
          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity duration-150">
            {!isCompleted && (
              <MotionButton
                onClick={() => onQuickReschedule(task, 1)}
                title="Move +1 day"
                className="w-7 h-7 flex items-center justify-center text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-md transition-colors"
                aria-label="Reschedule +1 day"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
              </MotionButton>
            )}

            <MotionButton
              onClick={() => onEdit(task)}
              title="Edit task"
              className="w-7 h-7 flex items-center justify-center text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-md transition-colors"
              aria-label="Edit task"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </MotionButton>

            <MotionButton
              onClick={() => onDuplicate(task)}
              title="Duplicate task"
              className="hidden sm:flex w-7 h-7 items-center justify-center text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-md transition-colors"
              aria-label="Duplicate task"
            >
              <Copy className="w-3.5 h-3.5" />
            </MotionButton>

            <MotionButton
              onClick={() => onDelete(task)}
              title="Delete task"
              className="w-7 h-7 flex items-center justify-center text-[#64748B] dark:text-[#9A9AA2] hover:text-[#DC2626] dark:hover:text-[#EF5350] hover:bg-[#FEE2E2] dark:hover:bg-[rgba(239,83,80,0.14)] rounded-md transition-colors"
              aria-label="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </MotionButton>

            {onMoveTask && (
              <>
                <MotionButton
                  onClick={() => onMoveTask(task, 'up')}
                  disabled={!canMoveUp}
                  title="Move up"
                  className={`hidden md:flex w-6 h-7 items-center justify-center rounded transition-colors ${
                    canMoveUp
                      ? 'text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528]'
                      : 'text-[#CBD5E1] dark:text-[#3A3A3F] cursor-not-allowed opacity-40'
                  }`}
                  aria-label="Move task up"
                >
                  <ArrowUp className="w-3 h-3" />
                </MotionButton>
                <MotionButton
                  onClick={() => onMoveTask(task, 'down')}
                  disabled={!canMoveDown}
                  title="Move down"
                  className={`hidden md:flex w-6 h-7 items-center justify-center rounded transition-colors ${
                    canMoveDown
                      ? 'text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528]'
                      : 'text-[#CBD5E1] dark:text-[#3A3A3F] cursor-not-allowed opacity-40'
                  }`}
                  aria-label="Move task down"
                >
                  <ArrowDown className="w-3 h-3" />
                </MotionButton>
              </>
            )}
          </div>

          {/* Primary Always-Visible Action */}
          {!isCompleted ? (
            <MotionButton
              onClick={() => onRequestComplete(task)}
              className="inline-flex items-center gap-1 px-2.5 h-7 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#DBEAFE] dark:hover:bg-[rgba(76,141,246,0.22)] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </MotionButton>
          ) : (
            <MotionButton
              onClick={() => onRestorePending(task)}
              className="inline-flex items-center gap-1 px-2.5 h-7 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-[#16A34A] dark:text-[#34C26B]" />
              <span>Reopen</span>
            </MotionButton>
          )}

          {/* Expand Details Toggle */}
          <MotionButton
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? 'Hide details' : 'Show details'}
            className="w-7 h-7 flex items-center justify-center text-[#94A3B8] dark:text-[#66666E] hover:text-[#0F172A] dark:hover:text-[#ECECEE] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] rounded-md transition-colors"
            aria-label="Toggle task details"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </MotionButton>
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
