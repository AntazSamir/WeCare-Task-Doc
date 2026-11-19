import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  X,
  GraduationCap,
  DollarSign,
  Calendar,
  BookOpen,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileText,
  ChevronRight,
  ChevronLeft,
  Layers,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import { KoreanUniversity } from '../types/pms';
import {
  updateUniversity,
  updateBankDetails,
  updateRefundPolicy,
  createProgram,
  createIntake,
} from '../services/pmsService';
import { ModalTransition } from './animations';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AddUniversityModalProps {
  /** Pass a university object to open in Edit mode; omit for Add mode */
  initialData?: KoreanUniversity & {
    intakes?: any[];
    bankDetails?: any;
    refundPolicy?: any;
    programs?: any[];
  };
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its list */
  onSuccess: (message: string) => void;
}

interface FormErrors {
  nameEn?: string;
  city?: string;
  websiteUrl?: string;
  bankBalanceUsd?: string;
  appDeadline?: string;
  quota?: string;
}

type DossierSectionId =
  | 'basic'
  | 'requirements'
  | 'intake'
  | 'program'
  | 'bank'
  | 'refund'
  | 'documents';

// ─── Helpers ────────────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full rounded-lg border px-3 py-1.5 text-xs border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:outline-none focus:ring-1 focus:ring-[#1E40AF]/30 transition-colors placeholder:text-slate-400';
const ERROR_INPUT_CLS =
  'w-full rounded-lg border px-3 py-1.5 text-xs border-red-400 bg-red-50 dark:bg-red-950/20 text-[#0F172A] dark:text-slate-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-400/30 transition-colors';
const LABEL_CLS = 'block text-xs font-medium text-[#0F172A] dark:text-slate-200 mb-1';
const SECTION_HEADER_CLS =
  'flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider mb-3 pb-2 border-b border-[#E2E8F0] dark:border-slate-800';
const FIELD_ERR_CLS = 'text-[11px] text-red-500 mt-0.5 flex items-center gap-1';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className={FIELD_ERR_CLS}>
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AddUniversityModal: React.FC<AddUniversityModalProps> = ({
  initialData,
  onClose,
  onSuccess,
}) => {
  const isEditMode = !!initialData;

  // Active section for tabbed view
  const [activeSection, setActiveSection] = useState<DossierSectionId>('basic');
  const [viewMode, setViewMode] = useState<'tabbed' | 'all'>('tabbed');

  // ── Section 1: Basic Info ──
  const [nameEn, setNameEn] = useState(initialData?.nameEn ?? '');
  const [nameKo, setNameKo] = useState(initialData?.nameKo ?? '');
  const [city, setCity] = useState(initialData?.city ?? 'Seoul');
  const [ranking, setRanking] = useState(initialData?.ranking ?? 'Top Tier Korean University');
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? 'https://');
  const [accredited, setAccredited] = useState(initialData?.accredited ?? true);
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  // ── Section 2: Language & Academic Requirements ──
  const [topikRequirement, setTopikRequirement] = useState(
    initialData?.topikRequirement ?? 'TOPIK Level 3 or higher'
  );
  const [ieltsRequirement, setIeltsRequirement] = useState(
    initialData?.ieltsRequirement ?? 'IELTS 5.5 / TOEFL iBT 71 minimum'
  );

  // ── Section 3: Financial Requirements ──
  const [bankBalanceUsd, setBankBalanceUsd] = useState<number | ''>(
    initialData?.bankBalanceUsd ?? 20000
  );

  // ── Section 4: Initial Intake & Milestones (Active by default for full dossier creation) ──
  const firstIntake = initialData?.intakes?.[0];
  const [addIntake, setAddIntake] = useState(true);
  const [intakeTerm, setIntakeTerm] = useState(firstIntake?.term ?? 'Spring 2027');
  const [intakeAcademicYear, setIntakeAcademicYear] = useState(firstIntake?.academicYear ?? 2027);
  const [appStart, setAppStart] = useState(firstIntake?.applicationStart ?? '2026-08-01');
  const [appDeadline, setAppDeadline] = useState(firstIntake?.applicationDeadline ?? '2026-09-30');
  const [documentDeadline, setDocumentDeadline] = useState(firstIntake?.documentDeadline ?? '2026-10-05');
  const [interviewDates, setInterviewDates] = useState(firstIntake?.interviewDates ?? '2026-10-15 ~ 2026-10-20');
  const [resultAnnouncementDate, setResultAnnouncementDate] = useState(firstIntake?.resultAnnouncementDate ?? '2026-11-15');
  const [tuitionPaymentDeadline, setTuitionPaymentDeadline] = useState(firstIntake?.tuitionPaymentDeadline ?? '2026-12-10');
  const [visaSubmissionDeadline, setVisaSubmissionDeadline] = useState(firstIntake?.visaSubmissionDeadline ?? '2027-01-10');
  const [classesStartDate, setClassesStartDate] = useState(firstIntake?.classesStartDate ?? '2027-03-02');
  const [quota, setQuota] = useState<number | ''>(firstIntake?.quota ?? 30);
  const [requiredDocs, setRequiredDocs] = useState(
    Array.isArray(firstIntake?.requiredDocuments)
      ? firstIntake.requiredDocuments.join(', ')
      : 'Valid Passport Copy, Apostilled High School Diploma, Apostilled Official Transcripts, Bank Balance Certificate ($20,000 USD), Family Relationship Certificate, Study Plan & SOP, TOPIK or English Test Score'
  );

  // ── Section 5: Bank Wire Details ──
  const [addBankDetails, setAddBankDetails] = useState(true);
  const [accountHolder, setAccountHolder] = useState(
    initialData?.bankDetails?.accountHolder ?? 'Office of International Affairs'
  );
  const [bankName, setBankName] = useState(initialData?.bankDetails?.bankName ?? 'Shinhan Bank');
  const [branchName, setBranchName] = useState(
    initialData?.bankDetails?.branchName ?? 'Main Campus Branch'
  );
  const [accountNumber, setAccountNumber] = useState(
    initialData?.bankDetails?.accountNumber ?? ''
  );
  const [swiftCode, setSwiftCode] = useState(initialData?.bankDetails?.swiftCode ?? 'SHBKKRSE');
  const [bankCurrency, setBankCurrency] = useState(
    initialData?.bankDetails?.currency ?? 'KRW'
  );
  const [isVirtualAccountSupported, setIsVirtualAccountSupported] = useState(
    initialData?.bankDetails?.isVirtualAccountSupported ?? true
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialData?.bankDetails?.paymentInstructions ??
      'Include student ID and name in wire memo. Sender pays all transfer fees (OUR mode).'
  );

  // ── Section 6: Academic Program & Tuition ──
  const firstProgram = initialData?.programs?.[0];
  const [addProgram, setAddProgram] = useState(true);
  const [progName, setProgName] = useState(firstProgram?.name ?? 'Korean Language Regular Program (KLP)');
  const [progCode, setProgCode] = useState(firstProgram?.code ?? 'KLP');
  const [progDegreeLevel, setProgDegreeLevel] = useState(firstProgram?.degreeLevel ?? 'Korean Language (D-4-1)');
  const [progDuration, setProgDuration] = useState(firstProgram?.duration ?? '4 Quarters (1 Year, 800 Hours)');
  const [progTuitionKrw, setProgTuitionKrw] = useState<number | ''>(firstProgram?.tuitionFeeKrw ?? 1730000);
  const [progAppFeeKrw, setProgAppFeeKrw] = useState<number | ''>(firstProgram?.applicationFeeKrw ?? 80000);
  const [progLanguage, setProgLanguage] = useState(firstProgram?.languageOfInstruction ?? 'Korean');
  const [progRequirements, setProgRequirements] = useState(
    firstProgram?.requirements ??
      'High school graduation certificate or higher, valid passport with 6+ months validity, financial affidavit of $10,000 USD.'
  );

  // ── Section 7: Refund Policy Guidelines ──
  const [addRefundPolicy, setAddRefundPolicy] = useState(true);
  const [appFeeRefundable, setAppFeeRefundable] = useState(
    initialData?.refundPolicy?.appFeeRefundable ?? false
  );
  const [appFeeConditions, setAppFeeConditions] = useState(
    initialData?.refundPolicy?.appFeeConditions ??
      'Application fee of KRW 80,000 is strictly non-refundable once online portal submission is finalized.'
  );
  const [tuitionRefundPolicy, setTuitionRefundPolicy] = useState(
    initialData?.refundPolicy?.tuitionRefundPolicy ??
      'Prior to semester commencement: 100% tuition refund minus bank processing charges (KRW 50,000).\n• Within 30 days of start: 5/6 refund.\n• 31 to 60 days: 2/3 refund.\n• 61 to 90 days: 1/2 refund.\n• Beyond 90 days: Non-refundable.'
  );
  const [visaRejectionRefund, setVisaRejectionRefund] = useState(
    initialData?.refundPolicy?.visaRejectionRefund ??
      '100% tuition fee is refunded if the student visa (D-2 / D-4) is refused by Korean Embassy/Immigration upon submitting the official refusal confirmation certificate.'
  );
  const [deadlinesDescription, setDeadlinesDescription] = useState(
    initialData?.refundPolicy?.deadlinesDescription ??
      'Formal cancellation request and refund application form must be submitted through the university International Office before the designated semester start date.'
  );
  const [refundProcessingTime, setRefundProcessingTime] = useState(
    initialData?.refundPolicy?.refundProcessingTime ??
      '14 to 21 business days via international wire transfer to student home bank account.'
  );

  // ── Section 8: Guidelines Document ──
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Admission Guidelines');
  const [docFileUrl, setDocFileUrl] = useState('');

  // ── UI state ──
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Section Navigation Metadata ──
  const SECTIONS: { id: DossierSectionId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'basic', label: 'Basic Profile', icon: <Building2 className="w-3.5 h-3.5" />, badge: 'Required' },
    { id: 'requirements', label: 'Requirements & Solvency', icon: <BookOpen className="w-3.5 h-3.5" />, badge: 'Solvency' },
    { id: 'intake', label: 'Intake Milestones', icon: <Calendar className="w-3.5 h-3.5" />, badge: 'Timeline' },
    { id: 'program', label: 'Program & Tuition', icon: <GraduationCap className="w-3.5 h-3.5" />, badge: 'Tuition' },
    { id: 'bank', label: 'Bank Wire Transfer', icon: <CreditCard className="w-3.5 h-3.5" />, badge: 'Banking' },
    { id: 'refund', label: 'Refund Policy', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: 'Guarantees' },
    { id: 'documents', label: 'Admission Guidelines', icon: <FileText className="w-3.5 h-3.5" />, badge: 'Official Docs' },
  ];

  const currentSectionIndex = SECTIONS.findIndex((s) => s.id === activeSection);

  // ── Validation ──────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!nameEn.trim()) {
      errs.nameEn = 'University name (English) is required.';
    }
    if (!city.trim()) {
      errs.city = 'City is required.';
    }
    if (websiteUrl.trim() && websiteUrl.trim() !== 'https://' && websiteUrl.trim() !== 'http://') {
      if (!/^https?:\/\/.+\..+/.test(websiteUrl.trim())) {
        errs.websiteUrl = 'Enter a valid URL starting with https:// or http://';
      }
    }
    if (bankBalanceUsd !== '' && (Number(bankBalanceUsd) < 0 || isNaN(Number(bankBalanceUsd)))) {
      errs.bankBalanceUsd = 'Bank balance must be a positive number.';
    }

    if (addIntake) {
      if (appDeadline) {
        const deadline = new Date(appDeadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadline < today) {
          errs.appDeadline = 'Application deadline must be a future date.';
        }
      }
      if (quota !== '' && (Number(quota) <= 0 || !Number.isInteger(Number(quota)))) {
        errs.quota = 'Quota must be a positive whole number.';
      }
    }

    return errs;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Switch to the section that has the first error
      if (validationErrors.nameEn || validationErrors.city || validationErrors.websiteUrl) {
        setActiveSection('basic');
      } else if (validationErrors.bankBalanceUsd) {
        setActiveSection('requirements');
      } else if (validationErrors.appDeadline || validationErrors.quota) {
        setActiveSection('intake');
      }
      return;
    }
    setErrors({});

    setIsSaving(true);
    try {
      const payload: any = {
        nameEn: nameEn.trim(),
        nameKo: nameKo.trim() || nameEn.trim(),
        city: city.trim(),
        ranking: ranking.trim() || 'Top Tier Korean University',
        websiteUrl:
          websiteUrl.trim() && websiteUrl.trim() !== 'https://'
            ? websiteUrl.trim()
            : 'https://www.studyinkorea.go.kr',
        topikRequirement: topikRequirement.trim() || 'TOPIK Level 3 or higher',
        ieltsRequirement: ieltsRequirement.trim() || 'IELTS 5.5 / TOEFL iBT 71 minimum',
        bankBalanceUsd: bankBalanceUsd !== '' ? Number(bankBalanceUsd) : 20000,
        accredited,
        notes: notes.trim(),
      };

      if (addIntake && intakeTerm && appDeadline) {
        payload.intake = {
          term: intakeTerm.trim(),
          academicYear: Number(intakeAcademicYear) || 2027,
          applicationStart: appStart,
          applicationDeadline: appDeadline,
          documentDeadline,
          interviewDates: interviewDates.trim(),
          resultAnnouncementDate,
          tuitionPaymentDeadline,
          visaSubmissionDeadline,
          classesStartDate,
          quota: quota !== '' ? Number(quota) : 30,
          requiredDocuments: requiredDocs
            .split(',')
            .map((d: string) => d.trim())
            .filter(Boolean),
        };
      }

      if (addProgram && progName.trim()) {
        payload.program = {
          name: progName.trim(),
          code: progCode.trim() || 'KLP',
          degreeLevel: progDegreeLevel,
          duration: progDuration.trim(),
          tuitionFeeKrw: progTuitionKrw !== '' ? Number(progTuitionKrw) : 1730000,
          applicationFeeKrw: progAppFeeKrw !== '' ? Number(progAppFeeKrw) : 80000,
          languageOfInstruction: progLanguage,
          requirements: progRequirements.trim(),
        };
      }

      if (addBankDetails && (accountNumber.trim() || bankName.trim())) {
        payload.bankDetails = {
          accountHolder: accountHolder.trim() || nameEn.trim(),
          bankName: bankName.trim() || 'Shinhan Bank',
          branchName: branchName.trim() || 'Main Campus Branch',
          accountNumber: accountNumber.trim() || 'Virtual Account Issued Upon Acceptance',
          swiftCode: swiftCode.trim() || 'SHBKKRSE',
          currency: bankCurrency,
          isVirtualAccountSupported,
          paymentInstructions: paymentInstructions.trim(),
        };
      }

      if (addRefundPolicy) {
        payload.refundPolicy = {
          appFeeRefundable,
          appFeeConditions: appFeeConditions.trim(),
          tuitionRefundPolicy: tuitionRefundPolicy.trim(),
          visaRejectionRefund: visaRejectionRefund.trim(),
          deadlinesDescription: deadlinesDescription.trim(),
          refundProcessingTime: refundProcessingTime.trim(),
        };
      }

      if (docTitle.trim() || docFileUrl.trim()) {
        payload.initialDocument = {
          title: docTitle.trim() || `${nameEn.trim()} International Student Admission Guidelines`,
          category: docCategory,
          fileUrl: docFileUrl.trim() || websiteUrl.trim() || 'https://www.studyinkorea.go.kr',
        };
      }

      if (isEditMode && initialData) {
        // Edit mode: update existing university record and sub-tables
        await updateUniversity(initialData.id, payload);
        const uniId = initialData.id;

        if (addBankDetails && (accountNumber.trim() || bankName.trim())) {
          await updateBankDetails(uniId, {
            accountHolder: accountHolder.trim(),
            bankName: bankName.trim(),
            branchName: branchName.trim(),
            accountNumber: accountNumber.trim(),
            swiftCode: swiftCode.trim(),
            currency: bankCurrency,
            isVirtualAccountSupported,
            paymentInstructions: paymentInstructions.trim(),
          });
        }

        if (addRefundPolicy) {
          await updateRefundPolicy(uniId, {
            appFeeRefundable,
            appFeeConditions: appFeeConditions.trim(),
            tuitionRefundPolicy: tuitionRefundPolicy.trim(),
            visaRejectionRefund: visaRejectionRefund.trim(),
            deadlinesDescription: deadlinesDescription.trim(),
            refundProcessingTime: refundProcessingTime.trim(),
          });
        }

        if (addProgram && progName.trim() && !firstProgram) {
          await createProgram(uniId, {
            name: progName.trim(),
            code: progCode.trim() || 'KLP',
            degreeLevel: progDegreeLevel as any,
            duration: progDuration.trim(),
            tuitionFeeKrw: progTuitionKrw !== '' ? Number(progTuitionKrw) : 1730000,
            applicationFeeKrw: progAppFeeKrw !== '' ? Number(progAppFeeKrw) : 80000,
            languageOfInstruction: progLanguage,
            requirements: progRequirements.trim(),
          });
        }

        if (addIntake && intakeTerm && appDeadline && !firstIntake) {
          await createIntake({
            universityId: uniId,
            term: intakeTerm.trim(),
            academicYear: Number(intakeAcademicYear) || 2027,
            applicationStart: appStart,
            applicationDeadline: appDeadline,
            documentDeadline,
            interviewDates: interviewDates.trim(),
            resultAnnouncementDate,
            tuitionPaymentDeadline,
            visaSubmissionDeadline,
            classesStartDate,
            quota: quota !== '' ? Number(quota) : 30,
            requiredDocuments: requiredDocs
              .split(',')
              .map((d: string) => d.trim())
              .filter(Boolean),
          });
        }
      } else {
        // Create mode: sends all payload including intake, program, bankDetails, refundPolicy, initialDocument
        const res = await fetch('/api/universities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('pms_token'),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to create university' }));
          throw new Error(err.error || 'Failed to create university');
        }
      }

      onSuccess(
        isEditMode
          ? `${nameEn} dossier updated successfully.`
          : `${nameEn} added with complete admission dossier, banking coordinates, and refund guidelines.`
      );
      onClose();
    } catch (err: any) {
      console.error('[AddUniversityModal] Save failed:', err);
      setErrors({ nameEn: err.message || 'Save failed. Please check form values and try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return createPortal(
    <ModalTransition
      isOpen={true}
      onClose={onClose}
      backdropClassName="fixed inset-0 z-50 bg-[#0F172A]/50 dark:bg-slate-950/70 backdrop-blur-xs"
      cardClassName="w-full max-w-4xl rounded-[14px] bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh]"
    >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E2E8F0] dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#1E40AF] dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
                {isEditMode
                  ? `Edit Partner Dossier — ${initialData?.nameEn}`
                  : 'Add Korean Higher Education Partner Institution'}
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  Full Dossier
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure institutional profile, language cutoffs, intake milestones, flagship program, banking coordinates &amp; refund policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Tabbed vs All */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('tabbed')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  viewMode === 'tabbed'
                    ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Tabbed
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Sections
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Bar (Visible in Tabbed Mode) */}
        {viewMode === 'tabbed' && (
          <div className="px-6 py-2 border-b border-[#E2E8F0] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 overflow-x-auto flex items-center gap-1.5 scrollbar-thin shrink-0">
            {SECTIONS.map((sec, idx) => {
              const isCurrent = activeSection === sec.id;
              const hasErr =
                (sec.id === 'basic' && (errors.nameEn || errors.city || errors.websiteUrl)) ||
                (sec.id === 'requirements' && errors.bankBalanceUsd) ||
                (sec.id === 'intake' && (errors.appDeadline || errors.quota));

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    isCurrent
                      ? 'bg-white dark:bg-slate-800 text-[#1E40AF] dark:text-blue-400 border-blue-200 dark:border-blue-900 shadow-xs'
                      : hasErr
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className={isCurrent ? 'text-[#1E40AF] dark:text-blue-400' : 'text-slate-400'}>
                    {sec.icon}
                  </span>
                  <span>{sec.label}</span>
                  {hasErr ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

            {/* Global submission error */}
            {errors.nameEn && errors.nameEn.includes('failed') && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.nameEn}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 1: BASIC PROFILE */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'basic') && (
              <div className="space-y-4">
                <div className={SECTION_HEADER_CLS}>
                  <Building2 className="w-3.5 h-3.5 text-[#1E40AF]" />
                  <span>1. Institutional Profile &amp; Accreditation</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>
                      University Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => {
                        setNameEn(e.target.value);
                        setErrors((p) => ({ ...p, nameEn: undefined }));
                      }}
                      placeholder="e.g. Chung-Ang University"
                      className={errors.nameEn && !errors.nameEn.includes('failed') ? ERROR_INPUT_CLS : INPUT_CLS}
                    />
                    <FieldError msg={!errors.nameEn?.includes('failed') ? errors.nameEn : undefined} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Korean Hangul Name</label>
                    <input
                      type="text"
                      value={nameKo}
                      onChange={(e) => setNameKo(e.target.value)}
                      placeholder="e.g. 중앙대학교"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>
                      City / Metropolitan Region <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setErrors((p) => ({ ...p, city: undefined }));
                      }}
                      className={errors.city ? ERROR_INPUT_CLS : INPUT_CLS}
                    >
                      {['Seoul', 'Busan', 'Daejeon', 'Incheon', 'Gwangju', 'Daegu', 'Suwon', 'Cheongju', 'Jeonju', 'Cheonan', 'Pohang', 'Chuncheon'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other Region</option>
                    </select>
                    <FieldError msg={errors.city} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Ranking / Tier Classification</label>
                    <input
                      type="text"
                      value={ranking}
                      onChange={(e) => setRanking(e.target.value)}
                      placeholder="e.g. Top 15 in Korea (SKY Adjacent) · QS #398"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className={LABEL_CLS}>Official International Admissions Portal URL</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => {
                        setWebsiteUrl(e.target.value);
                        setErrors((p) => ({ ...p, websiteUrl: undefined }));
                      }}
                      placeholder="https://international.cau.ac.kr"
                      className={errors.websiteUrl ? ERROR_INPUT_CLS : INPUT_CLS}
                    />
                    <FieldError msg={errors.websiteUrl} />
                  </div>

                  <div>
                    <label className={LABEL_CLS}>NIIED / Ministry of Education (MOE) Accreditation</label>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setAccredited(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          accredited
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        MOE Accredited (Fast-track Visa)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccredited(false)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          !accredited
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Non-Certified (Standard Visa Screening)
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>Admissions Notes / Special Protocols</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Apostilled academic documents required. Courier hardcopy via DHL to International Office before deadline."
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 2: LANGUAGE & SOLVENCY REQUIREMENTS */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'requirements') && (
              <div className="space-y-4">
                <div className={SECTION_HEADER_CLS}>
                  <BookOpen className="w-3.5 h-3.5 text-[#1E40AF]" />
                  <span>2. Language Proficiency &amp; Financial Solvency Requirements</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>TOPIK Proficiency Requirement</label>
                    <input
                      type="text"
                      value={topikRequirement}
                      onChange={(e) => setTopikRequirement(e.target.value)}
                      placeholder="e.g. TOPIK Level 3 or higher (Level 4 for Business)"
                      className={INPUT_CLS}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">D-4 Language trainees exempt; D-2 Bachelors require Level 3+.</p>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>English Track / IELTS / TOEFL Requirement</label>
                    <input
                      type="text"
                      value={ieltsRequirement}
                      onChange={(e) => setIeltsRequirement(e.target.value)}
                      placeholder="e.g. IELTS 5.5 / TOEFL iBT 71 minimum or English native"
                      className={INPUT_CLS}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Applicable to English-medium degree programs.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>
                      Bank Solvency Certificate Guarantee (USD) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-xs text-slate-400 font-semibold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={bankBalanceUsd}
                        onChange={(e) => {
                          setBankBalanceUsd(e.target.value === '' ? '' : Number(e.target.value));
                          setErrors((p) => ({ ...p, bankBalanceUsd: undefined }));
                        }}
                        placeholder="20000"
                        className={
                          (errors.bankBalanceUsd ? ERROR_INPUT_CLS : INPUT_CLS) +
                          ' pl-7 tabular-nums font-mono'
                        }
                      />
                    </div>
                    <FieldError msg={errors.bankBalanceUsd} />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Required bank balance certificate under student or parent name, frozen for 30 days.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-semibold text-[#1E40AF] dark:text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Korean Immigration MOJ Solvency Guidelines:
                    </span>
                    <p>• Seoul Capital Area: $20,000 USD equivalent</p>
                    <p>• Regional / Outside Capital Area: $16,000 USD equivalent</p>
                    <p>• D-4 Language Immersion (1 Year): $10,000 USD equivalent</p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 3: INTAKE MILESTONES & TIMELINE */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'intake') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>3. Admission Intake Milestones &amp; Academic Deadlines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Enable Initial Intake</span>
                    <input
                      type="checkbox"
                      checked={addIntake}
                      onChange={(e) => setAddIntake(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1E40AF] border-slate-300"
                    />
                  </div>
                </div>

                {addIntake ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Intake Term</label>
                        <select
                          value={intakeTerm}
                          onChange={(e) => setIntakeTerm(e.target.value)}
                          className={INPUT_CLS}
                        >
                          <option value="Spring 2027">Spring 2027 (March Intake)</option>
                          <option value="Fall 2027">Fall 2027 (September Intake)</option>
                          <option value="Summer 2027">Summer 2027 (June KLP)</option>
                          <option value="Winter 2026">Winter 2026 (December KLP)</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Academic Year</label>
                        <input
                          type="number"
                          value={intakeAcademicYear}
                          onChange={(e) => setIntakeAcademicYear(Number(e.target.value))}
                          min="2024"
                          max="2035"
                          className={INPUT_CLS + ' tabular-nums'}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>
                          Allocated Quota (Seats) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={quota}
                          onChange={(e) => {
                            setQuota(e.target.value === '' ? '' : Number(e.target.value));
                            setErrors((p) => ({ ...p, quota: undefined }));
                          }}
                          min="1"
                          placeholder="30"
                          className={errors.quota ? ERROR_INPUT_CLS : INPUT_CLS + ' tabular-nums'}
                        />
                        <FieldError msg={errors.quota} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Online Application Opens</label>
                        <input
                          type="date"
                          value={appStart}
                          onChange={(e) => setAppStart(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>
                          Application Submission Deadline <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={appDeadline}
                          onChange={(e) => {
                            setAppDeadline(e.target.value);
                            setErrors((p) => ({ ...p, appDeadline: undefined }));
                          }}
                          className={errors.appDeadline ? ERROR_INPUT_CLS : INPUT_CLS}
                        />
                        <FieldError msg={errors.appDeadline} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Hardcopy Document Deadline</label>
                        <input
                          type="date"
                          value={documentDeadline}
                          onChange={(e) => setDocumentDeadline(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Interview Assessment Window</label>
                        <input
                          type="text"
                          value={interviewDates}
                          onChange={(e) => setInterviewDates(e.target.value)}
                          placeholder="e.g. 2026-10-15 ~ 2026-10-20"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Admission Result Announcement</label>
                        <input
                          type="date"
                          value={resultAnnouncementDate}
                          onChange={(e) => setResultAnnouncementDate(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Tuition Wire Payment Deadline</label>
                        <input
                          type="date"
                          value={tuitionPaymentDeadline}
                          onChange={(e) => setTuitionPaymentDeadline(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Visa (CoA) Dispatch Deadline</label>
                        <input
                          type="date"
                          value={visaSubmissionDeadline}
                          onChange={(e) => setVisaSubmissionDeadline(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Semester Opening Day</label>
                        <input
                          type="date"
                          value={classesStartDate}
                          onChange={(e) => setClassesStartDate(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_CLS}>
                        Required Application Materials / Dossier Checklist{' '}
                        <span className="text-slate-400 font-normal">(comma-separated)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={requiredDocs}
                        onChange={(e) => setRequiredDocs(e.target.value)}
                        placeholder="Valid Passport Copy, Apostilled High School Diploma, Official Transcripts, Bank Balance Certificate ($20,000 USD), Family Relationship Certificate..."
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Intake schedule will not be pre-created. You can add intake terms individually from the Dossier view.
                  </p>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 4: FLAGSHIP ACADEMIC PROGRAM & TUITION */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'program') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                    <GraduationCap className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>4. Flagship Academic Program &amp; Tuition Structure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Enable Initial Program</span>
                    <input
                      type="checkbox"
                      checked={addProgram}
                      onChange={(e) => setAddProgram(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1E40AF] border-slate-300"
                    />
                  </div>
                </div>

                {addProgram ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className={LABEL_CLS}>Academic Program Name</label>
                        <input
                          type="text"
                          value={progName}
                          onChange={(e) => setProgName(e.target.value)}
                          placeholder="e.g. Korean Language Regular Program (KLP) or Computer Science"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Program Code</label>
                        <input
                          type="text"
                          value={progCode}
                          onChange={(e) => setProgCode(e.target.value)}
                          placeholder="e.g. KLP or CS-101"
                          className={INPUT_CLS + ' font-mono uppercase'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Degree Level / Visa Track</label>
                        <select
                          value={progDegreeLevel}
                          onChange={(e) => setProgDegreeLevel(e.target.value)}
                          className={INPUT_CLS}
                        >
                          <option value="Korean Language (D-4-1)">Korean Language Immersion (D-4-1)</option>
                          <option value="Bachelor (D-2-2)">Undergraduate / Bachelor (D-2-2)</option>
                          <option value="Master (D-2-3)">Graduate / Master (D-2-3)</option>
                          <option value="Doctorate (D-2-4)">Doctorate / PhD (D-2-4)</option>
                          <option value="Exchange (D-2-6)">Pathway / Exchange (D-2-6)</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Program Duration</label>
                        <input
                          type="text"
                          value={progDuration}
                          onChange={(e) => setProgDuration(e.target.value)}
                          placeholder="e.g. 4 Quarters (1 Year, 800 Hours) or 4 Years (8 Semesters)"
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Tuition Fee (KRW per Term/Sem)</label>
                        <input
                          type="number"
                          value={progTuitionKrw}
                          onChange={(e) => setProgTuitionKrw(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="1730000"
                          className={INPUT_CLS + ' tabular-nums font-mono'}
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          ~${progTuitionKrw ? Math.round(Number(progTuitionKrw) / 1320).toLocaleString() : 0} USD
                        </p>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Application Processing Fee (KRW)</label>
                        <input
                          type="number"
                          value={progAppFeeKrw}
                          onChange={(e) => setProgAppFeeKrw(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="80000"
                          className={INPUT_CLS + ' tabular-nums font-mono'}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Language of Instruction</label>
                        <select
                          value={progLanguage}
                          onChange={(e) => setProgLanguage(e.target.value)}
                          className={INPUT_CLS}
                        >
                          <option value="Korean">Korean 100%</option>
                          <option value="English 100%">English 100%</option>
                          <option value="Bilingual (Korean + English)">Bilingual (Korean + English)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_CLS}>Program Requirements &amp; Eligibility Criteria</label>
                      <textarea
                        rows={2}
                        value={progRequirements}
                        onChange={(e) => setProgRequirements(e.target.value)}
                        placeholder="e.g. High school graduation certificate or higher, valid passport with 6+ months validity, financial affidavit of $10,000 USD."
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Flagship program skipped. Additional programs can be configured directly in the Programs tab.
                  </p>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 5: BANK WIRE DETAILS */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'bank') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                    <CreditCard className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>5. Institutional Bank Coordinates &amp; Wire Instructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Enable Banking Details</span>
                    <input
                      type="checkbox"
                      checked={addBankDetails}
                      onChange={(e) => setAddBankDetails(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1E40AF] border-slate-300"
                    />
                  </div>
                </div>

                {addBankDetails ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Beneficiary Account Holder</label>
                        <input
                          type="text"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          placeholder="e.g. Office of International Affairs, Chung-Ang Univ"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Receiving Bank Name</label>
                        <select
                          value={bankName}
                          onChange={(e) => {
                            setBankName(e.target.value);
                            // Auto-set matching SWIFT code
                            if (e.target.value.includes('Shinhan')) setSwiftCode('SHBKKRSE');
                            else if (e.target.value.includes('Hana')) setSwiftCode('HNBNKRSE');
                            else if (e.target.value.includes('Kookmin') || e.target.value.includes('KB')) setSwiftCode('CZNBKRSE');
                            else if (e.target.value.includes('Woori')) setSwiftCode('HVBKKRSE');
                            else if (e.target.value.includes('IBK')) setSwiftCode('IBKOKRSE');
                          }}
                          className={INPUT_CLS}
                        >
                          <option value="Shinhan Bank">Shinhan Bank (신한은행)</option>
                          <option value="Hana Bank">Hana Bank (하나은행)</option>
                          <option value="KB Kookmin Bank">KB Kookmin Bank (국민은행)</option>
                          <option value="Woori Bank">Woori Bank (우리은행)</option>
                          <option value="IBK Industrial Bank of Korea">IBK Industrial Bank of Korea</option>
                          <option value="NongHyup Bank">NH NongHyup Bank (농협은행)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Branch Name</label>
                        <input
                          type="text"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="e.g. Main Campus Branch"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Account Number</label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Virtual Account Issued Upon Acceptance"
                          className={INPUT_CLS + ' font-mono'}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>SWIFT / BIC Code</label>
                        <input
                          type="text"
                          value={swiftCode}
                          onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                          placeholder="e.g. SHBKKRSE"
                          className={INPUT_CLS + ' uppercase font-mono'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className={LABEL_CLS}>Settlement Currency</label>
                        <select
                          value={bankCurrency}
                          onChange={(e) => setBankCurrency(e.target.value)}
                          className={INPUT_CLS}
                        >
                          <option value="KRW">KRW — South Korean Won (Primary)</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="EUR">EUR — Euro</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Virtual Account (VA) Support</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            id="modal-va-support"
                            checked={isVirtualAccountSupported}
                            onChange={(e) => setIsVirtualAccountSupported(e.target.checked)}
                            className="w-4 h-4 rounded text-[#1E40AF] border-slate-300"
                          />
                          <label htmlFor="modal-va-support" className="text-xs text-slate-700 dark:text-slate-300 select-none">
                            Individual unique virtual account assigned to each candidate invoice
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_CLS}>Telegraphic Wire Payment Instructions &amp; Remark Rules</label>
                      <textarea
                        rows={2}
                        value={paymentInstructions}
                        onChange={(e) => setPaymentInstructions(e.target.value)}
                        placeholder="Include student ID and name in wire memo. Sender pays all transfer fees (OUR mode)."
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Bank coordinates skipped. Institutional wire accounts can be added later from the Bank Details tab.
                  </p>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 6: REFUND POLICY GUIDELINES */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'refund') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-slate-100 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>6. Refund Policy &amp; Visa Rejection Guarantees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Enable Refund Policy</span>
                    <input
                      type="checkbox"
                      checked={addRefundPolicy}
                      onChange={(e) => setAddRefundPolicy(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1E40AF] border-slate-300"
                    />
                  </div>
                </div>

                {addRefundPolicy ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="modal-app-fee-refund"
                          checked={appFeeRefundable}
                          onChange={(e) => setAppFeeRefundable(e.target.checked)}
                          className="w-4 h-4 text-[#1E40AF] rounded border-slate-300"
                        />
                        <label htmlFor="modal-app-fee-refund" className="text-xs text-slate-700 dark:text-slate-300 select-none">
                          Application Fee Refundable
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className={LABEL_CLS}>Application Fee Conditions</label>
                        <input
                          type="text"
                          value={appFeeConditions}
                          onChange={(e) => setAppFeeConditions(e.target.value)}
                          placeholder="Application fee conditions..."
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_CLS}>Tuition Refund Schedule / Pro-rata Policy</label>
                      <textarea
                        rows={3}
                        value={tuitionRefundPolicy}
                        onChange={(e) => setTuitionRefundPolicy(e.target.value)}
                        placeholder="Prior to semester commencement: 100% tuition refund minus bank processing charges (KRW 50,000)..."
                        className={INPUT_CLS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLS}>Visa Rejection Refund Guarantee Clause</label>
                      <textarea
                        rows={2}
                        value={visaRejectionRefund}
                        onChange={(e) => setVisaRejectionRefund(e.target.value)}
                        placeholder="100% tuition fee is refunded if the student visa (D-2 / D-4) is refused by Korean Embassy upon submitting official refusal confirmation..."
                        className={INPUT_CLS}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Cancellation Formal Notice Deadline</label>
                        <input
                          type="text"
                          value={deadlinesDescription}
                          onChange={(e) => setDeadlinesDescription(e.target.value)}
                          placeholder="Formal cancellation request before semester opening day"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Refund Processing Window</label>
                        <input
                          type="text"
                          value={refundProcessingTime}
                          onChange={(e) => setRefundProcessingTime(e.target.value)}
                          placeholder="14 to 21 business days via international wire"
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Default NIIED refund schedule will apply automatically.
                  </p>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* SECTION 7: OFFICIAL ADMISSION GUIDELINES DOCUMENT */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {(viewMode === 'all' || activeSection === 'documents') && (
              <div className="space-y-4">
                <div className={SECTION_HEADER_CLS}>
                  <FileText className="w-3.5 h-3.5 text-[#1E40AF]" />
                  <span>7. Initial Admission Guidelines &amp; Official Documentation</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>Initial Admission Guide Title</label>
                      <input
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder={
                          nameEn.trim()
                            ? `${nameEn.trim()} International Student Admission Guidelines`
                            : 'e.g. 2027 Spring International Admissions Guide'
                        }
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Document Classification</label>
                      <select
                        value={docCategory}
                        onChange={(e) => setDocCategory(e.target.value)}
                        className={INPUT_CLS}
                      >
                        <option value="Admission Guidelines">Admission Guidelines (PDF)</option>
                        <option value="Application Form">Application Form &amp; Affidavit</option>
                        <option value="Visa & Immigration">Visa &amp; Immigration Protocol</option>
                        <option value="Tuition Schedule">Tuition Schedule &amp; Bank Coordinates</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Guidelines Download / Source URL</label>
                    <input
                      type="url"
                      value={docFileUrl}
                      onChange={(e) => setDocFileUrl(e.target.value)}
                      placeholder={websiteUrl.trim() || 'https://www.studyinkorea.go.kr'}
                      className={INPUT_CLS}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Link to the university's official admissions bulletin or NIIED Study in Korea repository.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#0F172A] dark:text-slate-100">Automatic Document Package Generation</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        In addition to the primary guideline, standard Apostille checklists and immigration affidavit forms are automatically provisioned in the Documents tab for consultants and students.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 rounded-b-[14px] shrink-0">
            <div className="flex items-center gap-2">
              {viewMode === 'tabbed' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentSectionIndex > 0) {
                        setActiveSection(SECTIONS[currentSectionIndex - 1].id);
                      }
                    }}
                    disabled={currentSectionIndex === 0}
                    className="h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>

                  {currentSectionIndex < SECTIONS.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection(SECTIONS[currentSectionIndex + 1].id);
                      }}
                      className="h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                    >
                      Next: {SECTIONS[currentSectionIndex + 1].label}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-8 px-4 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-8 px-5 text-xs font-semibold rounded-lg bg-[#1E40AF] text-white hover:bg-[#1E3A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Dossier…
                  </>
                ) : isEditMode ? (
                  'Save Partner Dossier'
                ) : (
                  'Add Partner Institution'
                )}
              </button>
            </div>
          </div>
        </form>
    </ModalTransition>,
    document.body
  );
};

export default AddUniversityModal;
