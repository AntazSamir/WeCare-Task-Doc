import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  FileSpreadsheet,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  DocumentHandover,
  HandoverContextData,
  HandoverStats,
  SheetsOutboxJob,
  SyncedTabRowPreview,
  UserProfile,
} from '../types/pms';
import {
  fetchHandoverContext,
  fetchHandovers,
  fetchHandoverStats,
  fetchSheetsOutbox,
  retryAllFailedOutboxApi,
  retryOutboxJobApi,
} from '../services/pmsService';
import { CreateHandoverModal } from './CreateHandoverModal';
import { HandoverAcknowledgementModal } from './HandoverAcknowledgementModal';
import { FollowUpDeliveryModal } from './FollowUpDeliveryModal';
import { HandoverDetailModal } from './HandoverDetailModal';
import { formatTimestamp } from '../utils/dateUtils';

interface DocumentHandoverViewProps {
  currentUser: UserProfile;
  initialHandoverId?: string | null;
  onClearInitialHandoverId?: () => void;
  onNotifyToast: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'overdue'
  ) => void;
  onStatsChanged?: (stats: HandoverStats) => void;
}

type ViewTab = 'my' | 'pending' | 'received' | 'disputed' | 'all' | 'outbox';

export const DocumentHandoverView: React.FC<DocumentHandoverViewProps> = ({
  currentUser,
  initialHandoverId,
  onClearInitialHandoverId,
  onNotifyToast,
  onStatsChanged,
}) => {
  const isAdmin = currentUser.role === 'Admission_Manager';
  const isCounselor = currentUser.team === 'Counseling Team';

  const defaultTab: ViewTab = isCounselor ? 'my' : isAdmin ? 'all' : 'pending';
  const [activeTab, setActiveTab] = useState<ViewTab>(defaultTab);
  const [handovers, setHandovers] = useState<DocumentHandover[]>([]);
  const [stats, setStats] = useState<HandoverStats | null>(null);
  const [contextData, setContextData] = useState<HandoverContextData | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('');
  const [receiverFilter, setReceiverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Admin Outbox State
  const [outboxJobs, setOutboxJobs] = useState<SheetsOutboxJob[]>([]);
  const [syncedTabRows, setSyncedTabRows] = useState<SyncedTabRowPreview[]>([]);
  const [outboxStatusFilter, setOutboxStatusFilter] = useState('all');
  const [isRetryingOutbox, setIsRetryingOutbox] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [verifyHandover, setVerifyHandover] = useState<DocumentHandover | null>(null);
  const [followUpHandover, setFollowUpHandover] = useState<DocumentHandover | null>(null);
  const [detailHandoverId, setDetailHandoverId] = useState<string | null>(initialHandoverId || null);

  useEffect(() => {
    if (initialHandoverId) {
      setDetailHandoverId(initialHandoverId);
    }
  }, [initialHandoverId]);

  useEffect(() => {
    // Switch default view gracefully when persona changes
    if (currentUser.team === 'Counseling Team') {
      setActiveTab((prev) => (prev === 'all' || prev === 'outbox' ? 'my' : prev));
    } else if (!isAdmin) {
      setActiveTab((prev) => (prev === 'all' || prev === 'outbox' ? 'pending' : prev));
    }
  }, [currentUser.id, currentUser.team, isAdmin]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ctx, st] = await Promise.all([
        fetchHandoverContext(),
        fetchHandoverStats(),
      ]);
      setContextData(ctx);
      setStats(st);
      if (onStatsChanged) onStatsChanged(st);

      if (activeTab === 'outbox' && isAdmin) {
        const ob = await fetchSheetsOutbox(outboxStatusFilter);
        setOutboxJobs(ob.jobs);
        setSyncedTabRows(ob.syncedTabRows);
      } else {
        const list = await fetchHandovers({
          viewMode: activeTab === 'outbox' ? 'all' : activeTab,
          search: searchTerm,
          counselorId: counselorFilter,
          receiverId: receiverFilter,
          status: statusFilter,
          dateFrom,
          dateTo,
        });
        setHandovers(list);
      }
    } catch (err: any) {
      onNotifyToast('Handover Load Error', err?.message || 'Failed to fetch handovers', 'warning');
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    searchTerm,
    counselorFilter,
    receiverFilter,
    statusFilter,
    dateFrom,
    dateTo,
    outboxStatusFilter,
    isAdmin,
    onStatsChanged,
    onNotifyToast,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const canUserVerifyHandover = (h: DocumentHandover): boolean => {
    if (h.status === 'Accepted') return false;
    if (h.counselorId === currentUser.id) return false;
    const isAssignedAdmission =
      h.receivingEmployeeId === currentUser.id && currentUser.team === 'Admission Team';
    return isAssignedAdmission || isAdmin;
  };

  const canUserSubmitFollowUp = (h: DocumentHandover): boolean => {
    if (!isCounselor) return false;
    return h.status === 'Partially Received' || h.status === 'Disputed';
  };

  const handleRetrySingleJob = async (jobId: number) => {
    setIsRetryingOutbox(true);
    try {
      await retryOutboxJobApi(jobId);
      onNotifyToast('Sync Retried', `Outbox job #${jobId} re-processed.`, 'success');
      await loadAll();
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
      await loadAll();
    } catch (err: any) {
      onNotifyToast('Batch Retry Failed', err?.message || 'Could not retry failed jobs', 'warning');
    } finally {
      setIsRetryingOutbox(false);
    }
  };

  const getStatusTextClass = (status: string) => {
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

  const renderStatusIcon = (status: string) => {
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

  const tabs: Array<{ id: ViewTab; label: string; visible: boolean }> = [
    { id: 'my', label: 'My Handovers (Counselor)', visible: isCounselor || isAdmin },
    { id: 'pending', label: 'Pending Receipts (Admission)', visible: true },
    { id: 'received', label: 'Received Documents', visible: true },
    { id: 'disputed', label: 'Disputed / Incomplete', visible: true },
    { id: 'all', label: 'All Handover History', visible: isAdmin },
    { id: 'outbox', label: 'Sheets Outbox & Tabs', visible: isAdmin },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
              Physical Document Handover & Custody Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Counselor-to-Admission Team chain of custody · Per-document status verification · Outbox-guaranteed Google Sheets tab sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isCounselor ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Document Handover
            </button>
          ) : (
            <span
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-md"
              title="Creation is restricted to Counseling Team members"
            >
              Admission Verification Mode ({currentUser.name})
            </span>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Handovers</div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {stats?.total ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Pending Receipts</div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {stats?.pendingReceipts ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Accepted in Custody</div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats?.accepted ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Partial / Disputed</div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {(stats?.partiallyReceived ?? 0) + (stats?.disputed ?? 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
            <span>Sheets Outbox</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-xs font-mono space-y-0.5">
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Synced Jobs: {stats?.outbox?.synced ?? 0}
            </div>
            <div className={stats?.outbox?.failed ? 'text-rose-600 font-bold' : 'text-slate-500'}>
              Queued: {stats?.outbox?.pending ?? 0} · Failed: {stats?.outbox?.failed ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex flex-wrap items-center gap-1.5">
        {tabs
          .filter((t) => t.visible)
          .map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
      </div>

      {/* Main Content Area: Outbox Tab vs Handovers Table */}
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
                      <td className="px-3.5 py-2.5 font-mono">
                        {job.retryCount} / {job.maxRetries}
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {job.errorMessage ? (
                          <span className="text-rose-600 dark:text-rose-400">{job.errorMessage}</span>
                        ) : (
                          <span>{job.syncedAt ? `Synced ${formatTimestamp(job.syncedAt)}` : formatTimestamp(job.createdAt)}</span>
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
                placeholder="Search Handover ID, student, passport, or document..."
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

            <div className="md:col-span-2">
              <select
                value={receiverFilter}
                onChange={(e) => setReceiverFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Receivers</option>
                {(contextData?.admissionTeam || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Receipt">Pending Receipt</option>
                <option value="Partially Received">Partially Received</option>
                <option value="Disputed">Disputed</option>
                <option value="Follow-up Delivered">Follow-up Delivered</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From Date"
                className="w-full px-2 py-1.5 text-[11px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
              />
              {(searchTerm || counselorFilter || receiverFilter || statusFilter !== 'All' || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCounselorFilter('');
                    setReceiverFilter('');
                    setStatusFilter('All');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Handovers Manifest Table */}
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
                {handovers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No document handovers found in this view
                      </div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {isCounselor
                          ? 'Click "Create Document Handover" above when handing over physical original student records to the Admission Team.'
                          : 'Incoming physical handovers assigned to you for inspection will appear here automatically.'}
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
                    const canFollowUpThis = canUserSubmitFollowUp(h);

                    return (
                      <tr
                        key={h.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => setDetailHandoverId(h.id)}
                            className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline text-left"
                          >
                            {h.id}
                          </button>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            v{h.version} {h.packageSealNumber ? `· ${h.packageSealNumber}` : ''}
                          </div>
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
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
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

                        <td className="px-4 py-3 align-top font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <div>{h.handoverDate}</div>
                          <div>{h.handoverTime}</div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className={`flex items-center gap-1.5 font-semibold ${getStatusTextClass(h.status)}`}>
                            {renderStatusIcon(h.status)}
                            <span>{h.status}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-1">
                            Tabs: C:{h.counselorSheetSyncStatus[0]} · R:{h.receiverSheetSyncStatus[0]} · M:{h.masterSheetSyncStatus[0]}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canFollowUpThis && (
                              <button
                                type="button"
                                onClick={() => setFollowUpHandover(h)}
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md"
                              >
                                Deliver Missing
                              </button>
                            )}
                            {canVerifyThis && (
                              <button
                                type="button"
                                onClick={() => setVerifyHandover(h)}
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                              >
                                Inspect & Verify
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDetailHandoverId(h.id)}
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
        </div>
      )}

      {/* Modals */}
      <CreateHandoverModal
        isOpen={isCreateOpen}
        currentUser={currentUser}
        contextData={contextData}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(createdId) => {
          setIsCreateOpen(false);
          onNotifyToast(
            'Handover Created',
            `${createdId} submitted & queued for Google Sheets synchronization.`,
            'success'
          );
          loadAll();
        }}
      />

      <HandoverAcknowledgementModal
        handover={verifyHandover}
        currentUser={currentUser}
        isOpen={!!verifyHandover}
        onClose={() => setVerifyHandover(null)}
        onSuccess={() => {
          const id = verifyHandover?.id;
          setVerifyHandover(null);
          onNotifyToast(
            'Verification Recorded',
            `Handover ${id} verified and counselor notified.`,
            'success'
          );
          loadAll();
        }}
      />

      <FollowUpDeliveryModal
        handover={followUpHandover}
        currentUser={currentUser}
        isOpen={!!followUpHandover}
        onClose={() => setFollowUpHandover(null)}
        onSuccess={() => {
          const id = followUpHandover?.id;
          setFollowUpHandover(null);
          onNotifyToast(
            'Follow-Up Submitted',
            `Missing/corrected document batch submitted under ${id}.`,
            'success'
          );
          loadAll();
        }}
      />

      <HandoverDetailModal
        handoverId={detailHandoverId}
        isOpen={!!detailHandoverId}
        onClose={() => {
          setDetailHandoverId(null);
          if (onClearInitialHandoverId) onClearInitialHandoverId();
        }}
        canVerify={canUserVerifyHandover}
        canFollowUp={canUserSubmitFollowUp}
        onOpenVerify={(h) => setVerifyHandover(h)}
        onOpenFollowUp={(h) => setFollowUpHandover(h)}
      />
    </div>
  );
};
