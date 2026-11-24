import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
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
import { Spinner } from '@astryxdesign/core/Spinner';
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
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { TabTransition, MotionButton } from './animations';
import { RoundedSlidingTabs } from './ui/RoundedSlidingTabs';

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

      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-[#16A34A] dark:text-[#34C26B] shrink-0" />
              <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Google Sheets Synchronization Center
              </h2>
            </div>
            <p className="text-sm text-[#0F172A]/75 dark:text-[#9A9AA2]">
              Account:{' '}
              <span className="font-medium text-[#0F172A] dark:text-[#ECECEE]">
                {connection.accountEmail}
              </span>{' '}
              · Spreadsheet:{' '}
              <span className="tabular-nums text-xs text-[#0F172A] dark:text-[#ECECEE]">
                {connection.selectedSpreadsheetTitle}
              </span>{' '}
              · Worksheet:{' '}
              <span className="tabular-nums text-xs text-[#16A34A] dark:text-[#34C26B] font-semibold">
                {connection.selectedWorksheet}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <MotionButton
              onClick={onSyncNow}
              disabled={connection.syncStatus === 'Syncing'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#138A59] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] disabled:opacity-60 rounded transition-colors whitespace-nowrap shrink-0"
            >
              {connection.syncStatus === 'Syncing' ? (
                <Spinner size="sm" shade="inherit" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {connection.syncStatus === 'Syncing' ? 'Syncing Sheet...' : 'Sync Now'}
            </MotionButton>

            <MotionButton
              onClick={onPullFromSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded transition-colors whitespace-nowrap shrink-0"
            >
              Load Tasks from Sheet
            </MotionButton>

            <MotionButton
              onClick={onEnsureHeaders}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded transition-colors whitespace-nowrap shrink-0"
            >
              Verify 12 Headers
            </MotionButton>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#2E2E32] grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

          <div className="md:col-span-5">
            <label
              htmlFor="select-spreadsheet"
              className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1.5"
            >
              Selected Google Spreadsheet
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <MorphSelect
                  value={connection.selectedSpreadsheetId}
                  onValueChange={(v) => onSelectSpreadsheet(v)}
                >
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select spreadsheet..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    {spreadsheets.map((sheet) => (
                      <MorphSelectItem key={sheet.spreadsheetId} value={sheet.spreadsheetId}>
                        {sheet.title} ({sheet.spreadsheetId.slice(0, 12)}...)
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>
              <MotionButton
                onClick={() => setShowCreateSheetModal((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#1E3A8A] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#1E40AF]/25 dark:hover:bg-[#4C8DF6]/25 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6]" />
                New Sheet
              </MotionButton>
            </div>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="select-worksheet"
              className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1.5"
            >
              Active Worksheet / Tab
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <MorphSelect
                  value={connection.selectedWorksheet}
                  onValueChange={(v) => onSelectWorksheet(v)}
                >
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select worksheet..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    {(currentSpreadsheet?.worksheets || [connection.selectedWorksheet]).map((ws) => (
                      <MorphSelectItem key={ws} value={ws}>
                        {ws}
                      </MorphSelectItem>
                    ))}
                  </MorphSelectContent>
                </MorphSelect>
              </div>
              <MotionButton
                onClick={() => setShowAddTabInput((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#2E2E32] rounded transition-colors whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#ECECEE]" />
                + Tab
              </MotionButton>
            </div>
          </div>

          <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-4 pb-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#0F172A] dark:text-[#ECECEE]">
              <input
                type="checkbox"
                checked={connection.autoSync}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                className="rounded border-[#E2E8F0] dark:border-[#3A3A3F] text-[#1E40AF] dark:text-[#4C8DF6] focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6]"
              />
              Auto-Sync on Change
            </label>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                {isOffline || connection.syncStatus === 'Sync Failed' ? (
                  <span className="inline-flex items-center gap-1 text-[#DC2626] dark:text-[#EF5350]">
                    <WifiOff className="w-3.5 h-3.5" />
                    Sync Failed {syncQueue.length > 0 ? `(${syncQueue.length} queued)` : ''}
                  </span>
                ) : connection.syncStatus === 'Syncing' ? (
                  <span className="inline-flex items-center gap-1.5 text-[#D97706] dark:text-[#F0A030]">
                    <Spinner size="sm" shade="inherit" aria-hidden="true" />
                    Syncing...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-[#34C26B]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Synced
                  </span>
                )}
              </div>
              <div className="text-[11px] tabular-nums text-[#0F172A]/50 dark:text-[#9A9AA2]">
                Last: {formatTimestamp(connection.lastSyncedAt)}
              </div>
            </div>
          </div>
        </div>

        {showCreateSheetModal && (
          <form
            onSubmit={handleCreateSpreadsheetSubmit}
            className="mt-4 p-4 rounded-md bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                New Google Spreadsheet Title
              </label>
              <input
                type="text"
                required
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                placeholder="e.g., Q4 Executive Task Tracker 2026"
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                Initial Worksheet Name
              </label>
              <input
                type="text"
                required
                value={newSheetTab}
                onChange={(e) => setNewSheetTab(e.target.value)}
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] px-3 py-1.5 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
            <MotionButton
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded transition-colors"
            >
              Create & Initialize 12 Headers
            </MotionButton>
            <MotionButton
              onClick={() => setShowCreateSheetModal(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#0F172A]/70 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE]"
            >
              Cancel
            </MotionButton>
          </form>
        )}

        {showAddTabInput && (
          <form
            onSubmit={handleAddWorksheetSubmit}
            className="mt-4 p-4 rounded-md bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                New Worksheet / Tab Name in {connection.selectedSpreadsheetTitle}
              </label>
              <input
                type="text"
                required
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="e.g., November_Sprint_Tasks"
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#1C1C1E] px-3 py-1.5 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>
            <MotionButton
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#138A59] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded transition-colors"
            >
              Create Tab & Sync Tasks
            </MotionButton>
            <MotionButton
              onClick={() => setShowAddTabInput(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#0F172A]/70 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE]"
            >
              Cancel
            </MotionButton>
          </form>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <RoundedSlidingTabs
          variant="segmented"
          value={activeSubTab}
          stretch={0}
          blur={10}
          label="Google Sheets sub-sections"
          onValueChange={(id) =>
            setActiveSubTab(id as 'sheet-grid' | 'connection-config' | 'sync-logs' | 'setup-guide')
          }
          className="gap-1 p-1 bg-[#F8FAFC] dark:bg-[#161616] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md"
          indicatorClassName="rounded-md bg-[#1E3A8A] dark:bg-[rgba(76,141,246,0.14)] shadow-xs dark:shadow-none"
          buttonClassName="px-3.5 h-[30px] rounded-md text-xs font-medium"
          activeButtonClassName="text-white dark:text-[#4C8DF6]"
          inactiveButtonClassName="text-[#0F172A]/75 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE]"
          tabs={[
            {
              id: 'sheet-grid',
              label: `Live Google Sheet Grid (${sheetRows.length} rows)`,
              icon: <Table className="w-3.5 h-3.5" />,
            },
            {
              id: 'connection-config',
              label: 'Google OAuth 2.0 & API Settings',
              icon: <KeyRound className="w-3.5 h-3.5" />,
            },
            {
              id: 'sync-logs',
              label: `Sync Audit Log & Queue (${syncLogs.length})`,
              icon: <History className="w-3.5 h-3.5" />,
            },
            {
              id: 'setup-guide',
              label: 'Google Cloud & Windows PC Setup Guide',
              icon: <BookOpen className="w-3.5 h-3.5" />,
            },
          ]}
        />

        <div className="flex items-center gap-2">
          <MotionButton
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] rounded transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#ECECEE]" />
            Export .CSV
          </MotionButton>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#ECECEE]" />
            Import Sheet .CSV
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <TabTransition viewKey={activeSubTab} className="space-y-4">
      {activeSubTab === 'sheet-grid' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#16A34A]/10 dark:bg-[rgba(52,194,107,0.14)] border-b border-[#E2E8F0] dark:border-[#2E2E32] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#0F172A] dark:text-[#ECECEE]">
              <span className="tabular-nums font-semibold text-[#16A34A] dark:text-[#34C26B]">
                {connection.selectedWorksheet}!A1:L{sheetRows.length + 1}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                12 Required Columns Active · Zero Duplicates Guaranteed
              </span>
            </div>
            <div className="tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2]">
              Spreadsheet ID: {connection.selectedSpreadsheetId}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead>

                <tr className="bg-[#F8FAFC] dark:bg-[#252528] border-b border-[#E2E8F0] dark:border-[#2E2E32] text-[11px] tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2]">
                  <th className="py-1.5 px-2.5 border-r border-[#E2E8F0] dark:border-[#2E2E32] text-center w-10">
                    #
                  </th>
                  {COLUMN_LETTERS.map((colLetter) => (
                    <th
                      key={colLetter}
                      className="py-1.5 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] text-center font-semibold"
                    >
                      {colLetter}
                    </th>
                  ))}
                </tr>

                <tr className="bg-[#F8FAFC] dark:bg-[#1C1C1E] border-b-2 border-[#E2E8F0] dark:border-[#2E2E32] font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                  <td className="py-2 px-2.5 border-r border-[#E2E8F0] dark:border-[#2E2E32] text-center tabular-nums text-[#0F172A]/50 dark:text-[#9A9AA2]">
                    1
                  </td>
                  {GOOGLE_SHEETS_HEADERS.map((header) => (
                    <td
                      key={header}
                      className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap"
                    >
                      {header}
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] tabular-nums text-[11px]">
                {sheetRows.map((row) => (
                  <tr
                    key={row.taskId}
                    className={`hover:bg-[#EFF6FF]/40 dark:hover:bg-[#252528] transition-colors ${
                      row.status === 'Completed'
                        ? 'bg-[#16A34A]/5 dark:bg-[rgba(52,194,107,0.14)] text-[#0F172A]/60 dark:text-[#9A9AA2]'
                        : 'text-[#0F172A] dark:text-[#ECECEE]'
                    }`}
                  >
                    <td className="py-2 px-2.5 border-r border-[#E2E8F0] dark:border-[#2E2E32] text-center text-[#0F172A]/50 dark:text-[#9A9AA2] bg-[#F8FAFC] dark:bg-[#252528]">
                      {row.rowNumber}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap font-semibold text-[#1E40AF] dark:text-[#4C8DF6]">
                      {row.taskId}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] font-sans font-medium max-w-[220px] truncate">
                      {row.taskTitle}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] font-sans max-w-[200px] truncate text-[#0F172A]/65 dark:text-[#9A9AA2]">
                      {row.description || '—'}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap font-sans">
                      {row.category}
                    </td>
                    <td
                      className={`py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap font-sans ${
                        row.priority === 'High'
                          ? 'text-[#DC2626] dark:text-[#EF5350] font-semibold'
                          : row.priority === 'Medium'
                          ? 'text-[#D97706] dark:text-[#F0A030]'
                          : ''
                      }`}
                    >
                      {row.priority}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap">
                      {row.taskDate}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap">
                      {row.deadline}
                    </td>
                    <td
                      className={`py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap font-sans font-semibold ${
                        row.status === 'Completed'
                          ? 'text-[#16A34A] dark:text-[#34C26B]'
                          : 'text-[#0F172A] dark:text-[#ECECEE]'
                      }`}
                    >
                      {row.status}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap text-[#0F172A]/65 dark:text-[#9A9AA2]">
                      {formatTimestamp(row.createdAt)}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] whitespace-nowrap text-[#16A34A] dark:text-[#34C26B]">
                      {row.completedAt ? formatTimestamp(row.completedAt) : ''}
                    </td>
                    <td className="py-2 px-3 border-r border-[#E2E8F0] dark:border-[#2E2E32] font-sans max-w-[180px] truncate text-[#0F172A]/65 dark:text-[#9A9AA2]">
                      {row.notes || ''}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[#0F172A]/65 dark:text-[#9A9AA2]">
                      {formatTimestamp(row.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'connection-config' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] pb-4">
            <div>
              <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Google OAuth 2.0 & Personal Spreadsheet Connection
              </h3>
              <p className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2] mt-1">
                Authenticate with Google Identity Services (OAuth 2.0) to connect directly to{' '}
                <span className="tabular-nums">https://sheets.googleapis.com/v4/spreadsheets</span> or
                use the built-in Workspace Cloud Sheet sync engine.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A] dark:text-[#34C26B]">
              <ShieldCheck className="w-4 h-4" />
              {connection.authMode === 'oauth_live'
                ? 'Live Google Sheets REST API v4'
                : 'Workspace Cloud + Local SQLite Sync'}
            </span>
          </div>

          {oauthFeedback && (
            <div className="p-3.5 rounded-md bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/30 text-xs text-[#1E3A8A] dark:text-[#ECECEE]">
              {oauthFeedback}
            </div>
          )}

          <form onSubmit={handleSaveManualOAuthConfig} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                  Connected Google Account Email
                </label>
                <input
                  type="email"
                  value={accountEmailInput}
                  onChange={(e) => setAccountEmailInput(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-2 text-sm text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                  Target Google Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={customSpreadsheetId}
                  onChange={(e) => setCustomSpreadsheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-2 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                Google Cloud OAuth 2.0 Client ID (Optional for GIS Popup)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={oauthClientId}
                  onChange={(e) => setOauthClientId(e.target.value)}
                  placeholder="e.g., 1234567890-abcdefg.apps.googleusercontent.com"
                  className="flex-1 rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-2 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                />
                <MotionButton
                  onClick={handleLaunchGoogleOAuthPopup}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded transition-colors whitespace-nowrap shrink-0"
                >
                  Sign in with Google OAuth 2.0
                </MotionButton>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] mb-1">
                OAuth 2.0 Bearer Access Token (For Direct Google Sheets API v4 Requests)
              </label>
              <input
                type="password"
                value={oauthAccessToken}
                onChange={(e) => setOauthAccessToken(e.target.value)}
                placeholder="ya29.a0AfH6SM... (Leave blank to use instant Workspace Cloud + SQLite Sheet Store)"
                className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-2 text-xs tabular-nums text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <MotionButton
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#138A59] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded transition-colors"
              >
                Save Connection Configuration
              </MotionButton>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'sync-logs' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                Synchronization Audit Log & Offline Recovery Queue
              </h3>
              <p className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2]">
                Tracks every row insert, update, completion timestamp, and offline retry operation.
              </p>
            </div>
            <div className="text-xs tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2]">
              Pending Offline Queue: <span className={syncQueue.length === 0 ? 'dark:text-[#66666E]' : ''}>{syncQueue.length}</span> items
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md">
            <table className="w-full min-w-[780px] table-fixed text-left text-xs">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '40%' }} />
              </colgroup>
              <thead className="bg-[#F8FAFC] dark:bg-[#252528] border-b border-[#E2E8F0] dark:border-[#2E2E32] text-[#0F172A]/65 dark:text-[#9A9AA2]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Timestamp</th>
                  <th className="py-2.5 px-3 font-medium">Operation</th>
                  <th className="py-2.5 px-3 font-medium">Sheet Range</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#252528]">
                    <td className="py-2.5 px-3 tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2] whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums font-semibold text-[#0F172A] dark:text-[#ECECEE] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-[#0F172A]/65 dark:text-[#9A9AA2] whitespace-nowrap">
                      {log.rowRange || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'text-[#16A34A] dark:text-[#34C26B]'
                            : log.status === 'PENDING'
                            ? 'text-[#D97706] dark:text-[#F0A030]'
                            : 'text-[#DC2626] dark:text-[#EF5350]'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#0F172A]/75 dark:text-[#9A9AA2]">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'setup-guide' && (
        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-6 space-y-6 text-sm text-[#0F172A]/80 dark:text-[#9A9AA2] leading-relaxed">
          <div>
            <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              1. Architecture & Two-Way Google Sheets Synchronization
            </h3>
            <p className="mt-1 text-xs text-[#0F172A]/70 dark:text-[#9A9AA2]">
              WeCare Task uses an Offline-First Local SQLite + Google Sheets API v4 architecture:
            </p>
            <ul className="mt-2 list-disc list-inside text-xs space-y-1 text-[#0F172A]/70 dark:text-[#9A9AA2]">
              <li>
                <strong className="dark:text-[#ECECEE]">Local SQLite & Disk Persistence:</strong> All tasks, completion timestamps,
                and sync queue states are stored locally in <code className="tabular-nums">data/sheetsync_sqlite_store.json</code> and mirrored to browser storage for instant offline startup.
              </li>
              <li>
                <strong className="dark:text-[#ECECEE]">Idempotent Deduping:</strong> Every task has a unique immutable internal ID (Column A). During synchronization, rows
                are matched strictly by internal ID and reconciled by{' '}
                <code className="tabular-nums">Last Updated</code> (Column L), preventing duplicate rows.
              </li>
              <li>
                <strong className="dark:text-[#ECECEE]">Offline Queue & Auto-Recovery:</strong> If the network disconnects, changes
                are appended to the local <code className="tabular-nums">SyncQueue</code> and flushed
                automatically when connectivity returns.
              </li>
            </ul>
          </div>

          <div className="border-t border-[#E2E8F0] dark:border-[#2E2E32] pt-4">
            <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              2. Step-by-Step Google Cloud Console & Google Sheets API Setup Guide
            </h3>
            <ol className="mt-2 list-decimal list-inside text-xs space-y-1.5 text-[#0F172A]/70 dark:text-[#9A9AA2]">
              <li>
                Open the <strong className="dark:text-[#ECECEE]">Google Cloud Console</strong> (<code className="tabular-nums">https://console.cloud.google.com/</code>) and create a new project (e.g., <em>SheetSync Desktop Task Manager</em>).
              </li>
              <li>
                Navigate to <strong className="dark:text-[#ECECEE]">APIs & Services → Library</strong>, search for{' '}
                <strong className="dark:text-[#ECECEE]">Google Sheets API</strong> and <strong className="dark:text-[#ECECEE]">Google Drive API</strong>, and click{' '}
                <strong className="dark:text-[#ECECEE]">Enable</strong> on both.
              </li>
              <li>
                Go to <strong className="dark:text-[#ECECEE]">APIs & Services → OAuth consent screen</strong>, select{' '}
                <strong className="dark:text-[#ECECEE]">External</strong>, enter your app name, and add your Google email (
                <code className="tabular-nums">samiul.wecare@gmail.com</code>) under{' '}
                <strong className="dark:text-[#ECECEE]">Test users</strong>.
              </li>
              <li>
                Add the scopes <code className="tabular-nums">https://www.googleapis.com/auth/spreadsheets</code> and <code className="tabular-nums">https://www.googleapis.com/auth/drive.readonly</code>.
              </li>
              <li>
                Navigate to <strong className="dark:text-[#ECECEE]">APIs & Services → Credentials → Create Credentials → OAuth client ID</strong>, choose <strong className="dark:text-[#ECECEE]">Web application</strong> (or Desktop app), and add your origin URL under <strong className="dark:text-[#ECECEE]">Authorized JavaScript origins</strong>.
              </li>
              <li>
                Copy your <strong className="dark:text-[#ECECEE]">Client ID</strong> and paste it into the{' '}
                <strong className="dark:text-[#ECECEE]">Google OAuth 2.0 & API Settings</strong> tab above, then click{' '}
                <strong className="dark:text-[#ECECEE]">Sign in with Google OAuth 2.0</strong>.
              </li>
            </ol>
          </div>

          <div className="border-t border-[#E2E8F0] dark:border-[#2E2E32] pt-4">
            <h3 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              3. Running Locally & Building the Windows PC Desktop Application
            </h3>
            <div className="mt-2 p-3.5 rounded-lg bg-[#1E3A8A] dark:bg-[#252528] dark:border dark:border-[#2E2E32] text-white dark:text-[#ECECEE] tabular-nums text-xs space-y-1 overflow-x-auto">
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
      </TabTransition>
    </div>
  );
};
