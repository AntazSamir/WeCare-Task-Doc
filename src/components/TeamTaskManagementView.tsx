import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Search,
  Building2,
  Trash2,
  Edit3,
  UserPlus,
  X,
  Check,
  Phone,
  Mail,
  Award,
  Layers,
  CheckSquare,
  GraduationCap,
} from 'lucide-react';
import {
  UserProfile,
  PmsTask,
  UserRole,
  TeamName,
  IntakeProject,
  KoreanUniversity,
  StudentApplication,
} from '../types/pms';
import { TaskPriority, TaskCategory } from '../types/task';
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignBulkTasks,
  reassignPmsTask,
} from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

export type TaskViewType =
  | 'all'
  | 'admission-team'
  | 'counseling-team'
  | 'my-tasks'
  | 'current'
  | 'previous'
  | 'completed'
  | 'overdue';

interface TeamTaskManagementViewProps {
  currentUser: UserProfile;
  team: UserProfile[];
  tasks: PmsTask[];
  projects: IntakeProject[];
  universities: KoreanUniversity[];
  students: StudentApplication[];
  onRefreshTasks: () => void;
  onRefreshTeam: () => void;
  onRequestComplete: (task: PmsTask) => void;
  onRestorePending: (task: PmsTask) => void;
  onDeleteTask: (task: PmsTask) => void;
}

export const TeamTaskManagementView: React.FC<TeamTaskManagementViewProps> = ({
  currentUser,
  team,
  tasks,
  projects,
  universities,
  students,
  onRefreshTasks,
  onRefreshTeam,
  onRequestComplete,
  onRestorePending,
  onDeleteTask,
}) => {
  const isAdmin = currentUser.role === 'Admission_Manager';
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Main active tab: task views
  const [activeView, setActiveView] = useState<TaskViewType>('all');
  const [selectedTeamTab, setSelectedTeamTab] = useState<'All' | 'Admission Team' | 'Counseling Team'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  // Selected Employee Profile Drawer/Modal
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);
  const [employeeTaskFilter, setEmployeeTaskFilter] = useState<'all' | 'current' | 'pending' | 'completed' | 'overdue' | 'previous'>('all');

  // Add/Edit Employee Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    role: 'Consultant' as UserRole,
    title: '',
    team: 'Admission Team' as TeamName,
    phone: '',
    avatar: '',
  });

  // Assign Task Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'single' | 'multiple' | 'team'>('single');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(currentUser.id);
  const [selectedMultiAssigneeIds, setSelectedMultiAssigneeIds] = useState<string[]>([]);
  const [selectedAssigneeTeam, setSelectedAssigneeTeam] = useState<TeamName>('Admission Team');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'Work' as TaskCategory,
    priority: 'Medium' as TaskPriority,
    taskDate: todayStr,
    deadline: todayStr,
    scheduledTime: '',
    notes: '',
    projectId: '',
    universityId: '',
    studentId: '',
  });

  // Reassign Task Modal
  const [reassigningTask, setReassigningTask] = useState<PmsTask | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [reassignDeadline, setReassignDeadline] = useState('');
  const [reassignPriority, setReassignPriority] = useState<TaskPriority>('Medium');

  // Team Member splits
  const admissionMembers = useMemo(() => team.filter((m) => m.team === 'Admission Team' || (!m.team && m.role === 'Admission_Manager')), [team]);
  const counselingMembers = useMemo(() => team.filter((m) => m.team === 'Counseling Team'), [team]);

  // View counts computation
  const viewCounts = useMemo(() => {
    const all = tasks.length;
    const admission = tasks.filter((t) => t.team === 'Admission Team' || admissionMembers.some((m) => m.id === t.assignedToId)).length;
    const counseling = tasks.filter((t) => t.team === 'Counseling Team' || counselingMembers.some((m) => m.id === t.assignedToId)).length;
    const myTasks = tasks.filter((t) => t.assignedToId === currentUser.id).length;
    const current = tasks.filter((t) => t.status === 'Pending' && (t.taskDate === todayStr || t.deadline === todayStr)).length;
    const previous = tasks.filter((t) => (t.deadline < todayStr || t.taskDate < todayStr) && t.status !== 'Pending').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const overdue = tasks.filter((t) => t.status === 'Pending' && t.deadline < todayStr).length;

    return { all, admission, counseling, myTasks, current, previous, completed, overdue };
  }, [tasks, admissionMembers, counselingMembers, currentUser.id, todayStr]);

  // Overall metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'Pending').length;
  const overdueTasks = tasks.filter((t) => t.status === 'Pending' && t.deadline < todayStr).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered tasks based on active view and search
  const displayedTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. View filter
      if (activeView === 'admission-team') {
        const isAdm = t.team === 'Admission Team' || admissionMembers.some((m) => m.id === t.assignedToId);
        if (!isAdm) return false;
      } else if (activeView === 'counseling-team') {
        const isCns = t.team === 'Counseling Team' || counselingMembers.some((m) => m.id === t.assignedToId);
        if (!isCns) return false;
      } else if (activeView === 'my-tasks') {
        if (t.assignedToId !== currentUser.id) return false;
      } else if (activeView === 'current') {
        if (t.status !== 'Pending' || (t.taskDate !== todayStr && t.deadline !== todayStr)) return false;
      } else if (activeView === 'previous') {
        if (!((t.deadline < todayStr || t.taskDate < todayStr) && t.status === 'Completed')) return false;
      } else if (activeView === 'completed') {
        if (t.status !== 'Completed') return false;
      } else if (activeView === 'overdue') {
        if (!(t.status === 'Pending' && t.deadline < todayStr)) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesAssignee = (t.assignedToName || '').toLowerCase().includes(q);
        const matchesUni = (t.universityName || '').toLowerCase().includes(q);
        const matchesStudent = (t.studentName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAssignee && !matchesUni && !matchesStudent) {
          return false;
        }
      }

      // 3. Category filter
      if (selectedCategory !== 'All' && t.category !== selectedCategory) {
        return false;
      }

      // 4. Priority filter
      if (selectedPriority !== 'All' && t.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [tasks, activeView, admissionMembers, counselingMembers, currentUser.id, todayStr, searchQuery, selectedCategory, selectedPriority]);

  // Selected Employee tasks
  const employeeTasks = useMemo(() => {
    if (!selectedEmployee) return [];
    return tasks.filter((t) => t.assignedToId === selectedEmployee.id);
  }, [tasks, selectedEmployee]);

  const filteredEmployeeTasks = useMemo(() => {
    if (!selectedEmployee) return [];
    return employeeTasks.filter((t) => {
      if (employeeTaskFilter === 'pending') return t.status === 'Pending';
      if (employeeTaskFilter === 'completed') return t.status === 'Completed';
      if (employeeTaskFilter === 'overdue') return t.status === 'Pending' && t.deadline < todayStr;
      if (employeeTaskFilter === 'current') return t.status === 'Pending' && (t.taskDate === todayStr || t.deadline === todayStr);
      if (employeeTaskFilter === 'previous') return (t.deadline < todayStr || t.taskDate < todayStr) && t.status === 'Completed';
      return true;
    });
  }, [employeeTasks, employeeTaskFilter, selectedEmployee, todayStr]);

  // Handlers for Employee Management
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      name: '',
      email: '',
      role: 'Consultant',
      title: '',
      team: 'Admission Team',
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    });
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: UserProfile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      title: emp.title,
      team: emp.team || 'Admission Team',
      phone: emp.phone || '',
      avatar: emp.avatar,
    });
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeForm);
      } else {
        await createEmployee(employeeForm);
      }
      setIsEmployeeModalOpen(false);
      onRefreshTeam();
    } catch (err: any) {
      alert(err.message || 'Error saving employee');
    }
  };

  const handleDeleteEmployee = async (emp: UserProfile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emp.id === 'USR-ADMIN') {
      alert('Cannot delete primary administrator.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${emp.name} from ${emp.team || 'the team'}?`)) {
      return;
    }
    try {
      await deleteEmployee(emp.id);
      if (selectedEmployee?.id === emp.id) setSelectedEmployee(null);
      onRefreshTeam();
    } catch (err: any) {
      alert(err.message || 'Error deleting employee');
    }
  };

  // Handlers for Task Creation & Reassignment
  const handleOpenAssignModal = (prefillAssignee?: string) => {
    if (prefillAssignee) {
      setAssignMode('single');
      setSelectedAssigneeId(prefillAssignee);
    }
    setTaskForm({
      title: '',
      description: '',
      category: 'Work',
      priority: 'Medium',
      taskDate: todayStr,
      deadline: todayStr,
      scheduledTime: '',
      notes: '',
      projectId: projects[0]?.id || '',
      universityId: universities[0]?.id || '',
      studentId: students[0]?.id || '',
    });
    setIsAssignModalOpen(true);
  };

  const handleSaveTaskAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      if (assignMode === 'team') {
        await assignBulkTasks({
          ...taskForm,
          assignedTeam: selectedAssigneeTeam,
        });
      } else if (assignMode === 'multiple') {
        if (selectedMultiAssigneeIds.length === 0) {
          alert('Please select at least one employee.');
          return;
        }
        await assignBulkTasks({
          ...taskForm,
          assignedToIds: selectedMultiAssigneeIds,
        });
      } else {
        await assignBulkTasks({
          ...taskForm,
          assignedToId: selectedAssigneeId,
        });
      }

      setIsAssignModalOpen(false);
      onRefreshTasks();
      onRefreshTeam();
    } catch (err: any) {
      alert(err.message || 'Failed to assign task');
    }
  };

  const handleOpenReassign = (task: PmsTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setReassigningTask(task);
    setReassignTargetId(task.assignedToId || currentUser.id);
    setReassignDeadline(task.deadline || todayStr);
    setReassignPriority(task.priority || 'Medium');
  };

  const handleSaveReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningTask) return;
    try {
      const targetUser = team.find((m) => m.id === reassignTargetId);
      await reassignPmsTask(reassigningTask.id, {
        assignedToId: reassignTargetId,
        team: targetUser?.team,
        deadline: reassignDeadline,
        priority: reassignPriority,
      });
      setReassigningTask(null);
      onRefreshTasks();
      onRefreshTeam();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign task');
    }
  };

  // Avatar presets for quick employee creation
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  ];

  return (
    <div className="space-y-5 animate-page-enter">
      {/* 1. EXECUTIVE TEAM DASHBOARD HEADER */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCEBFF] dark:bg-blue-950/50 text-[#123B78] dark:text-blue-300 border border-[#36A5F5]/40 dark:border-blue-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1769E8] dark:text-[#36A5F5]" />
                Team-Based Task Operations
              </span>
              <span className="text-xs text-[#172B4D]/60 dark:text-slate-400 font-mono">
                Admission: {admissionMembers.length} • Counseling: {counselingMembers.length}
              </span>
            </div>
            <h1 className="text-xl font-display font-bold text-[#172B4D] dark:text-slate-100 mt-1">
              Task Operations & Team Workload Command
            </h1>
            <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
              Coordinated Korean university admission pipeline, student visa filings, and advisory tasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenAddEmployee}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F4F2EE] dark:bg-slate-800 text-[#172B4D] dark:text-slate-200 hover:bg-[#DCEBFF] hover:text-[#123B78] dark:hover:bg-slate-700 border border-[#E3EAF3] dark:border-slate-700 transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#1769E8] dark:text-[#36A5F5]" />
                Add Employee
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#1769E8] hover:bg-[#123B78] text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Assign Task
            </button>
          </div>
        </div>

        {/* METRICS KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/50 border border-[#E3EAF3] dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-[#172B4D]/65 dark:text-slate-400 mb-1">
              <span>Total Active Tasks</span>
              <Layers className="w-3.5 h-3.5 text-[#1769E8]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#172B4D] dark:text-slate-100">{totalTasks}</div>
            <div className="text-[11px] text-[#172B4D]/55 dark:text-slate-400 mt-0.5">Across both dedicated teams</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#16A36A]/10 dark:bg-emerald-950/20 border border-[#16A36A]/30 dark:border-emerald-900/30">
            <div className="flex items-center justify-between text-xs text-[#16A36A] dark:text-emerald-400 mb-1">
              <span>Completed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#16A36A] dark:text-emerald-300">
              {completedTasks}
              <span className="text-xs font-normal text-[#16A36A] dark:text-emerald-400 ml-1.5 font-sans">
                ({completionRate}%)
              </span>
            </div>
            <div className="text-[11px] text-[#16A36A]/80 mt-0.5">Verified completions</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#DCEBFF]/60 dark:bg-blue-950/20 border border-[#36A5F5]/40 dark:border-blue-900/30">
            <div className="flex items-center justify-between text-xs text-[#123B78] dark:text-blue-400 mb-1">
              <span>Pending Action</span>
              <Clock className="w-3.5 h-3.5 text-[#1769E8]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#123B78] dark:text-blue-300">{pendingTasks}</div>
            <div className="text-[11px] text-[#1769E8]/85 mt-0.5">In active progression</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#DC4545]/10 dark:bg-rose-950/20 border border-[#DC4545]/30 dark:border-rose-900/30">
            <div className="flex items-center justify-between text-xs text-[#DC4545] dark:text-rose-400 mb-1">
              <span>Overdue Deadlines</span>
              <AlertTriangle className="w-3.5 h-3.5 text-[#DC4545]" />
            </div>
            <div className="text-2xl font-bold font-display text-[#DC4545] dark:text-rose-300">{overdueTasks}</div>
            <div className="text-[11px] text-[#DC4545]/80 mt-0.5">Requires immediate attention</div>
          </div>
        </div>
      </div>

      {/* 2. TEAM OVERVIEW & EMPLOYEE WORKLOAD DIRECTORY */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1769E8] dark:text-[#36A5F5]" />
              Teams & Employee Workload Directory
            </h2>
            <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
              Click any team tab to focus, or select any employee to view their full workload profile and task history.
            </p>
          </div>

          {/* Team Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-lg">
            {(['All', 'Admission Team', 'Counseling Team'] as const).map((tTab) => (
              <button
                key={tTab}
                type="button"
                onClick={() => setSelectedTeamTab(tTab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  selectedTeamTab === tTab
                    ? 'bg-[#123B78] dark:bg-slate-900 text-white dark:text-blue-300 shadow-xs'
                    : 'text-[#172B4D]/70 dark:text-slate-400 hover:text-[#172B4D]'
                }`}
              >
                {tTab === 'All' ? `All Teams (${team.length})` : tTab === 'Admission Team' ? `Admission Team (${admissionMembers.length})` : `Counseling Team (${counselingMembers.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* TEAM MEMBERS CARDS GRID */}
        <div key={selectedTeamTab} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-tab-enter">
          {team
            .filter((m) => {
              if (selectedTeamTab === 'Admission Team') return m.team === 'Admission Team' || (!m.team && m.role === 'Admission_Manager');
              if (selectedTeamTab === 'Counseling Team') return m.team === 'Counseling Team';
              return true;
            })
            .map((emp) => {
              const empPending = tasks.filter((t) => t.assignedToId === emp.id && t.status === 'Pending').length;
              const empOverdue = tasks.filter((t) => t.assignedToId === emp.id && t.status === 'Pending' && t.deadline < todayStr).length;
              const empCompleted = tasks.filter((t) => t.assignedToId === emp.id && t.status === 'Completed').length;
              const isSelected = selectedEmployee?.id === emp.id;
              const isEmpAdmin = emp.role === 'Admission_Manager';

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer group text-left ${
                    isSelected
                      ? 'border-[#1769E8] bg-[#DCEBFF]/40 dark:bg-blue-950/20 ring-1 ring-[#1769E8]'
                      : 'border-[#E3EAF3] dark:border-slate-800 hover:border-[#36A5F5] dark:hover:border-blue-800 bg-[#FFFFFF] dark:bg-slate-900 shadow-2xs hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#E3EAF3] dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-[#172B4D] dark:text-slate-100 truncate group-hover:text-[#1769E8] dark:group-hover:text-[#36A5F5] transition-colors">
                          {emp.name}
                        </div>
                        <div className="text-[11px] text-[#172B4D]/60 dark:text-slate-400 truncate">
                          {emp.title}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                        emp.team === 'Admission Team'
                          ? 'bg-[#DCEBFF] dark:bg-blue-950/60 text-[#123B78] dark:text-blue-300 border border-[#36A5F5]/40'
                          : 'bg-[#F4F2EE] dark:bg-slate-800 text-[#1769E8] dark:text-blue-300 border border-[#E3EAF3] dark:border-slate-700'
                      }`}
                    >
                      {emp.team === 'Admission Team' ? 'Admission' : 'Counseling'}
                    </span>
                  </div>

                  {/* Workload badges */}
                  <div className="flex items-center justify-between text-[11px] pt-3 mt-2 border-t border-[#E3EAF3] dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[#172B4D]/75 dark:text-slate-400 font-medium">
                        {empPending} Pending
                      </span>
                      {empOverdue > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-[#DC4545]/15 dark:bg-rose-950 text-[#DC4545] dark:text-rose-300 font-bold text-[10px]">
                          {empOverdue} late
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[#16A36A] dark:text-emerald-400 font-medium text-[10px]">
                        ✓ {empCompleted}
                      </span>

                      {isAdmin && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Edit Employee"
                            onClick={(e) => handleOpenEditEmployee(emp, e)}
                            className="p-1 text-[#172B4D]/45 hover:text-[#1769E8] dark:text-slate-400 dark:hover:text-slate-200 rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          {!isEmpAdmin && (
                            <button
                              type="button"
                              title="Delete Employee"
                              onClick={(e) => handleDeleteEmployee(emp, e)}
                              className="p-1 text-[#172B4D]/45 hover:text-[#DC4545] rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 3. 8 SEGMENTED TASK VIEWS NAVIGATION */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        {/* VIEW SELECTOR BUTTONS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Tasks', count: viewCounts.all, icon: Layers },
            { id: 'admission-team', label: 'Admission Team', count: viewCounts.admission, icon: ShieldCheck },
            { id: 'counseling-team', label: 'Counseling Team', count: viewCounts.counseling, icon: UserCheck },
            { id: 'my-tasks', label: 'My Tasks', count: viewCounts.myTasks, icon: Award },
            { id: 'current', label: 'Current Tasks', count: viewCounts.current, icon: Clock },
            { id: 'previous', label: 'Previous Tasks', count: viewCounts.previous, icon: Calendar },
            { id: 'completed', label: 'Completed Tasks', count: viewCounts.completed, icon: CheckCircle2 },
            { id: 'overdue', label: 'Overdue Tasks', count: viewCounts.overdue, icon: AlertCircle, badgeColor: 'bg-[#DC4545] text-white' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id as TaskViewType)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 border ${
                  isTabActive
                    ? 'bg-[#123B78] text-white border-[#123B78] shadow-xs'
                    : 'bg-[#F4F2EE] dark:bg-slate-800/60 border-[#E3EAF3] dark:border-slate-700/60 text-[#172B4D]/75 dark:text-slate-300 hover:bg-[#DCEBFF]/60 hover:text-[#123B78] dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isTabActive ? 'text-[#36A5F5]' : 'text-[#1769E8] dark:text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    tab.badgeColor && !isTabActive
                      ? tab.badgeColor
                      : isTabActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#DCEBFF] dark:bg-slate-700 text-[#123B78] dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#172B4D]/45 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, assignee, student, or university..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-800/40 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8] focus:bg-[#FFFFFF] dark:focus:bg-slate-900 transition-all text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/45"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#172B4D]/45 hover:text-[#172B4D] dark:text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#172B4D]/60 dark:text-slate-400 hidden sm:inline">Category:</span>
              <div className="w-36">
                <MorphSelect value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="All Categories" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="All">All Categories</MorphSelectItem>
                    <MorphSelectItem value="Work">Work</MorphSelectItem>
                    <MorphSelectItem value="Business">Business</MorphSelectItem>
                    <MorphSelectItem value="Study">Study</MorphSelectItem>
                    <MorphSelectItem value="Personal">Personal</MorphSelectItem>
                    <MorphSelectItem value="Other">Other</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#172B4D]/60 dark:text-slate-400 hidden sm:inline">Priority:</span>
              <div className="w-36">
                <MorphSelect value={selectedPriority} onValueChange={(v) => setSelectedPriority(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="All Priorities" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="All">All Priorities</MorphSelectItem>
                    <MorphSelectItem value="Urgent">Urgent</MorphSelectItem>
                    <MorphSelectItem value="High">High</MorphSelectItem>
                    <MorphSelectItem value="Medium">Medium</MorphSelectItem>
                    <MorphSelectItem value="Low">Low</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TASK LIST ACCORDING TO VIEW */}
      <div key={activeView} className="space-y-3 animate-tab-enter">
        {displayedTasks.length === 0 ? (
          <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl p-10 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#DCEBFF] dark:bg-slate-800 flex items-center justify-center mx-auto text-[#1769E8]">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#172B4D] dark:text-slate-200">
                No tasks found in this view
              </p>
              <p className="text-xs text-[#172B4D]/60 dark:text-slate-400 mt-0.5">
                {searchQuery
                  ? `No matches for "${searchQuery}". Try clearing search filters.`
                  : 'Assign tasks to team members or select another view tab.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F4F2EE] hover:bg-[#DCEBFF] border border-[#E3EAF3] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#172B4D] dark:text-slate-300"
                >
                  Clear Search
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenAssignModal()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#1769E8] hover:bg-[#123B78] text-white"
              >
                + Assign New Task
              </button>
            </div>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isOverdue = !isCompleted && task.deadline < todayStr;
            const isDueToday = !isCompleted && (task.deadline === todayStr || task.taskDate === todayStr);

            return (
              <div
                key={task.id}
                className={`group bg-[#FFFFFF] dark:bg-slate-900 border rounded-xl p-4 transition-all shadow-2xs hover:shadow-sm ${
                  isCompleted
                    ? 'border-[#E3EAF3] dark:border-slate-800 opacity-80'
                    : isOverdue
                    ? 'border-[#DC4545]/50 dark:border-rose-900/60 bg-[#DC4545]/5 dark:bg-rose-950/10'
                    : isDueToday
                    ? 'border-[#36A5F5] dark:border-blue-900/60 bg-[#DCEBFF]/25 dark:bg-blue-950/20'
                    : 'border-[#E3EAF3] dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Completion Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted) {
                          onRestorePending(task);
                        } else {
                          onRequestComplete(task);
                        }
                      }}
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        isCompleted
                          ? 'bg-[#16A36A] border-[#16A36A] text-white'
                          : 'border-[#E3EAF3] dark:border-slate-600 hover:border-[#1769E8] text-transparent'
                      }`}
                      title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">

                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            task.priority === 'Urgent'
                              ? 'bg-[#DC4545]/15 text-[#DC4545] dark:bg-rose-950 dark:text-rose-300'
                              : task.priority === 'High'
                              ? 'bg-[#E9A23B]/15 text-[#E9A23B] dark:bg-amber-950 dark:text-amber-300'
                              : task.priority === 'Medium'
                              ? 'bg-[#DCEBFF] text-[#1769E8] dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-[#F4F2EE] text-[#172B4D]/75 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {task.priority}
                        </span>

                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#F4F2EE] dark:bg-slate-800 text-[#172B4D]/70 dark:text-slate-400 border border-[#E3EAF3] dark:border-slate-700 font-medium">
                          {task.category}
                        </span>

                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            task.team === 'Counseling Team'
                              ? 'bg-[#F4F2EE] dark:bg-slate-800 text-[#123B78] dark:text-blue-300 border border-[#E3EAF3] dark:border-slate-700'
                              : 'bg-[#DCEBFF] dark:bg-blue-950/50 text-[#123B78] dark:text-blue-300 border border-[#36A5F5]/40'
                          }`}
                        >
                          {task.team || 'Admission Team'}
                        </span>

                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#DC4545] text-white">
                            Overdue ({task.deadline})
                          </span>
                        )}

                        {isDueToday && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#1769E8] text-white">
                            Due Today
                          </span>
                        )}

                        {isCompleted && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#16A36A]/15 dark:bg-emerald-950 text-[#16A36A] dark:text-emerald-300">
                            Completed
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-sm font-semibold ${
                          isCompleted
                            ? 'line-through text-[#172B4D]/45 dark:text-slate-500'
                            : 'text-[#172B4D] dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-[#172B4D]/70 dark:text-slate-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Attached entity badges */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#172B4D]/60 dark:text-slate-400">
                        {task.universityName && (
                          <span className="flex items-center gap-1 text-[11px] text-[#172B4D]/75 dark:text-slate-400">
                            <Building2 className="w-3 h-3 text-[#172B4D]/45 dark:text-slate-400" />
                            {task.universityName}
                          </span>
                        )}
                        {task.studentName && (
                          <span className="flex items-center gap-1 text-[11px] text-[#1769E8] dark:text-[#36A5F5] font-medium">
                            <GraduationCap className="w-3 h-3" />
                            {task.studentName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-[#172B4D]/55 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          Target: {task.taskDate} {task.deadline !== task.taskDate ? `(Deadline: ${task.deadline})` : ''}
                        </span>
                      </div>

                      {/* Subtasks summary */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-[#172B4D]/60 dark:text-slate-400">
                          <CheckSquare className="w-3 h-3 text-[#172B4D]/45 dark:text-slate-400" />
                          <span>
                            {task.subtasks.filter((s) => s.completed).length} of {task.subtasks.length} subtasks done
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignee Information & Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div
                      onClick={() => {
                        const targetUser = team.find((m) => m.id === task.assignedToId);
                        if (targetUser) setSelectedEmployee(targetUser);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/60 border border-[#E3EAF3] dark:border-slate-700/60 cursor-pointer hover:bg-[#DCEBFF]/60 transition-colors"
                      title="Click to view assignee profile"
                    >
                      <img
                        src={task.assigneeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                        alt={task.assignedToName || 'Assignee'}
                        className="w-5 h-5 rounded-full object-cover border border-[#E3EAF3] dark:border-slate-700"
                      />
                      <div className="text-right">
                        <div className="text-xs font-semibold text-[#172B4D] dark:text-slate-200 leading-tight">
                          {task.assignedToName || 'Unassigned'}
                        </div>
                        <div className="text-[10px] text-[#172B4D]/55 dark:text-slate-400 leading-tight">
                          {task.team || 'Admission Team'}
                        </div>
                      </div>
                    </div>

                    {/* Operational Quick Actions */}
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenReassign(task, e)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-[#F4F2EE] hover:bg-[#DCEBFF] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#172B4D] dark:text-slate-300 border border-[#E3EAF3] dark:border-slate-700"
                          title="Reassign to another employee or update priority"
                        >
                          Reassign
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        className="p-1 text-[#172B4D]/45 hover:text-[#DC4545] rounded transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. EMPLOYEE PROFILE & TASK HISTORY MODAL / SLIDEOUT */}
      {selectedEmployee &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-modal-backdrop">
            <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-modal-card">
              {/* Header */}
              <div className="p-5 border-b border-[#E3EAF3] dark:border-slate-800 flex items-start justify-between bg-[#F4F2EE] dark:bg-slate-800/40">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedEmployee.avatar}
                    alt={selectedEmployee.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#FFFFFF] dark:border-slate-800 shadow-md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-display font-bold text-[#172B4D] dark:text-slate-100">
                        {selectedEmployee.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          selectedEmployee.team === 'Admission Team'
                            ? 'bg-[#DCEBFF] text-[#123B78] dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-[#F4F2EE] text-[#1769E8] border border-[#E3EAF3] dark:bg-slate-800 dark:text-blue-300 dark:border-slate-700'
                        }`}
                      >
                        {selectedEmployee.team || 'Admission Team'}
                      </span>
                      {selectedEmployee.role === 'Admission_Manager' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#16A36A]/15 text-[#16A36A] dark:bg-emerald-950 dark:text-emerald-300">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#172B4D]/75 dark:text-slate-400 font-medium mt-0.5">
                      {selectedEmployee.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[#172B4D]/55 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {selectedEmployee.email}
                      </span>
                      {selectedEmployee.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedEmployee.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAssignModal(selectedEmployee.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1769E8] hover:bg-[#123B78] text-white transition-colors"
                  >
                    + Assign Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="p-1.5 text-[#172B4D]/50 hover:text-[#172B4D] dark:text-slate-400 dark:hover:text-slate-200 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Profile Statistics Bar */}
              <div className="grid grid-cols-4 p-4 border-b border-[#E3EAF3] dark:border-slate-800 text-center divide-x divide-[#E3EAF3] dark:divide-slate-800 text-xs">
                <div className="px-2">
                  <div className="text-lg font-bold text-[#172B4D] dark:text-slate-100">
                    {employeeTasks.length}
                  </div>
                  <div className="text-[10px] text-[#172B4D]/55 dark:text-slate-400 uppercase font-semibold">Total Assigned</div>
                </div>
                <div className="px-2">
                  <div className="text-lg font-bold text-[#1769E8] dark:text-[#36A5F5]">
                    {employeeTasks.filter((t) => t.status === 'Pending').length}
                  </div>
                  <div className="text-[10px] text-[#1769E8] uppercase font-semibold">Pending Action</div>
                </div>
                <div className="px-2">
                  <div className="text-lg font-bold text-[#16A36A] dark:text-emerald-400">
                    {employeeTasks.filter((t) => t.status === 'Completed').length}
                  </div>
                  <div className="text-[10px] text-[#16A36A] uppercase font-semibold">Completed</div>
                </div>
                <div className="px-2">
                  <div className="text-lg font-bold text-[#DC4545] dark:text-rose-400">
                    {employeeTasks.filter((t) => t.status === 'Pending' && t.deadline < todayStr).length}
                  </div>
                  <div className="text-[10px] text-[#DC4545] uppercase font-semibold">Overdue</div>
                </div>
              </div>

              {/* Employee Task Filter Tabs */}
              <div className="flex items-center gap-1.5 p-3 border-b border-[#E3EAF3] dark:border-slate-800 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'All Tasks', count: employeeTasks.length },
                  { id: 'current', label: 'Current / Today', count: employeeTasks.filter((t) => t.status === 'Pending' && (t.taskDate === todayStr || t.deadline === todayStr)).length },
                  { id: 'pending', label: 'Pending', count: employeeTasks.filter((t) => t.status === 'Pending').length },
                  { id: 'overdue', label: 'Overdue', count: employeeTasks.filter((t) => t.status === 'Pending' && t.deadline < todayStr).length },
                  { id: 'completed', label: 'Completed', count: employeeTasks.filter((t) => t.status === 'Completed').length },
                  { id: 'previous', label: 'Previous Completed', count: employeeTasks.filter((t) => (t.deadline < todayStr || t.taskDate < todayStr) && t.status === 'Completed').length },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setEmployeeTaskFilter(tf.id as any)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      employeeTaskFilter === tf.id
                        ? 'bg-[#123B78] text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-[#F4F2EE] dark:bg-slate-800 text-[#172B4D]/70 dark:text-slate-400 hover:text-[#172B4D]'
                    }`}
                  >
                    {tf.label} ({tf.count})
                  </button>
                ))}
              </div>

              {/* Task list for this employee */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {filteredEmployeeTasks.length === 0 ? (
                  <div className="py-12 text-center text-[#172B4D]/55 dark:text-slate-400 text-xs">
                    No tasks under this category for {selectedEmployee.name}.
                  </div>
                ) : (
                  filteredEmployeeTasks.map((t) => {
                    const isDone = t.status === 'Completed';
                    const isLate = !isDone && t.deadline < todayStr;
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border text-left text-xs space-y-1 transition-all ${
                          isDone
                            ? 'border-[#E3EAF3] dark:border-slate-800 opacity-75'
                            : isLate
                            ? 'border-[#DC4545]/50 dark:border-rose-900/60 bg-[#DC4545]/5'
                            : 'border-[#E3EAF3] dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-[#172B4D] dark:text-slate-100">
                            <span className={isDone ? 'line-through text-[#172B4D]/45' : ''}>{t.title}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isDone
                                ? 'bg-[#16A36A]/15 text-[#16A36A]'
                                : isLate
                                ? 'bg-[#DC4545]/15 text-[#DC4545]'
                                : 'bg-[#DCEBFF] text-[#1769E8]'
                            }`}
                          >
                            {isDone ? 'Completed' : isLate ? 'Overdue' : 'Pending'}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-[#172B4D]/65 dark:text-slate-400 line-clamp-1">{t.description}</p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-[#172B4D]/55 dark:text-slate-400 pt-1 border-t border-[#E3EAF3] dark:border-slate-800">
                          <span>Due: {t.deadline} • Priority: {t.priority}</span>
                          {t.completedAt && (
                            <span className="text-[#16A36A] font-medium">
                              Done on: {t.completedAt.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 6. ASSIGN TASK MODAL (Authorized for Managers / Team assignment) */}
      {isAssignModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-modal-backdrop">
            <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-modal-card">
            <div className="p-4 border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between bg-[#F4F2EE] dark:bg-slate-900">
              <div>
                <h2 className="text-base font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#1769E8]" />
                  Assign New Team Task
                </h2>
                <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
                  Assign to an individual employee, multiple team members, or an entire department.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-[#172B4D]/50 hover:text-[#172B4D] dark:text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskAssignment} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Assignment Scope Selector */}
              <div>
                <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1.5">
                  Assignment Target
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'single', label: 'Single Employee' },
                    { id: 'multiple', label: 'Multiple Employees' },
                    { id: 'team', label: 'Entire Team' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAssignMode(mode.id as any)}
                      className={`py-2 px-2 text-center rounded-lg border font-semibold transition-all ${
                        assignMode === mode.id
                          ? 'border-[#1769E8] bg-[#DCEBFF] dark:bg-blue-950/40 text-[#123B78] dark:text-blue-300'
                          : 'border-[#E3EAF3] dark:border-slate-800 text-[#172B4D]/70 dark:text-slate-400 hover:bg-[#F4F2EE]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode-specific Assignee Pickers */}
              {assignMode === 'single' && (
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Select Assignee
                  </label>
                  <MorphSelect value={selectedAssigneeId} onValueChange={(v) => setSelectedAssigneeId(v)}>
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select Assignee" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      {admissionMembers.map((m) => (
                        <MorphSelectItem key={m.id} value={m.id}>
                          [Admission] {m.name} ({m.title})
                        </MorphSelectItem>
                      ))}
                      {counselingMembers.map((m) => (
                        <MorphSelectItem key={m.id} value={m.id}>
                          [Counseling] {m.name} ({m.title})
                        </MorphSelectItem>
                      ))}
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              )}

              {assignMode === 'multiple' && (
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Select Employees ({selectedMultiAssigneeIds.length} selected)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-2 space-y-1.5 bg-[#F4F2EE] dark:bg-slate-800/30">
                    {team.map((m) => {
                      const isChecked = selectedMultiAssigneeIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMultiAssigneeIds([...selectedMultiAssigneeIds, m.id]);
                              } else {
                                setSelectedMultiAssigneeIds(selectedMultiAssigneeIds.filter((id) => id !== m.id));
                              }
                            }}
                            className="rounded text-[#1769E8] focus:ring-[#1769E8]"
                          />
                          <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                          <span className="font-medium text-[#172B4D] dark:text-slate-200">{m.name}</span>
                          <span className="text-[10px] text-[#172B4D]/55">({m.team})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {assignMode === 'team' && (
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Select Target Team
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Admission Team', 'Counseling Team'] as const).map((tName) => (
                      <button
                        key={tName}
                        type="button"
                        onClick={() => setSelectedAssigneeTeam(tName)}
                        className={`p-3 rounded-lg border text-left font-semibold transition-all ${
                          selectedAssigneeTeam === tName
                            ? 'border-[#1769E8] bg-[#DCEBFF] dark:bg-blue-950 text-[#123B78] dark:text-blue-300 ring-1 ring-[#1769E8]'
                            : 'border-[#E3EAF3] dark:border-slate-800 text-[#172B4D] hover:bg-[#F4F2EE]'
                        }`}
                      >
                        <div>{tName}</div>
                        <div className="text-[10px] font-normal text-[#172B4D]/65 mt-0.5">
                          {tName === 'Admission Team'
                            ? `Assigns to all ${admissionMembers.length} admission officers`
                            : `Assigns to all ${counselingMembers.length} counselors`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Details */}
              <div>
                <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Verify Apostille on high school certificate for SNU intake"
                  className="w-full px-3 py-2 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8]"
                />
              </div>

              <div>
                <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                  Description / Operational Instructions
                </label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Detailed guidelines, requirements, or portal reference links..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={taskForm.taskDate}
                    onChange={(e) => setTaskForm({ ...taskForm, taskDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#1769E8]"
                  />
                </div>
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#1769E8]"
                  />
                </div>
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Priority
                  </label>
                  <MorphSelect
                    value={taskForm.priority}
                    onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as any })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Priority" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Urgent">Urgent</MorphSelectItem>
                      <MorphSelectItem value="High">High</MorphSelectItem>
                      <MorphSelectItem value="Medium">Medium</MorphSelectItem>
                      <MorphSelectItem value="Low">Low</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Category
                  </label>
                  <MorphSelect
                    value={taskForm.category}
                    onValueChange={(v) => setTaskForm({ ...taskForm, category: v as any })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Category" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Work">Work</MorphSelectItem>
                      <MorphSelectItem value="Business">Business</MorphSelectItem>
                      <MorphSelectItem value="Study">Study</MorphSelectItem>
                      <MorphSelectItem value="Personal">Personal</MorphSelectItem>
                      <MorphSelectItem value="Other">Other</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>

              {/* Optional University / Student Link */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Link University (Optional)
                  </label>
                  <MorphSelect
                    value={taskForm.universityId}
                    onValueChange={(v) => setTaskForm({ ...taskForm, universityId: v })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select University" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="">None</MorphSelectItem>
                      {universities.map((u) => (
                        <MorphSelectItem key={u.id} value={u.id}>
                          {u.nameEn}
                        </MorphSelectItem>
                      ))}
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Link Student Dossier (Optional)
                  </label>
                  <MorphSelect
                    value={taskForm.studentId}
                    onValueChange={(v) => setTaskForm({ ...taskForm, studentId: v })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select Student" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="">None</MorphSelectItem>
                      {students.map((s) => (
                        <MorphSelectItem key={s.id} value={s.id}>
                          {s.fullName} ({s.passportNumber})
                        </MorphSelectItem>
                      ))}
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-700 text-[#172B4D]/75 dark:text-slate-300 hover:bg-[#F4F2EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1769E8] hover:bg-[#123B78] text-white font-semibold shadow-xs"
                >
                  Create & Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 7. REASSIGN TASK MODAL */}
      {reassigningTask &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-modal-backdrop">
            <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md my-auto p-5 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b border-[#E3EAF3] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#172B4D] dark:text-slate-100">
                  Reassign Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassigningTask(null)}
                className="text-[#172B4D]/45 hover:text-[#172B4D] dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReassign} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#172B4D]/75 dark:text-slate-400 mb-1 font-semibold">
                  Task
                </label>
                <div className="p-2.5 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/50 border border-[#E3EAF3] dark:border-slate-700 font-medium text-[#172B4D] dark:text-slate-200">
                  {reassigningTask.title}
                </div>
              </div>

              <div>
                <label className="block text-[#172B4D]/75 dark:text-slate-400 mb-1 font-semibold">
                  New Assignee
                </label>
                <MorphSelect value={reassignTargetId} onValueChange={(v) => setReassignTargetId(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select Assignee" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    {admissionMembers.map((m) => (
                      <MorphSelectItem key={m.id} value={m.id}>
                        [Admission] {m.name} ({m.title})
                      </MorphSelectItem>
                    ))}
                    {counselingMembers.map((m) => (
                      <MorphSelectItem key={m.id} value={m.id}>
                        [Counseling] {m.name} ({m.title})
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#172B4D]/75 dark:text-slate-400 mb-1 font-semibold">
                    New Deadline
                  </label>
                  <input
                    type="date"
                    value={reassignDeadline}
                    onChange={(e) => setReassignDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:border-[#1769E8]"
                  />
                </div>
                <div>
                  <label className="block text-[#172B4D]/75 dark:text-slate-400 mb-1 font-semibold">
                    Priority
                  </label>
                  <MorphSelect
                    value={reassignPriority}
                    onValueChange={(v) => setReassignPriority(v as any)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Priority" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Urgent">Urgent</MorphSelectItem>
                      <MorphSelectItem value="High">High</MorphSelectItem>
                      <MorphSelectItem value="Medium">Medium</MorphSelectItem>
                      <MorphSelectItem value="Low">Low</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReassigningTask(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-700 text-[#172B4D]/75 dark:text-slate-400 hover:bg-[#F4F2EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1769E8] hover:bg-[#123B78] text-white font-semibold"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 8. ADD/EDIT EMPLOYEE MODAL (ADMIN ONLY) */}
      {isEmployeeModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#123B78]/40 dark:bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-modal-backdrop">
            <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg my-auto p-5 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b border-[#E3EAF3] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#1769E8]" />
                  {editingEmployee ? 'Edit Employee Profile' : 'Add New Employee'}
                </h3>
                <p className="text-xs text-[#172B4D]/65 dark:text-slate-400">
                  Configure role, departmental team, and operational title.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-[#172B4D]/45 hover:text-[#172B4D] dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    placeholder="e.g. Min-Ji Park"
                    className="w-full px-3 py-2 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8]"
                  />
                </div>

                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    placeholder="e.g. minji.park@wecare-consulting.kr"
                    className="w-full px-3 py-2 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Assigned Team *
                  </label>
                  <MorphSelect
                    value={employeeForm.team}
                    onValueChange={(v) => setEmployeeForm({ ...employeeForm, team: v as TeamName })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Assigned Team" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Admission Team">Admission Team</MorphSelectItem>
                      <MorphSelectItem value="Counseling Team">Counseling Team</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <div>
                  <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                    Operational Role *
                  </label>
                  <MorphSelect
                    value={employeeForm.role}
                    onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v as UserRole })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Operational Role" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Consultant">Consultant</MorphSelectItem>
                      <MorphSelectItem value="Admission_Manager">Admission Manager (Admin)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>

              <div>
                <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                  Position / Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={employeeForm.title}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, title: e.target.value })}
                  placeholder="e.g. Senior Admission Officer & Evaluation Lead"
                  className="w-full px-3 py-2 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8]"
                />
              </div>

              <div>
                <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  placeholder="+82-10-XXXX-XXXX"
                  className="w-full px-3 py-2 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#1769E8] focus:border-[#1769E8]"
                />
              </div>

              <div>
                <label className="block text-[#172B4D] dark:text-slate-300 font-semibold mb-1">
                  Avatar Photo Preset or Custom URL
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={employeeForm.avatar || avatarPresets[0]}
                    alt="Preview"
                    className="w-8 h-8 rounded-full object-cover border border-[#E3EAF3] dark:border-slate-700"
                  />
                  <input
                    type="url"
                    value={employeeForm.avatar}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, avatar: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D] dark:text-slate-100 text-xs focus:outline-none focus:border-[#1769E8]"
                  />
                </div>
                {/* Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-[#172B4D]/55 dark:text-slate-400">Presets:</span>
                  {avatarPresets.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEmployeeForm({ ...employeeForm, avatar: url })}
                      className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 ${
                        employeeForm.avatar === url ? 'border-[#1769E8] scale-110' : 'border-transparent'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3EAF3] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E3EAF3] dark:border-slate-700 text-[#172B4D]/75 dark:text-slate-400 hover:bg-[#F4F2EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1769E8] hover:bg-[#123B78] text-white font-semibold"
                >
                  {editingEmployee ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
