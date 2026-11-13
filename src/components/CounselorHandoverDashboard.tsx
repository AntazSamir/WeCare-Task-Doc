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
} from 'lucide-react';
import {
  DocumentHandover,
  DocumentRequest,
  HandoverContextData,
  HandoverStats,
  UserProfile,
} from '../types/pms';
import { fetchDocumentRequests, fetchHandovers } from '../services/pmsService';

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
        return 'text-[#16A36A] dark:text-emerald-400';
      case 'Partially Received':
        return 'text-[#E9A23B] dark:text-amber-400';
      case 'Disputed':
        return 'text-[#DC4545] dark:text-rose-400';
      case 'Follow-up Delivered':
        return 'text-[#1769E8] dark:text-blue-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const renderHandoverStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] dark:text-emerald-400 shrink-0" />;
      case 'Partially Received':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#E9A23B] dark:text-amber-400 shrink-0" />;
      case 'Disputed':
        return <XCircle className="w-3.5 h-3.5 text-[#DC4545] dark:text-rose-400 shrink-0" />;
      case 'Follow-up Delivered':
        return <PackageCheck className="w-3.5 h-3.5 text-[#1769E8] dark:text-blue-400 shrink-0" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  const getRequestStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-[#16A36A] dark:text-emerald-400';
      case 'Partially Fulfilled':
        return 'text-[#E9A23B] dark:text-amber-400';
      case 'Disputed':
        return 'text-[#DC4545] dark:text-rose-400';
      case 'Handover Submitted':
      case 'In Verification':
        return 'text-[#1769E8] dark:text-blue-400';
      case 'Cancelled':
        return 'text-slate-400';
      default:
        return 'text-[#123B78] dark:text-blue-400';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'text-[#DC4545] dark:text-rose-400';
      case 'High':
        return 'text-[#E9A23B] dark:text-amber-400';
      case 'Normal':
        return 'text-[#1769E8] dark:text-blue-400';
      default:
        return 'text-slate-500';
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
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-[#DCEBFF] dark:bg-blue-950/60 border border-[#36A5F5]/40 dark:border-blue-800 flex items-center justify-center text-[#123B78] dark:text-blue-400 shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-[#172B4D] dark:text-slate-100">
              Counselor Document Handover Workspace
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentUser.name} · Submit physical student records to Admission Team · Fulfill incoming document requests · Ledger Tab{' '}
              <span className="font-mono text-[#172B4D] dark:text-slate-300">HND_{currentUser.id}</span>
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#172B4D] dark:text-slate-300 bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] border border-[#E3EAF3] dark:border-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#1769E8]" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => onOpenCreateHandover(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Document Handover
          </button>
        </div>
      </div>

      {/* Counselor KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => handleTabChange('requests')}
          className="text-left bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#1769E8] dark:hover:border-blue-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
            <span>Admission Requests</span>
            <ClipboardList className="w-3.5 h-3.5 text-[#123B78] dark:text-blue-400" />
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#123B78] dark:text-blue-400">
            {stats?.openRequestsAssignedToMe ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 font-mono tabular-nums">
            {stats?.totalRequestsAssignedToMe ?? 0} assigned total
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('pending_confirmations')}
          className="text-left bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#36A5F5] dark:hover:border-blue-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            Pending Confirmations
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#1769E8] dark:text-blue-400">
            {stats?.pendingConfirmationsMyHandovers ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Awaiting Admission sign-off</div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('disputed')}
          className="text-left bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#E9A23B] dark:hover:border-amber-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            Needs Follow-Up
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#E9A23B] dark:text-amber-400">
            {stats?.myNeedsFollowUp ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Partial or disputed batches</div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('received')}
          className="text-left bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#16A36A] dark:hover:border-emerald-700 rounded-lg p-3.5 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            Accepted in Custody
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#16A36A] dark:text-emerald-400">
            {stats?.myAcceptedHandovers ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Verified physical receipts</div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('my')}
          className="text-left bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#36A5F5] dark:hover:border-slate-700 rounded-lg p-3.5 col-span-2 lg:col-span-1 transition-colors"
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase">
            My Total Handovers
          </div>
          <div className="mt-1 text-2xl font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-100">
            {stats?.myTotalHandovers ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Submitted across all terms</div>
        </button>
      </div>

      {/* Role Segmented Navigation */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-2 flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                active
                  ? 'bg-[#123B78] text-white dark:bg-blue-600 dark:text-white'
                  : 'text-[#172B4D] dark:text-slate-400 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  active ? 'text-[#DCEBFF]' : 'text-slate-400'
                }`}
              >
                ({tab.count ?? 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Multi-Facet Filter Bar */}
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        <div className="md:col-span-4 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'requests'
                ? 'Search Request ID, student, passport, requester, or document...'
                : 'Search Handover ID, Request ID, student, passport, or doc...'
            }
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:bg-[#FFFFFF] focus:border-[#1769E8] focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <select
            value={admissionFilter}
            onChange={(e) => setAdmissionFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
          >
            <option value="">All Admission Officers</option>
            {(contextData?.admissionTeam || []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'requests' && (
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>
        )}

        <div className={activeTab === 'requests' ? 'md:col-span-2' : 'md:col-span-4'}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 focus:border-[#1769E8] focus:outline-none"
          >
            <option value="All">All Statuses</option>
            {activeTab === 'requests' ? (
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
            title={activeTab === 'requests' ? 'Deadline / Created From' : 'Handover Date From'}
            className="w-full px-2 py-1.5 text-[11px] rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 font-mono focus:border-[#1769E8] focus:outline-none"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2 py-1.5 text-[11px] font-semibold text-[#1769E8] hover:text-[#123B78] dark:hover:text-slate-100"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Table */}
      {activeTab === 'requests' ? (
        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F2EE] dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 border-b border-[#E3EAF3] dark:border-slate-800">
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
            <tbody className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Loading document requests from Admission Team...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                    <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-300">
                      No document requests assigned to you
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                      className="hover:bg-[#F4F2EE] dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => onOpenRequestDetail(req.id)}
                          className="font-mono font-bold text-[#1769E8] dark:text-blue-400 hover:underline text-left"
                        >
                          {req.id}
                        </button>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#172B4D] dark:text-slate-100">
                          {req.studentName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {req.studentPassport} · {req.universityName || req.intakeTerm}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top max-w-xs">
                        <div className="font-medium text-[#172B4D] dark:text-slate-200 truncate">
                          {req.requiredDocuments.map((d) => d.documentName).join(', ')}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                          {req.requiredDocuments.length} requested item(s)
                          {req.remarks ? ` · "${req.remarks}"` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#172B4D] dark:text-slate-200">
                          {req.requestedByName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">Admission Team</div>
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
                            className="mt-0.5 text-[11px] font-mono font-semibold text-[#1769E8] dark:text-blue-400 hover:underline"
                          >
                            {req.linkedHandoverId} ({req.linkedHandoverStatus})
                          </button>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-slate-400">Awaiting submission</div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canFulfill && (
                            <button
                              type="button"
                              onClick={() => onOpenCreateHandover(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-md transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              Submit Docs
                            </button>
                          )}
                          {needsFollowUp && req.linkedHandoverId && (
                            <button
                              type="button"
                              onClick={() => onOpenHandoverDetail(req.linkedHandoverId!)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#E9A23B] hover:opacity-90 rounded-md"
                            >
                              Deliver Missing
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenRequestDetail(req.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#172B4D] dark:text-slate-300 bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] border border-[#E3EAF3] dark:border-slate-700 rounded-md transition-colors"
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
        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F2EE] dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 border-b border-[#E3EAF3] dark:border-slate-800">
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
            <tbody className="divide-y divide-[#E3EAF3] dark:divide-slate-800">
              {loading && handovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Loading your document handovers...
                  </td>
                </tr>
              ) : handovers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center space-y-2">
                    <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-300">
                      No document handovers in this view
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                      className="hover:bg-[#F4F2EE] dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => onOpenHandoverDetail(h.id)}
                          className="font-mono font-bold text-[#1769E8] dark:text-blue-400 hover:underline text-left"
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
                            className="mt-0.5 block text-[10px] font-mono font-semibold text-[#123B78] dark:text-blue-400 hover:underline"
                          >
                            Req: {h.requestId}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#172B4D] dark:text-slate-100">
                          {h.studentName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {h.studentPassport} · {h.universityName || h.intakeTerm}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top max-w-xs">
                        <div className="font-medium text-[#172B4D] dark:text-slate-200 truncate">
                          {h.documents.map((d) => d.documentName).join(', ')}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                          {recCount}/{h.totalDocuments} Received
                          {missCount > 0 ? ` · ${missCount} Missing` : ''}
                          {defCount > 0 ? ` · ${defCount} Defective` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#172B4D] dark:text-slate-200">
                          {h.receivingEmployeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {h.lastAcknowledgedAt ? `Verified by ${h.lastAcknowledgedByName}` : 'Pending inspection'}
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
                          {canFollowUp && (
                            <button
                              type="button"
                              onClick={() => onOpenFollowUp(h)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#E9A23B] hover:opacity-90 rounded-md"
                            >
                              Deliver Missing
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenHandoverDetail(h.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#172B4D] dark:text-slate-300 bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] border border-[#E3EAF3] dark:border-slate-700 rounded-md transition-colors"
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
  );
};
