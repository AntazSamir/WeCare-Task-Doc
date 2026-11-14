import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Building2,
  FolderKanban,
  AlertCircle,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';
import { PmsTask, SubtaskItem, UserProfile, KoreanUniversity, IntakeProject, StudentApplication } from '../types/pms';
import { TaskCategory, TaskPriority } from '../types/task';
import { getLocalTodayIso } from '../utils/dateUtils';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface EnhancedTaskModalProps {
  isOpen: boolean;
  editingTask: PmsTask | null;
  currentUser: UserProfile;
  team: UserProfile[];
  universities: KoreanUniversity[];
  projects: IntakeProject[];
  students: StudentApplication[];
  defaultCategory?: TaskCategory;
  defaultPriority?: TaskPriority;
  initialDate?: string;
  initialStudentId?: string;
  initialProjectId?: string;
  onSave: (taskData: Partial<PmsTask>) => void;
  onClose: () => void;
}

export function EnhancedTaskModal({
  isOpen,
  editingTask,
  currentUser,
  team,
  universities,
  projects,
  students,
  defaultCategory = 'Work',
  defaultPriority = 'Medium',
  initialDate,
  initialStudentId,
  initialProjectId,
  onSave,
  onClose,
}: EnhancedTaskModalProps) {
  const todayIso = getLocalTodayIso();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [priority, setPriority] = useState<TaskPriority | 'Urgent'>(defaultPriority);
  const [taskDate, setTaskDate] = useState(initialDate || todayIso);
  const [deadline, setDeadline] = useState(initialDate || todayIso);
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  // PMS Linking
  const [assignedToId, setAssignedToId] = useState(currentUser.id);
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [universityId, setUniversityId] = useState('');

  // Subtasks
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Synchronize state when opening / switching task
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setCategory(editingTask.category || 'Work');
      setPriority(editingTask.priority || 'Medium');
      setTaskDate(editingTask.taskDate || todayIso);
      setDeadline(editingTask.deadline || editingTask.taskDate || todayIso);
      setScheduledTime(editingTask.scheduledTime || '');
      setNotes(editingTask.notes || '');
      setAssignedToId(editingTask.assignedToId || currentUser.id);
      setProjectId(editingTask.projectId || '');
      setStudentId(editingTask.studentId || '');
      setUniversityId(editingTask.universityId || '');
      setSubtasks(editingTask.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setCategory(defaultCategory);
      setPriority(defaultPriority);
      setTaskDate(initialDate || todayIso);
      setDeadline(initialDate || todayIso);
      setScheduledTime('');
      setNotes('');
      setAssignedToId(currentUser.role === 'Consultant' ? currentUser.id : team[1]?.id || currentUser.id);
      setProjectId(initialProjectId || '');
      setStudentId(initialStudentId || '');
      setUniversityId('');
      setSubtasks([]);
    }
  }, [editingTask, isOpen, initialDate, initialStudentId, initialProjectId, defaultCategory, defaultPriority, todayIso, currentUser, team]);

  if (!isOpen) return null;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newItem: SubtaskItem = {
      id: `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, newItem]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    setSubtasks(subtasks.map((st) => (st.id === subId ? { ...st, completed: !st.completed } : st)));
  };

  const handleRemoveSubtask = (subId: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== subId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedUser = team.find((u) => u.id === assignedToId);
    const selectedProj = projects.find((p) => p.id === projectId);
    const selectedStu = students.find((s) => s.id === studentId);
    const selectedUni = universities.find((u) => u.id === (universityId || selectedProj?.universityId || selectedStu?.appliedUniversityId));

    onSave({
      id: editingTask?.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      taskDate,
      deadline: deadline || taskDate,
      scheduledTime: scheduledTime || undefined,
      notes: notes.trim(),
      assignedToId: assignedUser?.id || currentUser.id,
      assignedToName: assignedUser?.name || currentUser.name,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      projectId: selectedProj?.id,
      projectName: selectedProj?.name,
      studentId: selectedStu?.id,
      studentName: selectedStu?.fullName,
      universityId: selectedUni?.id,
      universityName: selectedUni?.nameEn,
      subtasks,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-modal-backdrop">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg shadow-2xl my-auto overflow-hidden animate-modal-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#DCEBFF] dark:bg-blue-900/50 text-[#123B78] dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {editingTask ? '✏️' : '📋'}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D] dark:text-slate-100">
                {editingTask ? `Edit Task — ${editingTask.id}` : 'Create Consultancy Task'}
              </h2>
              <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
                Assign to team member and link to student dossier or intake project
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#172B4D]/50 hover:text-[#123B78] dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5">
              Task Title <span className="text-[#DC4545]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Verify Apostille on Bachelor degree & transcripts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#1769E8] text-[#172B4D] dark:text-slate-100"
            />
          </div>

          {/* Description & Detailed Instructions */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5">
              Detailed Instructions & Requirements
            </label>
            <textarea
              rows={3}
              placeholder="Provide exact verification checkpoints, embassy appointment guidelines, or DHL tracking details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#1769E8] text-[#172B4D] dark:text-slate-100"
            />
          </div>

          {/* Linking Row: Assigned To, Priority, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1769E8]" />
                Assign Responsibility
              </label>
              <MorphSelect
                value={assignedToId}
                onValueChange={(v) => setAssignedToId(v)}
                disabled={currentUser.role === 'Consultant'}
              >
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {team.map((m) => (
                    <MorphSelectItem key={m.id} value={m.id}>
                      {m.name} ({m.role === 'Admission_Manager' ? 'Manager' : 'Consultant'})
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#E9A23B]" />
                Priority
              </label>
              <MorphSelect value={priority} onValueChange={(v) => setPriority(v as any)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Urgent">🚨 Urgent (Immediate)</MorphSelectItem>
                  <MorphSelectItem value="High">🔴 High Priority</MorphSelectItem>
                  <MorphSelectItem value="Medium">🟡 Medium Priority</MorphSelectItem>
                  <MorphSelectItem value="Low">🔵 Low Priority</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5">
                Category
              </label>
              <MorphSelect value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Select..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Work">Admission / Visa</MorphSelectItem>
                  <MorphSelectItem value="Business">Document / DHL</MorphSelectItem>
                  <MorphSelectItem value="Study">Student Dossier</MorphSelectItem>
                  <MorphSelectItem value="Personal">Follow-up</MorphSelectItem>
                  <MorphSelectItem value="Other">Other</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>
          </div>

          {/* Dates Row: Task Date, Deadline, Scheduled Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1769E8]" />
                Task Start Date
              </label>
              <input
                type="date"
                required
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#DC4545]" />
                Hard Deadline
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5">
                Target Time (Optional)
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
              />
            </div>
          </div>

          {/* Consultancy Links: Link to Student, Project, or University */}
          <div className="p-4 bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-700 rounded-md space-y-3">
            <div className="text-xs font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-[#1769E8]" />
              Link to South Korea Consultancy Entities (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#172B4D]/75 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-[#16A36A]" />
                  Candidate / Student
                </label>
                <MorphSelect value={studentId} onValueChange={(v) => setStudentId(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="">— None —</MorphSelectItem>
                    {students.map((s) => (
                      <MorphSelectItem key={s.id} value={s.id}>
                        {s.fullName} ({s.id})
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D]/75 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <FolderKanban className="w-3 h-3 text-[#1769E8]" />
                  Intake Project
                </label>
                <MorphSelect value={projectId} onValueChange={(v) => setProjectId(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="">— None —</MorphSelectItem>
                    {projects.map((p) => (
                      <MorphSelectItem key={p.id} value={p.id}>
                        {p.name}
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#172B4D]/75 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#E9A23B]" />
                  University
                </label>
                <MorphSelect value={universityId} onValueChange={(v) => setUniversityId(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="">— None —</MorphSelectItem>
                    {universities.map((u) => (
                      <MorphSelectItem key={u.id} value={u.id}>
                        {u.nameEn}
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>
            </div>
          </div>

          {/* Subtasks Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#172B4D] dark:text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-[#1769E8]" />
                Subtasks / Verification Checkpoints ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </label>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-md bg-[#F4F2EE] dark:bg-slate-800/60 border border-[#E3EAF3] dark:border-slate-700 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      {st.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#16A36A] shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#172B4D]/40 shrink-0" />
                      )}
                      <span className={st.completed ? 'line-through text-[#172B4D]/45' : 'text-[#172B4D] dark:text-slate-200'}>
                        {st.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-[#172B4D]/45 hover:text-[#DC4545] p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask (e.g. Verify MoFA seal, check bank balance statement)..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs font-medium text-[#123B78] dark:text-blue-400 bg-[#DCEBFF] dark:bg-blue-900/30 rounded-md hover:bg-[#36A5F5]/25 flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#1769E8]" />
                Add Subtask
              </button>
            </div>
          </div>

          {/* Internal Notes / Google Sheets Column K */}
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#1769E8]" />
              Operational Notes (Synced to Google Sheets Column K)
            </label>
            <input
              type="text"
              placeholder="Case remarks, contact attempts, or courier receipt number..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3EAF3] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#172B4D] dark:text-slate-300 hover:bg-[#DCEBFF] dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md shadow-xs transition-colors"
            >
              {editingTask ? 'Save Changes & Sync' : 'Assign & Notify'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
