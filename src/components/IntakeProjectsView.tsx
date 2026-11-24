import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  X,
} from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import { IntakeProject, KoreanUniversity, UserProfile } from '../types/pms';
import { createProject } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { ModalTransition, StaggerContainer, StaggerItem, MotionButton } from './animations';

interface IntakeProjectsViewProps {
  projects: IntakeProject[];
  universities: KoreanUniversity[];
  team: UserProfile[];
  currentUser: UserProfile;
  onRefresh: () => void;
  onSelectProject: (project: IntakeProject) => void;
}

export const IntakeProjectsView: React.FC<IntakeProjectsViewProps> = ({
  projects,
  universities,
  team,
  currentUser,
  onRefresh,
  onSelectProject,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [universityId, setUniversityId] = useState(universities[0]?.id || '');
  const [intakeTerm, setIntakeTerm] = useState('Spring 2027');
  const [deadline, setDeadline] = useState('2026-09-30');
  const [targetQuota, setTargetQuota] = useState('25');
  const [notes, setNotes] = useState('');
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([
    'USR-CONSULTANT-1',
    'USR-CONSULTANT-2',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admission_Manager';

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !universityId || !deadline) {
      setError('Please provide project name, university, and deadline.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createProject({
        name: name.trim(),
        universityId,
        intakeTerm,
        academicYear: 2027,
        deadline,
        targetQuota: Number(targetQuota) || 25,
        assignedConsultantIds: selectedConsultants,
        notes: notes.trim(),
      });
      onRefresh();
      setShowCreateModal(false);
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1E40AF] dark:text-[#ECECEE]" />
            University Admission Intake Campaigns
          </h2>
          <p className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2] mt-0.5">
            Organizing student cohorts, application quota fill rates, and consultant assignments across South Korean partner institutions
          </p>
        </div>

        {isAdmin && (
          <MotionButton
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded transition-colors shadow-xs dark:shadow-none"
          >
            <Plus className="w-3.5 h-3.5" />
            New Intake Campaign
          </MotionButton>
        )}
      </div>

      {/* Projects Grid */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const quotaFill = Math.round(((p.studentCount || 0) / (p.targetQuota || 20)) * 100);
          return (
            <StaggerItem key={p.id}>
              <div
                onClick={() => onSelectProject(p)}
                className="p-5 rounded-md bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-xs dark:shadow-none hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] transition-all cursor-pointer flex flex-col justify-between space-y-4 h-full"
              >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="tabular-nums text-[10px] text-[#1E40AF] dark:text-[#4C8DF6] font-bold">
                    {p.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.status === 'Active'
                        ? 'bg-[#16A34A]/10 dark:bg-[rgba(52,194,107,0.14)] text-[#16A34A] dark:text-[#34C26B]'
                        : 'bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A]/70 dark:text-[#9A9AA2]'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#ECECEE] mt-1 line-clamp-2">
                  {p.name}
                </h3>
                <div className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2] mt-0.5 font-medium">
                  {p.universityName} · {p.intakeTerm}
                </div>
              </div>

              {/* Progress & Quota Fill Bar */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#0F172A]/65 dark:text-[#9A9AA2]">Intake Candidate Quota</span>
                  <span className={`tabular-nums font-bold ${(p.studentCount || 0) === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
                    {p.studentCount} / {p.targetQuota} ({quotaFill}%)
                  </span>
                </div>
                <div className="w-full bg-[#EFF6FF] dark:bg-[#252528] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E40AF] dark:bg-[#4C8DF6] h-full rounded-full transition-all"
                    style={{ width: `${Math.min(quotaFill, 100)}%` }}
                  />
                </div>
              </div>

              {/* Footer: Deadline & Assigned Consultants */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between text-xs">
                <div className="tabular-nums text-[11px] text-[#0F172A]/65 dark:text-[#9A9AA2] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#ECECEE]" />
                  Due: <span className="text-[#DC2626] dark:text-[#EF5350] font-semibold">{p.deadline}</span>
                </div>

                <div className="flex -space-x-1.5">
                  {(p.assignedConsultantIds || []).map((cid) => {
                    const member = team.find((t) => t.id === cid);
                    if (!member) return null;
                    return (
                      <img
                        key={cid}
                        src={member.avatar}
                        alt={member.name}
                        title={member.name}
                        className="w-5 h-5 rounded-full object-cover border border-white dark:border-[#1C1C1E] ring-1 ring-[#E2E8F0] dark:ring-[#2E2E32]"
                      />
                    );
                  })}
                </div>
              </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Modal: Create Intake Campaign (Admin Only) */}
      <ModalTransition
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/75 backdrop-blur-xs"
        cardClassName="w-full max-w-lg rounded-md bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-2xl dark:shadow-none p-6 space-y-4"
      >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#2E2E32] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                Initialize New University Intake Project
              </h3>
              <MotionButton
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#0F172A]/50 dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] rounded"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </MotionButton>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {error && (
                <div className="p-2 rounded bg-[#DC2626]/10 text-[#DC2626] dark:bg-[rgba(239,83,80,0.14)] dark:text-[#EF5350] font-medium border border-[#DC2626]/30 dark:border-[#EF5350]/30">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Korea University Global Business Spring 2027"
                  className="w-full rounded border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                    Korean University *
                  </label>
                  <MorphSelect value={universityId} onValueChange={(v) => setUniversityId(v)}>
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select university..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      {universities.map((u) => (
                        <MorphSelectItem key={u.id} value={u.id}>
                          {u.nameEn}
                        </MorphSelectItem>
                      ))}
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <div>
                  <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                    Intake Term
                  </label>
                  <MorphSelect value={intakeTerm} onValueChange={(v) => setIntakeTerm(v)}>
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select intake term..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Spring 2027">Spring 2027</MorphSelectItem>
                      <MorphSelectItem value="Fall 2027">Fall 2027</MorphSelectItem>
                      <MorphSelectItem value="Spring 2028">Spring 2028</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                    Portal Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                    Target Student Quota
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={targetQuota}
                    onChange={(e) => setTargetQuota(e.target.value)}
                    className="w-full rounded border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                  Assign Consultant Team
                </label>
                <div className="flex flex-wrap gap-2 p-2 rounded bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32]">
                  {team
                    .filter((t) => t.role === 'Consultant')
                    .map((t) => {
                      const isSelected = selectedConsultants.includes(t.id);
                      return (
                        <MotionButton
                          key={t.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedConsultants(selectedConsultants.filter((id) => id !== t.id));
                            } else {
                              setSelectedConsultants([...selectedConsultants, t.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#1E40AF] dark:bg-[#4C8DF6] text-white font-semibold'
                              : 'bg-[#FFFFFF] dark:bg-[#1C1C1E] text-[#0F172A]/75 dark:text-[#9A9AA2] border border-[#E2E8F0] dark:border-[#2E2E32]'
                          }`}
                        >
                          {t.name}
                        </MotionButton>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                  Campaign Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Required apostille cutoffs, specific scholarship quota..."
                  className="w-full rounded border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-1.5 text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <MotionButton
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs text-[#0F172A] dark:text-[#9A9AA2] hover:bg-[#EFF6FF]/40 dark:hover:bg-[#252528] rounded"
                >
                  Cancel
                </MotionButton>
                <MotionButton
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Spinner size="sm" shade="inherit" aria-hidden="true" />}
                  {isSubmitting ? 'Creating...' : 'Initialize Project'}
                </MotionButton>
              </div>
            </form>
      </ModalTransition>
    </div>
  );
};
