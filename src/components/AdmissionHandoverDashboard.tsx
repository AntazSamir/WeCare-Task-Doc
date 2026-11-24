import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PackageCheck,
  FileSpreadsheet,
  ChevronRight,
  RotateCcw,
  Flag,
  ClipboardList,
  X,
} from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import {
  DocumentHandover,
  DocumentRequest,
  HandoverContextData,
  HandoverStats,
  SheetsOutboxJob,
  SyncedTabRowPreview,
  UserProfile,
} from '../types/pms';
import {
  fetchDocumentRequests,
  fetchHandovers,
  fetchSheetsOutbox,
  retryAllFailedOutboxApi,
  retryOutboxJobApi,
} from '../services/pmsService';
import { formatTimestamp } from '../utils/dateUtils';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { TabTransition, MotionButton } from './animations';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';

export type AdmissionTab =
  | 'pending'
  | 'my-requests'
  | 'received'
  | 'disputed'
  | 'all'
  | 'outbox';

interface AdmissionHandoverDashboardProps {
  currentUser: UserProfile;
  stats: HandoverStats | null;
  contextData: HandoverContextData | null;
  refreshTrigger: number;
  initialTab?: AdmissionTab;
  onRefreshAll: () => void;
  onOpenCreateRequest: () => void;
  onOpenVerify: (handover: DocumentHandover) => void;
  onOpenHandoverDetail: (handoverId: string) => void;
  onOpenRequestDetail: (requestId: string) => void;
  onNotifyToast: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'overdue'
  ) => void;
}

export const AdmissionHandoverDashboard: React.FC<AdmissionHandoverDashboardProps> = ({
  currentUser,
  stats,
  contextData,
  refreshTrigger,
  initialTab = 'pending',
  onRefreshAll,
  onOpenCreateRequest,
  onOpenVerify,
  onOpenHandoverDetail,
  onOpenRequestDetail,
  onNotifyToast,
}) => {
  const isAdmin = currentUser.role === 'Admission_Manager';
  const [activeTab, setActiveTab] = useState<AdmissionTab>(initialTab);
  const [handovers, setHandovers] = useState<DocumentHandover[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('');
  const [receiverFilter, setReceiverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');

  // Admin Outbox State
  const [outboxJobs, setOutboxJobs] = useState<SheetsOutboxJob[]>([]);
  const [syncedTabRows, setSyncedTabRows] = useState<SyncedTabRowPreview[]>([]);
  const [outboxStatusFilter, setOutboxStatusFilter] = useState('all');
  const [isRetryingOutbox, setIsRetryingOutbox] = useState(false);

  const onNotifyToastRef = useRef(onNotifyToast);
  onNotifyToastRef.current = onNotifyToast;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isAdmin && (activeTab === 'all' || activeTab === 'outbox')) {
      setActiveTab('pending');
    }
  }, [isAdmin, activeTab]);

  const loadTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'outbox' && isAdmin) {
        const ob = await fetchSheetsOutbox(outboxStatusFilter);
        setOutboxJobs(ob.jobs);
        setSyncedTabRows(ob.syncedTabRows);
      } else if (activeTab === 'my-requests') {
        const list = await fetchDocumentRequests({
          scope: isAdmin ? 'all' : 'my_requests',
          search: searchTerm,
          counselorId: counselorFilter,
          requesterId: receiverFilter,
          status: statusFilter,
          priority: priorityFilter,
          dateFrom,
        });
        setRequests(list);
      } else {
        const list = await fetchHandovers({
          viewMode: activeTab === 'outbox' ? 'all' : activeTab,
          search: searchTerm,
          counselorId: counselorFilter,
          receiverId: receiverFilter,
          status: statusFilter,
          dateFrom,
        });
        setHandovers(list);
      }
    } catch (err: any) {
      onNotifyToastRef.current(
        'Admission Ledger Error',
        err?.message || 'Failed to load admission custody records',
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    isAdmin,
    outboxStatusFilter,
    searchTerm,
    counselorFilter,
    receiverFilter,
    statusFilter,
    priorityFilter,
    dateFrom,
  ]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData, refreshTrigger]);

  const handleTabChange = (tab: AdmissionTab) => {
    setActiveTab(tab);
    setStatusFilter('All');
    setPriorityFilter('All');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCounselorFilter('');
    setReceiverFilter('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setDateFrom('');
  };

  const canUserVerifyHandover = (h: DocumentHandover): boolean => {
    if (h.status === 'Accepted') return false;
    if (h.counselorId === currentUser.id) return false;
    const isAssignedAdmission =
      h.receivingEmployeeId === currentUser.id && currentUser.team === 'Admission Team';
    return isAssignedAdmission || isAdmin;
  };

  const handleRetrySingleJob = async (jobId: number) => {
    setIsRetryingOutbox(true);
    try {
      await retryOutboxJobApi(jobId);
      onNotifyToast('Sync Retried', `Outbox job #${jobId} re-processed.`, 'success');
      onRefreshAll();
      await loadTabData();
    } catch (err: any) {
      onNotifyToast('Retry Failed', err?.message || 'Could not retry job', 'warning');
    } finally {
      setIsRetryingOutbox(false);
    }
  };

  const handleRetryAllFailed = async () => {
    setIsRetryingOutbox(true);
    try {
      const res = await retryAllFailedOutboxApi();
      onNotifyToast('Outbox Batch Retry', `Re-queued ${res.requeued} failed job(s).`, 'success');
      onRefreshAll();
      await loadTabData();
    } catch (err: any) {
      onNotifyToast('Batch Retry Failed', err?.message || 'Could not retry failed jobs', 'warning');
    } finally {
      setIsRetryingOutbox(false);
    }
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
        return 'text-[#0F172A]/75 dark:text-[#9A9AA2]';
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
        return <Clock className="w-3.5 h-3.5 text-[#0F172A]/60 dark:text-[#9A9AA2] shrink-0" />;
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
        return 'text-[#0F172A]/45 dark:text-[#66666E]';
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
        return 'text-[#0F172A]/60 dark:text-[#9A9AA2]';
    }
  };

  const tabs: Array<{ id: AdmissionTab; label: string; count?: number; visible: boolean }> = [
    {
      id: 'pending',
      label: 'Pending Receipts',
      count: stats?.myPendingVerifications ?? 0,
      visible: true,
    },
    {
      id: 'my-requests',
      label: isAdmin ? 'Document Requests' : 'My Requests',
      count: stats?.myOpenAdmissionRequests ?? 0,
      visible: true,
    },
    {
      id: 'received',
      label: 'Received Documents',
      count: stats?.accepted ?? 0,
      visible: true,
    },
    {
      id: 'disputed',
      label: 'Disputed / Incomplete',
      count: (stats?.partiallyReceived ?? 0) + (stats?.disputed ?? 0),
      visible: true,
    },
    {
      id: 'all',
      label: 'All Handover History',
      count: stats?.total ?? 0,
      visible: isAdmin,
    },
    {
      id: 'outbox',
      label: 'Sheets Outbox & Tabs',
      count: stats?.outbox?.failed ? stats.outbox.failed : undefined,
      visible: isAdmin,
    },
  ];

  const hasActiveFilters = Boolean(
    searchTerm ||
      counselorFilter ||
      receiverFilter ||
      statusFilter !== 'All' ||
      priorityFilter !== 'All' ||
      dateFrom
  );

  return (
    <div className="space-y-2.5">
      {/* Header Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#EFF6FF] dark:bg-[#252528] border border-[#1E40AF]/40 dark:border-[#2E2E32] flex items-center justify-center text-[#1E3A8A] dark:text-[#ECECEE] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-[#0F172A] dark:text-[#ECECEE]">
              Admission Verification & Document Sourcing Console
            </h1>
            <p className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2] mt-0.5">
              {currentUser.name} ({isAdmin ? 'Admin & Admission Manager' : 'Admission Team'}) · Inspect physical documents per item · Request required dossiers from Counselors · Tab{' '}
              <span className="tabular-nums text-[#1E3A8A] dark:text-[#ECECEE] font-semibold">HND_{currentUser.id}</span>
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF]/60 dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors disabled:opacity-60"
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
            onClick={onOpenCreateRequest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Request Documents from Counselor
          </MotionButton>
        </div>
      </div>

      {/* Admission KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <MotionButton
          type="button"
          onClick={() => handleTabChange('pending')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#D97706] dark:hover:border-[#F0A030]/60 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">
            Pending Receipts
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.myPendingVerifications ?? 0) === 0 ? 'text-[#0F172A]/40 dark:text-[#66666E]' : 'text-[#D97706] dark:text-[#F0A030]'}`}>
            {stats?.myPendingVerifications ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2]">Awaiting physical inspection</div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('my-requests')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#1E40AF] dark:hover:border-[#3A3A3F] rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase flex items-center justify-between">
            <span>Active Requests</span>
            <ClipboardList className="w-3.5 h-3.5 text-[#1E40AF]" />
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.myOpenAdmissionRequests ?? 0) === 0 ? 'text-[#0F172A]/40 dark:text-[#66666E]' : 'text-[#1E40AF] dark:text-[#ECECEE]'}`}>
            {stats?.myOpenAdmissionRequests ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2] tabular-nums">
            {stats?.myCompletedAdmissionRequests ?? 0} completed · {stats?.myTotalAdmissionRequests ?? 0} total
          </div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('received')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#16A34A] dark:hover:border-[#34C26B]/60 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">
            Received Documents
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${(stats?.accepted ?? 0) === 0 ? 'text-[#0F172A]/40 dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}`}>
            {stats?.accepted ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2]">Confirmed in Admission custody</div>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => handleTabChange('disputed')}
          className="text-left bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#DC2626] dark:hover:border-[#EF5350]/60 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase">
            Disputed / Incomplete
          </div>
          <div className={`mt-1 text-2xl tabular-nums font-bold ${((stats?.partiallyReceived ?? 0) + (stats?.disputed ?? 0)) === 0 ? 'text-[#0F172A]/40 dark:text-[#66666E]' : 'text-[#DC2626] dark:text-[#EF5350]'}`}>
            {(stats?.partiallyReceived ?? 0) + (stats?.disputed ?? 0)}
          </div>
          <div className="mt-0.5 text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2]">Open missing or disputed</div>
        </MotionButton>

        <div
          onClick={() => isAdmin && handleTabChange('outbox')}
          className={`bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 col-span-2 lg:col-span-1 ${
            isAdmin ? 'cursor-pointer hover:border-[#16A34A] dark:hover:border-[#3A3A3F] transition-colors' : ''
          }`}
        >
          <div className="text-[11px] font-semibold text-[#0F172A]/60 dark:text-[#9A9AA2] uppercase flex items-center justify-between">
            <span>Sheets Outbox</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
          </div>
          <div className="mt-1 text-xs tabular-nums space-y-0.5">
            <div className={`font-semibold ${(stats?.outbox?.synced ?? 0) === 0 ? 'text-[#0F172A]/40 dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}`}>
              Synced Jobs: {stats?.outbox?.synced ?? 0}
            </div>
            <div className={stats?.outbox?.failed ? 'text-[#DC2626] dark:text-[#EF5350] font-bold' : 'text-[#0F172A]/60 dark:text-[#9A9AA2]'}>
              Queued: {stats?.outbox?.pending ?? 0} · Failed: {stats?.outbox?.failed ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Role Segmented Navigation */}
      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-2">
        <RoundedSlidingTabs
          variant="cards"
          value={activeTab}
          stretch={0}
          blur={10}
          label="Admission handover sections"
          onValueChange={(id) => handleTabChange(id as AdmissionTab)}
          className="flex-wrap gap-1.5 pb-0 pt-0 overflow-visible"
          indicatorClassName="rounded-md bg-[#1E3A8A] dark:bg-[rgba(76,141,246,0.14)] dark:border dark:border-[#4C8DF6]/40 shadow-xs dark:shadow-none"
          buttonClassName="px-3 h-[30px] rounded-md text-xs font-semibold"
          activeButtonClassName="text-white dark:text-[#4C8DF6]"
          inactiveButtonClassName="border-transparent bg-transparent text-[#0F172A]/75 dark:text-[#9A9AA2] hover:bg-[#EFF6FF]/60 hover:text-[#1E3A8A] dark:hover:bg-[#252528] dark:hover:text-[#ECECEE]"
          tabs={tabs
            .filter((t) => t.visible)
            .map((tab) => {
              const active = activeTab === tab.id;
              return {
                id: tab.id,
                label: tab.label,
                trailing:
                  tab.count !== undefined ? (
                    <span
                      className={`tabular-nums text-[11px] ${
                        active
                          ? 'text-[#EFF6FF] dark:text-[#4C8DF6]'
                          : tab.count === 0
                          ? 'text-[#0F172A]/40 dark:text-[#66666E]'
                          : 'text-[#0F172A]/50 dark:text-[#9A9AA2]'
                      }`}
                    >
                      ({tab.count})
                    </span>
                  ) : undefined,
              };
            })}
        />
      </div>

      {/* Content Area with smooth tab transition */}
      <TabTransition viewKey={activeTab}>
        {activeTab === 'outbox' && isAdmin ? (
        <div className="space-y-4">
          {/* Outbox Queue Controls */}
          <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                Google Sheets Outbox Queue
              </span>
              <div className="w-48">
                <MorphSelect value={outboxStatusFilter} onValueChange={(v) => setOutboxStatusFilter(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="All Jobs" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="all">All Jobs</MorphSelectItem>
                    <MorphSelectItem value="failed">Failed Only</MorphSelectItem>
                    <MorphSelectItem value="pending">Pending / Retrying</MorphSelectItem>
                    <MorphSelectItem value="synced">Synced</MorphSelectItem>
                    <MorphSelectItem value="superseded">Superseded</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
              </div>
            </div>

            <MotionButton
              type="button"
              disabled={isRetryingOutbox}
              onClick={handleRetryAllFailed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] disabled:opacity-50 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry All Failed Jobs
            </MotionButton>
          </div>

          {/* Jobs Table */}
          <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-left text-xs">
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-[#0F172A]/65 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                <tr>
                  <th className="px-3.5 py-2.5">Job #</th>
                  <th className="px-3.5 py-2.5">Handover & Version</th>
                  <th className="px-3.5 py-2.5">Stable Worksheet Tab</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5">Retries</th>
                  <th className="px-3.5 py-2.5">Error / Timestamp</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {outboxJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#0F172A]/60 dark:text-[#9A9AA2]">
                      No outbox sync jobs matching filter.
                    </td>
                  </tr>
                ) : (
                  outboxJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528]">
                      <td className="px-3.5 py-2.5 tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2]">#{job.id}</td>
                      <td className="px-3.5 py-2.5 tabular-nums font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                        {job.handoverId} (v{job.handoverVersion})
                      </td>
                      <td className="px-3.5 py-2.5 tabular-nums text-[#0F172A]/80 dark:text-[#9A9AA2] truncate" title={job.worksheetTitle}>
                        {job.worksheetTitle}
                      </td>
                      <td
                        className={`px-3.5 py-2.5 tabular-nums font-bold ${
                          job.status === 'synced'
                            ? 'text-[#16A34A] dark:text-[#34C26B]'
                            : job.status === 'failed'
                            ? 'text-[#DC2626] dark:text-[#EF5350]'
                            : job.status === 'superseded'
                            ? 'text-[#0F172A]/45 dark:text-[#66666E]'
                            : 'text-[#D97706] dark:text-[#F0A030]'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </td>
                      <td className="px-3.5 py-2.5 tabular-nums text-[#0F172A] dark:text-[#ECECEE]">
                        {job.retryCount} / {job.maxRetries}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-[#0F172A]/70 dark:text-[#9A9AA2]">
                        {job.errorMessage ? (
                          <span className="text-[#DC2626] dark:text-[#EF5350]">{job.errorMessage}</span>
                        ) : (
                          <span>
                            {job.syncedAt ? `Synced ${formatTimestamp(job.syncedAt)}` : formatTimestamp(job.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {(job.status === 'failed' || job.status === 'pending') && (
                          <MotionButton
                            type="button"
                            disabled={isRetryingOutbox}
                            onClick={() => handleRetrySingleJob(job.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#1E3A8A] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#1E40AF]/25 dark:hover:bg-[rgba(76,141,246,0.22)] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/40 rounded-md transition-colors"
                          >
                            Retry
                          </MotionButton>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Synchronized Employee Tabs Mirror */}
          <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                Synchronized Employee Worksheet Rows ({syncedTabRows.length})
              </h3>
              <p className="text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2]">
                Deduplicated 1-row-per-Handover-ID ledger across Counselor (`HND_{'{id}'}`), Receiver (`HND_{'{id}'}`), and `Handover_Master` tabs
              </p>
            </div>
            <div className="overflow-x-auto border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md">
              <table className="w-full min-w-[780px] table-fixed text-left text-xs">
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '19%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-[#0F172A]/65 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                  <tr>
                    <th className="px-3 py-2">Worksheet Tab</th>
                    <th className="px-3 py-2">Row #</th>
                    <th className="px-3 py-2">Handover ID</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                  {syncedTabRows.map((row) => (
                    <tr key={`${row.worksheetTitle}-${row.handoverId}`} className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528]">
                      <td className="px-3 py-2 tabular-nums font-semibold text-[#1E40AF] dark:text-[#4C8DF6] truncate" title={row.worksheetTitle}>
                        {row.worksheetTitle}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2]">{row.rowNumber}</td>
                      <td className="px-3 py-2 tabular-nums font-bold text-[#0F172A] dark:text-[#ECECEE] truncate">
                        {row.handoverId} (v{row.handoverVersion})
                      </td>
                      <td className="px-3 py-2 text-[#0F172A] dark:text-[#ECECEE] truncate">{row.rowValues[4] || '—'}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">{row.rowValues[11] || '—'}</td>
                      <td className="px-3 py-2 tabular-nums text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2] truncate">
                        {row.rowValues[7] || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Search & Multi-Facet Filter Bar */}
          <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            <div className="md:col-span-4 relative">
              <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'my-requests'
                    ? 'Search Request ID, linked Handover ID, student, counselor, or doc...'
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
              <MorphSelect value={counselorFilter} onValueChange={(v) => setCounselorFilter(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="All Counselors" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="">All Counselors</MorphSelectItem>
                  {(contextData?.counselingTeam || []).map((c) => (
                    <MorphSelectItem key={c.id} value={c.id}>
                      {c.name}
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>

            {activeTab === 'my-requests' ? (
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
            ) : (
              <div className="md:col-span-2">
                <MorphSelect value={receiverFilter} onValueChange={(v) => setReceiverFilter(v)}>
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="All Admission Receivers" />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="">All Admission Receivers</MorphSelectItem>
                    {(contextData?.admissionTeam || []).map((r) => (
                      <MorphSelectItem key={r.id} value={r.id}>
                        {r.name}
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>
            )}

            <div className="md:col-span-2">
              <MorphSelect value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <MorphSelectTrigger>
                  <MorphSelectValue placeholder="All Statuses" />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  <MorphSelectItem value="All">All Statuses</MorphSelectItem>
                  {activeTab === 'my-requests' ? (
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
                title={activeTab === 'my-requests' ? 'Deadline / Created From' : 'Handover Date From'}
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

          {/* Requests Table vs Handovers Table */}
          {activeTab === 'my-requests' ? (
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
                <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-[#0F172A]/65 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Student Dossier</th>
                    <th className="px-4 py-3">Required Physical Documents</th>
                    <th className="px-4 py-3">Assigned Counselor</th>
                    <th className="px-4 py-3">Priority & Deadline</th>
                    <th className="px-4 py-3">Status & Linked Handover</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                  {loading && requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-[#0F172A]/60 dark:text-[#9A9AA2]">
                        <div className="inline-flex items-center justify-center gap-2">
                          <Spinner size="md" aria-label="Loading Admission document requests" />
                          <span>Loading Admission document requests...</span>
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                        <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                          No outbound document requests found
                        </div>
                        <p className="text-xs text-[#0F172A]/60 dark:text-[#9A9AA2] max-w-md mx-auto">
                          Click "Request Documents from Counselor" above when physical originals or apostilled files are needed from the Counseling Team.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const canInspectLinked =
                        !!req.linkedHandoverId &&
                        (req.linkedHandoverStatus === 'Pending Receipt' ||
                          req.linkedHandoverStatus === 'Follow-up Delivered');

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
                            {isAdmin && (
                              <div className="text-[10px] text-[#0F172A]/55 dark:text-[#9A9AA2] mt-0.5">
                                By {req.requestedByName}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                              {req.studentName}
                            </div>
                            <div className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2] truncate">
                              {req.studentPassport} · {req.universityName || req.intakeTerm}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                              {req.requiredDocuments.map((d) => d.documentName).join(', ')}
                            </div>
                            <div className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2] mt-0.5">
                              {req.requiredDocuments.length} requested item(s)
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-[#0F172A] dark:text-[#ECECEE] truncate">
                              {req.assignedCounselorName}
                            </div>
                            <div className="text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2] tabular-nums">Counseling Team</div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className={`font-semibold flex items-center gap-1 ${getPriorityClass(req.priority)}`}>
                              <Flag className="w-3 h-3 shrink-0" />
                              <span>{req.priority}</span>
                            </div>
                            <div className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2] mt-0.5">
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
                              <div className="mt-0.5 text-[11px] text-[#0F172A]/50 dark:text-[#66666E]">
                                Pending counselor submission
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canInspectLinked && req.linkedHandoverId && (
                                <MotionButton
                                  type="button"
                                  onClick={() => onOpenHandoverDetail(req.linkedHandoverId!)}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#16A34A] dark:bg-[#34C26B] hover:bg-[#138A59] rounded-md transition-colors"
                                >
                                  Inspect Handover
                                </MotionButton>
                              )}
                              <MotionButton
                                type="button"
                                onClick={() => onOpenRequestDetail(req.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1E3A8A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors"
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
                <thead className="bg-[#F8FAFC] dark:bg-[#161616] text-[11px] font-semibold text-[#0F172A]/65 dark:text-[#9A9AA2] border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                  <tr>
                    <th className="px-4 py-3">Handover ID</th>
                    <th className="px-4 py-3">Student Dossier</th>
                    <th className="px-4 py-3">Documents Breakdown</th>
                    <th className="px-4 py-3">Custody Transfer</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Status & Sheets</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                  {loading && handovers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-[#0F172A]/60 dark:text-[#9A9AA2]">
                        <div className="inline-flex items-center justify-center gap-2">
                          <Spinner size="md" aria-label="Loading Admission handover records" />
                          <span>Loading Admission handover records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : handovers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                        <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                          No document handovers found in this view
                        </div>
                        <p className="text-xs text-[#0F172A]/60 dark:text-[#9A9AA2] max-w-md mx-auto">
                          Incoming physical handovers from counselors awaiting your verification appear under "Pending Receipts".
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
                      const canVerifyThis = canUserVerifyHandover(h);

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
                            <div className="text-[10px] tabular-nums text-[#0F172A]/50 dark:text-[#9A9AA2] mt-0.5">
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
                            <div className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2] truncate">
                              {h.studentPassport} · {h.universityName || h.intakeTerm}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-[#0F172A] dark:text-[#ECECEE] truncate">
                              {h.documents.map((d) => d.documentName).join(', ')}
                            </div>
                            <div className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#9A9AA2] mt-0.5">
                              {recCount}/{h.totalDocuments} Received
                              {missCount > 0 ? ` · ${missCount} Missing` : ''}
                              {defCount > 0 ? ` · ${defCount} Defective` : ''}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="text-[#0F172A] dark:text-[#ECECEE] truncate">
                              From: <span className="font-semibold">{h.counselorName}</span>
                            </div>
                            <div className="text-[11px] text-[#0F172A]/60 dark:text-[#9A9AA2] truncate">
                              To: <span className="font-medium">{h.receivingEmployeeName}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top tabular-nums text-[11px] text-[#0F172A]/75 dark:text-[#9A9AA2]">
                            <div>{h.handoverDate}</div>
                            <div>{h.handoverTime}</div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className={`flex items-center gap-1.5 font-semibold ${getHandoverStatusClass(h.status)}`}>
                              {renderHandoverStatusIcon(h.status)}
                              <span>{h.status}</span>
                            </div>
                            <div className="text-[10px] tabular-nums text-[#0F172A]/50 dark:text-[#66666E] mt-1">
                              Tabs: C:{h.counselorSheetSyncStatus[0]} · R:{h.receiverSheetSyncStatus[0]} · M:{h.masterSheetSyncStatus[0]}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canVerifyThis && (
                                <MotionButton
                                  type="button"
                                  onClick={() => onOpenVerify(h)}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#16A34A] dark:bg-[#34C26B] hover:bg-[#138A59] rounded-md transition-colors"
                                >
                                  Inspect & Verify
                                </MotionButton>
                              )}
                              <MotionButton
                                type="button"
                                onClick={() => onOpenHandoverDetail(h.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1E3A8A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors"
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
        </div>
      )}
      </TabTransition>
    </div>
  );
};
