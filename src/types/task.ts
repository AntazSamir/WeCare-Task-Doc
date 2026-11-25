export type TaskPriority = 'High' | 'Medium' | 'Low' | 'Urgent';

export type TaskCategory = 'Personal' | 'Work' | 'Study' | 'Business' | 'Other';

export type TaskStatus = 'Pending' | 'Completed';

export type NavigationTab =
  | 'dashboard'
  | 'my-day'
  | 'upcoming'
  | 'calendar'
  | 'all-tasks'
  | 'students'
  | 'projects'
  | 'universities'
  | 'document-handover'
  | 'completed'
  | 'sheets-connection'
  | 'settings';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  taskDate: string; // YYYY-MM-DD (Required scheduled date)
  deadline: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm optional time schedule
  status: TaskStatus;
  createdAt: string; // ISO 8601
  completedAt: string | null; // ISO 8601 when confirmed completed
  notes: string;
  lastUpdated: string; // ISO 8601
  syncState?: 'synced' | 'pending_sync' | 'sync_failed';
  sheetRowNumber?: number;
}

export const GOOGLE_SHEETS_HEADERS = [
  'Task ID',
  'Task Title',
  'Description',
  'Category',
  'Priority',
  'Task Date',
  'Deadline',
  'Status',
  'Created At',
  'Completed At',
  'Notes',
  'Last Updated',
] as const;

export interface GoogleSheetRow {
  rowNumber: number;
  taskId: string;
  taskTitle: string;
  description: string;
  category: string;
  priority: string;
  taskDate: string;
  deadline: string;
  status: string;
  createdAt: string;
  completedAt: string;
  notes: string;
  lastUpdated: string;
}

export interface GoogleSpreadsheetItem {
  spreadsheetId: string;
  title: string;
  url: string;
  worksheets: string[];
  updatedAt: string;
  isLiveApi?: boolean;
}

export type SyncStatusType = 'Synced' | 'Syncing' | 'Sync Failed';

export interface GoogleSheetsConnectionState {
  connected: boolean;
  accountEmail: string;
  accountName: string;
  authMode: 'workspace_cloud' | 'oauth_live' | 'apps_script';
  oauthClientId: string;
  oauthAccessToken: string;
  appsScriptUrl: string;
  selectedSpreadsheetId: string;
  selectedSpreadsheetTitle: string;
  selectedWorksheet: string;
  autoSync: boolean;
  syncStatus: SyncStatusType;
  lastSyncedAt: string | null;
  headersInitialized: boolean;
  errorMessage?: string | null;
}

export interface SyncQueueItem {
  queueId: string;
  taskId: string;
  operation: 'UPSERT' | 'DELETE';
  taskSnapshot?: Task;
  queuedAt: string;
  retryCount: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'COMPLETE'
    | 'RESTORE'
    | 'DELETE'
    | 'FULL_SYNC'
    | 'INIT_HEADERS'
    | 'PULL_SHEET'
    | 'OFFLINE_QUEUE';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  details: string;
  taskId?: string;
  rowRange?: string;
}

export interface DashboardWidgetsConfig {
  // Executive Overview Widgets
  executiveBanner: boolean;
  kpiMetrics: boolean;
  visaPipeline: boolean;
  universityDeadlines: boolean;
  teamWorkload: boolean;

  // Daily Command Center & Task Widgets
  dailyProgressBar: boolean;
  taskMetricStrip: boolean;
  quickAddBar: boolean;
  overdueTasks: boolean;
  upcomingDeadlines: boolean;
  connectedSheetCard: boolean;
  weeklyCompletionTrend: boolean;

  // Individual Task Summary Metric Cards
  metricToday: boolean;
  metricUpcoming: boolean;
  metricCompleted: boolean;
  metricPending: boolean;
  metricOverdue: boolean;
  metricTotal: boolean;
  metricRate: boolean;
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetsConfig = {
  executiveBanner: true,
  kpiMetrics: true,
  visaPipeline: true,
  universityDeadlines: true,
  teamWorkload: true,
  dailyProgressBar: true,
  taskMetricStrip: true,
  quickAddBar: true,
  overdueTasks: true,
  upcomingDeadlines: true,
  connectedSheetCard: true,
  weeklyCompletionTrend: true,
  metricToday: true,
  metricUpcoming: true,
  metricCompleted: true,
  metricPending: true,
  metricOverdue: true,
  metricTotal: true,
  metricRate: true,
};

export interface AppSettings {
  theme: 'light' | 'dark';
  remindersEnabled: boolean;
  todayReminderShownDate: string | null;
  defaultCategory: TaskCategory;
  defaultPriority: TaskPriority;
  simulateOffline: boolean;

  // Appearance & Interface
  compactMode?: boolean;
  reducedMotion?: boolean;
  dashboardWidgets?: Partial<DashboardWidgetsConfig>;

  // Admissions & Visa Operations Defaults
  defaultIntakeTerm?: string;
  defaultVisaType?: string;
  defaultDegreeLevel?: string;
  quotaWarningThreshold?: number; // e.g. 80 (%)
  deadlineWarningDays?: number; // e.g. 30 (days)

  // Task & Workflow Automation
  requireCompletionConfirm?: boolean;
  soundEnabled?: boolean;
  tasksPerPage?: number;
  autoRescheduleOverdue?: boolean;

  // Google Sheets Sync Configuration
  autoSyncFrequency?: 'realtime' | '5m' | '15m' | 'manual';
  syncConflictPolicy?: 'sheets_wins' | 'local_wins' | 'last_modified';
  defaultWorksheetName?: string;

  // Notifications & Alerts
  overdueAlertsEnabled?: boolean;
  handoverAlertsEnabled?: boolean;
  desktopNotificationsEnabled?: boolean;

  // Regional Office & Emergency Contact
  regionalBranch?: string;
  dispatchEmergencyPhone?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'overdue';
  timestamp: string;
  read: boolean;
  taskId?: string;
}
