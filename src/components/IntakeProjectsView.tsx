import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Calendar,
  Users,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { IntakeProject, KoreanUniversity, UserProfile } from '../types/pms';
import { createProject } from '../services/pmsService';

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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-4">
        <div>
          <h2 className="text-base font-semibold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1769E8] dark:text-[#36A5F5]" />
            University Admission Intake Campaigns
          </h2>
          <p className="text-xs text-[#172B4D]/65 dark:text-slate-400 mt-0.5">
            Organizing student cohorts, application quota fill rates, and consultant assignments across South Korean partner institutions
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Intake Campaign
          </button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p, idx) => {
          const quotaFill = Math.round(((p.studentCount || 0) / (p.targetQuota || 20)) * 100);
          return (
            <div
              key={p.id}
              onClick={() => onSelectProject(p)}
              className={`p-5 rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-xs hover:border-[#36A5F5] dark:hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-4 animate-card-enter stagger-${Math.min(idx + 1, 12)}`}
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-[#1769E8] dark:text-[#36A5F5] font-bold">
                    {p.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.status === 'Active'
                        ? 'bg-[#16A36A]/10 dark:bg-emerald-950/60 text-[#16A36A] dark:text-emerald-400'
                        : 'bg-[#F5F8FC] dark:bg-slate-800 text-[#172B4D]/70 dark:text-slate-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#172B4D] dark:text-slate-100 mt-1 line-clamp-2">
                  {p.name}
                </h3>
                <div className="text-xs text-[#172B4D]/65 dark:text-slate-400 mt-0.5 font-medium">
                  {p.universityName} · {p.intakeTerm}
                </div>
              </div>

              {/* Progress & Quota Fill Bar */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#172B4D]/65 dark:text-slate-400">Intake Candidate Quota</span>
                  <span className="font-mono font-bold text-[#172B4D] dark:text-slate-200">
                    {p.studentCount} / {p.targetQuota} ({quotaFill}%)
                  </span>
                </div>
                <div className="w-full bg-[#DCEBFF] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1769E8] h-full rounded-full transition-all"
                    style={{ width: `${Math.min(quotaFill, 100)}%` }}
                  />
                </div>
              </div>

              {/* Footer: Deadline & Assigned Consultants */}
              <div className="pt-3 border-t border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="font-mono text-[11px] text-[#172B4D]/65 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#1769E8]" />
                  Due: <span className="text-[#DC4545] dark:text-red-400 font-semibold">{p.deadline}</span>
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
                        className="w-5 h-5 rounded-full object-cover border border-white dark:border-slate-900 ring-1 ring-[#E3EAF3]"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Intake Campaign (Admin Only) */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-md bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b border-[#E3EAF3] dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-[#172B4D] dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1769E8]" />
                Initialize New University Intake Project
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[#172B4D]/50 hover:text-[#172B4D] dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {error && (
                <div className="p-2 rounded bg-[#DC4545]/10 text-[#DC4545] dark:bg-red-950/40 dark:text-red-400 font-medium border border-[#DC4545]/30">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Korea University Global Business Spring 2027"
                  className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                    Korean University *
                  </label>
                  <select
                    value={universityId}
                    onChange={(e) => setUniversityId(e.target.value)}
                    className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                  >
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                    Intake Term
                  </label>
                  <select
                    value={intakeTerm}
                    onChange={(e) => setIntakeTerm(e.target.value)}
                    className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                  >
                    <option value="Spring 2027">Spring 2027</option>
                    <option value="Fall 2027">Fall 2027</option>
                    <option value="Spring 2028">Spring 2028</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                    Portal Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 font-mono text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                    Target Student Quota
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={targetQuota}
                    onChange={(e) => setTargetQuota(e.target.value)}
                    className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 font-mono text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                  Assign Consultant Team
                </label>
                <div className="flex flex-wrap gap-2 p-2 rounded bg-[#F5F8FC] dark:bg-slate-800/40 border border-[#E3EAF3] dark:border-slate-800">
                  {team
                    .filter((t) => t.role === 'Consultant')
                    .map((t) => {
                      const isSelected = selectedConsultants.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedConsultants(selectedConsultants.filter((id) => id !== t.id));
                            } else {
                              setSelectedConsultants([...selectedConsultants, t.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#1769E8] text-white font-semibold'
                              : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#172B4D]/75 dark:text-slate-400 border border-[#E3EAF3] dark:border-slate-700'
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#172B4D] dark:text-slate-300 mb-1">
                  Campaign Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Required apostille cutoffs, specific scholarship quota..."
                  className="w-full rounded border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-1.5 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3EAF3] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs text-[#172B4D] dark:text-slate-400 hover:bg-[#DCEBFF]/40 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Initialize Project'}
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
