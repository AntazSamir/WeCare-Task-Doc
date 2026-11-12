import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Download,
  Upload,
  KeyRound,
  BookOpen,
  Table,
  History,
  FolderPlus,
  Layers,
  ShieldCheck,
  WifiOff,
  FileSpreadsheet,
} from 'lucide-react';
import {
  GOOGLE_SHEETS_HEADERS,
  GoogleSheetsConnectionState,
  GoogleSpreadsheetItem,
  SyncLogEntry,
  SyncQueueItem,
  Task,
} from '../types/task';
import { tasksToGoogleSheetRows } from '../services/googleSheetsService';
import { formatTimestamp } from '../utils/dateUtils';

interface GoogleSheetsPanelProps {
  tasks: Task[];
  connection: GoogleSheetsConnectionState;
  spreadsheets: GoogleSpreadsheetItem[];
  syncLogs: SyncLogEntry[];
  syncQueue: SyncQueueItem[];
  isOffline: boolean;
  onSyncNow: () => void;
  onPullFromSheet: () => void;
  onEnsureHeaders: () => void;
  onSelectSpreadsheet: (spreadsheetId: string) => void;
  onSelectWorksheet: (worksheetName: string) => void;
  onCreateSpreadsheet: (title: string, worksheetName: string) => void;
  onCreateWorksheetTab: (tabName: string) => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onUpdateOAuthCredentials: (
    mode: 'workspace_cloud' | 'oauth_live',
    clientId: string,
    accessToken: string,
    accountEmail: string
  ) => void;
  onExportCsv: () => void;
  onImportCsvText: (csvContent: string) => void;
}

const COLUMN_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  tasks,
  connection,
  spreadsheets,
  syncLogs,
  syncQueue,
  isOffline,
  onSyncNow,
  onPullFromSheet,
  onEnsureHeaders,
  onSelectSpreadsheet,
  onSelectWorksheet,
  onCreateSpreadsheet,
  onCreateWorksheetTab,
  onToggleAutoSync,
  onUpdateOAuthCredentials,
  onExportCsv,
  onImportCsvText,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'sheet-grid' | 'connection-config' | 'sync-logs' | 'setup-guide'
  >('sheet-grid');

  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [newSheetTab, setNewSheetTab] = useState('Daily_Tasks_2026');
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false);

  const [newTabName, setNewTabName] = useState('');
  const [showAddTabInput, setShowAddTabInput] = useState(false);

  const [oauthClientId, setOauthClientId] = useState(connection.oauthClientId || '');
  const [oauthAccessToken, setOauthAccessToken] = useState(connection.oauthAccessToken || '');
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState(
    connection.selectedSpreadsheetId || ''
  );
  const [accountEmailInput, setAccountEmailInput] = useState(
    connection.accountEmail || 'samiul.wecare@gmail.com'
  );
  const [oauthFeedback, setOauthFeedback] = useState<string | null>(null);

  const currentSpreadsheet =
    spreadsheets.find((s) => s.spreadsheetId === connection.selectedSpreadsheetId) ||
    spreadsheets[0];

  const sheetRows = tasksToGoogleSheetRows(tasks);

  const handleCreateSpreadsheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim()) return;
    onCreateSpreadsheet(newSheetTitle.trim(), newSheetTab.trim() || 'Daily_Tasks_2026');
    setNewSheetTitle('');
    setShowCreateSheetModal(false);
  };

  const handleAddWorksheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabName.trim()) return;
    onCreateWorksheetTab(newTabName.trim());
    setNewTabName('');
    setShowAddTabInput(false);
  };

  const handleLaunchGoogleOAuthPopup = () => {
    const win = window as any;
    if (!oauthClientId.trim()) {
      setOauthFeedback(
        'Enter your Google Cloud OAuth 2.0 Client ID below to launch the Google Identity Services popup, or paste an OAuth 2.0 Access Token directly.'
      );
      return;
    }
    if (win.google?.accounts?.oauth2) {
      const tokenClient = win.google.accounts.oauth2.initTokenClient({
        client_id: oauthClientId.trim(),
        scope:
          'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response?.access_token) {
            setOauthAccessToken(response.access_token);
            onUpdateOAuthCredentials(
              'oauth_live',
              oauthClientId.trim(),
              response.access_token,
              accountEmailInput.trim() || 'samiul.wecare@gmail.com'
            );
            setOauthFeedback(
              'Google OAuth 2.0 token acquired. Live Google Sheets API v4 connection is active.'
            );
          } else {
            setOauthFeedback('OAuth flow did not return an access token.');
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      setOauthFeedback(
        'Google Identity Services script is initializing. You can also paste an OAuth 2.0 Bearer token directly below.'
      );
    }
  };

  const handleSaveManualOAuthConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const useLive = Boolean(oauthAccessToken.trim());
    onUpdateOAuthCredentials(
      useLive ? 'oauth_live' : 'workspace_cloud',
      oauthClientId.trim(),
      oauthAccessToken.trim(),
      accountEmailInput.trim() || 'samiul.wecare@gmail.com'
    );
    if (customSpreadsheetId.trim() && customSpreadsheetId !== connection.selectedSpreadsheetId) {
      onSelectSpreadsheet(customSpreadsheetId.trim());
    }
    setOauthFeedback(
      useLive
        ? 'Connected to Live Google Sheets API v4 with provided OAuth 2.0 Access Token.'
        : 'Connected to Personal Google Workspace Sheet Engine with SQLite persistence.'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onImportCsvText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Connection Overview Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Google Sheets Synchronization Center
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Account:{' '}
              <span className="font-medium text-slate-900 dark:text-slate-200">
                {connection.accountEmail}
              </span>{' '}
              · Spreadsheet:{' '}
              <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                {connection.selectedSpreadsheetTitle}
              </span>{' '}
              · Worksheet:{' '}
              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                {connection.selectedWorksheet}
              </span>
            </p>
          </div>

          {/* Primary Sync Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={connection.syncStatus === 'Syncing'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  connection.syncStatus === 'Syncing' ? 'animate-spin' : ''
                }`}
              />
              {connection.syncStatus === 'Syncing' ? 'Syncing Sheet...' : 'Sync Now'}
            </button>

            <button
              type="button"
              onClick={onPullFromSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Load Tasks from Sheet
            </button>

            <button
              type="button"
              onClick={onEnsureHeaders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Verify 12 Headers
            </button>
          </div>
        </div>

        {/* Spreadsheet & Worksheet Selector Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Spreadsheet Selector */}
          <div className="md:col-span-5">
            <label
              htmlFor="select-spreadsheet"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Selected Google Spreadsheet
            </label>
            <div className="flex items-center gap-2">
              <select
                id="select-spreadsheet"
                value={connection.selectedSpreadsheetId}
                onChange={(e) => onSelectSpreadsheet(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              >
                {spreadsheets.map((sheet) => (
                  <option key={sheet.spreadsheetId} value={sheet.spreadsheetId}>
                    {sheet.title} ({sheet.spreadsheetId.slice(0, 12)}...)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCreateSheetModal((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                New Sheet
              </button>
            </div>
          </div>

          {/* Worksheet / Tab Selector */}
          <div className="md:col-span-4">
            <label
              htmlFor="select-worksheet"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Active Worksheet / Tab
            </label>
            <div className="flex items-center gap-2">
              <select
                id="select-worksheet"
                value={connection.selectedWorksheet}
                onChange={(e) => onSelectWorksheet(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
              >
                {(currentSpreadsheet?.worksheets || [connection.selectedWorksheet]).map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddTabInput((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                + Tab
              </button>
            </div>
          </div>

          {/* Sync Status & Auto-Sync Toggle */}
          <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-4 pb-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={connection.autoSync}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-Sync on Change
            </label>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                {isOffline || connection.syncStatus === 'Sync Failed' ? (
                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                    <WifiOff className="w-3.5 h-3.5" />
                    Sync Failed {syncQueue.length > 0 ? `(${syncQueue.length} queued)` : ''}
                  </span>
                ) : connection.syncStatus === 'Syncing' ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Syncing...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Synced
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                Last: {formatTimestamp(connection.lastSyncedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Inline Create New Spreadsheet Form */}
        {showCreateSheetModal && (
          <form
            onSubmit={handleCreateSpreadsheetSubmit}
            className="mt-4 p-4 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Google Spreadsheet Title
              </label>
              <input
                type="text"
                required
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                placeholder="e.g., Q4 Executive Task Tracker 2026"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Initial Worksheet Name
              </label>
              <input
                type="text"
                required
                value={newSheetTab}
                onChange={(e) => setNewSheetTab(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Create & Initialize 12 Headers
            </button>
            <button
              type="button"
              onClick={() => setShowCreateSheetModal(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Inline Add Worksheet Tab Form */}
        {showAddTabInput && (
          <form
            onSubmit={handleAddWorksheetSubmit}
            className="mt-4 p-4 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Worksheet / Tab Name in {connection.selectedSpreadsheetTitle}
              </label>
              <input
                type="text"
                required
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="e.g., November_Sprint_Tasks"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            >
              Create Tab & Sync Tasks
            </button>
            <button
              type="button"
              onClick={() => setShowAddTabInput(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Sub-Navigation Tabs (Functional Segmented Control) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
          <button
            type="button"
            onClick={() => setActiveSubTab('sheet-grid')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'sheet-grid'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Live Google Sheet Grid ({sheetRows.length} rows)
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('connection-config')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'connection-config'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Google OAuth 2.0 & API Settings
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sync-logs')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'sync-logs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Sync Audit Log & Queue ({syncLogs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('setup-guide')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'setup-guide'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Google Cloud & Windows PC Setup Guide
          </button>
        </div>

        {/* CSV Import / Export Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export .CSV
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5" />
            Import Sheet .CSV
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* TAB 1: Live 12-Column Google Sheet Grid View */}
      {activeSubTab === 'sheet-grid' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {connection.selectedWorksheet}!A1:L{sheetRows.length + 1}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                12 Required Columns Active · Zero Duplicate Task IDs Guaranteed
              </span>
            </div>
            <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Spreadsheet ID: {connection.selectedSpreadsheetId}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                {/* Column Letters Row */}
                <tr className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <th className="py-1.5 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center w-10">
                    #
                  </th>
                  {COLUMN_LETTERS.map((colLetter) => (
                    <th
                      key={colLetter}
                      className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-semibold"
                    >
                      {colLetter}
                    </th>
                  ))}
                </tr>

                {/* Row 1: Frozen Spreadsheet Column Headers */}
                <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                  <td className="py-2 px-2.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-slate-400">
                    1
                  </td>
                  {GOOGLE_SHEETS_HEADERS.map((header) => (
                    <td
                      key={header}
                      className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap"
                    >
                      {header}
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums text-[11px]">
                {sheetRows.map((row) => (
                  <tr
                    key={row.taskId}
                    className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors ${
                      row.status === 'Completed'
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-500 dark:text-slate-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <td className="py-2 px-2.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                      {row.rowNumber}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap font-semibold text-blue-700 dark:text-blue-400">
                      {row.taskId}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-sans font-medium max-w-[220px] truncate">
                      {row.taskTitle}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-sans max-w-[200px] truncate text-slate-500 dark:text-slate-400">
                      {row.description || '—'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap font-sans">
                      {row.category}
                    </td>
                    <td
                      className={`py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap font-sans ${
                        row.priority === 'High'
                          ? 'text-red-600 dark:text-red-400 font-semibold'
                          : row.priority === 'Medium'
                          ? 'text-amber-600 dark:text-amber-400'
                          : ''
                      }`}
                    >
                      {row.priority}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {row.taskDate}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      {row.deadline}
                    </td>
                    <td
                      className={`py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap font-sans font-semibold ${
                        row.status === 'Completed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {row.status}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap text-slate-500">
                      {formatTimestamp(row.createdAt)}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap text-emerald-700 dark:text-emerald-400">
                      {row.completedAt ? formatTimestamp(row.completedAt) : ''}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 font-sans max-w-[180px] truncate text-slate-500">
                      {row.notes || ''}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                      {formatTimestamp(row.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Google OAuth 2.0 & API Connection Configuration */}
      {activeSubTab === 'connection-config' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Google OAuth 2.0 & Personal Spreadsheet Connection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Authenticate with Google Identity Services (OAuth 2.0) to connect directly to{' '}
                <span className="font-mono">https://sheets.googleapis.com/v4/spreadsheets</span> or
                use the built-in Workspace Cloud Sheet sync engine.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              {connection.authMode === 'oauth_live'
                ? 'Live Google Sheets REST API v4'
                : 'Workspace Cloud + Local SQLite Sync'}
            </span>
          </div>

          {oauthFeedback && (
            <div className="p-3.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-200">
              {oauthFeedback}
            </div>
          )}

          <form onSubmit={handleSaveManualOAuthConfig} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Connected Google Account Email
                </label>
                <input
                  type="email"
                  value={accountEmailInput}
                  onChange={(e) => setAccountEmailInput(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Google Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={customSpreadsheetId}
                  onChange={(e) => setCustomSpreadsheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Google Cloud OAuth 2.0 Client ID (Optional for GIS Popup)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={oauthClientId}
                  onChange={(e) => setOauthClientId(e.target.value)}
                  placeholder="e.g., 1234567890-abcdefg.apps.googleusercontent.com"
                  className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleLaunchGoogleOAuthPopup}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  Sign in with Google OAuth 2.0
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                OAuth 2.0 Bearer Access Token (For Direct Google Sheets API v4 Requests)
              </label>
              <input
                type="password"
                value={oauthAccessToken}
                onChange={(e) => setOauthAccessToken(e.target.value)}
                placeholder="ya29.a0AfH6SM... (Leave blank to use instant Workspace Cloud + SQLite Sheet Store)"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
              >
                Save Connection Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Sync Audit Log & Offline Recovery Queue */}
      {activeSubTab === 'sync-logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Synchronization Audit Log & Offline Recovery Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracks every row insert, update, completion timestamp, and offline retry operation.
              </p>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500">
              Pending Offline Queue: {syncQueue.length} items
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Timestamp</th>
                  <th className="py-2.5 px-3 font-medium">Operation</th>
                  <th className="py-2.5 px-3 font-medium">Task ID</th>
                  <th className="py-2.5 px-3 font-medium">Sheet Range</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {log.taskId || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.rowRange || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : log.status === 'PENDING'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Step-by-Step Google Cloud Console & Windows PC Build Guide */}
      {activeSubTab === 'setup-guide' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              1. Architecture & Two-Way Google Sheets Synchronization
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              SheetSync Tasks uses an Offline-First Local SQLite + Google Sheets API v4 architecture:
            </p>
            <ul className="mt-2 list-disc list-inside text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <li>
                <strong>Local SQLite & Disk Persistence:</strong> All tasks, completion timestamps,
                and sync queue states are stored locally in <code className="font-mono">data/sheetsync_sqlite_store.json</code> and mirrored to browser storage for instant offline startup.
              </li>
              <li>
                <strong>Idempotent Deduping by Task ID:</strong> Every task has a unique immutable{' '}
                <code className="font-mono">Task ID</code> (Column A). During synchronization, rows
                are matched strictly by <code className="font-mono">Task ID</code> and reconciled by{' '}
                <code className="font-mono">Last Updated</code> (Column L), preventing duplicate rows.
              </li>
              <li>
                <strong>Offline Queue & Auto-Recovery:</strong> If the network disconnects, changes
                are appended to the local <code className="font-mono">SyncQueue</code> and flushed
                automatically when connectivity returns.
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              2. Step-by-Step Google Cloud Console & Google Sheets API Setup Guide
            </h3>
            <ol className="mt-2 list-decimal list-inside text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>
                Open the <strong>Google Cloud Console</strong> (<code className="font-mono">https://console.cloud.google.com/</code>) and create a new project (e.g., <em>SheetSync Desktop Task Manager</em>).
              </li>
              <li>
                Navigate to <strong>APIs & Services → Library</strong>, search for{' '}
                <strong>Google Sheets API</strong> and <strong>Google Drive API</strong>, and click{' '}
                <strong>Enable</strong> on both.
              </li>
              <li>
                Go to <strong>APIs & Services → OAuth consent screen</strong>, select{' '}
                <strong>External</strong>, enter your app name, and add your Google email (
                <code className="font-mono">samiul.wecare@gmail.com</code>) under{' '}
                <strong>Test users</strong>.
              </li>
              <li>
                Add the scopes <code className="font-mono">https://www.googleapis.com/auth/spreadsheets</code> and <code className="font-mono">https://www.googleapis.com/auth/drive.readonly</code>.
              </li>
              <li>
                Navigate to <strong>APIs & Services → Credentials → Create Credentials → OAuth client ID</strong>, choose <strong>Web application</strong> (or Desktop app), and add your origin URL under <strong>Authorized JavaScript origins</strong>.
              </li>
              <li>
                Copy your <strong>Client ID</strong> and paste it into the{' '}
                <strong>Google OAuth 2.0 & API Settings</strong> tab above, then click{' '}
                <strong>Sign in with Google OAuth 2.0</strong>.
              </li>
            </ol>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              3. Running Locally & Building the Windows PC Desktop Application
            </h3>
            <div className="mt-2 p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs space-y-1 overflow-x-auto">
              <div># 1. Install dependencies & start local PC server (Port 3000)</div>
              <div>npm install</div>
              <div>npm run dev</div>
              <div className="pt-2"># 2. Build production bundle for Windows PC (Electron / Desktop wrapper)</div>
              <div>npm run build</div>
              <div>npx electron-builder --win --x64</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
