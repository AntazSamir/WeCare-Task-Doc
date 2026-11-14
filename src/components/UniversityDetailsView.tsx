import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Building2,
  Calendar,
  DollarSign,
  BookOpen,
  ArrowLeft,
  ShieldCheck,
  Clock,
  FileText,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Check,
  Copy,
  Download,
  AlertCircle,
  Users,
  CreditCard,
  RefreshCw,
  X,
  FileCheck2,
  ChevronRight,
  Info,
  CalendarDays,
  Percent,
  Star,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import {
  AdmissionIntake,
  DegreeLevel,
  KoreanUniversity,
  UniversityBankAccount,
  UniversityDocument,
  UniversityProgram,
  UniversityRefundPolicy,
  UserProfile,
} from '../types/pms';
import {
  fetchUniversityDetails,
  verifyUniversity,
  updateRefundPolicy,
  updateBankDetails,
  createProgram,
  updateProgram,
  deleteProgram,
  createUniversityDocument,
  deleteUniversityDocument,
  updateUniversity,
  createIntake,
  updateIntake,
} from '../services/pmsService';
import { UniversityDetailsSkeleton } from './SkeletonLoaders';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';

interface UniversityDetailsViewProps {
  universityId: string;
  currentUser: UserProfile;
  onBack: () => void;
  onApplyStudentForProgram?: (universityId: string, program: UniversityProgram, intakeTerm?: string) => void;
  onRefreshParent?: () => void;
}

type TabType = 'intakes' | 'programs' | 'tuition' | 'refund' | 'bank' | 'documents' | 'dates' | 'applicants';

export const UniversityDetailsView: React.FC<UniversityDetailsViewProps> = ({
  universityId,
  currentUser,
  onBack,
  onApplyStudentForProgram,
  onRefreshParent,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('intakes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uni, setUni] = useState<(KoreanUniversity & { applicants?: any[] }) | null>(null);

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Admin edit modals
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEditUniModal, setShowEditUniModal] = useState(false);
  const [showEditRefundModal, setShowEditRefundModal] = useState(false);
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<UniversityProgram | null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [editingIntake, setEditingIntake] = useState<AdmissionIntake | null>(null);

  // Modal form states for MorphSelect
  const [modalDegreeLevel, setModalDegreeLevel] = useState<string>('Bachelor (D-2-2)');
  const [modalLanguage, setModalLanguage] = useState<string>('Korean');
  const [modalCurrency, setModalCurrency] = useState<string>('KRW');
  const [modalIntakeStatus, setModalIntakeStatus] = useState<string>('Open');
  const [modalDocCategory, setModalDocCategory] = useState<string>('Admission Guidelines');

  // Program filter
  const [programFilter, setProgramFilter] = useState<string>('All');

  const isAdmin = currentUser.role === 'Admission_Manager';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUniversityDetails(universityId);
      setUni(data);
    } catch (err: any) {
      console.error('Failed to load university details:', err);
      setError(err.message || 'Unable to load university details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [universityId]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReverify = async () => {
    if (!isAdmin) return;
    try {
      setIsVerifying(true);
      const res = await verifyUniversity(universityId);
      if (uni) {
        setUni({
          ...uni,
          verificationStatus: 'Verified',
          lastVerifiedAt: res.verifiedAt,
          verifiedBy: res.verifiedBy,
        });
      }
      onRefreshParent?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this degree/language program?')) return;
    try {
      await deleteProgram(universityId, programId);
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete program');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this admission document?')) return;
    try {
      await deleteUniversityDocument(universityId, docId);
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  if (loading) {
    return <UniversityDetailsSkeleton />;
  }

  if (error || !uni) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-lg space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
          {error || 'University profile not found'}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>
      </div>
    );
  }

  const intakes = uni.intakes || [];
  const programs = uni.programs || [];
  const refundPolicy = uni.refundPolicy;
  const bankDetails = uni.bankDetails;
  const documents = uni.documents || [];
  const applicants = uni.applicants || [];

  const filteredPrograms = programs.filter((p) => {
    if (programFilter === 'All') return true;
    if (programFilter === 'KLP') return p.code === 'KLP' || p.degreeLevel.includes('D-4');
    if (programFilter === 'Undergraduate') return p.degreeLevel.includes('Bachelor') || p.code === 'KSU' || p.code === 'UIC-BS';
    if (programFilter === 'Graduate') return p.degreeLevel.includes('Master') || p.degreeLevel.includes('Doctorate');
    if (programFilter === 'Pathway') return p.code === 'EAP' || p.degreeLevel.includes('Exchange');
    return true;
  });

  return (
    <div className="space-y-3.5">

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-xs group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-slate-600 dark:text-slate-300" />
          <span>Back to Universities</span>
        </button>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleReverify}
              disabled={isVerifying}
              title="Confirm that university admission criteria, fees, and bank coordinates are currently validated"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isVerifying ? 'Re-verifying...' : 'Re-verify Criteria'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowEditUniModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Info</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_14px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">

          <div className="flex items-center gap-4 shrink-0">
            {uni.id === 'UNI-SNU' ? (
              <div className="h-20 w-52 sm:w-56 rounded-xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/assets/snu_logo_badge.png"
                  alt="Seoul National University"
                  className="h-full w-full object-contain"
                  onError={(e) => {

                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg bg-blue-600 text-white flex flex-col items-center justify-center shadow-xs shrink-0">
                <Building2 className="w-8 h-8 text-white mb-0.5" />
                <span className="text-[11px] font-mono font-bold tracking-wider">
                  {uni.id.replace('UNI-', '')}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {uni.nameEn} {uni.id === 'UNI-SNU' ? '(SNU)' : ''}
                </h1>

                <span className="inline-flex items-center justify-center text-blue-500 dark:text-blue-400" title="Verified Korean Institution">
                  <svg className="w-5 h-5 fill-blue-500 text-white" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M8.6 2.25A2.25 2.25 0 0 0 6.64 3.7l-.42 1.48a2.25 2.25 0 0 1-1.54 1.54l-1.48.42a2.25 2.25 0 0 0-1.45 1.96v.1a2.25 2.25 0 0 0 .7 1.68l1.09 1.09c.47.46.7 1.1.63 1.74l-.16 1.53a2.25 2.25 0 0 0 1.25 2.25l1.37.69c.58.29.98.84 1.08 1.48l.24 1.52a2.25 2.25 0 0 0 2 1.89h.2a2.25 2.25 0 0 0 1.8-1l.9-1.26a2.25 2.25 0 0 1 1.6-.82h1.55a2.25 2.25 0 0 0 2.2-1.78l.35-1.5a2.25 2.25 0 0 1 1.22-1.5l1.4-.64a2.25 2.25 0 0 0 1.28-2.22l-.12-1.54a2.25 2.25 0 0 1 .65-1.73l1.1-1.09a2.25 2.25 0 0 0 .7-1.68v-.1a2.25 2.25 0 0 0-1.45-1.96l-1.48-.42a2.25 2.25 0 0 1-1.54-1.54l-.42-1.48a2.25 2.25 0 0 0-1.96-1.45h-.1a2.25 2.25 0 0 0-1.68.7L13.1 3.5a2.25 2.25 0 0 1-1.74.63l-1.53-.16a2.25 2.25 0 0 0-2.25 1.25l-.69 1.37c-.29.58-.84.98-1.48 1.08l-1.52.24a2.25 2.25 0 0 0-1.89 2v.2a2.25 2.25 0 0 0 1 1.8l1.26.9c.5.35.8.92.82 1.6v1.55a2.25 2.25 0 0 0 1.78 2.2l1.5.35c.6.14 1.13.56 1.5 1.22l.64 1.4a2.25 2.25 0 0 0 2.22 1.28l1.54-.12c.64-.05 1.27.18 1.73.65l1.09 1.1a2.25 2.25 0 0 0 1.68.7h.1a2.25 2.25 0 0 0 1.96-1.45l.42-1.48a2.25 2.25 0 0 1 1.54-1.54l1.48-.42a2.25 2.25 0 0 0 1.45-1.96v-.1a2.25 2.25 0 0 0-.7-1.68l-1.09-1.09a2.25 2.25 0 0 1-.63-1.74l.16-1.53a2.25 2.25 0 0 0-1.25-2.25l-1.37-.69a2.25 2.25 0 0 1-1.08-1.48l-.24-1.52a2.25 2.25 0 0 0-2-1.89h-.2a2.25 2.25 0 0 0-1.8 1l-.9 1.26a2.25 2.25 0 0 1-1.6.82h-1.55a2.25 2.25 0 0 0-2.2 1.78l-.35 1.5a2.25 2.25 0 0 1-1.22 1.5l-1.4.64a2.25 2.25 0 0 0-1.28 2.22l.12 1.54c.05.64-.18 1.27-.65 1.73l-1.1 1.09a2.25 2.25 0 0 0-.7 1.68v.1c0 .88.52 1.65 1.3 1.96l1.48.42a2.25 2.25 0 0 1 1.54 1.54l.42 1.48a2.25 2.25 0 0 0 1.96 1.45h.1a2.25 2.25 0 0 0 1.68-.7l1.09-1.09a2.25 2.25 0 0 1 1.74-.63l1.53.16a2.25 2.25 0 0 0 2.25-1.25l.69-1.37c.29-.58.84-.98 1.48-1.08l1.52-.24a2.25 2.25 0 0 0 1.89-2v-.2a2.25 2.25 0 0 0-1-1.8l-1.26-.9a2.25 2.25 0 0 1-.82-1.6v-1.55a2.25 2.25 0 0 0-1.78-2.2l-1.5-.35a2.25 2.25 0 0 1-1.5-1.22l-.64-1.4a2.25 2.25 0 0 0-2.22-1.28l-1.54.12a2.25 2.25 0 0 1-1.73-.65l-1.09-1.1a2.25 2.25 0 0 0-1.68-.7h-.1z" clipRule="evenodd" />
                    <path fill="#ffffff" d="m10.2 15.5-3.2-3.2 1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4-6.2 6.2z" />
                  </svg>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {uni.city}, South Korea
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <a
                  href={uni.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{uni.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </a>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {uni.ranking}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative w-96 xl:w-[460px] h-24 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 shrink-0">
            <img
              src="/assets/campus_snu_clean.jpg"
              alt={`${uni.nameEn} Campus`}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('intakes')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'intakes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Current Intake</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('programs')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'programs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Programs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tuition')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'tuition'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Tuition & Fees</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('refund')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'refund'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Refund Policy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'bank'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Bank Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'documents'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dates')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
            activeTab === 'dates'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Important Dates</span>
        </button>

        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setActiveTab('applicants')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-md font-medium transition-all shrink-0 ${
              activeTab === 'applicants'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>More ({applicants.length})</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div key={activeTab} className="animate-tab-enter">

        {activeTab === 'intakes' && (() => {

        const primaryIntake = intakes.find((i) => i.status === 'Open') || intakes[0] || {
          term: 'Spring 2027',
          status: 'Open',
          applicationStart: '2026-10-01',
          applicationDeadline: '2026-11-30',
          documentDeadline: 'Dec 5, 2026',
          resultAnnouncementDate: 'Jan 15, 2027',
          tuitionPaymentDeadline: 'Feb 1, 2027',
          visaSubmissionDeadline: 'Feb 15, 2027',
          classesStartDate: 'Mar 1, 2027',
        };

        const klpProgram = programs.find((p) => p.code === 'KLP' || p.name.includes('Korean Language'));
        const ksuProgram = programs.find((p) => p.code === 'KSU' || p.name.includes('Korean Studies'));
        const eapProgram = programs.find((p) => p.code === 'EAP' || p.name.includes('English Academic'));
        const underProgram = programs.find((p) => p.degreeLevel.includes('Bachelor') && p.code !== 'KSU');
        const gradProgram = programs.find((p) => p.degreeLevel.includes('Master') || p.degreeLevel.includes('Doctorate'));

        const formatDateClean = (dStr?: string) => {
          if (!dStr) return '';
          if (dStr.includes('Oct') || dStr.includes('Nov') || dStr.includes('Dec') || dStr.includes('Jan') || dStr.includes('Feb') || dStr.includes('Mar')) {
            return dStr;
          }
          const dt = new Date(dStr);
          if (isNaN(dt.getTime())) return dStr;
          return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        return (
          <div className="space-y-4">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              <div className="lg:col-span-3 xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Current Intake</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      {primaryIntake.term}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{primaryIntake.status || 'Open'}</span>
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Application Open</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatDateClean(primaryIntake.applicationStart) || 'Oct 1, 2026'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Application Deadline</span>
                      </span>
                      <span className="font-bold text-red-500 dark:text-red-400">
                        {formatDateClean(primaryIntake.applicationDeadline) || 'Nov 30, 2026'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Document Deadline</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {primaryIntake.documentDeadline || 'Dec 5, 2026'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Result Announcement</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {primaryIntake.resultAnnouncementDate || 'Jan 15, 2027'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <DollarSign className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Tuition Payment</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {primaryIntake.tuitionPaymentDeadline || 'Feb 1, 2027'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Visa Submission</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {primaryIntake.visaSubmissionDeadline || 'Feb 15, 2027'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Classes Start</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {primaryIntake.classesStartDate || 'Mar 1, 2027'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdmin) {
                        setEditingIntake(primaryIntake);
                        setShowIntakeModal(true);
                      }
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>View All Intakes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-sm">Available Programs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('programs')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View All Programs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">

                    <div
                      onClick={() => {
                        if (klpProgram && onApplyStudentForProgram) {
                          onApplyStudentForProgram(universityId, klpProgram, primaryIntake.term);
                        } else {
                          setActiveTab('programs');
                        }
                      }}
                      className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] group"
                    >
                      <div>
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-white bg-sky-500 rounded font-mono uppercase mb-1.5">
                          KLP
                        </span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors leading-snug">
                          Korean Language Program
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>1 Year</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (ksuProgram && onApplyStudentForProgram) {
                          onApplyStudentForProgram(universityId, ksuProgram, primaryIntake.term);
                        } else {
                          setActiveTab('programs');
                        }
                      }}
                      className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] group"
                    >
                      <div>
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-white bg-purple-500 rounded font-mono uppercase mb-1.5">
                          KSU
                        </span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 transition-colors leading-snug">
                          Korean Studies Program
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>4 Years</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (eapProgram && onApplyStudentForProgram) {
                          onApplyStudentForProgram(universityId, eapProgram, primaryIntake.term);
                        } else {
                          setActiveTab('programs');
                        }
                      }}
                      className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer flex flex-col justify-between min-h-[96px] group"
                    >
                      <div>
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold text-white bg-emerald-500 rounded font-mono uppercase mb-1.5">
                          EAP
                        </span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors leading-snug">
                          English Academic Program
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>1 Year</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                    <div
                      onClick={() => setActiveTab('programs')}
                      className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 hover:border-amber-300 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Undergraduate Programs
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>4 Years</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>

                    <div
                      onClick={() => setActiveTab('programs')}
                      className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Graduate Programs (Master's / PhD)
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>2–4 Years</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProgram(null);
                        setShowProgramModal(true);
                      }}
                      className="text-xs text-slate-400 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Configure Programs</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 3: Refund Policy (approx 3.5 cols) */}
              <div className="lg:col-span-4 xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Refund Policy</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Updated: Jan 2027</span>
                    </div>
                  </div>

                  {/* Bullet points */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Application Fee: </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {refundPolicy?.appFeeRefundable ? 'Refundable under conditions' : 'Non-refundable'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Tuition Refund: </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {refundPolicy?.tuitionRefundPolicy?.includes('70%')
                            ? '70% before semester, 50% after'
                            : '70% before semester, 50% after'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Refund Deadline: </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {refundPolicy?.deadlinesDescription?.includes('Before classes start')
                            ? 'Before classes start'
                            : 'Before classes start'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer View Policy Details Link Button matching reference */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('refund')}
                    className="w-full py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all inline-flex items-center justify-center gap-1"
                  >
                    <span>View Policy Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: 3 Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
              {/* CARD 4: Bank Details (approx 3.5 cols) */}
              <div className="lg:col-span-3 xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Bank Details</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bank')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bank Name with KB symbol icon */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src="/assets/kb_symbol.png"
                        alt="Kookmin Bank"
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {bankDetails?.bankName || 'Kookmin Bank'}
                    </span>
                  </div>

                  {/* Account Information Rows */}
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Account Holder: </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {bankDetails?.accountHolder || 'Seoul National University'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Account No: </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {bankDetails?.accountNumber || '123-456-7890'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400">SWIFT: </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {bankDetails?.swiftCode || 'CZNBKRSE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1-click Copy Details button matching mockup */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Bank: ${bankDetails?.bankName || 'Kookmin Bank'}\nHolder: ${bankDetails?.accountHolder || 'Seoul National University'}\nAccount: ${bankDetails?.accountNumber || '123-456-7890'}\nSWIFT: ${bankDetails?.swiftCode || 'CZNBKRSE'}`;
                      handleCopy(text, 'all_bank');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 rounded-lg transition-colors shadow-2xs"
                  >
                    {copiedField === 'all_bank' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 5: Important Dates (approx 5.5 cols) */}
              <div className="lg:col-span-5 xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Important Dates</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dates')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Calendar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dates list */}
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {primaryIntake.term} Application Period
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        Oct 1 – Nov 30, 2026
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Admission Results
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {primaryIntake.resultAnnouncementDate || 'Jan 15, 2027'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Semester Starts
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {primaryIntake.classesStartDate || 'Mar 1, 2027'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-right">
                  <span className="text-[11px] text-slate-400">
                    Visa filing window: Jan 16 ~ Feb 15, 2027
                  </span>
                </div>
              </div>

              {/* CARD 6: Documents (approx 3.5 cols) */}
              <div className="lg:col-span-4 xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Documents</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('documents')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Documents List */}
                  <div className="space-y-3 text-xs">
                    {/* Item 1: Admission Guide */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-mono text-[9px] font-bold">
                          PDF
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Admission Guide (PDF)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">2.5 MB</span>
                        <a
                          href={documents[0]?.fileUrl || 'https://en.snu.ac.kr/admission'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Item 2: Application Form */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-mono text-[9px] font-bold">
                          PDF
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Application Form (PDF)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">1.8 MB</span>
                        <a
                          href={documents[1]?.fileUrl || 'https://en.snu.ac.kr/form'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Item 3: University Brochure */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-mono text-[9px] font-bold">
                          PDF
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          University Brochure (PDF)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">3.2 MB</span>
                        <a
                          href={documents[2]?.fileUrl || 'https://en.snu.ac.kr/brochure'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddDocModal(true)}
                      className="text-xs text-slate-400 hover:text-blue-600 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Upload Document</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: AVAILABLE PROGRAMS & TUITION */}
      {(activeTab === 'programs' || activeTab === 'tuition') && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {activeTab === 'tuition' ? 'Tuition Fees & Cost Schedules' : 'Academic & Language Training Programs'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed breakdowns of Korean Language Programs (KLP), Undergraduate Degrees, Graduate Programs, and English Pathways
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Program Segmented Filters */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {['All', 'KLP', 'Undergraduate', 'Graduate', 'Pathway'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProgramFilter(cat)}
                    className={`px-3 py-1 font-medium rounded-md transition-colors ${
                      programFilter === cat
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProgram(null);
                    setShowProgramModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Program
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPrograms.map((prog) => (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                          {prog.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {prog.name}
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        {prog.degreeLevel} · {prog.duration}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProgram(prog);
                            setShowProgramModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                          title="Edit Program"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProgram(prog.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete Program"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial & Tuition Cards */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                        Tuition Fee (Per Term / Semester)
                      </span>
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                        {prog.tuitionFeeKrw === 0
                          ? '100% Scholarship / Free'
                          : `₩${prog.tuitionFeeKrw?.toLocaleString()} KRW`}
                      </div>
                      {prog.tuitionFeeUsd && prog.tuitionFeeUsd > 0 ? (
                        <div className="text-[11px] text-slate-500 font-mono">
                          (approx ${prog.tuitionFeeUsd?.toLocaleString()} USD)
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
                        Application Evaluation Fee
                      </span>
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        ₩{prog.applicationFeeKrw?.toLocaleString()} KRW
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Language: <span className="font-semibold">{prog.languageOfInstruction}</span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Requirements */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                      Eligibility & Document Requirements:
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/20 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                      {prog.requirements}
                    </p>
                  </div>

                  {/* Offered Intake Terms */}
                  {prog.intakeTerms && prog.intakeTerms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="font-mono text-slate-400 font-semibold text-[10px] uppercase">
                        Available Terms:
                      </span>
                      {prog.intakeTerms.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Action Linkage */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Visa: {prog.degreeLevel.includes('D-4') ? 'D-4-1 (General Trainee)' : 'D-2 (Student Visa)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onApplyStudentForProgram) {
                        onApplyStudentForProgram(universityId, prog, prog.intakeTerms?.[0]);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Apply Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REFUND POLICY & CONDITIONS */}
      {activeTab === 'refund' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Official Tuition & Application Fee Refund Regulations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Governed by Korean Ministry of Education University Tuition Operation Rules and institutional agreements
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowEditRefundModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Refund Terms
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 cols: Detailed Policies */}
            <div className="lg:col-span-2 space-y-4">
              {/* Visa Denial Guarantee Callout */}
              <div className="p-4 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Korean Embassy Visa Rejection Refund Guarantee
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  {refundPolicy?.visaRejectionRefund ||
                    '100% full tuition refund (minus nominal wire transfer banking charge) is officially guaranteed upon presentation of the Korean Embassy / Consulate Visa Denial notice.'}
                </p>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                  Documentation requirement: Original official Visa Refusal Notice issued by the Ministry of Justice / HiKorea.
                </div>
              </div>

              {/* Tuition Refund Schedule */}
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Standard Semester Tuition Withdrawal Schedule
                  </h3>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {refundPolicy?.tuitionRefundPolicy ||
                    '• Prior to semester start: 100% tuition refund.\n• Within 30 days after class start: 5/6 refund.\n• 31 to 60 days after class start: 2/3 refund.\n• 61 to 90 days after class start: 1/2 refund.\n• Beyond 90 days: Non-refundable.'}
                </div>
              </div>

              {/* Deadlines & Submission Protocol */}
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Written Refund Notice & Deadlines
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {refundPolicy?.deadlinesDescription ||
                    'Written withdrawal request with student signature, original receipt, and applicant bank passbook copy must be submitted to the university Office of International Affairs before the stated deadline.'}
                </p>
              </div>
            </div>

            {/* Right 1 col: Application fee & Processing summary */}
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  Application Fee Refund
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      refundPolicy?.appFeeRefundable
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {refundPolicy?.appFeeRefundable ? 'Refundable Under Conditions' : 'Strictly Non-Refundable'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {refundPolicy?.appFeeConditions ||
                    'Application screening fee is strictly non-refundable once online portal submission is finalized.'}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  Remittance Processing Time
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {refundPolicy?.refundProcessingTime || '14 to 21 business days'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Funds will be credited via international SWIFT wire back to the original remitter account. Remittance commission fees may be deducted by correspondent intermediary banks.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Policy Verification Status
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{refundPolicy?.verificationStatus || 'Verified'}</span></div>
                  <div>Verified By: <span className="font-semibold text-slate-700 dark:text-slate-300">{refundPolicy?.verifiedBy || 'Admissions Head'}</span></div>
                  <div className="font-mono text-[10px]">
                    Last Checked: {new Date(refundPolicy?.lastVerifiedAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BANK & REMITTANCE DETAILS */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Institutional Bank Accounts & Wire Remittance Coordinates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified South Korean university bank accounts for tuition fee deposits, virtual accounts, and international telegraphic transfer instructions
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowEditBankModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Bank Details
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Primary Banking Coordinates Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {bankDetails?.bankName || 'Shinhan Bank (신한은행)'}
                    </h3>
                    <div className="text-xs text-slate-500">
                      {bankDetails?.branchName || 'Main Campus Branch'}
                    </div>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Currency: {bankDetails?.currency || 'KRW'}
                </span>
              </div>

              {/* Data rows with 1-click Copy */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-0.5">
                    Account Beneficiary Name (Account Holder)
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                    <span>{bankDetails?.accountHolder || uni.nameEn}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails?.accountHolder || uni.nameEn, 'holder')}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      {copiedField === 'holder' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-0.5">
                    Account / Virtual Remittance Number
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    <span>{bankDetails?.accountNumber || '140-002-881920 (Virtual)'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails?.accountNumber || '140-002-881920', 'acct')}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      {copiedField === 'acct' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-0.5">
                    Bank SWIFT / BIC Code
                  </span>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                    <span>{bankDetails?.swiftCode || 'SHBKKRSE'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankDetails?.swiftCode || 'SHBKKRSE', 'swift')}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      {copiedField === 'swift' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Virtual Account (Unique per candidate admission):
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300 font-mono">
                    {bankDetails?.isVirtualAccountSupported !== false ? 'Supported & Mandatory' : 'Fixed Direct Account'}
                  </span>
                </div>
              </div>
            </div>

            {/* Remittance Instructions & Telegraphic Wire Rules */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    International Wire Remittance Protocol
                  </h3>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-100 dark:border-slate-800 font-sans">
                  {bankDetails?.paymentInstructions ||
                    '1. Remit in Korean Won (KRW) or exact USD equivalent converted using bank telegraphic transfer selling rate.\n2. In the remittance memo remark, strictly write applicant ID and name.\n3. Wire fee mode MUST be set to "OUR" (all intermediary bank fees paid by remitter).\n4. Email remittance SWIFT MT103 confirmation receipt to admissions office within 24 hours.'}
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Important Notice for International Remitters:
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Failure to quote applicant passport number or admission registration code will cause automated matching delays at the Korean university treasury office, potentially delaying the issuance of the Certificate of Admission (CoA).
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Verified: {new Date(bankDetails?.lastVerifiedAt || Date.now()).toLocaleDateString()}
                </span>
                <span className="text-slate-400">By {bankDetails?.verifiedBy || 'Admissions Head'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOCUMENTS & CIRCULARS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Official Admission Guidelines, Circulars & Circular Attachments
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Downloadable PDF guidelines, application circulars, fee remittance circulars, and consular apostille instructions
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddDocModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Upload / Link Document
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start justify-between gap-3 hover:border-blue-400/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    PDF
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                      {doc.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {doc.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{doc.fileSize}</span>
                      {doc.intakeTerm && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{doc.intakeTerm}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Open / Download Document"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: IMPORTANT DATES TIMELINE & SCHEDULE */}
      {activeTab === 'dates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Admission Intakes Calendar & Critical Deadlines
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological application windows, document submission cutoffs, interview dates, and visa filing schedules
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingIntake(null);
                  setShowIntakeModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Intake Schedule
              </button>
            )}
          </div>

          <div className="space-y-3">
            {intakes.map((it) => (
              <div
                key={it.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      {it.term} Academic Intake
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      AY {it.academicYear}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {it.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                      1. Application Open
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {it.applicationStart || 'Oct 1, 2026'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                    <span className="text-[10px] uppercase font-mono text-red-500 font-bold block mb-1">
                      2. Portal Deadline
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {it.applicationDeadline || 'Nov 30, 2026'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                      3. Document Deadline
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {it.documentDeadline || 'Dec 5, 2026'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                      4. Result Date
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {it.resultAnnouncementDate || 'Jan 15, 2027'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1">
                      5. Visa Submission
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {it.visaSubmissionDeadline || 'Feb 15, 2027'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[10px] uppercase font-mono text-emerald-600 font-bold block mb-1">
                      6. Classes Start
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {it.classesStartDate || 'Mar 1, 2027'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: REGISTERED CANDIDATES */}
      {activeTab === 'applicants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active Student Applications for {uni.nameEn}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Candidates currently assigned or applying to this university across all intakes
              </p>
            </div>
          </div>

          {applicants.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No candidate dossiers filed for this university yet
              </div>
              <p className="text-xs text-slate-500">
                Click "Apply Candidate" on any program to register a new student dossier.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    <tr>
                      <th className="px-4 py-3">Candidate ID & Name</th>
                      <th className="px-4 py-3">Passport No</th>
                      <th className="px-4 py-3">Program / Major</th>
                      <th className="px-4 py-3">Intake</th>
                      <th className="px-4 py-3">Visa Stage</th>
                      <th className="px-4 py-3">Admission Result</th>
                      <th className="px-4 py-3">Consultant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {applicants.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          <div>{app.fullName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{app.id}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {app.passportNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{app.major}</div>
                          <div className="text-[11px] text-slate-500">{app.degreeLevel}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {app.intakeTerm}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {app.visaStage?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              app.admissionResult === 'Accepted'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {app.admissionResult}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {app.consultantName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* ADMIN EDIT MODALS */}
      {/* ========================================================================= */}

      {/* Edit University Info Modal */}
      {showEditUniModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Edit University Requirements & Metadata
              </h3>
              <button
                type="button"
                onClick={() => setShowEditUniModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await updateUniversity(universityId, {
                    nameEn: form.nameEn.value,
                    nameKo: form.nameKo.value,
                    city: form.city.value,
                    ranking: form.ranking.value,
                    websiteUrl: form.websiteUrl.value,
                    topikRequirement: form.topikRequirement.value,
                    ieltsRequirement: form.ieltsRequirement.value,
                    bankBalanceUsd: Number(form.bankBalanceUsd.value),
                    notes: form.notes.value,
                  });
                  setShowEditUniModal(false);
                  loadData();
                  onRefreshParent?.();
                } catch (err: any) {
                  alert(err.message || 'Failed to update university');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">University Name (English)</label>
                  <input
                    name="nameEn"
                    defaultValue={uni.nameEn}
                    required
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Korean Hangul Name</label>
                  <input
                    name="nameKo"
                    defaultValue={uni.nameKo}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">City / Region</label>
                  <input
                    name="city"
                    defaultValue={uni.city}
                    required
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ranking / Tier</label>
                  <input
                    name="ranking"
                    defaultValue={uni.ranking}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">TOPIK Language Cutoff</label>
                  <input
                    name="topikRequirement"
                    defaultValue={uni.topikRequirement}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">English Track Requirement</label>
                  <input
                    name="ieltsRequirement"
                    defaultValue={uni.ieltsRequirement}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Bank Certificate Requirement ($ USD)</label>
                  <input
                    name="bankBalanceUsd"
                    type="number"
                    defaultValue={uni.bankBalanceUsd}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Official Admissions URL</label>
                  <input
                    name="websiteUrl"
                    type="url"
                    defaultValue={uni.websiteUrl}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Operational Notes / Special Protocols</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={uni.notes}
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditUniModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Program Modal */}
      {showProgramModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                {editingProgram ? 'Edit Academic / Language Program' : 'Add New Academic Program'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProgramModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const terms = form.intakeTerms.value
                  .split(',')
                  .map((t: string) => t.trim())
                  .filter(Boolean);

                try {
                  const payload = {
                    name: form.name.value,
                    code: form.code.value,
                    degreeLevel: form.degreeLevel.value,
                    duration: form.duration.value,
                    tuitionFeeKrw: Number(form.tuitionFeeKrw.value),
                    tuitionFeeUsd: Number(form.tuitionFeeUsd.value),
                    applicationFeeKrw: Number(form.applicationFeeKrw.value),
                    requirements: form.requirements.value,
                    languageOfInstruction: form.languageOfInstruction.value,
                    intakeTerms: terms,
                  };

                  if (editingProgram) {
                    await updateProgram(universityId, editingProgram.id, payload);
                  } else {
                    await createProgram(universityId, payload);
                  }
                  setShowProgramModal(false);
                  loadData();
                  onRefreshParent?.();
                } catch (err: any) {
                  alert(err.message || 'Failed to save program');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium mb-1">Program Name *</label>
                  <input
                    name="name"
                    defaultValue={editingProgram?.name || ''}
                    required
                    placeholder="e.g. Korean Language Regular Program (KLP)"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Code *</label>
                  <input
                    name="code"
                    defaultValue={editingProgram?.code || 'KLP'}
                    required
                    placeholder="e.g. KLP, KSU, BS-CS"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Degree Level & Visa Category *</label>
                  <input type="hidden" name="degreeLevel" value={modalDegreeLevel} />
                  <MorphSelect
                    value={modalDegreeLevel}
                    onValueChange={(v) => setModalDegreeLevel(v)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Degree Level" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Korean Language (D-4-1)">Korean Language (D-4-1)</MorphSelectItem>
                      <MorphSelectItem value="Bachelor (D-2-2)">Undergraduate / Bachelor (D-2-2)</MorphSelectItem>
                      <MorphSelectItem value="Master (D-2-3)">Graduate / Master (D-2-3)</MorphSelectItem>
                      <MorphSelectItem value="Doctorate (D-2-4)">Doctorate / PhD (D-2-4)</MorphSelectItem>
                      <MorphSelectItem value="Exchange (D-2-6)">Pathway / Exchange (D-2-6)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
                <div>
                  <label className="block font-medium mb-1">Duration *</label>
                  <input
                    name="duration"
                    defaultValue={editingProgram?.duration || '4 Years (8 Semesters)'}
                    required
                    placeholder="e.g. 4 Quarters (1 Year) or 4 Years"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tuition Fee (KRW) *</label>
                  <input
                    name="tuitionFeeKrw"
                    type="number"
                    defaultValue={editingProgram?.tuitionFeeKrw ?? 2500000}
                    required
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Approx USD Equivalent</label>
                  <input
                    name="tuitionFeeUsd"
                    type="number"
                    defaultValue={editingProgram?.tuitionFeeUsd ?? 1900}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Application Fee (KRW)</label>
                  <input
                    name="applicationFeeKrw"
                    type="number"
                    defaultValue={editingProgram?.applicationFeeKrw ?? 100000}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Language of Instruction</label>
                  <input type="hidden" name="languageOfInstruction" value={modalLanguage} />
                  <MorphSelect
                    value={modalLanguage}
                    onValueChange={(v) => setModalLanguage(v)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Language" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Korean">Korean</MorphSelectItem>
                      <MorphSelectItem value="English 100%">English 100%</MorphSelectItem>
                      <MorphSelectItem value="Bilingual (Korean + English)">Bilingual (Korean + English)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
                <div>
                  <label className="block font-medium mb-1">Intake Terms (comma separated)</label>
                  <input
                    name="intakeTerms"
                    defaultValue={editingProgram?.intakeTerms?.join(', ') || 'Spring 2027, Fall 2027'}
                    placeholder="Spring 2027, Fall 2027"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Requirements & Prerequisites *</label>
                <textarea
                  name="requirements"
                  rows={3}
                  required
                  defaultValue={
                    editingProgram?.requirements ||
                    'High school diploma or degree equivalent, apostilled transcripts, TOPIK Level 3 or IELTS 6.0.'
                  }
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  {editingProgram ? 'Update Program' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Refund Policy Modal */}
      {showEditRefundModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-600" />
                Configure University Refund Policy & Regulations
              </h3>
              <button
                type="button"
                onClick={() => setShowEditRefundModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await updateRefundPolicy(universityId, {
                    appFeeRefundable: form.appFeeRefundable.checked,
                    appFeeConditions: form.appFeeConditions.value,
                    tuitionRefundPolicy: form.tuitionRefundPolicy.value,
                    visaRejectionRefund: form.visaRejectionRefund.value,
                    deadlinesDescription: form.deadlinesDescription.value,
                    refundProcessingTime: form.refundProcessingTime.value,
                  });
                  setShowEditRefundModal(false);
                  loadData();
                  onRefreshParent?.();
                } catch (err: any) {
                  alert(err.message || 'Failed to update refund policy');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="appFeeRefundable"
                    name="appFeeRefundable"
                    defaultChecked={refundPolicy?.appFeeRefundable || false}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="appFeeRefundable" className="font-semibold text-slate-800 dark:text-slate-200">
                    Application fee is refundable under specific conditions
                  </label>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Application Fee Conditions</label>
                  <input
                    name="appFeeConditions"
                    defaultValue={
                      refundPolicy?.appFeeConditions ||
                      'Application fee is non-refundable once online portal submission is finalized.'
                    }
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Tuition Refund Tier Schedule (Standard Withdrawal) *
                </label>
                <textarea
                  name="tuitionRefundPolicy"
                  rows={4}
                  required
                  defaultValue={
                    refundPolicy?.tuitionRefundPolicy ||
                    '• Prior to semester start: 100% refund.\n• Within 30 days after start: 5/6 refund.\n• 31 to 60 days after start: 2/3 refund.\n• 61 to 90 days after start: 1/2 refund.\n• Beyond 90 days: Non-refundable.'
                  }
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Embassy Visa Denial 100% Refund Guarantee Terms *
                </label>
                <textarea
                  name="visaRejectionRefund"
                  rows={3}
                  required
                  defaultValue={
                    refundPolicy?.visaRejectionRefund ||
                    '100% tuition refund (minus nominal wire transfer banking charge) is granted upon submitting the official Korean Embassy / Consulate Visa Denial notice within 14 calendar days.'
                  }
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Notice Deadlines *</label>
                  <input
                    name="deadlinesDescription"
                    required
                    defaultValue={
                      refundPolicy?.deadlinesDescription ||
                      'Written withdrawal form required 7 days before semester commencement.'
                    }
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Wire Processing Timeline *</label>
                  <input
                    name="refundProcessingTime"
                    required
                    defaultValue={refundPolicy?.refundProcessingTime || '14 to 21 business days via international wire'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditRefundModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Save Refund Policy
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Bank Details Modal */}
      {showEditBankModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Configure Institutional Banking & Wire Instructions
              </h3>
              <button
                type="button"
                onClick={() => setShowEditBankModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await updateBankDetails(universityId, {
                    accountHolder: form.accountHolder.value,
                    bankName: form.bankName.value,
                    branchName: form.branchName.value,
                    accountNumber: form.accountNumber.value,
                    swiftCode: form.swiftCode.value,
                    currency: form.currency.value,
                    paymentInstructions: form.paymentInstructions.value,
                    isVirtualAccountSupported: form.isVirtualAccountSupported.checked,
                  });
                  setShowEditBankModal(false);
                  loadData();
                  onRefreshParent?.();
                } catch (err: any) {
                  alert(err.message || 'Failed to update bank details');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium mb-1">Account Holder (Beneficiary Name) *</label>
                <input
                  name="accountHolder"
                  required
                  defaultValue={bankDetails?.accountHolder || `${uni.nameEn} (Office of International Affairs)`}
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Bank Name *</label>
                  <input
                    name="bankName"
                    required
                    defaultValue={bankDetails?.bankName || 'Shinhan Bank (신한은행)'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Campus Branch Name *</label>
                  <input
                    name="branchName"
                    required
                    defaultValue={bankDetails?.branchName || 'Main Campus Branch'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Account / Virtual Account Format *</label>
                  <input
                    name="accountNumber"
                    required
                    defaultValue={bankDetails?.accountNumber || '140-002-881920 (Virtual)'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Bank SWIFT / BIC Code *</label>
                  <input
                    name="swiftCode"
                    required
                    defaultValue={bankDetails?.swiftCode || 'SHBKKRSE'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Remittance Currency</label>
                  <input type="hidden" name="currency" value={modalCurrency} />
                  <MorphSelect
                    value={modalCurrency}
                    onValueChange={(v) => setModalCurrency(v)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Currency" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="KRW">KRW (South Korean Won)</MorphSelectItem>
                      <MorphSelectItem value="USD">USD (US Dollar)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isVirtualAccountSupported"
                    name="isVirtualAccountSupported"
                    defaultChecked={bankDetails?.isVirtualAccountSupported !== false}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="isVirtualAccountSupported" className="font-semibold text-slate-700 dark:text-slate-300">
                    Virtual Account Supported
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Wire Transfer Remark & Instructions for Candidates *
                </label>
                <textarea
                  name="paymentInstructions"
                  rows={4}
                  required
                  defaultValue={
                    bankDetails?.paymentInstructions ||
                    '1. Remit in KRW (or USD equivalent using bank TT selling rate).\n2. Write student ID and name in wire remark.\n3. Sender pays all transfer charges (OUR mode).\n4. Email SWIFT MT103 confirmation within 24h.'
                  }
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditBankModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Save Banking Details
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Intake Modal */}
      {showIntakeModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                {editingIntake ? 'Edit Admission Intake Schedule' : 'Configure New University Admission Intake'}
              </h3>
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  const payload = {
                    universityId,
                    term: form.term.value,
                    academicYear: Number(form.academicYear.value),
                    applicationStart: form.applicationStart.value,
                    applicationDeadline: form.applicationDeadline.value,
                    quota: Number(form.quota.value),
                    status: form.status.value,
                    interviewDates: form.interviewDates.value,
                    resultAnnouncementDate: form.resultAnnouncementDate.value,
                    tuitionPaymentDeadline: form.tuitionPaymentDeadline.value,
                    documentDeadline: form.documentDeadline.value,
                    visaSubmissionDeadline: form.visaSubmissionDeadline.value,
                    classesStartDate: form.classesStartDate.value,
                  };

                  if (editingIntake) {
                    await updateIntake(editingIntake.id, payload);
                  } else {
                    await createIntake(payload);
                  }
                  setShowIntakeModal(false);
                  loadData();
                  onRefreshParent?.();
                } catch (err: any) {
                  alert(err.message || 'Failed to save intake schedule');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Intake Term *</label>
                  <input
                    name="term"
                    defaultValue={editingIntake?.term || 'Spring 2027'}
                    required
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Academic Year *</label>
                  <input
                    name="academicYear"
                    type="number"
                    defaultValue={editingIntake?.academicYear || 2027}
                    required
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Application Open Date *</label>
                  <input
                    name="applicationStart"
                    type="date"
                    required
                    defaultValue={editingIntake?.applicationStart || '2026-10-01'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Application Deadline *</label>
                  <input
                    name="applicationDeadline"
                    type="date"
                    required
                    defaultValue={editingIntake?.applicationDeadline || '2026-11-30'}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Document Deadline</label>
                  <input
                    name="documentDeadline"
                    defaultValue={editingIntake?.documentDeadline || 'Dec 5, 2026'}
                    placeholder="e.g. Dec 5, 2026"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Result Announcement Date</label>
                  <input
                    name="resultAnnouncementDate"
                    defaultValue={editingIntake?.resultAnnouncementDate || 'Jan 15, 2027'}
                    placeholder="e.g. Jan 15, 2027"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tuition Payment Deadline</label>
                  <input
                    name="tuitionPaymentDeadline"
                    defaultValue={editingIntake?.tuitionPaymentDeadline || 'Feb 1, 2027'}
                    placeholder="e.g. Feb 1, 2027"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Visa Submission Deadline</label>
                  <input
                    name="visaSubmissionDeadline"
                    defaultValue={editingIntake?.visaSubmissionDeadline || 'Feb 15, 2027'}
                    placeholder="e.g. Feb 15, 2027"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Classes Start Date</label>
                  <input
                    name="classesStartDate"
                    defaultValue={editingIntake?.classesStartDate || 'Mar 1, 2027'}
                    placeholder="e.g. Mar 1, 2027"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Target International Quota</label>
                  <input
                    name="quota"
                    type="number"
                    defaultValue={editingIntake?.quota || 35}
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Status</label>
                  <input type="hidden" name="status" value={modalIntakeStatus} />
                  <MorphSelect
                    value={modalIntakeStatus}
                    onValueChange={(v) => setModalIntakeStatus(v)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Status" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Open">Open</MorphSelectItem>
                      <MorphSelectItem value="Upcoming">Upcoming</MorphSelectItem>
                      <MorphSelectItem value="Closed">Closed</MorphSelectItem>
                      <MorphSelectItem value="Archived">Archived</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
                <div>
                  <label className="block font-medium mb-1">Interview / Screening Dates</label>
                  <input
                    name="interviewDates"
                    defaultValue={editingIntake?.interviewDates || '2026-12-10 ~ 2026-12-20'}
                    placeholder="e.g. 2026-12-10 ~ 2026-12-20"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  {editingIntake ? 'Save Changes' : 'Create Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Document Modal */}
      {showAddDocModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto p-6 space-y-4 animate-modal-card">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Attach University Circular / Admission Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  await createUniversityDocument(universityId, {
                    title: form.title.value,
                    category: form.category.value,
                    fileUrl: form.fileUrl.value,
                    fileSize: form.fileSize.value,
                    intakeTerm: form.intakeTerm.value,
                  });
                  setShowAddDocModal(false);
                  loadData();
                  onRefreshParent?.();
                } catch (err: any) {
                  alert(err.message || 'Failed to attach document');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium mb-1">Document Title *</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Official Spring 2027 Admissions Guide"
                  className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Document Category</label>
                  <input type="hidden" name="category" value={modalDocCategory} />
                  <MorphSelect
                    value={modalDocCategory}
                    onValueChange={(v) => setModalDocCategory(v)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Category" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Admission Guidelines">Admission Guidelines</MorphSelectItem>
                      <MorphSelectItem value="Circular">Circular</MorphSelectItem>
                      <MorphSelectItem value="Visa & Immigration">Visa & Immigration</MorphSelectItem>
                      <MorphSelectItem value="Tuition & Bank">Tuition & Bank</MorphSelectItem>
                      <MorphSelectItem value="Application Form">Application Form</MorphSelectItem>
                      <MorphSelectItem value="Syllabus">Syllabus</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
                <div>
                  <label className="block font-medium mb-1">Intake Term</label>
                  <input
                    name="intakeTerm"
                    defaultValue="Spring 2027"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Download / Portal Link *</label>
                  <input
                    name="fileUrl"
                    type="url"
                    required
                    defaultValue="https://en.snu.ac.kr/admission"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">File Size</label>
                  <input
                    name="fileSize"
                    defaultValue="2.4 MB"
                    className="w-full rounded border px-3 py-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Attach Document
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
