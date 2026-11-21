import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit3,
  Plus,
  UserPlus,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import {
  INTAKE_WORKFLOW_STAGES,
  IntakeApplicationRecord,
  IntakeDocumentItem,
  IntakeDocumentStatus,
  IntakeProject,
  IntakeWorkflowStage,
  IntakeWorkspaceData,
  PmsTask,
  StudentApplication,
  UserProfile,
} from '../types/pms';
import {
  assignExistingStudentToIntake,
  fetchProjectWorkspace,
  logIntakeActivity,
  reassignPmsTask,
  removeStudentFromIntake,
  updateIntakeStudentDocument,
  updateIntakeStudentWorkflow,
  updateProjectCampaign,
} from '../services/pmsService';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from './ui/MorphSelect';
import { ModalTransition, TabTransition } from './animations';
import { OverviewTab } from './intake-workspace/OverviewTab';
import { StudentsTab } from './intake-workspace/StudentsTab';
import { WorkflowTab } from './intake-workspace/WorkflowTab';
import { DocumentsTab } from './intake-workspace/DocumentsTab';
import { TasksTab } from './intake-workspace/TasksTab';
import { UniversityInfoTab } from './intake-workspace/UniversityInfoTab';
import { ActivityTab } from './intake-workspace/ActivityTab';

export type WorkspaceTabId =
  | 'overview'
  | 'students'
  | 'workflow'
  | 'documents'
  | 'tasks'
  | 'university'
  | 'activity';

interface IntakeWorkspaceViewProps {
  projectId: string;
  currentUser: UserProfile;
  team: UserProfile[];
  refreshKey?: number;
  onBack: () => void;
  onRefreshParent: () => void;
  onReloadTasks: () => void;
  onOpenStudentDossier: (student: StudentApplication) => void;
  onOpenNewStudentModal: (project: IntakeProject) => void;
  onCreateIntakeTask: (projectId: string) => void;
  onRequestCompleteTask: (task: PmsTask) => void;
  onRestoreTaskToPending: (task: PmsTask) => void;
  onDeleteTask: (task: PmsTask) => void;
}

const DOC_STATUSES: IntakeDocumentStatus[] = [
  'Missing',
  'Incorrect',
  'Pending',
  'Collected',
  'Notarized',
  'Apostilled',
  'Verified',
];

const STAGE_STATUS_OPTIONS = [
  'In Progress',
  'Action Required',
  'Submitted',
  'Approved',
  'Completed',
  'On Hold',
];

export const IntakeWorkspaceView: React.FC<IntakeWorkspaceViewProps> = ({
  projectId,
  currentUser,
  team,
  refreshKey = 0,
  onBack,
  onRefreshParent,
  onReloadTasks,
  onOpenStudentDossier,
  onOpenNewStudentModal,
  onCreateIntakeTask,
  onRequestCompleteTask,
  onRestoreTaskToPending,
  onDeleteTask,
}) => {
  const [workspace, setWorkspace] = useState<IntakeWorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('overview');

  // 1. Edit Campaign Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<IntakeProject['status']>('Active');
  const [editTerm, setEditTerm] = useState('Spring 2027');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editQuota, setEditQuota] = useState('25');
  const [editNotes, setEditNotes] = useState('');
  const [editConsultants, setEditConsultants] = useState<string[]>([]);

  // 2. Assign Existing Student Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignProgramId, setAssignProgramId] = useState('__default__');
  const [assignConsultantId, setAssignConsultantId] = useState('__keep__');
  const [assignNotes, setAssignNotes] = useState('');

  // 3. Record Workflow Stage Modal
  const [workflowTarget, setWorkflowTarget] = useState<IntakeApplicationRecord | null>(null);
  const [wfStage, setWfStage] = useState<IntakeWorkflowStage>('Student Registered');
  const [wfStatus, setWfStatus] = useState('In Progress');
  const [wfDate, setWfDate] = useState(new Date().toISOString().slice(0, 10));
  const [wfAdmissionResult, setWfAdmissionResult] = useState('Pending');
  const [wfTuitionPaid, setWfTuitionPaid] = useState(false);
  const [wfCoaNo, setWfCoaNo] = useState('');
  const [wfRemarks, setWfRemarks] = useState('');

  // 4. Update Document Modal
  const [docTarget, setDocTarget] = useState<{
    app: IntakeApplicationRecord;
    doc: IntakeDocumentItem;
  } | null>(null);
  const [docStatus, setDocStatus] = useState<IntakeDocumentStatus>('Pending');
  const [docNotarized, setDocNotarized] = useState(false);
  const [docApostilled, setDocApostilled] = useState(false);
  const [docRemarks, setDocRemarks] = useState('');

  // 5. Reassign Task Modal
  const [reassignTarget, setReassignTarget] = useState<PmsTask | null>(null);
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignDeadline, setReassignDeadline] = useState('');
  const [reassignPriority, setReassignPriority] = useState('Medium');

  // 6. Log Activity Modal
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activityType, setActivityType] = useState<'Remark' | 'University Response' | 'Team Activity'>('Remark');
  const [activityMessage, setActivityMessage] = useState('');

  // 7 & 8. Confirmation Modals
  const [removeTarget, setRemoveTarget] = useState<IntakeApplicationRecord | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<PmsTask | null>(null);

  // Shared modal submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admission_Manager';

  const loadWorkspace = useCallback(
    async (silent = false) => {
      if (!projectId) return;
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(null);
      try {
        const data = await fetchProjectWorkspace(projectId);
        setWorkspace(data);
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load intake workspace');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    setActiveTab('overview');
    loadWorkspace(false);
  }, [projectId]);

  useEffect(() => {
    if (refreshKey > 0) {
      loadWorkspace(true);
    }
  }, [refreshKey, loadWorkspace]);

  // Modal Openers
  const openEditModal = () => {
    if (!workspace) return;
    const p = workspace.project;
    setEditName(p.name);
    setEditStatus(p.status);
    setEditTerm(p.intakeTerm);
    setEditStartDate(p.startDate || '');
    setEditDeadline(p.deadline || '');
    setEditQuota(String(p.targetQuota || 25));
    setEditNotes(p.notes || '');
    setEditConsultants(p.assignedConsultantIds || []);
    setModalError(null);
    setIsEditOpen(true);
  };

  const openAssignModal = () => {
    if (!workspace) return;
    setAssignStudentId(workspace.availableStudents[0]?.id || '');
    setAssignProgramId('__default__');
    setAssignConsultantId('__keep__');
    setAssignNotes('');
    setModalError(null);
    setIsAssignOpen(true);
  };

  const openWorkflowModal = (app: IntakeApplicationRecord, preselect?: IntakeWorkflowStage) => {
    const targetStage = preselect || app.workflowStage;
    setWorkflowTarget(app);
    setWfStage(targetStage);
    setWfStatus(
      targetStage === 'Submitted to University'
        ? 'Submitted'
        : targetStage === 'CoA Received'
        ? 'Completed'
        : targetStage === 'Additional Documents Requested'
        ? 'Action Required'
        : app.stageStatus || 'In Progress'
    );
    setWfDate(new Date().toISOString().slice(0, 10));
    setWfAdmissionResult(app.student.admissionResult || 'Pending');
    setWfTuitionPaid(Boolean(app.student.tuitionFeePaid));
    setWfCoaNo(app.student.certificateOfAdmissionNo || '');
    setWfRemarks('');
    setModalError(null);
  };

  const openDocModal = (app: IntakeApplicationRecord, doc: IntakeDocumentItem) => {
    setDocTarget({ app, doc });
    setDocStatus(doc.status);
    setDocNotarized(Boolean(doc.notarized));
    setDocApostilled(Boolean(doc.apostilled));
    setDocRemarks(doc.remarks || '');
    setModalError(null);
  };

  const openReassignModal = (task: PmsTask) => {
    setReassignTarget(task);
    setReassignUserId(task.assignedToId || team[0]?.id || '');
    setReassignDeadline(task.deadline || '');
    setReassignPriority(task.priority || 'Medium');
    setModalError(null);
  };

  const openActivityModal = () => {
    setActivityType('Remark');
    setActivityMessage('');
    setModalError(null);
    setIsActivityOpen(true);
  };

  // Modal Submit Handlers
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editDeadline) {
      setModalError('Campaign title and deadline are required.');
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      await updateProjectCampaign(projectId, {
        name: editName.trim(),
        status: editStatus,
        intakeTerm: editTerm,
        startDate: editStartDate,
        deadline: editDeadline,
        targetQuota: Number(editQuota) || 25,
        assignedConsultantIds: editConsultants,
        notes: editNotes.trim(),
      });
      setIsEditOpen(false);
      await loadWorkspace(true);
      onRefreshParent();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId) {
      setModalError('Select a student candidate to assign.');
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      const selectedProg = workspace?.university?.programs?.find((p) => p.id === assignProgramId);
      await assignExistingStudentToIntake(projectId, {
        studentId: assignStudentId,
        assignedConsultantId: assignConsultantId !== '__keep__' ? assignConsultantId : undefined,
        programId: selectedProg ? selectedProg.id : undefined,
        programName: selectedProg ? selectedProg.name : undefined,
        notes: assignNotes.trim(),
      });
      setIsAssignOpen(false);
      await loadWorkspace(true);
      onRefreshParent();
    } catch (err: any) {
      setModalError(err.message || 'Failed to assign student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowTarget) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await updateIntakeStudentWorkflow(projectId, workflowTarget.studentId, {
        workflowStage: wfStage,
        stageStatus: wfStatus,
        stageDate: wfDate,
        remarks: wfRemarks.trim(),
        admissionResult: wfStage === 'Admission Result Received' ? wfAdmissionResult : undefined,
        tuitionFeePaid: wfStage === 'Tuition Payment' ? wfTuitionPaid : undefined,
        certificateOfAdmissionNo: wfStage === 'CoA Received' ? wfCoaNo.trim() : undefined,
      });
      setWorkflowTarget(null);
      await loadWorkspace(true);
      onRefreshParent();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record workflow action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTarget) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await updateIntakeStudentDocument(projectId, docTarget.app.studentId, {
        docId: docTarget.doc.id,
        docName: docTarget.doc.name,
        status: docStatus,
        notarized: docNotarized,
        apostilled: docApostilled,
        remarks: docRemarks.trim(),
      });
      setDocTarget(null);
      await loadWorkspace(true);
      onRefreshParent();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update document status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTarget) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await reassignPmsTask(reassignTarget.id, {
        assignedToId: reassignUserId,
        deadline: reassignDeadline,
        priority: reassignPriority,
      });
      setReassignTarget(null);
      await loadWorkspace(true);
      onReloadTasks();
      onRefreshParent();
    } catch (err: any) {
      setModalError(err.message || 'Failed to reassign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityMessage.trim()) {
      setModalError('Please enter remark or university response details.');
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      await logIntakeActivity(projectId, {
        type: activityType,
        message: activityMessage.trim(),
      });
      setIsActivityOpen(false);
      await loadWorkspace(true);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save activity entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemoveStudent = async () => {
    if (!removeTarget) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await removeStudentFromIntake(projectId, removeTarget.studentId);
      setRemoveTarget(null);
      await loadWorkspace(true);
      onRefreshParent();
    } catch (err: any) {
      setModalError(err.message || 'Failed to remove student from intake');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    onDeleteTask(deleteTaskTarget);
    setDeleteTaskTarget(null);
    setTimeout(() => {
      loadWorkspace(true);
      onReloadTasks();
    }, 250);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-12 flex flex-col items-center justify-center gap-3">
        <Spinner size="md" aria-label="Loading intake workspace" />
        <div className="text-xs font-medium text-[#64748B] dark:text-slate-400">
          Loading intake workspace and linked student records...
        </div>
      </div>
    );
  }

  if (loadError || !workspace) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-8 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E40AF] dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Intake Campaigns
        </button>
        <div className="flex items-start gap-2.5 text-xs text-[#DC2626] dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Unable to open Intake Management Workspace</div>
            <div className="mt-0.5">{loadError || 'Campaign data could not be loaded.'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadWorkspace(false)}
          className="h-9 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const { project, admissionIntake, university, applications, availableStudents, tasks, taskSummary, activities } =
    workspace;

  const tabs: Array<{ id: WorkspaceTabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'students', label: 'Student Applications', count: applications.length },
    { id: 'workflow', label: 'Application Workflow' },
    { id: 'documents', label: 'Documents' },
    { id: 'tasks', label: 'Tasks & Team', count: taskSummary.total },
    { id: 'university', label: 'University Info' },
    { id: 'activity', label: 'Activity History', count: activities.length },
  ];

  return (
    <div className="space-y-4">
      {/* Workspace Header */}
      <header className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-[260px]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-[#1E40AF] dark:text-blue-400 hover:underline font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Intake Campaigns
              </button>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="tabular-nums font-bold text-[#0F172A] dark:text-slate-200">
                {project.id}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span
                className={`font-semibold ${
                  project.status === 'Active'
                    ? 'text-[#16A34A] dark:text-emerald-400'
                    : project.status === 'Under Review'
                    ? 'text-[#D97706] dark:text-amber-400'
                    : 'text-[#64748B] dark:text-slate-400'
                }`}
              >
                {project.status}
              </span>
              {isRefreshing && <Spinner size="sm" aria-label="Refreshing workspace" />}
            </div>

            <h1 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 leading-snug">
              {project.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B] dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A] dark:text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                {university?.nameEn || project.universityName}
                {university?.nameKo ? ` (${university.nameKo})` : ''}
              </span>
              <span>Term: {project.intakeTerm}</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-[#DC2626]" />
                Deadline:{' '}
                <strong className="text-[#DC2626] dark:text-red-400">{project.deadline}</strong>
              </span>
              <span className="tabular-nums">
                Quota: <strong className="text-[#0F172A] dark:text-slate-200">{project.studentCount}/{project.targetQuota}</strong>
              </span>
            </div>
          </div>

          {/* Separate, explicit operational actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadWorkspace(true)}
              title="Refresh workspace data"
              className="inline-flex items-center justify-center w-9 h-9 text-[#64748B] hover:text-[#1E40AF] border border-[#E2E8F0] dark:border-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#0F172A] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:border-[#1E40AF] rounded-lg transition-colors whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                Edit Campaign
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenNewStudentModal(project)}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#0F172A] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:border-[#1E40AF] rounded-lg transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
              Register Student
            </button>

            <button
              type="button"
              onClick={() => onCreateIntakeTask(project.id)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Task
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <nav
          aria-label="Intake workspace sections"
          className="flex items-center gap-1 border-t border-[#E2E8F0] dark:border-slate-800 pt-3 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1E40AF] text-white font-semibold'
                    : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-100 hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`tabular-nums text-[11px] ${
                      active ? 'text-blue-100' : 'text-[#64748B] dark:text-slate-500'
                    }`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Active Section Content */}
      <TabTransition viewKey={activeTab}>
        {activeTab === 'overview' && (
          <OverviewTab workspace={workspace} onSwitchTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'students' && (
          <StudentsTab
            applications={applications}
            team={team}
            currentUser={currentUser}
            availableCount={availableStudents.length}
            onOpenStudentDossier={onOpenStudentDossier}
            onOpenAssignExisting={openAssignModal}
            onOpenRegisterNew={() => onOpenNewStudentModal(project)}
            onOpenRecordStage={(app) => openWorkflowModal(app)}
            onRequestRemoveStudent={(app) => {
              setModalError(null);
              setRemoveTarget(app);
            }}
          />
        )}

        {activeTab === 'workflow' && (
          <WorkflowTab
            applications={applications}
            onRecordStage={(app, preselect) => openWorkflowModal(app, preselect)}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            admissionIntake={admissionIntake}
            applications={applications}
            onEditDocument={openDocModal}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            taskSummary={taskSummary}
            team={team}
            currentUser={currentUser}
            onCreateIntakeTask={() => onCreateIntakeTask(project.id)}
            onRequestCompleteTask={onRequestCompleteTask}
            onRestoreTaskToPending={onRestoreTaskToPending}
            onRequestDeleteTask={(task) => setDeleteTaskTarget(task)}
            onOpenReassignModal={openReassignModal}
          />
        )}

        {activeTab === 'university' && (
          <UniversityInfoTab university={university} admissionIntake={admissionIntake} />
        )}

        {activeTab === 'activity' && (
          <ActivityTab activities={activities} onOpenLogActivity={openActivityModal} />
        )}
      </TabTransition>

      {/* MODAL 1: EDIT CAMPAIGN (Admin Only) */}
      <ModalTransition
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        cardClassName="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-visible"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
            Edit Intake Campaign Settings
          </h3>
          <button
            type="button"
            onClick={() => setIsEditOpen(false)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveCampaign} className="space-y-3.5 text-xs">
          {modalError && (
            <div className="p-2.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] dark:text-red-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Campaign Title *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Overall Intake Status
              </label>
              <MorphSelect value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <MorphSelectTrigger>
                  <MorphSelectValue />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Planning">Planning</MorphSelectItem>
                  <MorphSelectItem value="Active">Active</MorphSelectItem>
                  <MorphSelectItem value="Under Review">Under Review</MorphSelectItem>
                  <MorphSelectItem value="Completed">Completed</MorphSelectItem>
                  <MorphSelectItem value="Archived">Archived</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Intake Term
              </label>
              <MorphSelect value={editTerm} onValueChange={setEditTerm}>
                <MorphSelectTrigger>
                  <MorphSelectValue />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Spring 2027">Spring 2027</MorphSelectItem>
                  <MorphSelectItem value="Fall 2027">Fall 2027</MorphSelectItem>
                  <MorphSelectItem value="Spring 2028">Spring 2028</MorphSelectItem>
                  <MorphSelectItem value="Fall 2028">Fall 2028</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 tabular-nums text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Deadline *
              </label>
              <input
                type="date"
                required
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 tabular-nums text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Target Quota
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={editQuota}
                onChange={(e) => setEditQuota(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 tabular-nums text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Assigned Consultants
            </label>
            <div className="flex flex-wrap gap-2 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-slate-800">
              {team
                .filter((m) => m.role === 'Consultant')
                .map((m) => {
                  const selected = editConsultants.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setEditConsultants(
                          selected
                            ? editConsultants.filter((id) => id !== m.id)
                            : [...editConsultants, m.id]
                        )
                      }
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        selected
                          ? 'bg-[#1E40AF] text-white font-semibold'
                          : 'bg-white dark:bg-slate-900 text-[#0F172A]/75 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Operational Guidelines & Notes
            </label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              Save Changes
            </button>
          </div>
        </form>
      </ModalTransition>

      {/* MODAL 2: ASSIGN EXISTING STUDENT */}
      <ModalTransition
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        cardClassName="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-visible"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
            Assign Existing Student to Intake
          </h3>
          <button
            type="button"
            onClick={() => setIsAssignOpen(false)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAssignStudent} className="space-y-3.5 text-xs">
          {modalError && (
            <div className="p-2.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] dark:text-red-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Eligible Student Dossier *
            </label>
            <MorphSelect value={assignStudentId} onValueChange={setAssignStudentId}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Choose student..." />
              </MorphSelectTrigger>
              <MorphSelectContent>
                {availableStudents.map((s) => (
                  <MorphSelectItem key={s.id} value={s.id}>
                    {s.fullName} ({s.passportNumber})
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          {university?.programs && university.programs.length > 0 && (
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Target Program (Optional Override)
              </label>
              <MorphSelect value={assignProgramId} onValueChange={setAssignProgramId}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="Keep existing program" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="__default__">Keep student&apos;s current program</MorphSelectItem>
                  {university.programs.map((p) => (
                    <MorphSelectItem key={p.id} value={p.id}>
                      {p.name} ({p.degreeLevel})
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Consultant Assignment
            </label>
            <MorphSelect value={assignConsultantId} onValueChange={setAssignConsultantId}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Keep current consultant" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="__keep__">Keep student&apos;s assigned consultant</MorphSelectItem>
                {team
                  .filter((m) => m.role === 'Consultant' || m.role === 'Admission_Manager')
                  .map((m) => (
                    <MorphSelectItem key={m.id} value={m.id}>
                      {m.name}
                    </MorphSelectItem>
                  ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Assignment Remarks
            </label>
            <textarea
              rows={2}
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Scholarship track, secondary choice, or counseling note..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !assignStudentId}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              Assign to Intake
            </button>
          </div>
        </form>
      </ModalTransition>

      {/* MODAL 3: RECORD APPLICATION WORKFLOW STAGE */}
      <ModalTransition
        isOpen={Boolean(workflowTarget)}
        onClose={() => setWorkflowTarget(null)}
        cardClassName="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-visible"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
              Record Application Workflow Action
            </h3>
            {workflowTarget && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                {workflowTarget.student.fullName} ({workflowTarget.student.passportNumber})
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setWorkflowTarget(null)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveWorkflow} className="space-y-3.5 text-xs">
          {modalError && (
            <div className="p-2.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] dark:text-red-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Workflow Stage *
            </label>
            <MorphSelect
              value={wfStage}
              onValueChange={(v) => {
                const next = v as IntakeWorkflowStage;
                setWfStage(next);
                if (next === 'Submitted to University') setWfStatus('Submitted');
                else if (next === 'CoA Received') setWfStatus('Completed');
                else if (next === 'Additional Documents Requested') setWfStatus('Action Required');
              }}
            >
              <MorphSelectTrigger>
                <MorphSelectValue />
              </MorphSelectTrigger>
              <MorphSelectContent>
                {INTAKE_WORKFLOW_STAGES.map((stage, idx) => (
                  <MorphSelectItem key={stage} value={stage}>
                    {idx + 1}. {stage}
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Stage Status
              </label>
              <MorphSelect value={wfStatus} onValueChange={setWfStatus}>
                <MorphSelectTrigger>
                  <MorphSelectValue />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {STAGE_STATUS_OPTIONS.map((opt) => (
                    <MorphSelectItem key={opt} value={opt}>
                      {opt}
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Action Date *
              </label>
              <input
                type="date"
                required
                value={wfDate}
                onChange={(e) => setWfDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 tabular-nums text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          </div>

          {wfStage === 'Admission Result Received' && (
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Official Admission Decision
              </label>
              <MorphSelect value={wfAdmissionResult} onValueChange={setWfAdmissionResult}>
                <MorphSelectTrigger>
                  <MorphSelectValue />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="Pending">Pending</MorphSelectItem>
                  <MorphSelectItem value="Accepted">Accepted</MorphSelectItem>
                  <MorphSelectItem value="Waitlisted">Waitlisted</MorphSelectItem>
                  <MorphSelectItem value="Rejected">Rejected</MorphSelectItem>
                </MorphSelectContent>
              </MorphSelect>
            </div>
          )}

          {wfStage === 'Tuition Payment' && (
            <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={wfTuitionPaid}
                onChange={(e) => setWfTuitionPaid(e.target.checked)}
                className="rounded border-slate-300 text-[#1E40AF]"
              />
              <span className="font-medium text-[#0F172A] dark:text-slate-200">
                Confirm university tuition invoice wire transfer settled
              </span>
            </label>
          )}

          {wfStage === 'CoA Received' && (
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Certificate of Admission (CoA) Number
              </label>
              <input
                type="text"
                value={wfCoaNo}
                onChange={(e) => setWfCoaNo(e.target.value)}
                placeholder="e.g. COA-2027-SNU-0142"
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 tabular-nums text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Officer Remarks & Audit Note
            </label>
            <textarea
              rows={2}
              value={wfRemarks}
              onChange={(e) => setWfRemarks(e.target.value)}
              placeholder="Portal reference number, courier dispatch details, or university feedback..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setWorkflowTarget(null)}
              className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              Record Stage Action
            </button>
          </div>
        </form>
      </ModalTransition>

      {/* MODAL 4: UPDATE DOCUMENT STATUS & REMARKS */}
      <ModalTransition
        isOpen={Boolean(docTarget)}
        onClose={() => setDocTarget(null)}
        cardClassName="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-visible"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
              Update Intake Document Record
            </h3>
            {docTarget && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                {docTarget.app.student.fullName} · {docTarget.doc.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDocTarget(null)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveDocument} className="space-y-3.5 text-xs">
          {modalError && (
            <div className="p-2.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] dark:text-red-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Document Verification Status *
            </label>
            <MorphSelect
              value={docStatus}
              onValueChange={(v) => {
                const next = v as IntakeDocumentStatus;
                setDocStatus(next);
                if (next === 'Notarized') setDocNotarized(true);
                if (next === 'Apostilled') {
                  setDocNotarized(true);
                  setDocApostilled(true);
                }
              }}
            >
              <MorphSelectTrigger>
                <MorphSelectValue />
              </MorphSelectTrigger>
              <MorphSelectContent>
                {DOC_STATUSES.map((st) => (
                  <MorphSelectItem key={st} value={st}>
                    {st}
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={docNotarized}
                onChange={(e) => setDocNotarized(e.target.checked)}
                className="rounded border-slate-300 text-[#1E40AF]"
              />
              <span className="font-medium text-[#0F172A] dark:text-slate-200">Notarized</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={docApostilled}
                onChange={(e) => setDocApostilled(e.target.checked)}
                className="rounded border-slate-300 text-[#1E40AF]"
              />
              <span className="font-medium text-[#0F172A] dark:text-slate-200">Apostilled</span>
            </label>
          </div>

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Verification Remarks
            </label>
            <textarea
              rows={2}
              value={docRemarks}
              onChange={(e) => setDocRemarks(e.target.value)}
              placeholder="MOFA apostille stamp verified, missing signature on page 2..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDocTarget(null)}
              className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              Save Document Status
            </button>
          </div>
        </form>
      </ModalTransition>

      {/* MODAL 5: REASSIGN INTAKE TASK */}
      <ModalTransition
        isOpen={Boolean(reassignTarget)}
        onClose={() => setReassignTarget(null)}
        cardClassName="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-visible"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
              Reassign Intake Task
            </h3>
            {reassignTarget && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 truncate max-w-xs">
                {reassignTarget.title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setReassignTarget(null)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveReassign} className="space-y-3.5 text-xs">
          {modalError && (
            <div className="p-2.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] dark:text-red-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Assign Team Member
            </label>
            <MorphSelect value={reassignUserId} onValueChange={setReassignUserId}>
              <MorphSelectTrigger>
                <MorphSelectValue />
              </MorphSelectTrigger>
              <MorphSelectContent>
                {team.map((m) => (
                  <MorphSelectItem key={m.id} value={m.id}>
                    {m.name} ({m.team || m.title})
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Priority
              </label>
              <MorphSelect value={reassignPriority} onValueChange={setReassignPriority}>
                <MorphSelectTrigger>
                  <MorphSelectValue />
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
              <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={reassignDeadline}
                onChange={(e) => setReassignDeadline(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 tabular-nums text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setReassignTarget(null)}
              className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              Update Assignment
            </button>
          </div>
        </form>
      </ModalTransition>

      {/* MODAL 6: LOG REMARK / UNIVERSITY RESPONSE */}
      <ModalTransition
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        cardClassName="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4 overflow-visible"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
            Log Intake Activity or University Response
          </h3>
          <button
            type="button"
            onClick={() => setIsActivityOpen(false)}
            className="p-1 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveActivity} className="space-y-3.5 text-xs">
          {modalError && (
            <div className="p-2.5 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] dark:text-red-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Activity Category
            </label>
            <MorphSelect value={activityType} onValueChange={(v) => setActivityType(v as any)}>
              <MorphSelectTrigger>
                <MorphSelectValue />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="Remark">Important Team Remark</MorphSelectItem>
                <MorphSelectItem value="University Response">Official University Response</MorphSelectItem>
                <MorphSelectItem value="Team Activity">Team Coordination Activity</MorphSelectItem>
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div>
            <label className="block font-medium text-[#0F172A] dark:text-slate-300 mb-1">
              Details *
            </label>
            <textarea
              rows={3}
              required
              value={activityMessage}
              onChange={(e) => setActivityMessage(e.target.value)}
              placeholder="Record university admissions office correspondence, interview notices, or cohort instructions..."
              className="w-full rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsActivityOpen(false)}
              className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-50"
            >
              {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
              Record Entry
            </button>
          </div>
        </form>
      </ModalTransition>

      {/* MODAL 7: CONFIRM DETACH STUDENT */}
      <ModalTransition
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        cardClassName="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4"
      >
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
          Detach Student from Intake?
        </h3>
        <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
          Remove <strong className="text-[#0F172A] dark:text-slate-100">{removeTarget?.student.fullName}</strong> from{' '}
          <strong>{project.name}</strong>? Their main Student Dossier remains intact in the CRM.
        </p>
        {modalError && (
          <div className="p-2 rounded bg-[#DC2626]/10 text-xs text-[#DC2626] dark:text-red-400">
            {modalError}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setRemoveTarget(null)}
            className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmRemoveStudent}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
            Detach Student
          </button>
        </div>
      </ModalTransition>

      {/* MODAL 8: CONFIRM DELETE TASK */}
      <ModalTransition
        isOpen={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        cardClassName="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-6 space-y-4"
      >
        <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">
          Delete Intake Task?
        </h3>
        <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
          Permanently remove <strong className="text-[#0F172A] dark:text-slate-100">{deleteTaskTarget?.title}</strong> from this intake and synchronize Google Sheets?
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDeleteTaskTarget(null)}
            className="h-9 px-3.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteTask}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg"
          >
            Delete Task
          </button>
        </div>
      </ModalTransition>
    </div>
  );
};
