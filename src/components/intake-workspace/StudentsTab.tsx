import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Users,
  ExternalLink,
  GitBranch,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  INTAKE_WORKFLOW_STAGES,
  IntakeApplicationRecord,
  StudentApplication,
  UserProfile,
} from '../../types/pms';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from '../ui/MorphSelect';
import { MotionButton } from '../animations';

interface StudentsTabProps {
  applications: IntakeApplicationRecord[];
  team: UserProfile[];
  currentUser: UserProfile;
  availableCount: number;
  onOpenStudentDossier: (student: StudentApplication) => void;
  onOpenAssignExisting: () => void;
  onOpenRegisterNew: () => void;
  onOpenRecordStage: (app: IntakeApplicationRecord) => void;
  onRequestRemoveStudent: (app: IntakeApplicationRecord) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  applications,
  team,
  currentUser,
  availableCount,
  onOpenStudentDossier,
  onOpenAssignExisting,
  onOpenRegisterNew,
  onOpenRecordStage,
  onRequestRemoveStudent,
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [consultantFilter, setConsultantFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'readiness-desc' | 'readiness-asc' | 'stage'>('updated');

  const isAdmin = currentUser.role === 'Admission_Manager';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = applications.filter((app) => {
      if (stageFilter !== 'All' && app.workflowStage !== stageFilter) return false;
      if (consultantFilter !== 'All' && app.student.assignedConsultantId !== consultantFilter) return false;
      if (q) {
        const hay = `${app.student.fullName} ${app.student.passportNumber} ${app.student.id} ${app.student.major} ${app.student.contactEmail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.student.fullName.localeCompare(b.student.fullName);
      if (sortBy === 'readiness-desc') return b.readiness.readinessPercentage - a.readiness.readinessPercentage;
      if (sortBy === 'readiness-asc') return a.readiness.readinessPercentage - b.readiness.readinessPercentage;
      if (sortBy === 'stage') {
        return (
          INTAKE_WORKFLOW_STAGES.indexOf(a.workflowStage) -
          INTAKE_WORKFLOW_STAGES.indexOf(b.workflowStage)
        );
      }
      return new Date(b.appUpdatedAt).getTime() - new Date(a.appUpdatedAt).getTime();
    });
  }, [applications, search, stageFilter, consultantFilter, sortBy]);

  const activeConsultants = useMemo(() => {
    const ids = new Set(applications.map((a) => a.student.assignedConsultantId));
    return team.filter((m) => ids.has(m.id));
  }, [applications, team]);

  return (
    <div className="space-y-4">
      {/* Toolbar: Search, Filters, Sort, Actions */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, passport, major..."
              className="w-full h-9 pl-8 pr-8 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] transition-colors"
            />
            {search && (
              <MotionButton
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear student search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
              >
                <X className="w-3.5 h-3.5" />
              </MotionButton>
            )}
          </div>

          <div className="w-48">
            <MorphSelect value={stageFilter} onValueChange={setStageFilter}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="All Stages" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Workflow Stages</MorphSelectItem>
                {INTAKE_WORKFLOW_STAGES.map((st) => (
                  <MorphSelectItem key={st} value={st}>
                    {st}
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="w-44">
            <MorphSelect value={consultantFilter} onValueChange={setConsultantFilter}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="All Consultants" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Consultants</MorphSelectItem>
                {activeConsultants.map((c) => (
                  <MorphSelectItem key={c.id} value={c.id}>
                    {c.name}
                  </MorphSelectItem>
                ))}
              </MorphSelectContent>
            </MorphSelect>
          </div>

          <div className="w-44">
            <MorphSelect value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="Sort by" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="updated">Sort: Recently Updated</MorphSelectItem>
                <MorphSelectItem value="name">Sort: Name (A–Z)</MorphSelectItem>
                <MorphSelectItem value="stage">Sort: Workflow Stage</MorphSelectItem>
                <MorphSelectItem value="readiness-desc">Sort: Doc % (High–Low)</MorphSelectItem>
                <MorphSelectItem value="readiness-asc">Sort: Doc % (Low–High)</MorphSelectItem>
              </MorphSelectContent>
            </MorphSelect>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <MotionButton
            type="button"
            onClick={onOpenAssignExisting}
            disabled={availableCount === 0}
            title={availableCount === 0 ? 'All eligible students are already assigned to this intake' : 'Assign an existing student without duplicating records'}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
            Add Existing ({availableCount})
          </MotionButton>

          <MotionButton
            type="button"
            onClick={onOpenRegisterNew}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register New Student
          </MotionButton>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Users className="w-8 h-8 text-[#64748B] dark:text-[#66666E] mx-auto opacity-60" />
            <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              {applications.length === 0
                ? 'No student applications in this intake yet'
                : 'No student applications match the active filters'}
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] max-w-md mx-auto">
              {applications.length === 0
                ? 'Register a new student candidate or assign an existing student dossier to begin tracking documents and university submission.'
                : 'Clear search terms or reset filters to view all assigned candidates.'}
            </p>
            {applications.length === 0 && (
              <div className="flex items-center justify-center gap-2 pt-1">
                {availableCount > 0 && (
                  <MotionButton
                    type="button"
                    onClick={onOpenAssignExisting}
                    className="h-9 px-3.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg hover:bg-slate-50 dark:hover:bg-[#252528]"
                  >
                    Add Existing Student
                  </MotionButton>
                )}
                <MotionButton
                  type="button"
                  onClick={onOpenRegisterNew}
                  className="h-9 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg"
                >
                  Register First Student
                </MotionButton>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed text-left border-collapse text-xs">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2]">
                  <th className="py-2.5 px-4">Student & Passport</th>
                  <th className="py-2.5 px-4">Program & Degree</th>
                  <th className="py-2.5 px-4">Workflow Stage & Status</th>
                  <th className="py-2.5 px-4">Consultant</th>
                  <th className="py-2.5 px-4">Doc Readiness</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {filtered.map((app) => {
                  const s = app.student;
                  const pct = app.readiness.readinessPercentage;
                  const hasIssues = app.readiness.missingCount > 0 || app.readiness.incorrectCount > 0;
                  return (
                    <tr
                      key={app.intakeAppId}
                      onClick={() => onOpenStudentDossier(s)}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{s.fullName}</span>
                          {!app.isPrimaryProject && (
                            <span className="text-[10px] font-normal text-[#64748B] dark:text-[#9A9AA2] shrink-0">
                              (Cross-intake)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] tabular-nums mt-0.5 truncate">
                          {s.id} · {s.passportNumber}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {s.programName || s.major}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 truncate">
                          {s.degreeLevel}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1E40AF] dark:text-[#4C8DF6] truncate">
                          {app.workflowStage}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 truncate">
                          Status: {app.stageStatus}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#0F172A] dark:text-[#ECECEE] truncate">
                        {s.assignedConsultantName}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] tabular-nums mb-1">
                          <span className={`font-semibold text-[#0F172A] flex items-center gap-1 ${pct === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'}`}>
                            {pct}%
                            {app.readiness.isSubmissionReady && (
                              <CheckCircle2 className="w-3 h-3 text-[#16A34A] dark:text-[#34C26B]" />
                            )}
                            {hasIssues && (
                              <AlertTriangle className="w-3 h-3 text-[#DC2626] dark:text-[#EF5350]" />
                            )}
                          </span>
                          <span className="text-[#64748B] dark:text-[#9A9AA2]">
                            {app.readiness.verifiedCount}/{app.readiness.totalRequired}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-[#252528] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              hasIssues
                                ? 'bg-[#D97706] dark:bg-[#F0A030]'
                                : pct === 100
                                ? 'bg-[#16A34A] dark:bg-[#34C26B]'
                                : 'bg-[#1E40AF] dark:bg-[#4C8DF6]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <MotionButton
                            type="button"
                            onClick={() => onOpenRecordStage(app)}
                            title="Record application workflow stage"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#DBEAFE] dark:hover:bg-[rgba(76,141,246,0.22)] rounded transition-colors"
                          >
                            <GitBranch className="w-3 h-3" />
                            Stage
                          </MotionButton>

                          <MotionButton
                            type="button"
                            onClick={() => onOpenStudentDossier(s)}
                            title="Open existing Student Dossier"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0F172A] dark:text-[#ECECEE] border border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-slate-50 dark:hover:bg-[#252528] rounded transition-colors"
                          >
                            Dossier
                            <ExternalLink className="w-3 h-3" />
                          </MotionButton>

                          {isAdmin && !app.isPrimaryProject && (
                            <MotionButton
                              type="button"
                              onClick={() => onRequestRemoveStudent(app)}
                              title="Detach student from this intake"
                              className="p-1 text-[#64748B] dark:text-[#9A9AA2] hover:text-[#DC2626] dark:hover:text-[#EF5350] rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </MotionButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
