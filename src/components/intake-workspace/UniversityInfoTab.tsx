import React from 'react';
import {
  Building2,
  GraduationCap,
  Landmark,
  FileText,
  ExternalLink,
  ShieldCheck,
  RefreshCcw,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { AdmissionIntake, KoreanUniversity } from '../../types/pms';

interface UniversityInfoTabProps {
  university: KoreanUniversity | null;
  admissionIntake: AdmissionIntake | null;
}

function isSafeHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

export const UniversityInfoTab: React.FC<UniversityInfoTabProps> = ({
  university,
  admissionIntake,
}) => {
  if (!university) {
    return (
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-10 text-center space-y-2">
        <Building2 className="w-8 h-8 text-[#64748B] dark:text-[#66666E] mx-auto opacity-60" />
        <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
          No linked university profile found in database
        </div>
        <p className="text-xs text-[#64748B] dark:text-[#9A9AA2]">
          This intake campaign does not currently reference an active university directory record.
        </p>
      </div>
    );
  }

  const programs = (university.programs || []).filter((p) => p.isActive !== false);
  const documents = university.documents || [];
  const requiredDocs = admissionIntake?.requiredDocuments || [];
  const bank = university.bankDetails;
  const refund = university.refundPolicy;
  const hasWebsite = isSafeHttpUrl(university.websiteUrl);

  const scheduleRows = admissionIntake
    ? [
        { label: 'Application Window Start', value: admissionIntake.applicationStart },
        { label: 'Application Deadline', value: admissionIntake.applicationDeadline },
        { label: 'Document Submission Cutoff', value: admissionIntake.documentDeadline },
        { label: 'Interview Dates', value: admissionIntake.interviewDates },
        { label: 'Result Announcement', value: admissionIntake.resultAnnouncementDate },
        { label: 'Tuition Payment Deadline', value: admissionIntake.tuitionPaymentDeadline },
        { label: 'Visa Submission Deadline', value: admissionIntake.visaSubmissionDeadline },
        { label: 'Classes Start Date', value: admissionIntake.classesStartDate },
      ].filter((r) => Boolean(r.value && String(r.value).trim()))
    : [];

  return (
    <div className="space-y-4">
      {/* University Profile & Admission Requirements */}
      <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
              {university.nameEn}
              {university.nameKo && (
                <span className="text-xs font-normal text-[#64748B] dark:text-[#9A9AA2]">
                  ({university.nameKo})
                </span>
              )}
            </h3>
            <div className="text-xs text-[#64748B] dark:text-[#9A9AA2] mt-0.5">
              {[university.city, university.ranking, university.accredited ? 'IEQAS Accredited' : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {university.verificationStatus && (
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  university.verificationStatus === 'Verified'
                    ? 'text-[#16A34A] dark:text-[#34C26B]'
                    : 'text-[#D97706] dark:text-[#F0A030]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {university.verificationStatus}
              </span>
            )}
            {hasWebsite && (
              <a
                href={university.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] rounded-lg transition-colors"
              >
                Official Website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] dark:divide-[#2E2E32]">
          {university.topikRequirement && (
            <div className="p-4">
              <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">TOPIK Requirement</div>
              <div className="mt-1 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                {university.topikRequirement}
              </div>
            </div>
          )}
          {university.ieltsRequirement && (
            <div className="p-4">
              <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">IELTS / English Track</div>
              <div className="mt-1 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                {university.ieltsRequirement}
              </div>
            </div>
          )}
          {typeof university.bankBalanceUsd === 'number' && university.bankBalanceUsd > 0 && (
            <div className="p-4">
              <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Required Bank Balance</div>
              <div className="mt-1 text-xs font-semibold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                ${university.bankBalanceUsd.toLocaleString()} USD
              </div>
            </div>
          )}
          {university.standardIntakes && university.standardIntakes.length > 0 && (
            <div className="p-4">
              <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Standard Intake Terms</div>
              <div className="mt-1 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                {university.standardIntakes.join(', ')}
              </div>
            </div>
          )}
        </div>

        {university.notes && university.notes.trim() && (
          <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC]/60 dark:bg-[#252528] text-xs text-[#0F172A]/85 dark:text-[#ECECEE] leading-relaxed">
            <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              Official Submission & Admission Notes:{' '}
            </span>
            {university.notes}
          </div>
        )}
      </section>

      {/* Official Submission Schedule & Required Documents */}
      {(scheduleRows.length > 0 || requiredDocs.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {scheduleRows.length > 0 && (
            <section className="lg:col-span-6 bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                  Official Submission Schedule ({admissionIntake?.term})
                </h3>
                {admissionIntake?.status && (
                  <span className="text-[11px] font-semibold text-[#1E40AF] dark:text-[#4C8DF6]">
                    {admissionIntake.status}
                  </span>
                )}
              </div>
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] text-xs">
                {scheduleRows.map((row) => (
                  <div key={row.label} className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <span className="text-[#64748B] dark:text-[#9A9AA2]">{row.label}</span>
                    <span className="font-semibold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {requiredDocs.length > 0 && (
            <section
              className={`${
                scheduleRows.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'
              } bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden`}
            >
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                  Required Intake Documents
                </h3>
                <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                  {requiredDocs.length} documents
                </span>
              </div>
              <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] text-xs">
                {requiredDocs.map((docName, idx) => (
                  <div key={docName} className="px-4 py-2.5 flex items-center gap-2.5">
                    <span className="tabular-nums text-[11px] font-semibold text-[#1E40AF] dark:text-[#4C8DF6] w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[#0F172A] dark:text-[#ECECEE]">{docName}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Available Programs & Tuition / Application Fees */}
      {programs.length > 0 && (
        <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
              Available Programs, Tuition & Application Fees
            </h3>
            <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
              {programs.length} active program{programs.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-left border-collapse text-xs">
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '23%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#9A9AA2]">
                  <th className="py-2.5 px-4">Code & Program</th>
                  <th className="py-2.5 px-4">Degree & Duration</th>
                  <th className="py-2.5 px-4">Instruction</th>
                  <th className="py-2.5 px-4">Tuition Fee</th>
                  <th className="py-2.5 px-4">App Fee</th>
                  <th className="py-2.5 px-4">Entry Requirements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {programs.map((prog) => (
                  <tr key={prog.id} className="hover:bg-[#F8FAFC]/60 dark:hover:bg-[#252528]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                        {prog.name}
                      </div>
                      {prog.code && (
                        <div className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
                          {prog.code}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[#0F172A] dark:text-[#ECECEE]">{prog.degreeLevel}</div>
                      {prog.duration && (
                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                          {prog.duration}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#0F172A] dark:text-[#ECECEE]">
                      {prog.languageOfInstruction}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                        ₩{Number(prog.tuitionFeeKrw || 0).toLocaleString()}
                      </div>
                      {prog.tuitionFeeUsd ? (
                        <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                          ≈ ${Number(prog.tuitionFeeUsd).toLocaleString()} USD
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-medium text-[#0F172A] dark:text-[#ECECEE]">
                      ₩{Number(prog.applicationFeeKrw || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#64748B] dark:text-[#9A9AA2] max-w-xs">
                      {prog.requirements || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bank & Payment Information + Refund Policy (Rendered ONLY if present in DB) */}
      {(bank || refund) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {bank && (
            <section
              className={`${
                refund ? 'lg:col-span-6' : 'lg:col-span-12'
              } bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden`}
            >
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                  Bank & Wire Payment Information
                </h3>
                {bank.verificationStatus && (
                  <span className="text-[11px] font-semibold text-[#16A34A] dark:text-[#34C26B]">
                    {bank.verificationStatus}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Bank & Branch</div>
                    <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      {[bank.bankName, bank.branchName].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Account Holder</div>
                    <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      {bank.accountHolder}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">Account Number</div>
                    <div className="font-semibold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                      {bank.accountNumber} ({bank.currency})
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">SWIFT / BIC</div>
                    <div className="font-semibold tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                      {bank.swiftCode}
                    </div>
                  </div>
                </div>
                {bank.paymentInstructions && (
                  <div className="pt-2.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] text-[#0F172A]/85 dark:text-[#ECECEE] leading-relaxed">
                    <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      Submission & Wire Instructions:{' '}
                    </span>
                    {bank.paymentInstructions}
                  </div>
                )}
              </div>
            </section>
          )}

          {refund && (
            <section
              className={`${
                bank ? 'lg:col-span-6' : 'lg:col-span-12'
              } bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden`}
            >
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                  Official Refund Policy
                </h3>
                {refund.verificationStatus && (
                  <span className="text-[11px] font-semibold text-[#16A34A] dark:text-[#34C26B]">
                    {refund.verificationStatus}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B] dark:text-[#9A9AA2]">Application Fee Refundable</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    {refund.appFeeRefundable ? 'Yes (Conditional)' : 'Non-Refundable'}
                  </span>
                </div>
                {refund.appFeeConditions && (
                  <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2]">
                    {refund.appFeeConditions}
                  </div>
                )}
                {refund.tuitionRefundPolicy && (
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                    <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] mb-0.5">
                      Tuition Refund Schedule
                    </div>
                    <p className="text-[#0F172A]/80 dark:text-[#9A9AA2] leading-relaxed">
                      {refund.tuitionRefundPolicy}
                    </p>
                  </div>
                )}
                {refund.visaRejectionRefund && (
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                    <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] mb-0.5">
                      Visa Rejection Clause
                    </div>
                    <p className="text-[#0F172A]/80 dark:text-[#9A9AA2] leading-relaxed">
                      {refund.visaRejectionRefund}
                    </p>
                  </div>
                )}
                {refund.refundProcessingTime && (
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B] dark:text-[#9A9AA2]">Processing Window</span>
                    <span className="font-medium text-[#0F172A] dark:text-[#ECECEE]">
                      {refund.refundProcessingTime}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Official Circulars & University Links / Documents */}
      {documents.length > 0 && (
        <section className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
              Official Circulars, Guidelines & Links
            </h3>
            <span className="text-[11px] tabular-nums text-[#64748B] dark:text-[#9A9AA2]">
              {documents.length} item{documents.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] text-xs">
            {documents.map((doc) => {
              const validUrl = isSafeHttpUrl(doc.fileUrl);
              return (
                <div
                  key={doc.id}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-[#F8FAFC]/60 dark:hover:bg-[#252528]"
                >
                  <div>
                    <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      {doc.title}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 tabular-nums">
                      {[doc.category, doc.intakeTerm, doc.fileFormat, doc.fileSize, doc.verificationStatus]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  {validUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#1E40AF] dark:text-[#4C8DF6] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#4C8DF6] rounded transition-colors"
                    >
                      Open Link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
