import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ListTodo,
  Calendar,
  Clock,
  Layers,
  Briefcase,
  GraduationCap,
  Building2,
  User,
  Tag,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types/task';
import { getLocalTodayIso } from '../utils/dateUtils';

const renderCategoryIcon = (category: TaskCategory) => {
  switch (category) {
    case 'Work':
      return <Briefcase className="w-3.5 h-3.5 shrink-0 text-[#1769E8]" />;
    case 'Study':
      return <GraduationCap className="w-3.5 h-3.5 shrink-0 text-[#16A36A]" />;
    case 'Business':
      return <Building2 className="w-3.5 h-3.5 shrink-0 text-[#123B78] dark:text-blue-400" />;
    case 'Personal':
      return <User className="w-3.5 h-3.5 shrink-0 text-[#E9A23B]" />;
    default:
      return <Tag className="w-3.5 h-3.5 shrink-0 text-[#36A5F5]" />;
  }
};

const renderPriorityIndicator = (priority: TaskPriority) => {
  switch (priority) {
    case 'High':
      return <span className="w-2 h-2 rounded-full bg-[#DC4545] shrink-0" />;
    case 'Medium':
      return <span className="w-2 h-2 rounded-full bg-[#E9A23B] shrink-0" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-[#36A5F5] shrink-0" />;
  }
};

interface TaskFormModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  defaultCategory: TaskCategory;
  defaultPriority: TaskPriority;
  initialDate?: string;
  onSave: (taskData: {
    id?: string;
    title: string;
    description: string;
    category: TaskCategory;
    priority: TaskPriority;
    taskDate: string;
    deadline: string;
    scheduledTime?: string;
    notes: string;
  }) => void;
  onClose: () => void;
}

const CATEGORIES: TaskCategory[] = ['Personal', 'Work', 'Study', 'Business', 'Other'];
const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  editingTask,
  defaultCategory,
  defaultPriority,
  initialDate,
  onSave,
  onClose,
}) => {
  const todayIso = getLocalTodayIso();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [taskDate, setTaskDate] = useState(todayIso);
  const [deadline, setDeadline] = useState(todayIso);
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setTaskDate(editingTask.taskDate);
      setDeadline(editingTask.deadline || editingTask.taskDate);
      setScheduledTime(editingTask.scheduledTime || '');
      setNotes(editingTask.notes || '');
      setValidationError(null);
    } else {
      const targetDate = initialDate || todayIso;
      setTitle('');
      setDescription('');
      setCategory(defaultCategory);
      setPriority(defaultPriority);
      setTaskDate(targetDate);
      setDeadline(targetDate);
      setScheduledTime('');
      setNotes('');
      setValidationError(null);
    }
  }, [editingTask, isOpen, defaultCategory, defaultPriority, initialDate, todayIso]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Please enter a task title.');
      return;
    }
    if (!taskDate) {
      setValidationError('Every task must have a scheduled date.');
      return;
    }
    onSave({
      id: editingTask?.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      taskDate,
      deadline: deadline || taskDate,
      scheduledTime: scheduledTime.trim() || undefined,
      notes: notes.trim(),
    });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-form-title"
    >
      <div className="w-full max-w-xl rounded-lg bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-xl my-auto overflow-hidden animate-modal-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3EAF3] dark:border-slate-800">
          <div>
            <h2
              id="task-form-title"
              className="text-base font-semibold text-[#172B4D] dark:text-slate-100"
            >
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
              Automatically synchronized with local SQLite and connected Google Spreadsheet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#172B4D]/50 hover:text-[#123B78] dark:hover:text-slate-200 rounded transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-md bg-[#DC4545]/10 dark:bg-red-950/40 border border-[#DC4545]/35 dark:border-red-900 text-xs font-medium text-[#DC4545] dark:text-red-400">
              {validationError}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1"
            >
              Task Title *
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g., Prepare Q4 Financial Reconciliation Spreadsheet"
              className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3.5 py-2 text-sm text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/40 focus:border-[#1769E8] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-desc-input"
              className="flex items-center gap-1.5 text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1"
            >
              <ListTodo className="w-3.5 h-3.5 text-[#36A5F5]" />
              Detailed Description
            </label>
            <textarea
              id="task-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe key deliverables, context, or acceptance criteria..."
              className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3.5 py-2 text-sm text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/40 focus:border-[#1769E8] focus:outline-none"
            />
          </div>

          {/* Category & Priority Segmented Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1.5">
                Category
              </span>
              <div className="flex flex-wrap gap-1 p-1 rounded-md bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      category === cat
                        ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs ring-1 ring-[#36A5F5]/60 dark:ring-slate-700'
                        : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#123B78] dark:hover:text-slate-100'
                    }`}
                  >
                    {renderCategoryIcon(cat)}
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1.5">
                Priority Level
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700">
                {PRIORITIES.map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setPriority(prio)}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      priority === prio
                        ? prio === 'High'
                          ? 'bg-[#DC4545] text-white shadow-xs'
                          : prio === 'Medium'
                          ? 'bg-[#E9A23B] text-white shadow-xs'
                          : 'bg-[#1769E8] dark:bg-slate-900 text-white shadow-xs'
                        : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#123B78] dark:hover:text-slate-100'
                    }`}
                  >
                    {renderPriorityIndicator(prio)}
                    <span>{prio}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates & Time Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="task-date-input"
                className="flex items-center gap-1.5 text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#1769E8]" />
                Scheduled Date *
              </label>
              <input
                id="task-date-input"
                type="date"
                required
                value={taskDate}
                onChange={(e) => {
                  setTaskDate(e.target.value);
                  if (!deadline || deadline < e.target.value) {
                    setDeadline(e.target.value);
                  }
                }}
                className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-sm font-mono tabular-nums text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="task-deadline-input"
                className="flex items-center gap-1.5 text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#E9A23B]" />
                Deadline Date
              </label>
              <input
                id="task-deadline-input"
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-sm font-mono tabular-nums text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="task-time-input"
                className="flex items-center gap-1.5 text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1"
              >
                <Clock className="w-3.5 h-3.5 text-[#36A5F5]" />
                Time (Optional)
              </label>
              <input
                id="task-time-input"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-sm font-mono tabular-nums text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="task-notes-input"
              className="flex items-center gap-1.5 text-xs font-medium text-[#172B4D] dark:text-slate-300 mb-1"
            >
              <Layers className="w-3.5 h-3.5 text-[#1769E8]" />
              Notes / Additional Information
            </label>
            <textarea
              id="task-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Links, reference numbers, meeting room, or follow-up checklist..."
              className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3.5 py-2 text-sm text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/40 focus:border-[#1769E8] focus:outline-none"
            />
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#172B4D] dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md hover:bg-[#DCEBFF] dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {editingTask ? 'Save & Sync Changes' : 'Create & Sync Task'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
