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
} from 'lucide-react';
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
        return 'text-emerald-600 dark:text-emerald-400';
      case 'Partially Received':
        return 'text-amber-600 dark:text-amber-400';
      case 'Disputed':
        return 'text-rose-600 dark:text-rose-400';
      case 'Follow-up Delivered':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const renderHandoverStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'Partially Received':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'Disputed':
        return <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'Follow-up Delivered':
        return <PackageCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  const getRequestStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'Partially Fulfilled':
        return 'text-amber-600 dark:text-amber-400';
      case 'Disputed':
        return 'text-rose-600 dark:text-rose-400';
      case 'Handover Submitted':
      case 'In Verification':
        return 'text-blue-600 dark:text-blue-400';
      case 'Cancelled':
        return 'text-slate-400';
      default:
        return 'text-indigo-600 dark:text-indigo-400';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'text-rose-600 dark:text-rose-400';
      case 'High':
        return 'text-amber-600 dark:text-amber-400';
      case 'Normal':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-slate-500';
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
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
              Admission Verification & Document Sourcing Console
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentUser.name} ({isAdmin ? 'Admin & Admission Manager' : 'Admission Team'}) · Inspect physical documents per item · Request required dossiers from Counselors · Tab{' '}
              <span className="font-mono text-slate-700 dark:text-slate-300">HND_{currentUser.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRefreshAll();
              loadTabData();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            type="button"
            onClick={onOpenCreateRequest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Request Documents from Counselor
          </button>
        </div>
      </div>

      {/* Admission KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            Pending Receipts
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {stats?.myPendingVerifications ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Awaiting physical inspection</div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('my-requests')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
            <span>Active Requests</span>
            <ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {stats?.myOpenAdmissionRequests ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
            {stats?.myCompletedAdmissionRequests ?? 0} completed · {stats?.myTotalAdmissionRequests ?? 0} total
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('received')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            Received Documents
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats?.accepted ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Confirmed in Admission custody</div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('disputed')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            Disputed / Incomplete
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {(stats?.partiallyReceived ?? 0) + (stats?.disputed ?? 0)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Open missing or disputed</div>
        </button>

        <div
          onClick={() => isAdmin && handleTabChange('outbox')}
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 col-span-2 lg:col-span-1 ${
            isAdmin ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors' : ''
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
            <span>Sheets Outbox</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-xs font-mono space-y-0.5 tabular-nums">
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Synced Jobs: {stats?.outbox?.synced ?? 0}
            </div>
            <div className={stats?.outbox?.failed ? 'text-rose-600 font-bold' : 'text-slate-500'}>
              Queued: {stats?.outbox?.pending ?? 0} · Failed: {stats?.outbox?.failed ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Role Segmented Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex flex-wrap items-center gap-1.5">
        {tabs
          .filter((t) => t.visible)
          .map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* Content Area */}
      {activeTab === 'outbox' && isAdmin ? (
        <div className="space-y-4">
          {/* Outbox Queue Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Google Sheets Outbox Queue
              </span>
              <select
                value={outboxStatusFilter}
                onChange={(e) => setOutboxStatusFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="all">All Jobs</option>
                <option value="failed">Failed Only</option>
                <option value="pending">Pending / Retrying</option>
                <option value="synced">Synced</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>

            <button
              type="button"
              disabled={isRetryingOutbox}
              onClick={handleRetryAllFailed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry All Failed Jobs
            </button>
          </div>

          {/* Jobs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
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
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {outboxJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No outbox sync jobs matching filter.
                    </td>
                  </tr>
                ) : (
                  outboxJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-3.5 py-2.5 font-mono text-slate-500">#{job.id}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {job.handoverId} (v{job.handoverVersion})
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                        {job.worksheetTitle}
                      </td>
                      <td
                        className={`px-3.5 py-2.5 font-mono font-bold ${
                          job.status === 'synced'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : job.status === 'failed'
                            ? 'text-rose-600 dark:text-rose-400'
                            : job.status === 'superseded'
                            ? 'text-slate-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums">
                        {job.retryCount} / {job.maxRetries}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {job.errorMessage ? (
                          <span className="text-rose-600 dark:text-rose-400">{job.errorMessage}</span>
                        ) : (
                          <span>
                            {job.syncedAt ? `Synced ${formatTimestamp(job.syncedAt)}` : formatTimestamp(job.createdAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {(job.status === 'failed' || job.status === 'pending') && (
                          <button
                            type="button"
                            disabled={isRetryingOutbox}
                            onClick={() => handleRetrySingleJob(job.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Synchronized Employee Tabs Mirror */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Synchronized Employee Worksheet Rows ({syncedTabRows.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Deduplicated 1-row-per-Handover-ID ledger across Counselor (`HND_{'{id}'}`), Receiver (`HND_{'{id}'}`), and `Handover_Master` tabs
              </p>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Worksheet Tab</th>
                    <th className="px-3 py-2">Row #</th>
                    <th className="px-3 py-2">Handover ID</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {syncedTabRows.map((row) => (
                    <tr key={`${row.worksheetTitle}-${row.handoverId}`}>
                      <td className="px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {row.worksheetTitle}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-mono font-bold">
                        {row.handoverId} (v{row.handoverVersion})
                      </td>
                      <td className="px-3 py-2">{row.rowValues[4] || '—'}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{row.rowValues[11] || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            <div className="md:col-span-4 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'my-requests'
                    ? 'Search Request ID, linked Handover ID, student, counselor, or doc...'
                    : 'Search Handover ID, Request ID, student, passport, or doc...'
                }
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={counselorFilter}
                onChange={(e) => setCounselorFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Counselors</option>
                {(contextData?.counselingTeam || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'my-requests' ? (
              <div className="md:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="All">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            ) : (
              <div className="md:col-span-2">
                <select
                  value={receiverFilter}
                  onChange={(e) => setReceiverFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="">All Admission Receivers</option>
                  {(contextData?.admissionTeam || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="All">All Statuses</option>
                {activeTab === 'my-requests' ? (
                  <>
                    <option value="Open">Open</option>
                    <option value="Handover Submitted">Handover Submitted</option>
                    <option value="In Verification">In Verification</option>
                    <option value="Partially Fulfilled">Partially Fulfilled</option>
                    <option value="Disputed">Disputed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="Pending Receipt">Pending Receipt</option>
                    <option value="Partially Received">Partially Received</option>
                    <option value="Disputed">Disputed</option>
                    <option value="Follow-up Delivered">Follow-up Delivered</option>
                    <option value="Accepted">Accepted</option>
                  </>
                )}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title={activeTab === 'my-requests' ? 'Deadline / Created From' : 'Handover Date From'}
                className="w-full px-2 py-1.5 text-[11px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Requests Table vs Handovers Table */}
          {activeTab === 'my-requests' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading && requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        Loading Admission document requests...
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No outbound document requests found
                        </div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => onOpenRequestDetail(req.id)}
                              className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                            >
                              {req.id}
                            </button>
                            {isAdmin && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                By {req.requestedByName}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {req.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {req.studentPassport} · {req.universityName || req.intakeTerm}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top max-w-xs">
                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {req.requiredDocuments.map((d) => d.documentName).join(', ')}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                              {req.requiredDocuments.length} requested item(s)
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {req.assignedCounselorName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">Counseling Team</div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className={`font-semibold flex items-center gap-1 ${getPriorityClass(req.priority)}`}>
                              <Flag className="w-3 h-3 shrink-0" />
                              <span>{req.priority}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                              Due {req.deadline}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className={`font-semibold ${getRequestStatusClass(req.status)}`}>
                              {req.status}
                            </div>
                            {req.linkedHandoverId ? (
                              <button
                                type="button"
                                onClick={() => onOpenHandoverDetail(req.linkedHandoverId!)}
                                className="mt-0.5 text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {req.linkedHandoverId} ({req.linkedHandoverStatus})
                              </button>
                            ) : (
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                Pending counselor submission
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canInspectLinked && req.linkedHandoverId && (
                                <button
                                  type="button"
                                  onClick={() => onOpenHandoverDetail(req.linkedHandoverId!)}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                                >
                                  Inspect Handover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenRequestDetail(req.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading && handovers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        Loading Admission handover records...
                      </td>
                    </tr>
                  ) : handovers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No document handovers found in this view
                        </div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => onOpenHandoverDetail(h.id)}
                              className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline text-left"
                            >
                              {h.id}
                            </button>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              v{h.version}
                              {h.packageSealNumber ? ` · ${h.packageSealNumber}` : ''}
                            </div>
                            {h.requestId && (
                              <button
                                type="button"
                                onClick={() => onOpenRequestDetail(h.requestId!)}
                                className="mt-0.5 block text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Req: {h.requestId}
                              </button>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {h.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {h.studentPassport} · {h.universityName || h.intakeTerm}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top max-w-xs">
                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {h.documents.map((d) => d.documentName).join(', ')}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                              {recCount}/{h.totalDocuments} Received
                              {missCount > 0 ? ` · ${missCount} Missing` : ''}
                              {defCount > 0 ? ` · ${defCount} Defective` : ''}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="text-slate-800 dark:text-slate-200">
                              From: <span className="font-semibold">{h.counselorName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              To: <span className="font-medium">{h.receivingEmployeeName}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                            <div>{h.handoverDate}</div>
                            <div>{h.handoverTime}</div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className={`flex items-center gap-1.5 font-semibold ${getHandoverStatusClass(h.status)}`}>
                              {renderHandoverStatusIcon(h.status)}
                              <span>{h.status}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Tabs: C:{h.counselorSheetSyncStatus[0]} · R:{h.receiverSheetSyncStatus[0]} · M:{h.masterSheetSyncStatus[0]}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canVerifyThis && (
                                <button
                                  type="button"
                                  onClick={() => onOpenVerify(h)}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                                >
                                  Inspect & Verify
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenHandoverDetail(h.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md"
                              >
                                <span>Manifest</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
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
    </div>
  );
};
