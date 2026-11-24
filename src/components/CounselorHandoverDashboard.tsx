import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PackageCheck,
  ClipboardList,
  ChevronRight,
  Flag,
  Send,
  X,
} from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import {
  DocumentHandover,
  DocumentRequest,
  HandoverContextData,
  HandoverStats,
  UserProfile,
} from '../types/pms';
import { fetchDocumentRequests, fetchHandovers } from '../services/pmsService';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { TabTransition, MotionButton } from './animations';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';

export type CounselorTab =
  | 'requests'
  | 'my'
  | 'pending_confirmations'
  | 'disputed'
  | 'received';

interface CounselorHandoverDashboardProps {
  currentUser: UserProfile;
  stats: HandoverStats | null;
  contextData: HandoverContextData | null;
  refreshTrigger: number;
  initialTab?: CounselorTab;
  onRefreshAll: () => void;
  onOpenCreateHandover: (linkedRequest?: DocumentRequest | null) => void;
  onOpenHandoverDetail: (handoverId: string) => void;
  onOpenFollowUp: (handover: DocumentHandover) => void;
  onOpenRequestDetail: (requestId: string) => void;
  onNotifyToast: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'overdue'
  ) => void;
}

export const CounselorHandoverDashboard: React.FC<CounselorHandoverDashboardProps> = ({
  currentUser,
  stats,
  contextData,
  refreshTrigger,
  initialTab = 'my',
  onRefreshAll,
  onOpenCreateHandover,
  onOpenHandoverDetail,
  onOpenFollowUp,
  onOpenRequestDetail,
  onNotifyToast,
}) => {
  const [activeTab, setActiveTab] = useState<CounselorTab>(initialTab);
  const [handovers, setHandovers] = useState<DocumentHandover[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [admissionFilter, setAdmissionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');

  const onNotifyToastRef = useRef(onNotifyToast);
  onNotifyToastRef.current = onNotifyToast;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const list = await fetchDocumentRequests({
          scope: 'assigned_to_me',
          search: searchTerm,
          requesterId: admissionFilter,
          status: statusFilter,
          priority: priorityFilter,
          dateFrom,
        });
        setRequests(list);
      } else {
        const list = await fetchHandovers({
          viewMode: activeTab,
          search: searchTerm,
          receiverId: admissionFilter,
          status: statusFilter,
          dateFrom,
        });
        setHandovers(list);
      }
    } catch (err: any) {
      onNotifyToastRef.current(
        'Counselor Ledger Error',
        err?.message || 'Failed to load counselor handover records',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    searchTerm,
    admissionFilter,
    statusFilter,
    priorityFilter,
    dateFrom,
  ]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData, refreshTrigger]);

  const handleTabChange = (tab: CounselorTab) => {
    setActiveTab(tab);
    setStatusFilter('All');
    setPriorityFilter('All');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setAdmissionFilter('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setDateFrom('');
  };

  const getHandoverStatusClass = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'text-[#16A34A] dark:text-[#34C26B]';
      case 'Partially Received':
        return 'text-[#D97706] dark:text-[#F0A030]';
      case 'Disputed':
        return 'text-[#DC2626] dark:text-[#EF5350]';
      case 'Follow-up Delivered':
        return 'text-[#1E40AF] dark:text-[#4C8DF6]';
      default:
        return 'text-slate-600 dark:text-[#9A9AA2]';
    }
  };

  const renderHandoverStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#34C26B] shrink-0" />;
      case 'Partially Received':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F0A030] shrink-0" />;
      case 'Disputed':
        return <XCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#EF5350] shrink-0" />;
      case 'Follow-up Delivered':
        return <PackageCheck className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-[#9A9AA2] shrink-0" />;
    }
  };

  const getRequestStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-[#16A34A] dark:text-[#34C26B]';
      case 'Partially Fulfilled':
        return 'text-[#D97706] dark:text-[#F0A030]';
      case 'Disputed':
        return 'text-[#DC2626] dark:text-[#EF5350]';
      case 'Handover Submitted':
      case 'In Verification':
        return 'text-[#1E40AF] dark:text-[#4C8DF6]';
      case 'Cancelled':
        return 'text-slate-400 dark:text-[#66666E]';
      default:
        return 'text-[#1E3A8A] dark:text-[#ECECEE]';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'text-[#DC2626] dark:text-[#EF5350]';
      case 'High':
        return 'text-[#D97706] dark:text-[#F0A030]';
      case 'Normal':
        return 'text-[#1E40AF] dark:text-[#ECECEE]';
      default:
        return 'text-slate-500 dark:text-[#9A9AA2]';
    }
  };

  const tabs: Array<{ id: CounselorTab; label: string; count?: number }> = [
    {
      id: 'my',
      label: 'My Handovers',
      count: stats?.myTotalHandovers ?? 0,
    },
    {
      id: 'pending_confirmations',
      label: 'Pending Confirmations',
      count: stats?.pendingConfirmationsMyHandovers ?? 0,
    },
    {
      id: 'requests',
      label: 'Requests from Admission',
      count: stats?.actionNeededRequestsAssignedToMe ?? 0,
    },
    {
      id: 'disputed',
      label: 'Partial / Disputed',
      count: stats?.myNeedsFollowUp ?? 0,
    },
    {
      id: 'received',
      label: 'Accepted Archive',
      count: stats?.myAcceptedHandovers ?? 0,
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm || admissionFilter || statusFilter !== 'All' || priorityFilter !== 'All' || dateFrom
  );

  return (
    <div className="space-y-2.5">
      {/* Header Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#EFF6FF] dark:bg-[#252528] border border-[#1E40AF]/40 dark:border-[#2E2E32] flex items-center justify-center text-[#1E3A8A] dark:text-[#ECECEE] shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-[#0F172A] dark:text-[#ECECEE]">
              Counselor Document Handover Workspace
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
              {currentUser.name} · Submit physical student records to Admission Team · Fulfill incoming document requests · Ledger Tab{' '}
              <span className="tabular-nums text-[#0F172A] dark:text-[#ECECEE]">HND_{currentUser.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MotionButton
            type="button"
            disabled={loading}
            onClick={() => {
              onRefreshAll();
              loadTabData();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Spinner size="sm" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-[#1E40AF]" />
            )}
            Refresh
          </MotionButton>

          <MotionButton
            type="button"
            onClick={() => onOpenCreateHandover(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Document Handover
          </MotionButton>
        </div>
      </div>

      {/* Counselor KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <MotionButton
          type="button"
          onClick={() => handleTabChange('requests')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#3A3A3F] rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] uppercase flex items-center justify-between">
            <span>Admission Requests</span>
            <ClipboardList className="w-3.5 h-3.5 text-[#1E3A8A]" />
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.openRequestsAssignedToMe ?? 0) === 0 ? 'text-slate-400 dark:text-[#66666E]' : 'text-[#1E3A8A] dark:text-[#ECECEE]'}`}>
            {stats?.openRequestsAssignedToMe ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2] tabular-nums">
            {stats?.totalRequestsAssignedToMe ?? 0} assigned total
          </div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('pending_confirmations')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#3A3A3F] rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] uppercase">
            Pending Confirmations
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.pendingConfirmationsMyHandovers ?? 0) === 0 ? 'text-slate-400 dark:text-[#66666E]' : 'text-[#1E40AF] dark:text-[#ECECEE]'}`}>
            {stats?.pendingConfirmationsMyHandovers ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2]">Awaiting Admission sign-off</div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('disputed')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#D97706] dark:hover:border-[#F0A030]/60 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] uppercase">
            Needs Follow-Up
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.myNeedsFollowUp ?? 0) === 0 ? 'text-slate-400 dark:text-[#66666E]' : 'text-[#D97706] dark:text-[#F0A030]'}`}>
            {stats?.myNeedsFollowUp ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2]">Partial or disputed batches</div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('received')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#16A34A] dark:hover:border-[#34C26B]/60 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] uppercase">
            Accepted in Custody
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.myAcceptedHandovers ?? 0) === 0 ? 'text-slate-400 dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}`}>
            {stats?.myAcceptedHandovers ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2]">Verified physical receipts</div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('my')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#3A3A3F] rounded-lg p-3.5 col-span-2 lg:col-span-1 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] uppercase">
            My Total Handovers
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.myTotalHandovers ?? 0) === 0 ? 'text-slate-400 dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
            {stats?.myTotalHandovers ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-[#9A9AA2]">Submitted across all terms</div>
        </MotionButton>
      </div>

      {/* Role Segmented Navigation */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-2">
        <RoundedSlidingTabs
          variant="cards"
          value={activeTab}
          stretch={0}
          blur={10}
          label="Counselor handover sections"
          onValueChange={(id) => handleTabChange(id as CounselorTab)}
          className="flex-wrap gap-1.5 pb-0 pt-0 overflow-visible"
          indicatorClassName="rounded-md bg-[#1E3A8A] dark:bg-[rgba(76,141,246,0.14)] dark:border dark:border-[#4C8DF6]/40 shadow-xs dark:shadow-none"
          buttonClassName="px-3 h-[30px] rounded-md text-xs font-semibold"
          activeButtonClassName="text-white dark:text-[#4C8DF6]"
          inactiveButtonClassName="border-transparent bg-transparent text-[#0F172A] dark:text-[#9A9AA2] hover:bg-[#EFF6FF]/60 dark:hover:bg-[#252528] dark:hover:text-[#ECECEE]"
          tabs={tabs.map((tab) => {
            const active = activeTab === tab.id;
            return {
              id: tab.id,
              label: tab.label,
              trailing: (
                <span
                  className={`tabular-nums text-[11px] ${
                    active
                      ? 'text-[#EFF6FF] dark:text-[#4C8DF6]'
                      : (tab.count ?? 0) === 0
                      ? 'text-slate-400 dark:text-[#66666E]'
                      : 'text-slate-400 dark:text-[#9A9AA2]'
                  }`}
                >
                  ({tab.count ?? 0})
                </span>
              ),
            };
          })}
        />
      </div>

      {/* Content Area with smooth tab transition */}
      <TabTransition viewKey={activeTab} className="space-y-3.5">
        {/* Search & Multi-Facet Filter Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        <div className="md:col-span-4 relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'requests'
                ? 'Search Request ID, student, passport, requester, or document...'
                : 'Search Handover ID, Request ID, student, passport, or doc...'
            }
            className="w-full pl-8 pr-8 h-9 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#64748B] dark:placeholder:text-[#66666E] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none transition-colors"
          />
          {searchTerm && (
            <MotionButton
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear handover search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:text-[#9A9AA2] dark:hover:text-[#ECECEE] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </MotionButton>
          )}
        </div>

        <div className="md:col-span-2">
          <MorphSelect value={admissionFilter} onValueChange={(v) => setAdmissionFilter(v)}>
            <MorphSelectTrigger>
              <MorphSelectValue placeholder="All Admission Officers" />
            </MorphSelectTrigger>
            <MorphSelectContent>
              <MorphSelectItem value="">All Admission Officers</MorphSelectItem>
              {(contextData?.admissionTeam || []).map((emp) => (
                <MorphSelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </MorphSelectItem>
              ))}
            </MorphSelectContent>
          </MorphSelect>
        </div>

        {activeTab === 'requests' && (
          <div className="md:col-span-2">
            <MorphSelect value={priorityFilter} onValueChange={(v) => setPriorityFilter(v)}>
              <MorphSelectTrigger>
                <MorphSelectValue placeholder="All Priorities" />
              </MorphSelectTrigger>
              <MorphSelectContent>
                <MorphSelectItem value="All">All Priorities</MorphSelectItem>
                <MorphSelectItem value="Urgent">Urgent</MorphSelectItem>
                <MorphSelectItem value="High">High</MorphSelectItem>
                <MorphSelectItem value="Normal">Normal</MorphSelectItem>
                <MorphSelectItem value="Low">Low</MorphSelectItem>
              </MorphSelectContent>
            </MorphSelect>
          </div>
        )}

        <div className={activeTab === 'requests' ? 'md:col-span-2' : 'md:col-span-4'}>
          <MorphSelect value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <MorphSelectTrigger>
              <MorphSelectValue placeholder="All Statuses" />
            </MorphSelectTrigger>
            <MorphSelectContent>
              <MorphSelectItem value="All">All Statuses</MorphSelectItem>
              {activeTab === 'requests' ? (
                <>
                  <MorphSelectItem value="Open">Open</MorphSelectItem>
                  <MorphSelectItem value="Handover Submitted">Handover Submitted</MorphSelectItem>
                  <MorphSelectItem value="In Verification">In Verification</MorphSelectItem>
                  <MorphSelectItem value="Partially Fulfilled">Partially Fulfilled</MorphSelectItem>
                  <MorphSelectItem value="Disputed">Disputed</MorphSelectItem>
                  <MorphSelectItem value="Completed">Completed</MorphSelectItem>
                  <MorphSelectItem value="Cancelled">Cancelled</MorphSelectItem>
                </>
              ) : (
                <>
                  <MorphSelectItem value="Pending Receipt">Pending Receipt</MorphSelectItem>
                  <MorphSelectItem value="Partially Received">Partially Received</MorphSelectItem>
                  <MorphSelectItem value="Disputed">Disputed</MorphSelectItem>
                  <MorphSelectItem value="Follow-up Delivered">Follow-up Delivered</MorphSelectItem>
                  <MorphSelectItem value="Accepted">Accepted</MorphSelectItem>
                </>
              )}
            </MorphSelectContent>
          </MorphSelect>
        </div>

        <div className="md:col-span-2 flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title={activeTab === 'requests' ? 'Deadline / Created From' : 'Handover Date From'}
            className="w-full px-2 h-[28px] text-[11px] rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] tabular-nums focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
          />
          {hasActiveFilters && (
            <MotionButton
              type="button"
              onClick={resetFilters}
              className="px-2 py-1.5 text-[11px] font-semibold text-[#1E40AF] dark:text-[#4C8DF6] hover:text-[#1E3A8A] dark:hover:text-[#6BA1F8] transition-colors"
            >
              Reset
            </MotionButton>
          )}
        </div>
      </div>

      {/* Main Content Table */}
      {activeTab === 'requests' ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-x-auto">
          <table className="w-full min-w-[1140px] table-fixed text-left text-xs">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Student Dossier</th>
                <th className="px-4 py-3">Required Physical Documents</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Priority & Deadline</th>
                <th className="px-4 py-3">Status & Linked Handover</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-[#9A9AA2]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <Spinner size="md" aria-label="Loading document requests" />
                      <span>Loading document requests from Admission Team...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      No document requests assigned to you
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#9A9AA2] max-w-md mx-auto">
                      When Admission Team officers request original or apostilled student documents from you, they appear here for fulfillment.
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const canFulfill = req.status === 'Open' && !req.linkedHandoverId;
                  const needsFollowUp =
                    !!req.linkedHandoverId &&
                    (req.status === 'Partially Fulfilled' || req.status === 'Disputed');

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528] transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <MotionButton
                          type="button"
                          onClick={() => onOpenRequestDetail(req.id)}
                          className="tabular-nums font-bold text-[#1E40AF] dark:text-[#4C8DF6] hover:underline text-left"
                        >
                          {req.id}
                        </MotionButton>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {req.studentName}
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-500 dark:text-[#9A9AA2] truncate">
                          {req.studentPassport} · {req.universityName || req.intakeTerm}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {req.requiredDocuments.map((d) => d.documentName).join(', ')}
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-500 dark:text-[#9A9AA2] mt-0.5 truncate">
                          {req.requiredDocuments.length} requested item(s)
                          {req.remarks ? ` · "${req.remarks}"` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {req.requestedByName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] tabular-nums">Admission Team</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className={`font-semibold flex items-center gap-1 ${getPriorityClass(req.priority)}`}>
                          <Flag className="w-3 h-3 shrink-0" />
                          <span>{req.priority}</span>
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                          Due {req.deadline}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className={`font-semibold ${getRequestStatusClass(req.status)}`}>
                          {req.status}
                        </div>
                        {req.linkedHandoverId ? (
                          <MotionButton
                            type="button"
                            onClick={() => onOpenHandoverDetail(req.linkedHandoverId!)}
                            className="mt-0.5 text-[11px] tabular-nums font-semibold text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
                          >
                            {req.linkedHandoverId} ({req.linkedHandoverStatus})
                          </MotionButton>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-slate-400 dark:text-[#66666E]">Awaiting submission</div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canFulfill && (
                            <MotionButton
                              type="button"
                              onClick={() => onOpenCreateHandover(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-md transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              Submit Docs
                            </MotionButton>
                          )}
                          {needsFollowUp && req.linkedHandoverId && (
                            <MotionButton
                              type="button"
                              onClick={() => onOpenHandoverDetail(req.linkedHandoverId!)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#D97706] dark:bg-[#F0A030] hover:opacity-90 rounded-md transition-colors"
                            >
                              Deliver Missing
                            </MotionButton>
                          )}
                          <MotionButton
                            type="button"
                            onClick={() => onOpenRequestDetail(req.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </MotionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-x-auto">
          <table className="w-full min-w-[1140px] table-fixed text-left text-xs">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-slate-500 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
              <tr>
                <th className="px-4 py-3">Handover ID</th>
                <th className="px-4 py-3">Student Dossier</th>
                <th className="px-4 py-3">Documents Breakdown</th>
                <th className="px-4 py-3">Receiving Admission Officer</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Status & Sheets</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
              {loading && handovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-[#9A9AA2]">
                    <div className="inline-flex items-center justify-center gap-2">
                      <Spinner size="md" aria-label="Loading document handovers" />
                      <span>Loading your document handovers...</span>
                    </div>
                  </td>
                </tr>
              ) : handovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      No document handovers in this view
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#9A9AA2] max-w-md mx-auto">
                      Click "Create Document Handover" above when handing physical student documents to an Admission Team officer, or fulfill an incoming request from the "Requests from Admission" tab.
                    </p>
                  </td>
                </tr>
              ) : (
                handovers.map((h) => {
                  const recCount = h.documents.filter((d) => d.status === 'Received').length;
                  const missCount = h.documents.filter((d) => d.status === 'Missing').length;
                  const defCount = h.documents.filter(
                    (d) => d.status === 'Incorrect' || d.status === 'Rejected'
                  ).length;
                  const canFollowUp =
                    h.status === 'Partially Received' || h.status === 'Disputed';

                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528] transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <MotionButton
                          type="button"
                          onClick={() => onOpenHandoverDetail(h.id)}
                          className="tabular-nums font-bold text-[#1E40AF] dark:text-[#4C8DF6] hover:underline text-left"
                        >
                          {h.id}
                        </MotionButton>
                        <div className="text-[10px] tabular-nums text-slate-400 dark:text-[#9A9AA2] mt-0.5">
                          v{h.version}
                          {h.packageSealNumber ? ` · ${h.packageSealNumber}` : ''}
                        </div>
                        {h.requestId && (
                          <MotionButton
                            type="button"
                            onClick={() => onOpenRequestDetail(h.requestId!)}
                            className="mt-0.5 block text-[10px] tabular-nums font-semibold text-[#1E3A8A] dark:text-[#4C8DF6] hover:underline"
                          >
                            Req: {h.requestId}
                          </MotionButton>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {h.studentName}
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-500 dark:text-[#9A9AA2] truncate">
                          {h.studentPassport} · {h.universityName || h.intakeTerm}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {h.documents.map((d) => d.documentName).join(', ')}
                        </div>
                        <div className="text-[11px] tabular-nums text-slate-500 dark:text-[#9A9AA2] mt-0.5 truncate">
                          {recCount}/{h.totalDocuments} Received
                          {missCount > 0 ? ` · ${missCount} Missing` : ''}
                          {defCount > 0 ? ` · ${defCount} Defective` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                          {h.receivingEmployeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] tabular-nums truncate">
                          {h.lastAcknowledgedAt ? `Verified by ${h.lastAcknowledgedByName}` : 'Pending inspection'}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top tabular-nums text-[11px] text-slate-600 dark:text-[#9A9AA2]">
                        <div>{h.handoverDate}</div>
                        <div>{h.handoverTime}</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className={`flex items-center gap-1.5 font-semibold ${getHandoverStatusClass(h.status)}`}>
                          {renderHandoverStatusIcon(h.status)}
                          <span>{h.status}</span>
                        </div>
                        <div className="text-[10px] tabular-nums text-slate-400 dark:text-[#66666E] mt-1">
                          Tabs: C:{h.counselorSheetSyncStatus[0]} · R:{h.receiverSheetSyncStatus[0]} · M:{h.masterSheetSyncStatus[0]}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canFollowUp && (
                            <MotionButton
                              type="button"
                              onClick={() => onOpenFollowUp(h)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#D97706] dark:bg-[#F0A030] hover:opacity-90 rounded-md transition-colors"
                            >
                              Deliver Missing
                            </MotionButton>
                          )}
                          <MotionButton
                            type="button"
                            onClick={() => onOpenHandoverDetail(h.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors"
                          >
                            <span>Manifest</span>
                            <ChevronRight className="w-3 h-3" />
                          </MotionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </TabTransition>
    </div>
  );
};
