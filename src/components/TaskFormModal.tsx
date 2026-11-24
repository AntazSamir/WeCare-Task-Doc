import React, { useState, useEffect } from 'react';
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
import { Spinner } from '@astryxdesign/core/Spinner';
import { Task, TaskCategory, TaskPriority } from '../types/task';
import { getLocalTodayIso } from '../utils/dateUtils';
import { ModalTransition, MotionButton } from './animations';

const renderCategoryIcon = (category: TaskCategory) => {
  switch (category) {
    case 'Work':
      return <Briefcase className="w-3.5 h-3.5 shrink-0 text-[#1E40AF] dark:text-[#4C8DF6]" />;
    case 'Study':
      return <GraduationCap className="w-3.5 h-3.5 shrink-0 text-[#16A34A] dark:text-[#34C26B]" />;
    case 'Business':
      return <Building2 className="w-3.5 h-3.5 shrink-0 text-[#1E3A8A] dark:text-[#4C8DF6]" />;
    case 'Personal':
      return <User className="w-3.5 h-3.5 shrink-0 text-[#D97706] dark:text-[#F0A030]" />;
    default:
      return <Tag className="w-3.5 h-3.5 shrink-0 text-[#1E40AF] dark:text-[#4C8DF6]" />;
  }
};

const renderPriorityIndicator = (priority: TaskPriority) => {
  switch (priority) {
    case 'High':
      return <span className="w-2 h-2 rounded-full bg-[#DC2626] dark:bg-[#EF5350] shrink-0" />;
    case 'Medium':
      return <span className="w-2 h-2 rounded-full bg-[#D97706] dark:bg-[#F0A030] shrink-0" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6] shrink-0" />;
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
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!title.trim()) {
      setValidationError('Please enter a task title.');
      return;
    }
    if (!taskDate) {
      setValidationError('Every task must have a scheduled date.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
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
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalTransition
      isOpen={isOpen}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/70 backdrop-blur-xs"
      cardClassName="w-full max-w-xl rounded-lg bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-xl dark:shadow-none overflow-hidden"
    >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] dark:bg-[#161616]">
          <div>
            <h2
              id="task-form-title"
              className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]"
            >
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2]">
              Automatically synchronized with local SQLite and connected Google Spreadsheet
            </p>
          </div>
          <MotionButton
            onClick={onClose}
            className="p-1.5 text-[#0F172A]/50 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE] dark:hover:bg-[#252528] rounded transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </MotionButton>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-md bg-[#DC2626]/10 dark:bg-[rgba(239,83,80,0.14)] border border-[#DC2626]/35 dark:border-[#EF5350]/40 text-xs font-medium text-[#DC2626] dark:text-[#EF5350]">
              {validationError}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1"
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
              className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#0F172A]/40 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-desc-input"
              className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1"
            >
              <ListTodo className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
              Detailed Description
            </label>
            <textarea
              id="task-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe key deliverables, context, or acceptance criteria..."
              className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#0F172A]/40 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
            />
          </div>

          {/* Category & Priority Segmented Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1.5">
                Category
              </span>
              <div className="flex flex-wrap gap-1 p-1 rounded-md bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32]">
                {CATEGORIES.map((cat) => (
                  <MotionButton
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      category === cat
                        ? 'bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#1E3A8A] dark:text-[#ECECEE] shadow-xs dark:shadow-none ring-1 ring-[#1E40AF]/60 dark:ring-[#4C8DF6]'
                        : 'text-[#0F172A]/70 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE]'
                    }`}
                  >
                    {renderCategoryIcon(cat)}
                    <span>{cat}</span>
                  </MotionButton>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1.5">
                Priority Level
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32]">
                {PRIORITIES.map((prio) => (
                  <MotionButton
                    key={prio}
                    onClick={() => setPriority(prio)}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      priority === prio
                        ? prio === 'High'
                          ? 'bg-[#DC2626] dark:bg-[#EF5350] text-white shadow-xs dark:shadow-none'
                          : prio === 'Medium'
                          ? 'bg-[#D97706] dark:bg-[#F0A030] text-white shadow-xs dark:shadow-none'
                          : 'bg-[#1E40AF] dark:bg-[#4C8DF6] text-white shadow-xs dark:shadow-none'
                        : 'text-[#0F172A]/70 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE]'
                    }`}
                  >
                    {renderPriorityIndicator(prio)}
                    <span>{prio}</span>
                  </MotionButton>
                ))}
              </div>
            </div>
          </div>

          {/* Dates & Time Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="task-date-input"
                className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
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
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 text-sm tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="task-deadline-input"
                className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F0A030]" />
                Deadline Date
              </label>
              <input
                id="task-deadline-input"
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 text-sm tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="task-time-input"
                className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1"
              >
                <Clock className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Time (Optional)
              </label>
              <input
                id="task-time-input"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 text-sm tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="task-notes-input"
              className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1"
            >
              <Layers className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
              Notes / Additional Information
            </label>
            <textarea
              id="task-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Links, reference numbers, meeting room, or follow-up checklist..."
              className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3.5 py-2 text-sm text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#0F172A]/40 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
            />
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
            <MotionButton
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isSaving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSaving && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              {isSaving ? 'Saving & Syncing...' : editingTask ? 'Save & Sync Changes' : 'Create & Sync Task'}
            </MotionButton>
          </div>
        </form>
    </ModalTransition>
  );
};
