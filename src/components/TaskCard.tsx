import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Check,
  Clock,
  Copy,
  Edit3,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Calendar,
  GripVertical,
  FileSpreadsheet,
  CalendarPlus,
  Briefcase,
  GraduationCap,
  Building2,
  User,
  Tag,
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

function CategoryIcon({ category, className = 'w-3.5 h-3.5' }: { category: string; className?: string }) {
  switch (category) {
    case 'Work':
      return <Briefcase className={className} />;
    case 'Study':
      return <GraduationCap className={className} />;
    case 'Business':
      return <Building2 className={className} />;
    case 'Personal':
      return <User className={className} />;
    default:
      return <Tag className={className} />;
  }
}

function PriorityIndicator({ priority }: { priority: string }) {
  const color =
    priority === 'High' || priority === 'Urgent'
      ? 'text-[#DC2626] dark:text-[#EF5350]'
      : priority === 'Medium'
      ? 'text-[#D97706] dark:text-[#F0A030]'
      : 'text-[#16A34A] dark:text-[#34C26B]';
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{priority}</span>
    </span>
  );
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

  const priorityBorderClass = isCompleted
    ? task.priority === 'Urgent'
      ? 'border-l-[3.5px] border-l-[#DC2626]/50 dark:border-l-[#EF5350]/50'
      : task.priority === 'High'
      ? 'border-l-[3.5px] border-l-[#DC2626]/50 dark:border-l-[#EF5350]/40'
      : task.priority === 'Medium'
      ? 'border-l-[3.5px] border-l-[#D97706]/50 dark:border-l-[#F0A030]/40'
      : 'border-l-[3.5px] border-l-[#1E40AF]/50 dark:border-l-[#3A3A3F]'
    : task.priority === 'Urgent'
    ? 'border-l-[3.5px] border-l-[#DC2626] dark:border-l-[#EF5350] shadow-xs dark:shadow-none'
    : task.priority === 'High'
    ? 'border-l-[3.5px] border-l-[#DC2626] dark:border-l-[#EF5350]'
    : task.priority === 'Medium'
    ? 'border-l-[3.5px] border-l-[#D97706] dark:border-l-[#F0A030]'
    : 'border-l-[3.5px] border-l-[#1E40AF] dark:border-l-[#3A3A3F]';

  const statusTextClass = isCompleted
    ? 'text-[#16A34A] dark:text-[#34C26B] font-medium'
    : overdue
    ? 'text-[#DC2626] dark:text-[#EF5350] font-semibold'
    : 'text-[#64748B] dark:text-[#9A9AA2]';

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

  return (
    <div
      draggable={isCardDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative rounded-[12px] border transition-all duration-150 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none ${
        isDragging
          ? 'opacity-40 border-dashed border-[#1E40AF] dark:border-[#4C8DF6] scale-[0.99] shadow-xs dark:shadow-none'
          : selected
          ? 'bg-[#EFF6FF]/60 dark:bg-[rgba(76,141,246,0.10)] border-[#1E40AF] dark:border-[#4C8DF6]'
          : isCompleted
          ? 'bg-[#F8FAFC] dark:bg-[#1C1C1E]/75 border-[#E2E8F0] dark:border-[#2E2E32]'
          : overdue
          ? 'bg-[#FEE2E2]/30 dark:bg-[#1C1C1E] border-[#DC2626]/30 dark:border-[#EF5350]/40 hover:border-[#DC2626]/60 dark:hover:border-[#EF5350]/70'
          : 'bg-white dark:bg-[#1C1C1E] border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF]/40 dark:hover:border-[#3A3A3F]'
      } ${priorityBorderClass} p-4`}
    >
      {/* Visual Drop Placement Indicators */}
      {dropIndicator === 'top' && (
        <div className="absolute -top-1 left-2 right-2 h-1 bg-[#1E40AF] dark:bg-[#4C8DF6] rounded-full z-30 pointer-events-none shadow-xs dark:shadow-none ring-1 ring-[#EFF6FF] dark:ring-[#4C8DF6]/30" />
      )}
      {dropIndicator === 'bottom' && (
        <div className="absolute -bottom-1 left-2 right-2 h-1 bg-[#1E40AF] dark:bg-[#4C8DF6] rounded-full z-30 pointer-events-none shadow-xs dark:shadow-none ring-1 ring-[#EFF6FF] dark:ring-[#4C8DF6]/30" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Drag Handle + Completion Trigger + Primary Content */}
        <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Selection Checkbox (Multi-Select Bulk Actions) */}
          {selectable && onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(task)}
              aria-label={`Select ${task.title}`}
              title="Select task for bulk actions"
              className="mt-1 w-4 h-4 rounded border-[#CBD5E1] dark:border-[#3A3A3F] text-[#1E40AF] dark:text-[#4C8DF6] focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] cursor-pointer shrink-0 accent-[#1E40AF] dark:accent-[#4C8DF6]"
            />
          )}
          {/* Drag Handle */}
          {isCardDraggable && (
            <div
              title={onReorderTasks ? 'Drag to reorder task' : 'Drag onto a calendar day to reschedule'}
              className="mt-0.5 -ml-1 text-[#64748B]/40 dark:text-[#66666E] group-hover:text-[#1E40AF] dark:group-hover:text-[#ECECEE] cursor-grab active:cursor-grabbing hover:bg-[#EFF6FF] dark:hover:bg-[#252528] p-0.5 rounded transition-colors shrink-0"
              aria-label="Drag handle"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          {isCompleted ? (
            <MotionButton
              onClick={() => onRestorePending(task)}
              title="Completed — Click to restore task to Pending"
              className="mt-0.5 w-[18px] h-[18px] rounded flex items-center justify-center bg-[#16A34A] dark:bg-[#34C26B] text-white hover:bg-[#15803d] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] shadow-xs dark:shadow-none"
              aria-label={`Restore ${task.title} to Pending`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </MotionButton>
          ) : (
            <MotionButton
              onClick={() => onRequestComplete(task)}
              title="Click to confirm task completion"
              className="mt-0.5 w-[18px] h-[18px] rounded border border-[#E2E8F0] dark:border-[#3A3A3F] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] bg-white dark:bg-[#252528] flex items-center justify-center transition-colors shrink-0 group/check focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF]"
              aria-label={`Complete task ${task.title}`}
            >
              <Check className="w-3 h-3 text-transparent group-hover/check:text-[#1E40AF] dark:group-hover/check:text-[#4C8DF6] transition-colors" />
            </MotionButton>
          )}

          <div className="min-w-0 flex-1">
            {/* Title Row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3
                className={`text-[16px] font-semibold leading-snug break-words ${
                  isCompleted
                    ? 'line-through text-[#64748B] dark:text-[#66666E]'
                    : 'text-[#0F172A] dark:text-[#ECECEE]'
                }`}
              >
                {task.title}
              </h3>
            </div>

            {/* Description Preview */}
            {task.description && (
              <p
                className={`mt-1 text-sm leading-relaxed ${
                  isCompleted
                    ? 'text-[#64748B] dark:text-[#66666E]'
                    : 'text-[#0F172A]/80 dark:text-[#9A9AA2]'
                } ${expanded ? '' : 'line-clamp-2'}`}
              >
                {task.description}
              </p>
            )}

            {/* Clean Unboxed Metadata Line with Real Lucide Icons */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#64748B] dark:text-[#9A9AA2]">
              <span className="inline-flex items-center gap-1 font-medium text-[#0F172A] dark:text-[#ECECEE] whitespace-nowrap">
                <CategoryIcon category={task.category} className="w-3.5 h-3.5 shrink-0 text-[#1E40AF]" />
                <span>{task.category}</span>
              </span>
              <span aria-hidden="true" className="text-[#E2E8F0] dark:text-[#3A3A3F]">·</span>
              <span className="whitespace-nowrap">
                <PriorityIndicator priority={task.priority} />
              </span>
              <span aria-hidden="true" className="text-[#E2E8F0] dark:text-[#3A3A3F]">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 shrink-0 text-[#1E40AF]" />
                <span>Scheduled: {formatReadableDate(task.taskDate, todayIso)}</span>
              </span>
              <span aria-hidden="true" className="text-[#E2E8F0] dark:text-[#3A3A3F]">·</span>
              <span
                className={`inline-flex items-center gap-1 tabular-nums whitespace-nowrap ${
                  overdue ? 'text-[#DC2626] dark:text-[#EF5350] font-semibold' : ''
                }`}
              >
                {overdue ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#DC2626]" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-[#64748B]" />
                )}
                <span>
                  Deadline: {formatReadableDate(task.deadline, todayIso)}
                  {task.scheduledTime ? ` at ${task.scheduledTime}` : ''}
                </span>
              </span>
              <span aria-hidden="true" className="text-[#E2E8F0] dark:text-[#3A3A3F]">·</span>
              <span className={`${statusTextClass} whitespace-nowrap`}>
                {isCompleted ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
              </span>
              {task.sheetRowNumber && (
                <>
                  <span aria-hidden="true" className="text-[#E2E8F0] dark:text-[#3A3A3F]">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-[#64748B] dark:text-[#9A9AA2] whitespace-nowrap">
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-[#16A34A]" />
                    Row {task.sheetRowNumber}
                  </span>
                </>
              )}
            </div>

            {/* Completed Timestamp or Sync State Notice */}
            {isCompleted && task.completedAt && (
              <div className="mt-1.5 text-xs text-[#16A34A] dark:text-[#34C26B] tabular-nums">
                Confirmed completed on {formatTimestamp(task.completedAt)}
              </div>
            )}

            {/* Expanded Notes & Timestamps */}
            <CollapseTransition isOpen={expanded}>
              <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] text-xs text-[#0F172A]/80 dark:text-[#9A9AA2] space-y-1.5">
                {task.notes ? (
                  <div>
                    <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      Notes:{' '}
                    </span>
                    <span>{task.notes}</span>
                  </div>
                ) : (
                  <div className="text-[#64748B] dark:text-[#66666E] italic">
                    No additional task notes attached.
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-[#64748B] dark:text-[#66666E]">
                  <span>Created: {formatTimestamp(task.createdAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Last Updated: {formatTimestamp(task.lastUpdated)}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Sheet Sync:{' '}
                    {task.syncState === 'pending_sync'
                      ? 'Pending (Offline Queue)'
                      : task.syncState === 'sync_failed'
                      ? 'Sync Failed'
                      : 'Synced'}
                  </span>
                </div>
              </div>
            </CollapseTransition>
          </div>
        </div>

        {/* Right: Functional Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap self-end sm:self-auto">
          {!isCompleted ? (
            <MotionButton
              onClick={() => onRequestComplete(task)}
              className="inline-flex items-center gap-1 px-3 h-[28px] box-border text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#dbeafe] dark:hover:bg-[rgba(76,141,246,0.22)] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5 text-[#1E40AF]" />
              Complete
            </MotionButton>
          ) : (
            <MotionButton
              onClick={() => onRestorePending(task)}
              className="inline-flex items-center gap-1 px-3 h-[28px] box-border text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-white dark:bg-[#252528] hover:bg-[#F8FAFC] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-[#16A34A] dark:text-[#34C26B]" />
              Restore
            </MotionButton>
          )}

          {!isCompleted && (
            <MotionButton
              onClick={() => onQuickReschedule(task, 1)}
              title="Reschedule +1 Day"
              className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-md transition-colors duration-150"
              aria-label="Reschedule +1 day"
            >
              <CalendarPlus className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
            </MotionButton>
          )}

          <MotionButton
            onClick={() => onEdit(task)}
            title="Edit Task"
            className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-md transition-colors duration-150"
            aria-label="Edit task"
          >
            <Edit3 className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
          </MotionButton>

          <MotionButton
            onClick={() => onDuplicate(task)}
            title="Duplicate Task"
            className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-md transition-colors duration-150"
            aria-label="Duplicate task"
          >
            <Copy className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
          </MotionButton>

          <MotionButton
            onClick={() => onDelete(task)}
            title="Delete Task"
            className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[rgba(239,83,80,0.14)] rounded-md transition-colors duration-150"
            aria-label="Delete task"
          >
            <Trash2 className="w-4 h-4 text-[#DC2626] dark:text-[#EF5350]" />
          </MotionButton>

          {onMoveTask && (
            <div className="flex items-center">
              <MotionButton
                onClick={() => onMoveTask(task, 'up')}
                disabled={!canMoveUp}
                title="Move Task Up"
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 ${
                  canMoveUp
                    ? 'text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528]'
                    : 'text-[#64748B]/30 dark:text-[#66666E] cursor-not-allowed opacity-40'
                }`}
                aria-label="Move task up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </MotionButton>
              <MotionButton
                onClick={() => onMoveTask(task, 'down')}
                disabled={!canMoveDown}
                title="Move Task Down"
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 ${
                  canMoveDown
                    ? 'text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528]'
                    : 'text-[#64748B]/30 dark:text-[#66666E] cursor-not-allowed opacity-40'
                }`}
                aria-label="Move task down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </MotionButton>
            </div>
          )}

          <MotionButton
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? 'Hide details' : 'Show notes & audit timestamps'}
            className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded transition-colors duration-150"
            aria-label="Toggle task notes"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </MotionButton>
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
