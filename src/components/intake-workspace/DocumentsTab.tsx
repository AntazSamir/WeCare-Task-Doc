import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Edit3,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AdmissionIntake,
  IntakeApplicationRecord,
  IntakeDocumentItem,
  IntakeDocumentStatus,
} from '../../types/pms';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from '../ui/MorphSelect';
import { MotionButton } from '../animations';

interface DocumentsTabProps {
  admissionIntake: AdmissionIntake | null;
  applications: IntakeApplicationRecord[];
  onEditDocument: (app: IntakeApplicationRecord, doc: IntakeDocumentItem) => void;
}

const STATUS_STYLE: Record<IntakeDocumentStatus, string> = {
  Verified: 'text-[#16A34A] dark:text-[#34C26B] font-semibold',
  Apostilled: 'text-[#1E40AF] dark:text-[#4C8DF6] font-semibold',
  Notarized: 'text-[#1E40AF] dark:text-[#4C8DF6] font-medium',
  Collected: 'text-[#0F172A] dark:text-[#ECECEE] font-medium',
  Pending: 'text-[#D97706] dark:text-[#F0A030] font-medium',
  Missing: 'text-[#DC2626] dark:text-[#EF5350] font-semibold',
  Incorrect: 'text-[#DC2626] dark:text-[#EF5350] font-semibold',
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  admissionIntake,
  applications,
  onEditDocument,
}) => {
  const [search, setSearch] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'All' | 'Ready' | 'Issues' | 'Pending'>('All');

  const requiredDocs = admissionIntake?.requiredDocuments || [];

  const summary = useMemo(() => {
    let missing = 0;
    let incorrect = 0;
    let pending = 0;
    let verified = 0;
    let readyStudents = 0;

    for (const app of applications) {
      missing += app.readiness.missingCount;
      incorrect += app.readiness.incorrectCount;
      pending += app.readiness.pendingCount;
      verified += app.readiness.verifiedCount;
      if (app.readiness.isSubmissionReady) readyStudents++;
    }
    return { missing, incorrect, pending, verified, readyStudents };
  }, [applications]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (readinessFilter === 'Ready' && !app.readiness.isSubmissionReady) return false;
      if (readinessFilter === 'Issues' && app.readiness.missingCount === 0 && app.readiness.incorrectCount === 0) return false;
      if (readinessFilter === 'Pending' && app.readiness.pendingCount === 0) return false;
      if (q) {
        const docText = app.intakeDocuments.map((d) => d.name).join(' ').toLowerCase();
        const hay = `${app.student.fullName} ${app.student.passportNumber} ${docText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, search, readinessFilter]);

  return (
    <div className="space-y-4">
      {/* Compact Document Readiness Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Submission Ready</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${summary.readyStudents === 0 ? 'text-[#16A34A] dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}`}>
            {summary.readyStudents} / {applications.length}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">candidates verified</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Verified Items</div>
          <div className={`mt-1 text-xl font-bold tabular-nums text-[#0F172A] ${summary.verified === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'}`}>
            {summary.verified}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">approved across cohort</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Pending / Collected</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${summary.pending === 0 ? 'text-[#D97706] dark:text-[#66666E]' : 'text-[#D97706] dark:text-[#F0A030]'}`}>
            {summary.pending}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">awaiting verification</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Missing Docs</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${summary.missing === 0 ? 'text-[#DC2626] dark:text-[#66666E]' : 'text-[#DC2626] dark:text-[#EF5350]'}`}>
            {summary.missing}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">action required</div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5">
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Incorrect / Rejected</div>
          <div className={`mt-1 text-xl font-bold tabular-nums ${summary.incorrect === 0 ? 'text-[#DC2626] dark:text-[#66666E]' : 'text-[#DC2626] dark:text-[#EF5350]'}`}>
            {summary.incorrect}
          </div>
          <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">needs resubmission</div>
        </div>
      </div>

      {/* University-Specific Required Documents Reference */}
      {requiredDocs.length > 0 && (
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
              University Intake Mandatory Checklist ({admissionIntake?.term})
            </h3>
            <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
              {requiredDocs.length} required items
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-[#0F172A]/85 dark:text-[#ECECEE]">
            {requiredDocs.map((docName, idx) => (
              <div key={docName} className="flex items-center gap-2 py-1 border-b border-dashed border-[#E2E8F0] dark:border-[#2E2E32]">
                <span className="tabular-nums text-[11px] font-semibold text-[#1E40AF] dark:text-[#4C8DF6] w-5">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="truncate">{docName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by student or document name..."
            className="w-full h-9 pl-8 pr-8 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] transition-colors"
          />
          {search && (
            <MotionButton
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear document filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </MotionButton>
          )}
        </div>

        <div className="w-52">
          <MorphSelect value={readinessFilter} onValueChange={(v) => setReadinessFilter(v as any)}>
            <MorphSelectTrigger>
              <MorphSelectValue placeholder="All Students" />
            </MorphSelectTrigger>
            <MorphSelectContent>
              <MorphSelectItem value="All">All Candidates</MorphSelectItem>
              <MorphSelectItem value="Ready">Submission Ready (100%)</MorphSelectItem>
              <MorphSelectItem value="Issues">Has Missing / Incorrect Docs</MorphSelectItem>
              <MorphSelectItem value="Pending">Has Pending Verification</MorphSelectItem>
            </MorphSelectContent>
          </MorphSelect>
        </div>
      </div>

      {/* Per-Student Document Verification Tables */}
      {filteredApps.length === 0 ? (
        <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-8 text-center text-xs text-[#64748B] dark:text-[#9A9AA2]">
          No candidate document records match the selected criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <section
              key={app.intakeAppId}
              className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden"
            >
              {/* Student Header */}
              <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#252528] border-b border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      {app.student.fullName}
                    </span>
                    <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                      {app.student.passportNumber}
                    </span>
                    {app.handoverCount > 0 && (
                      <span className="text-[11px] text-[#1E40AF] dark:text-[#4C8DF6] font-medium tabular-nums">
                        · {app.handoverCount} Physical Handover{app.handoverCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5">
                    Stage: {app.workflowStage} · Consultant: {app.student.assignedConsultantName}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs tabular-nums">
                  {app.readiness.isSubmissionReady ? (
                    <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-[#34C26B] font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready for Submission ({app.readiness.verifiedCount}/{app.readiness.totalRequired})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#0F172A] dark:text-[#ECECEE] font-semibold">
                      {app.readiness.missingCount + app.readiness.incorrectCount > 0 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF5350]" />
                      )}
                      {app.readiness.readinessPercentage}% verified ({app.readiness.verifiedCount}/{app.readiness.totalRequired})
                    </span>
                  )}
                </div>
              </div>

              {/* Document Checklist Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] table-fixed text-left border-collapse text-xs">
                  <colgroup>
                    <col style={{ width: '23%' }} />
                    <col style={{ width: '31%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#2E2E32] text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2]">
                      <th className="py-2 px-4">Required Document</th>
                      <th className="py-2 px-4">Collection / Notarization / Apostille</th>
                      <th className="py-2 px-4">Verification Status</th>
                      <th className="py-2 px-4">Remarks & Audit</th>
                      <th className="py-2 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                    {app.intakeDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-[#252528]">
                        <td className="py-2.5 px-4 font-medium text-[#0F172A] dark:text-[#ECECEE] truncate" title={doc.name}>
                          {doc.name}
                          {doc.required && (
                            <span className="ml-1.5 text-[10px] text-[#DC2626] dark:text-[#EF5350]">*</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={doc.collected ? 'text-[#16A34A] dark:text-[#34C26B] font-medium' : ''}>
                              {doc.collected ? '✓ Collected' : '○ Uncollected'}
                            </span>
                            <span className={doc.notarized ? 'text-[#1E40AF] dark:text-[#4C8DF6] font-medium' : ''}>
                              {doc.notarized ? '✓ Notarized' : '○ Notarized'}
                            </span>
                            <span className={doc.apostilled ? 'text-[#1E40AF] dark:text-[#4C8DF6] font-medium' : ''}>
                              {doc.apostilled ? '✓ Apostilled' : '○ Apostilled'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={STATUS_STYLE[doc.status] || 'text-[#0F172A] dark:text-[#ECECEE]'}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                          {doc.remarks ? (
                            <div className="text-[#0F172A] dark:text-[#ECECEE] truncate" title={doc.remarks}>
                              {doc.remarks}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                          {doc.updatedBy && (
                            <div className="text-[10px] tabular-nums truncate">
                              By {doc.updatedBy}{doc.updatedAt ? ` · ${doc.updatedAt.slice(0, 10)}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <MotionButton
                            type="button"
                            onClick={() => onEditDocument(app, doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1E40AF] dark:text-[#4C8DF6] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] rounded transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            Update
                          </MotionButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
