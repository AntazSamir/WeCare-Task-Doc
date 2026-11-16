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
} from 'lucide-react';
import { KoreanUniversity } from '../types/pms';
import { createUniversity, updateUniversity, createIntake, updateBankDetails } from '../services/pmsService';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AddUniversityModalProps {
  /** Pass a university object to open in Edit mode; omit for Add mode */
  initialData?: KoreanUniversity & { intakes?: any[]; bankDetails?: any };
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
    initialData?.ieltsRequirement ?? 'IELTS 6.0 minimum'
  );

  // ── Section 3: Financial Requirements ──
  const [bankBalanceUsd, setBankBalanceUsd] = useState<number | ''>(
    initialData?.bankBalanceUsd ?? 20000
  );

  // ── Section 4: Initial Intake (optional, only shown in Add mode) ──
  const [addIntake, setAddIntake] = useState(false);
  const [intakeTerm, setIntakeTerm] = useState('Spring 2027');
  const [intakeAcademicYear, setIntakeAcademicYear] = useState(2027);
  const [appStart, setAppStart] = useState('2026-08-01');
  const [appDeadline, setAppDeadline] = useState('2026-09-30');
  const [quota, setQuota] = useState<number | ''>(30);
  const [requiredDocs, setRequiredDocs] = useState('');

  // ── Section 5: Bank Wire Details (optional) ──
  const [addBankDetails, setAddBankDetails] = useState(false);
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
  const [swiftCode, setSwiftCode] = useState(initialData?.bankDetails?.swiftCode ?? '');
  const [bankCurrency, setBankCurrency] = useState(
    initialData?.bankDetails?.currency ?? 'KRW'
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialData?.bankDetails?.paymentInstructions ??
      'Include student ID and name in wire memo. Sender pays all transfer fees (OUR mode).'
  );

  // ── UI state ──
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Pre-open bank section if editing with existing bank data
  useEffect(() => {
    if (isEditMode && initialData?.bankDetails) {
      setAddBankDetails(true);
    }
  }, [isEditMode, initialData]);

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
      return;
    }
    setErrors({});

    setIsSaving(true);
    try {
      const payload: Partial<KoreanUniversity> = {
        nameEn: nameEn.trim(),
        nameKo: nameKo.trim() || nameEn.trim(),
        city: city.trim(),
        ranking: ranking.trim() || 'Top Tier Korean University',
        websiteUrl:
          websiteUrl.trim() && websiteUrl.trim() !== 'https://'
            ? websiteUrl.trim()
            : 'https://www.studyinkorea.go.kr',
        topikRequirement: topikRequirement.trim() || 'TOPIK Level 3 or higher',
        ieltsRequirement: ieltsRequirement.trim() || 'IELTS 6.0 minimum',
        bankBalanceUsd: bankBalanceUsd !== '' ? Number(bankBalanceUsd) : 20000,
        accredited,
        notes: notes.trim(),
      };

      let uniId: string;

      if (isEditMode && initialData) {
        await updateUniversity(initialData.id, payload);
        uniId = initialData.id;
      } else {
        // Create university — returns { ok, id }
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
        const result = await res.json();
        uniId = result.id;
      }

      // Create intake if requested (Add mode only)
      if (!isEditMode && addIntake && intakeTerm && appDeadline) {
        await createIntake({
          universityId: uniId,
          term: intakeTerm.trim(),
          academicYear: Number(intakeAcademicYear) || 2027,
          applicationStart: appStart,
          applicationDeadline: appDeadline,
          quota: quota !== '' ? Number(quota) : 30,
          requiredDocuments: requiredDocs
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
        });
      }

      // Save bank details if provided
      if (addBankDetails && (accountNumber.trim() || bankName.trim())) {
        await updateBankDetails(uniId, {
          accountHolder: accountHolder.trim(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountNumber: accountNumber.trim(),
          swiftCode: swiftCode.trim(),
          currency: bankCurrency,
          paymentInstructions: paymentInstructions.trim(),
        });
      }

      onSuccess(
        isEditMode
          ? `${nameEn} updated successfully.`
          : `${nameEn} added to the university directory.`
      );
      onClose();
    } catch (err: any) {
      console.error('[AddUniversityModal] Save failed:', err);
      setErrors({ nameEn: err.message || 'Save failed. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#0F172A]/40 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
      <div className="w-full max-w-2xl rounded-[12px] bg-[#FFFFFF] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xl my-6 animate-modal-card">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-slate-800">
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1E40AF]" />
            {isEditMode
              ? `Edit University — ${initialData?.nameEn}`
              : 'Add Korean Higher Education Partner Institution'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

            {/* Global error (shown when nameEn error used as general msg) */}
            {errors.nameEn && errors.nameEn.includes('failed') && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.nameEn}
              </div>
            )}

            {/* ── Section 1: Basic Info ── */}
            <div>
              <div className={SECTION_HEADER_CLS}>
                <Building2 className="w-3.5 h-3.5 text-[#1E40AF]" />
                <span>Basic Information</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>
                      University Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => { setNameEn(e.target.value); setErrors((p) => ({ ...p, nameEn: undefined })); }}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>
                      City / Region <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={city}
                      onChange={(e) => { setCity(e.target.value); setErrors((p) => ({ ...p, city: undefined })); }}
                      className={errors.city ? ERROR_INPUT_CLS : INPUT_CLS}
                    >
                      {['Seoul', 'Busan', 'Daejeon', 'Incheon', 'Gwangju', 'Daegu', 'Suwon', 'Cheongju', 'Jeonju', 'Cheonan'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    <FieldError msg={errors.city} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Ranking / Tier</label>
                    <input
                      type="text"
                      value={ranking}
                      onChange={(e) => setRanking(e.target.value)}
                      placeholder="e.g. Top 15 in Korea (SKY Adjacent)"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Official Admissions URL</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => { setWebsiteUrl(e.target.value); setErrors((p) => ({ ...p, websiteUrl: undefined })); }}
                      placeholder="https://international.university.ac.kr"
                      className={errors.websiteUrl ? ERROR_INPUT_CLS : INPUT_CLS}
                    />
                    <FieldError msg={errors.websiteUrl} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className={LABEL_CLS}>NIIED/MOE Accredited</label>
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setAccredited(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${accredited ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accredited
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccredited(false)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!accredited ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                      >
                        Not Accredited
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
                    placeholder="e.g. Apostilled documents required. Submit via DHL to International Office."
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Language & Academic Requirements ── */}
            <div>
              <div className={SECTION_HEADER_CLS}>
                <BookOpen className="w-3.5 h-3.5 text-[#1E40AF]" />
                <span>Language &amp; Academic Requirements</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>TOPIK Requirement</label>
                  <input
                    type="text"
                    value={topikRequirement}
                    onChange={(e) => setTopikRequirement(e.target.value)}
                    placeholder="e.g. TOPIK Level 3 or higher"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>English Track / IELTS Requirement</label>
                  <input
                    type="text"
                    value={ieltsRequirement}
                    onChange={(e) => setIeltsRequirement(e.target.value)}
                    placeholder="e.g. IELTS 6.0 minimum"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 3: Financial Requirements ── */}
            <div>
              <div className={SECTION_HEADER_CLS}>
                <DollarSign className="w-3.5 h-3.5 text-[#1E40AF]" />
                <span>Financial Requirements</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>
                    Bank Certificate Balance (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bankBalanceUsd}
                    onChange={(e) => {
                      setBankBalanceUsd(e.target.value === '' ? '' : Number(e.target.value));
                      setErrors((p) => ({ ...p, bankBalanceUsd: undefined }));
                    }}
                    placeholder="20000"
                    className={errors.bankBalanceUsd ? ERROR_INPUT_CLS : INPUT_CLS + ' tabular-nums'}
                  />
                  <FieldError msg={errors.bankBalanceUsd} />
                  <p className="text-[11px] text-slate-400 mt-0.5">Required balance in student's bank statement (USD equivalent)</p>
                </div>
                <div className="flex items-start pt-5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Typical ranges: Seoul ≥ \$20,000 · Regional ≥ \$16,000 · D-4 KLP ≥ \$9,000
                  </p>
                </div>
              </div>
            </div>

            {/* ── Section 4: Initial Intake (Add mode only) ── */}
            {!isEditMode && (
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
                  <div className={SECTION_HEADER_CLS.replace('mb-3 pb-2 border-b border-[#E2E8F0] dark:border-slate-800', '')}>
                    <Calendar className="w-3.5 h-3.5 text-[#1E40AF]" />
                    <span>Initial Intake</span>
                    <span className="text-[11px] font-normal text-slate-400 normal-case tracking-normal">(optional)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddIntake((v) => !v)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${addIntake ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {addIntake ? 'Remove Intake' : '+ Add Intake'}
                  </button>
                </div>

                {addIntake && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Intake Term</label>
                        <input
                          type="text"
                          value={intakeTerm}
                          onChange={(e) => setIntakeTerm(e.target.value)}
                          placeholder="e.g. Spring 2027"
                          className={INPUT_CLS}
                        />
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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Application Opens</label>
                        <input
                          type="date"
                          value={appStart}
                          onChange={(e) => setAppStart(e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>
                          Application Deadline <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={appDeadline}
                          onChange={(e) => { setAppDeadline(e.target.value); setErrors((p) => ({ ...p, appDeadline: undefined })); }}
                          className={errors.appDeadline ? ERROR_INPUT_CLS : INPUT_CLS}
                        />
                        <FieldError msg={errors.appDeadline} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>
                          Intake Quota (seats) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={quota}
                          onChange={(e) => { setQuota(e.target.value === '' ? '' : Number(e.target.value)); setErrors((p) => ({ ...p, quota: undefined })); }}
                          min="1"
                          placeholder="30"
                          className={errors.quota ? ERROR_INPUT_CLS : INPUT_CLS + ' tabular-nums'}
                        />
                        <FieldError msg={errors.quota} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Required Documents <span className="text-slate-400 font-normal">(comma-separated)</span></label>
                        <input
                          type="text"
                          value={requiredDocs}
                          onChange={(e) => setRequiredDocs(e.target.value)}
                          placeholder="Passport copy, High school diploma, TOPIK certificate..."
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Section 5: Bank Wire Details ── */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
                <div className={SECTION_HEADER_CLS.replace('mb-3 pb-2 border-b border-[#E2E8F0] dark:border-slate-800', '')}>
                  <CreditCard className="w-3.5 h-3.5 text-[#1E40AF]" />
                  <span>Bank Wire Details</span>
                  <span className="text-[11px] font-normal text-slate-400 normal-case tracking-normal">(optional)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddBankDetails((v) => !v)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${addBankDetails ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {addBankDetails ? 'Hide Bank Info' : '+ Add Bank Info'}
                </button>
              </div>

              {addBankDetails && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>Account Holder</label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Office of International Affairs"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Shinhan Bank"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                        placeholder="Virtual account issued upon acceptance"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>SWIFT / BIC Code</label>
                      <input
                        type="text"
                        value={swiftCode}
                        onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SHBKKRSE"
                        className={INPUT_CLS + ' uppercase'}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Currency</label>
                      <select
                        value={bankCurrency}
                        onChange={(e) => setBankCurrency(e.target.value)}
                        className={INPUT_CLS}
                      >
                        <option value="KRW">KRW — Korean Won</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLS}>Payment Instructions</label>
                    <textarea
                      rows={2}
                      value={paymentInstructions}
                      onChange={(e) => setPaymentInstructions(e.target.value)}
                      placeholder="Include student ID and name in wire memo. Sender pays all transfer fees (OUR mode)."
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-[12px]">
            <p className="text-[11px] text-slate-400">
              Fields marked <span className="text-red-500">*</span> are required
            </p>
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
                className="h-8 px-5 text-xs font-semibold rounded-lg bg-[#1E40AF] text-white hover:bg-[#1E3A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving…
                  </>
                ) : isEditMode ? (
                  'Save Changes'
                ) : (
                  'Add University'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddUniversityModal;
