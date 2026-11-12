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
      ? 'text-[#DC4545] dark:text-rose-400'
      : priority === 'Medium'
      ? 'text-[#E9A23B] dark:text-amber-400'
      : 'text-[#16A36A] dark:text-emerald-400';
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{priority}</span>
    </span>
  );
}

export const TaskCard: React.FC<TaskCardProps> = ({
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
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<'top' | 'bottom' | null>(null);

  const todayIso = getLocalTodayIso();
  const overdue = isTaskOverdue(task, todayIso);
  const isCompleted = task.status === 'Completed';

  const priorityColorClass =
    task.priority === 'Urgent'
      ? 'text-[#DC4545] dark:text-rose-400 font-bold'
      : task.priority === 'High'
      ? 'text-[#DC4545] dark:text-red-400 font-semibold'
      : task.priority === 'Medium'
      ? 'text-[#E9A23B] dark:text-amber-400 font-medium'
      : 'text-[#172B4D]/70 dark:text-slate-400';

  const priorityBorderClass = isCompleted
    ? task.priority === 'Urgent'
      ? 'border-l-[3.5px] border-l-[#DC4545]/50 dark:border-l-rose-500/50'
      : task.priority === 'High'
      ? 'border-l-[3.5px] border-l-[#DC4545]/50 dark:border-l-red-500/40'
      : task.priority === 'Medium'
      ? 'border-l-[3.5px] border-l-[#E9A23B]/50 dark:border-l-amber-400/40'
      : 'border-l-[3.5px] border-l-[#36A5F5]/50 dark:border-l-blue-500/40'
    : task.priority === 'Urgent'
    ? 'border-l-[3.5px] border-l-[#DC4545] dark:border-l-rose-500 shadow-xs'
    : task.priority === 'High'
    ? 'border-l-[3.5px] border-l-[#DC4545] dark:border-l-red-500'
    : task.priority === 'Medium'
    ? 'border-l-[3.5px] border-l-[#E9A23B] dark:border-l-amber-400'
    : 'border-l-[3.5px] border-l-[#1769E8] dark:border-l-blue-400';

  const statusTextClass = isCompleted
    ? 'text-[#16A36A] dark:text-emerald-400 font-medium'
    : overdue
    ? 'text-[#DC4545] dark:text-red-400 font-semibold'
    : 'text-[#172B4D]/70 dark:text-slate-400';

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

  return (
    <div
      draggable={Boolean(onReorderTasks)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative rounded-lg border transition-all duration-150 animate-card-enter ${
        isDragging
          ? 'opacity-40 border-dashed border-[#1769E8] scale-[0.99] shadow-xs'
          : isCompleted
          ? 'bg-[#F5F8FC] dark:bg-slate-900/50 border-[#E3EAF3] dark:border-slate-800/80'
          : overdue
          ? 'bg-[#DC4545]/5 dark:bg-red-950/15 border-[#DC4545]/30 dark:border-red-900/60 hover:border-[#DC4545]/60 dark:hover:border-red-800'
          : 'bg-[#FFFFFF] dark:bg-slate-900 border-[#E3EAF3] dark:border-slate-800 hover:border-[#36A5F5]/60 dark:hover:border-slate-700'
      } ${priorityBorderClass} p-3.5`}
    >
      {/* Visual Drop Placement Indicators */}
      {dropIndicator === 'top' && (
        <div className="absolute -top-1 left-2 right-2 h-1 bg-[#1769E8] dark:bg-blue-400 rounded-full z-30 pointer-events-none shadow-xs ring-1 ring-[#DCEBFF] dark:ring-blue-900" />
      )}
      {dropIndicator === 'bottom' && (
        <div className="absolute -bottom-1 left-2 right-2 h-1 bg-[#1769E8] dark:bg-blue-400 rounded-full z-30 pointer-events-none shadow-xs ring-1 ring-[#DCEBFF] dark:ring-blue-900" />
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Drag Handle + Completion Trigger + Primary Content */}
        <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Drag Handle */}
          {onReorderTasks && (
            <div
              title="Drag to reorder task"
              className="mt-0.5 -ml-1 text-[#172B4D]/30 dark:text-slate-600 group-hover:text-[#1769E8] dark:group-hover:text-blue-400 cursor-grab active:cursor-grabbing hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800 p-0.5 rounded transition-colors shrink-0"
              aria-label="Drag handle"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          {isCompleted ? (
            <button
              type="button"
              onClick={() => onRestorePending(task)}
              title="Completed — Click to restore task to Pending"
              className="mt-0.5 w-4.5 h-4.5 rounded flex items-center justify-center bg-[#16A36A] text-white hover:bg-[#138A59] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#16A36A] shadow-xs"
              aria-label={`Restore ${task.title} to Pending`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRequestComplete(task)}
              title="Click to confirm task completion"
              className="mt-0.5 w-4.5 h-4.5 rounded border border-[#E3EAF3] dark:border-slate-600 hover:border-[#1769E8] dark:hover:border-blue-400 bg-[#FFFFFF] dark:bg-slate-800 flex items-center justify-center transition-colors shrink-0 group/check focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1769E8]"
              aria-label={`Complete task ${task.title}`}
            >
              <Check className="w-3 h-3 text-transparent group-hover/check:text-[#1769E8] dark:group-hover/check:text-blue-400 transition-colors" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            {/* Title Row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3
                className={`text-[15px] font-semibold leading-snug break-words ${
                  isCompleted
                    ? 'line-through text-[#172B4D]/50 dark:text-slate-500'
                    : 'text-[#172B4D] dark:text-slate-100'
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
                    ? 'text-[#172B4D]/50 dark:text-slate-500'
                    : 'text-[#172B4D]/75 dark:text-slate-300'
                } ${expanded ? '' : 'line-clamp-2'}`}
              >
                {task.description}
              </p>
            )}

            {/* Clean Unboxed Metadata Line with Real Lucide Icons */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#172B4D]/65 dark:text-slate-400">
              <span className="font-mono tabular-nums text-[#1769E8] dark:text-slate-300 whitespace-nowrap">
                {task.id}
              </span>
              <span aria-hidden="true" className="text-[#E3EAF3] dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-[#172B4D] dark:text-slate-300 whitespace-nowrap">
                <CategoryIcon category={task.category} className="w-3.5 h-3.5 shrink-0 text-[#1769E8]" />
                <span>{task.category}</span>
              </span>
              <span aria-hidden="true" className="text-[#E3EAF3] dark:text-slate-700">·</span>
              <span className="whitespace-nowrap">
                <PriorityIndicator priority={task.priority} />
              </span>
              <span aria-hidden="true" className="text-[#E3EAF3] dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 shrink-0 text-[#36A5F5]" />
                <span>Scheduled: {formatReadableDate(task.taskDate, todayIso)}</span>
              </span>
              <span aria-hidden="true" className="text-[#E3EAF3] dark:text-slate-700">·</span>
              <span
                className={`inline-flex items-center gap-1 tabular-nums whitespace-nowrap ${
                  overdue ? 'text-[#DC4545] dark:text-red-400 font-semibold' : ''
                }`}
              >
                {overdue ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#DC4545]" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-[#172B4D]/50" />
                )}
                <span>
                  Deadline: {formatReadableDate(task.deadline, todayIso)}
                  {task.scheduledTime ? ` at ${task.scheduledTime}` : ''}
                </span>
              </span>
              <span aria-hidden="true" className="text-[#E3EAF3] dark:text-slate-700">·</span>
              <span className={`${statusTextClass} whitespace-nowrap`}>
                {isCompleted ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
              </span>
              {task.sheetRowNumber && (
                <>
                  <span aria-hidden="true" className="text-[#E3EAF3] dark:text-slate-700">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#172B4D]/65 dark:text-slate-400 whitespace-nowrap">
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-[#16A36A]" />
                    Row {task.sheetRowNumber}
                  </span>
                </>
              )}
            </div>

            {/* Completed Timestamp or Sync State Notice */}
            {isCompleted && task.completedAt && (
              <div className="mt-1.5 text-xs text-[#16A36A] dark:text-emerald-400 tabular-nums">
                Confirmed completed on {formatTimestamp(task.completedAt)}
              </div>
            )}

            {/* Expanded Notes & Timestamps */}
            {expanded && (
              <div className="mt-3 pt-3 border-t border-[#E3EAF3] dark:border-slate-800/80 text-xs text-[#172B4D]/75 dark:text-slate-300 space-y-1.5">
                {task.notes ? (
                  <div>
                    <span className="font-semibold text-[#172B4D] dark:text-slate-200">
                      Notes:{' '}
                    </span>
                    <span>{task.notes}</span>
                  </div>
                ) : (
                  <div className="text-[#172B4D]/50 dark:text-slate-500 italic">
                    No additional task notes attached.
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-[#172B4D]/50 dark:text-slate-500">
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
            )}
          </div>
        </div>

        {/* Right: Functional Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap self-end sm:self-auto">
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => onRequestComplete(task)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#123B78] dark:text-blue-300 bg-[#DCEBFF] dark:bg-blue-950/60 hover:bg-[#36A5F5]/25 dark:hover:bg-blue-900/70 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5 text-[#1769E8] dark:text-blue-400" />
              Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRestorePending(task)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#172B4D] dark:text-slate-300 bg-[#F5F8FC] dark:bg-slate-800 hover:bg-[#DCEBFF] dark:hover:bg-slate-700 border border-[#E3EAF3] dark:border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-[#16A36A] dark:text-emerald-400" />
              Restore
            </button>
          )}

          {!isCompleted && (
            <button
              type="button"
              onClick={() => onQuickReschedule(task, 1)}
              title="Reschedule +1 Day"
              className="p-1.5 text-[#172B4D]/60 hover:text-[#1769E8] dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#DCEBFF]/70 dark:hover:bg-slate-800 rounded-md transition-colors"
              aria-label="Reschedule +1 day"
            >
              <CalendarPlus className="w-4 h-4 text-[#1769E8] dark:text-blue-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(task)}
            title="Edit Task"
            className="p-1.5 text-[#172B4D]/60 hover:text-[#E9A23B] dark:text-slate-400 dark:hover:text-amber-400 hover:bg-[#E9A23B]/10 dark:hover:bg-amber-950/40 rounded-md transition-colors"
            aria-label="Edit task"
          >
            <Edit3 className="w-4 h-4 text-[#E9A23B] dark:text-amber-400" />
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(task)}
            title="Duplicate Task"
            className="p-1.5 text-[#172B4D]/60 hover:text-[#36A5F5] dark:text-slate-400 dark:hover:text-sky-400 hover:bg-[#DCEBFF]/70 dark:hover:bg-sky-950/40 rounded-md transition-colors"
            aria-label="Duplicate task"
          >
            <Copy className="w-4 h-4 text-[#36A5F5] dark:text-sky-400" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(task)}
            title="Delete Task"
            className="p-1.5 text-[#172B4D]/60 hover:text-[#DC4545] dark:text-slate-400 dark:hover:text-red-400 hover:bg-[#DC4545]/10 dark:hover:bg-red-950/40 rounded-md transition-colors"
            aria-label="Delete task"
          >
            <Trash2 className="w-4 h-4 text-[#DC4545] dark:text-rose-400" />
          </button>

          {onMoveTask && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onMoveTask(task, 'up')}
                disabled={!canMoveUp}
                title="Move Task Up"
                className={`p-1.5 rounded transition-colors ${
                  canMoveUp
                    ? 'text-[#172B4D]/50 hover:text-[#1769E8] dark:hover:text-blue-400 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800'
                    : 'text-[#172B4D]/20 dark:text-slate-700 cursor-not-allowed opacity-40'
                }`}
                aria-label="Move task up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveTask(task, 'down')}
                disabled={!canMoveDown}
                title="Move Task Down"
                className={`p-1.5 rounded transition-colors ${
                  canMoveDown
                    ? 'text-[#172B4D]/50 hover:text-[#1769E8] dark:hover:text-blue-400 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800'
                    : 'text-[#172B4D]/20 dark:text-slate-700 cursor-not-allowed opacity-40'
                }`}
                aria-label="Move task down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? 'Hide details' : 'Show notes & audit timestamps'}
            className="p-1.5 text-[#172B4D]/50 hover:text-[#123B78] dark:hover:text-slate-200 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="Toggle task notes"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
