import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Sun,
  CalendarClock,
  Calendar as CalendarIcon,
  ListTodo,
  CheckCircle2,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Plus,
  Search,
  RefreshCw,
  Bell,
  BellOff,
  Moon,
  Monitor,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ListFilter,
  LayoutList,
  Check,
  X,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  FolderKanban,
  Building2,
  GraduationCap,
  Clock,
  Layers,
  Percent,
  FileCheck2,
} from 'lucide-react';
import {
  AppNotification,
  AppSettings,
  GOOGLE_SHEETS_HEADERS,
  GoogleSheetsConnectionState,
  GoogleSpreadsheetItem,
  NavigationTab,
  SyncLogEntry,
  SyncQueueItem,
  Task,
  TaskCategory,
  TaskPriority,
} from './types/task';
import {
  addDaysToIsoDate,
  formatFullHeaderDate,
  formatReadableDate,
  formatTimestamp,
  getLocalTodayIso,
  isTaskOverdue,
  isTaskToday,
  isTaskUpcoming,
  getDaysDifference,
} from './utils/dateUtils';
import {
  createLiveGoogleSpreadsheet,
  deduplicateTasks,
  ensureLiveGoogleSheetHeaders,
  exportTasksToCsv,
  parseTasksFromCsv,
  pullTasksFromLiveGoogleSheet,
  pushTasksToLiveGoogleSheet,
} from './services/googleSheetsService';
import { TaskCard } from './components/TaskCard';
import { CompletionConfirmModal } from './components/CompletionConfirmModal';
import { TaskFormModal } from './components/TaskFormModal';
import { CalendarView } from './components/CalendarView';
import { GoogleSheetsPanel } from './components/GoogleSheetsPanel';
import { UpcomingDeadlinesWidget } from './components/UpcomingDeadlinesWidget';
import { OverdueTasksWidget } from './components/OverdueTasksWidget';
import { WeeklyCompletionTrend } from './components/WeeklyCompletionTrend';
import {
  UserProfile,
  KoreanUniversity,
  IntakeProject,
  StudentApplication,
  PmsTask,
  InAppNotification,
  HandoverStats,
} from './types/pms';
import {
  getSessionUser,
  setSessionUser,
  fetchTeam,
  fetchUniversities,
  fetchProjects,
  fetchStudents,
  fetchAnalytics,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotificationStream,
  createPmsTask,
  fetchHandoverStats,
} from './services/pmsService';
import { RoleSwitcherBar } from './components/RoleSwitcherBar';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { StudentDossierList } from './components/StudentDossierList';
import { StudentDossierModal } from './components/StudentDossierModal';
import { NewStudentModal } from './components/NewStudentModal';
import { IntakeProjectsView } from './components/IntakeProjectsView';
import { UniversityDirectoryView } from './components/UniversityDirectoryView';
import { EnhancedTaskModal } from './components/EnhancedTaskModal';
import { DashboardSkeleton } from './components/SkeletonLoaders';
import { TeamTaskManagementView } from './components/TeamTaskManagementView';
import { DocumentHandoverView } from './components/DocumentHandoverView';

const LOCAL_STORAGE_KEY = 'sheetsync_pc_state_v1';

export function App() {
  const todayIso = getLocalTodayIso();

  // Navigation & View Mode
  const [activeNav, setActiveNav] = useState<NavigationTab>('dashboard');
  const [dashboardViewMode, setDashboardViewMode] = useState<'list' | 'calendar'>('list');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sheetsync_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sheetsync_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors in restricted contexts
      }
      return next;
    });
  }, []);

  // Global Ctrl+B / Cmd+B keyboard shortcut for sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Core Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [connection, setConnection] = useState<GoogleSheetsConnectionState>({
    connected: true,
    accountEmail: 'samiul.wecare@gmail.com',
    accountName: 'Samiul (Personal Google Workspace)',
    authMode: 'workspace_cloud',
    oauthClientId: '',
    oauthAccessToken: '',
    appsScriptUrl: '',
    selectedSpreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    selectedSpreadsheetTitle: 'Personal Daily Task Master 2026',
    selectedWorksheet: 'Daily_Tasks_2026',
    autoSync: true,
    syncStatus: 'Synced',
    lastSyncedAt: new Date().toISOString(),
    headersInitialized: true,
    errorMessage: null,
  });
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => {
    let initialTheme: 'light' | 'dark' | 'system' = 'light';
    try {
      const stored = localStorage.getItem('pms_theme_preference');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        initialTheme = stored;
      }
    } catch {}
    return {
      theme: initialTheme,
      remindersEnabled: true,
      todayReminderShownDate: null,
      defaultCategory: 'Work',
      defaultPriority: 'Medium',
      simulateOffline: false,
    };
  });

  // Network & Loading State
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>(
    'All'
  );

  // Quick Inline Add Task Bar
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('Work');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('Medium');
  const [quickDate, setQuickDate] = useState(todayIso);

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [taskToConfirmComplete, setTaskToConfirmComplete] = useState<Task | null>(null);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);

  // Notifications & Toast Banner
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'overdue';
  } | null>(null);

  // PMS Consultancy State & Modals
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getSessionUser());
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [universities, setUniversities] = useState<KoreanUniversity[]>([]);
  const [projects, setProjects] = useState<IntakeProject[]>([]);
  const [students, setStudents] = useState<StudentApplication[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pmsNotifications, setPmsNotifications] = useState<InAppNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<StudentApplication | null>(null);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [isEnhancedTaskModalOpen, setIsEnhancedTaskModalOpen] = useState(false);
  const [taskContextStudentId, setTaskContextStudentId] = useState<string | undefined>(undefined);
  const [taskContextProjectId, setTaskContextProjectId] = useState<string | undefined>(undefined);
  const [prefillStudentUniversityId, setPrefillStudentUniversityId] = useState<string | undefined>(undefined);
  const [prefillStudentProgramId, setPrefillStudentProgramId] = useState<string | undefined>(undefined);
  const [prefillStudentIntakeTerm, setPrefillStudentIntakeTerm] = useState<string | undefined>(undefined);
  const [handoverStats, setHandoverStats] = useState<HandoverStats | null>(null);
  const [selectedHandoverIdFromNotif, setSelectedHandoverIdFromNotif] = useState<string | null>(null);
  const clearSelectedHandoverFromNotif = useCallback(() => setSelectedHandoverIdFromNotif(null), []);

  const isOffline = !browserOnline || settings.simulateOffline;

  // Stable mirrors in refs to eliminate cascading render loops
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const connectionRef = useRef<GoogleSheetsConnectionState>(connection);
  connectionRef.current = connection;
  const spreadsheetsRef = useRef<GoogleSpreadsheetItem[]>(spreadsheets);
  spreadsheetsRef.current = spreadsheets;
  const syncLogsRef = useRef<SyncLogEntry[]>(syncLogs);
  syncLogsRef.current = syncLogs;
  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;
  const browserOnlineRef = useRef<boolean>(browserOnline);
  browserOnlineRef.current = browserOnline;
  const hasGeneratedDailyRemindersRef = useRef<boolean>(false);
  const isFlushingQueueRef = useRef<boolean>(false);
  const prevIsOfflineRef = useRef<boolean>(isOffline);

  // Apply Light / Dark / System Theme to <html> and synchronize storage
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      let isDark = false;
      if (settings.theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = settings.theme === 'dark';
      }
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    try {
      localStorage.setItem('pms_theme_preference', settings.theme);
    } catch {}

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Helper to show non-intrusive toast and record notification
  const pushNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'info' | 'success' | 'warning' | 'overdue' = 'info',
      taskId?: string
    ) => {
      const id = `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newNotif: AppNotification = {
        id,
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false,
        taskId,
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 29)]);
      setActiveToast({ id, title, message, type });
    },
    []
  );

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 4200);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Append Sync Audit Log
  const appendSyncLog = useCallback(
    (
      action: SyncLogEntry['action'],
      status: SyncLogEntry['status'],
      details: string,
      taskId?: string,
      rowRange?: string
    ) => {
      const entry: SyncLogEntry = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: new Date().toISOString(),
        action,
        status,
        details,
        taskId,
        rowRange,
      };
      setSyncLogs((prev) => [entry, ...prev.slice(0, 79)]);
      return entry;
    },
    []
  );

  // Load initial state from Server SQLite store with LocalStorage fallback
  useEffect(() => {
    let mounted = true;
    async function hydrateState() {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Server state fetch failed');
        const data = await res.json();
        if (!mounted) return;

        const loadedTasks = deduplicateTasks(data.tasks || []);
        setTasks(loadedTasks);
        if (Array.isArray(data.spreadsheets) && data.spreadsheets.length > 0) {
          setSpreadsheets(data.spreadsheets);
        }
        if (data.connection) {
          setConnection(data.connection);
        }
        if (Array.isArray(data.syncLogs)) {
          setSyncLogs(data.syncLogs);
        }
        if (data.settings) {
          const storedTheme = localStorage.getItem('pms_theme_preference') as ('light' | 'dark' | 'system' | null);
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            theme: storedTheme || data.settings.theme || prev.theme,
          }));
        }

        // Cache locally for offline resilience
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({
            tasks: loadedTasks,
            spreadsheets: data.spreadsheets,
            connection: data.connection,
            syncLogs: data.syncLogs,
            settings: data.settings,
          })
        );
      } catch {
        // Fallback to localStorage offline cache
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached && mounted) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.tasks) setTasks(deduplicateTasks(parsed.tasks));
            if (parsed.spreadsheets) setSpreadsheets(parsed.spreadsheets);
            if (parsed.connection) setConnection(parsed.connection);
            if (parsed.syncLogs) setSyncLogs(parsed.syncLogs);
            if (parsed.settings) {
              const storedTheme = localStorage.getItem('pms_theme_preference') as ('light' | 'dark' | 'system' | null);
              setSettings((prev) => ({
                ...prev,
                ...parsed.settings,
                theme: storedTheme || parsed.settings.theme || prev.theme,
              }));
            }
          } catch {
            // ignore corrupt cache
          }
        }
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    }
    hydrateState();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch all PMS Consultancy records (scoped by currentUser role/id)
  const refreshPmsData = useCallback(async () => {
    try {
      const [tList, uList, pList, sList, aData, nList, hStats] = await Promise.all([
        fetchTeam().catch(() => []),
        fetchUniversities().catch(() => []),
        fetchProjects().catch(() => []),
        fetchStudents().catch(() => []),
        fetchAnalytics().catch(() => null),
        fetchNotifications().catch(() => []),
        fetchHandoverStats().catch(() => null),
      ]);
      setTeam(tList);
      if (tList.length > 0) {
        setCurrentUser((prev) => {
          const fresh = tList.find((u) => u.id === prev.id);
          if (fresh && fresh.team !== prev.team) {
            const updated = { ...prev, team: fresh.team, role: fresh.role, title: fresh.title, name: fresh.name };
            setSessionUser(updated);
            return updated;
          }
          return prev;
        });
      }
      setUniversities(uList);
      setProjects(pList);
      setStudents(sList);
      setAnalytics(aData);
      setPmsNotifications(nList);
      if (hStats) setHandoverStats(hStats);
    } catch (err) {
      console.warn('Failed to refresh PMS records', err);
    }
  }, []);

  // Role switching between Admission Manager and individual Consultants
  const handleSwitchUser = useCallback(
    (newUser: UserProfile) => {
      setSessionUser(newUser);
      setCurrentUser(newUser);
      pushNotification(
        'Persona Switched',
        `Operating as ${newUser.name} (${newUser.role === 'Admission_Manager' ? 'Admission Manager' : 'Consultant'}). Access permissions updated.`,
        'info'
      );
    },
    [pushNotification]
  );

  // Subscribe to real-time notification stream (SSE)
  useEffect(() => {
    refreshPmsData();
    const unsubscribe = subscribeToNotificationStream(currentUser.id, (notif) => {
      setPmsNotifications((prev) => [notif, ...prev]);
      pushNotification(notif.title, notif.message, notif.type === 'deadline_warning' ? 'warning' : 'info');
      refreshPmsData();
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser.id, refreshPmsData, pushNotification]);

  // Enhanced Task Creation & Assignment
  const handleSaveEnhancedTask = async (taskData: Partial<PmsTask>) => {
    try {
      const res = await createPmsTask(taskData);
      await refreshPmsData();
      // Synchronize with existing tasks list
      const tasksRes = await fetch('/api/tasks', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (tasksRes.ok) {
        const pTasks = await tasksRes.json();
        setTasks(pTasks);
      }
      setIsEnhancedTaskModalOpen(false);
      pushNotification(
        'Consultancy Task Assigned & Synced',
        `"${taskData.title}" assigned to ${taskData.assignedToName || 'team'}. Google Sheets synced.`,
        'success',
        res.id
      );
    } catch (err: any) {
      pushNotification('Task Error', err?.message || 'Failed to save task', 'warning');
    }
  };

  const handleReloadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.warn('Failed to reload tasks', err);
    }
  }, [currentUser]);

  // Generate Daily Reminders on load when remindersEnabled is true (runs once on initial load)
  useEffect(() => {
    if (isInitialLoading || hasGeneratedDailyRemindersRef.current || !settings.remindersEnabled || tasks.length === 0) return;
    hasGeneratedDailyRemindersRef.current = true;

    const todayPending = tasks.filter(
      (t) => t.status === 'Pending' && t.taskDate === todayIso
    );
    const overdueList = tasks.filter((t) => isTaskOverdue(t, todayIso));

    const initialNotifs: AppNotification[] = [];
    if (overdueList.length > 0) {
      initialNotifs.push({
        id: 'INIT-OVERDUE',
        title: `${overdueList.length} Overdue ${overdueList.length === 1 ? 'Task' : 'Tasks'} Require Attention`,
        message: `Includes "${overdueList[0].title}" (${overdueList[0].id}). Reschedule or confirm completion.`,
        type: 'overdue',
        timestamp: new Date().toISOString(),
        read: false,
        taskId: overdueList[0].id,
      });
    }
    if (todayPending.length > 0) {
      initialNotifs.push({
        id: 'INIT-TODAY',
        title: `${todayPending.length} Tasks Scheduled for Today`,
        message: `First up: "${todayPending[0].title}" (${todayPending[0].priority} priority).`,
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
        taskId: todayPending[0].id,
      });
    }
    if (initialNotifs.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const filtered = initialNotifs.filter((n) => !existingIds.has(n.id));
        if (filtered.length === 0) return prev;
        return [...filtered, ...prev];
      });
    }
  }, [isInitialLoading, settings.remindersEnabled, tasks, todayIso]);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Core Synchronization Function (Local SQLite + Google Sheets API v4)
  const synchronizeWithSheets = useCallback(
    async (
      updatedTasks: Task[],
      actionLabel: SyncLogEntry['action'] = 'FULL_SYNC',
      detailMessage = 'Synchronized all tasks with Google Sheets',
      affectedTaskId?: string,
      overrideConnection?: Partial<GoogleSheetsConnectionState>,
      overrideSpreadsheets?: GoogleSpreadsheetItem[],
      overrideSettings?: AppSettings
    ) => {
      const deduplicated = deduplicateTasks(updatedTasks);
      const nextConn: GoogleSheetsConnectionState = {
        ...connectionRef.current,
        ...overrideConnection,
      };
      const nextSheets = overrideSpreadsheets || spreadsheetsRef.current;
      const nextSettings = overrideSettings || settingsRef.current;
      const isCurrentlyOnline = browserOnlineRef.current && !nextSettings.simulateOffline;

      // Always save immediately to LocalStorage for offline resilience
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          tasks: deduplicated,
          spreadsheets: nextSheets,
          connection: nextConn,
          syncLogs: syncLogsRef.current,
          settings: nextSettings,
        })
      );

      // Check if offline
      if (!isCurrentlyOnline) {
        const failedConn: GoogleSheetsConnectionState = {
          ...nextConn,
          syncStatus: 'Sync Failed',
          errorMessage: 'Network offline — changes saved to local SQLite & queued for retry.',
        };
        setConnection(failedConn);
        setTasks(
          deduplicated.map((t) =>
            t.id === affectedTaskId ? { ...t, syncState: 'pending_sync' } : t
          )
        );
        if (affectedTaskId) {
          setSyncQueue((prev) => [
            ...prev.filter((q) => q.taskId !== affectedTaskId),
            {
              queueId: `Q-${Date.now()}`,
              taskId: affectedTaskId,
              operation: actionLabel === 'DELETE' ? 'DELETE' : 'UPSERT',
              queuedAt: new Date().toISOString(),
              retryCount: 0,
            },
          ]);
        }
        appendSyncLog(
          'OFFLINE_QUEUE',
          'PENDING',
          `Offline: saved locally & queued for Google Sheets sync (${detailMessage})`,
          affectedTaskId,
          `${nextConn.selectedWorksheet}!A1:L${deduplicated.length + 1}`
        );
        return;
      }

      // Online: Set status to Syncing
      setConnection((prev) => ({
        ...prev,
        ...overrideConnection,
        syncStatus: 'Syncing',
        errorMessage: null,
      }));

      try {
        // 1. If connected via Live Google OAuth 2.0 Access Token, push directly to Google Sheets API v4
        if (nextConn.authMode === 'oauth_live' && nextConn.oauthAccessToken) {
          await pushTasksToLiveGoogleSheet(
            nextConn.oauthAccessToken,
            nextConn.selectedSpreadsheetId,
            nextConn.selectedWorksheet,
            deduplicated
          );
        }

        // 2. Persist to local SQLite backend & workspace sheet store
        const nowIso = new Date().toISOString();
        const syncedConn: GoogleSheetsConnectionState = {
          ...nextConn,
          syncStatus: 'Synced',
          lastSyncedAt: nowIso,
          headersInitialized: true,
          errorMessage: null,
        };

        const newLog = appendSyncLog(
          actionLabel,
          'SUCCESS',
          detailMessage,
          affectedTaskId,
          `${syncedConn.selectedWorksheet}!A1:L${deduplicated.length + 1}`
        );

        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: deduplicated,
            connection: syncedConn,
            spreadsheets: nextSheets,
            syncLogs: [newLog, ...syncLogsRef.current.slice(0, 50)],
            settings: nextSettings,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          if (Array.isArray(resData.tasks)) {
            setTasks(resData.tasks);
          } else {
            setTasks(deduplicated.map((t) => ({ ...t, syncState: 'synced' })));
          }
        } else {
          setTasks(deduplicated.map((t) => ({ ...t, syncState: 'synced' })));
        }

        setConnection(syncedConn);
        setSyncQueue([]);
      } catch (err: any) {
        const errMsg = err?.message || 'Synchronization error with Google Sheets API';
        setConnection((prev) => ({
          ...prev,
          syncStatus: 'Sync Failed',
          errorMessage: errMsg,
        }));
        appendSyncLog(
          actionLabel,
          'FAILED',
          errMsg,
          affectedTaskId,
          `${nextConn.selectedWorksheet}!A1:L${deduplicated.length + 1}`
        );
      }
    },
    [appendSyncLog]
  );

  // Automatic Offline Recovery when connection returns (triggered only on offline-to-online transition)
  useEffect(() => {
    const wasOffline = prevIsOfflineRef.current;
    prevIsOfflineRef.current = isOffline;

    if (wasOffline && !isOffline && syncQueue.length > 0 && !isFlushingQueueRef.current) {
      isFlushingQueueRef.current = true;
      const queuedCount = syncQueue.length;
      const currentTasks = tasksRef.current;
      const targetWorksheet = connectionRef.current.selectedWorksheet;

      synchronizeWithSheets(
        currentTasks,
        'FULL_SYNC',
        `Recovered from offline mode: flushed ${queuedCount} queued changes to Google Sheets`
      )
        .then(() => {
          pushNotification(
            'Google Sheets Sync Recovered',
            `Automatically synchronized ${queuedCount} queued offline changes to ${targetWorksheet}.`,
            'success'
          );
        })
        .finally(() => {
          isFlushingQueueRef.current = false;
        });
    }
  }, [isOffline, syncQueue.length, synchronizeWithSheets, pushNotification]);

  // Generate next unique Task ID (TSK-1010, TSK-1011...)
  const generateNextTaskId = useCallback((): string => {
    let maxNum = 1000;
    for (const t of tasks) {
      const match = t.id.match(/TSK-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `TSK-${maxNum + 1}`;
  }, [tasks]);

  // Create or Update Task
  const handleSaveTask = (taskData: {
    id?: string;
    title: string;
    description: string;
    category: TaskCategory;
    priority: TaskPriority;
    taskDate: string;
    deadline: string;
    scheduledTime?: string;
    notes: string;
  }) => {
    const nowIso = new Date().toISOString();

    if (taskData.id) {
      // Edit existing task
      const updatedList = tasks.map((t) =>
        t.id === taskData.id
          ? {
              ...t,
              title: taskData.title,
              description: taskData.description,
              category: taskData.category,
              priority: taskData.priority,
              taskDate: taskData.taskDate,
              deadline: taskData.deadline,
              scheduledTime: taskData.scheduledTime,
              notes: taskData.notes,
              lastUpdated: nowIso,
            }
          : t
      );
      setTasks(updatedList);
      if (connection.autoSync) {
        synchronizeWithSheets(
          updatedList,
          'UPDATE',
          `Updated task ${taskData.id} ("${taskData.title}") in ${connection.selectedWorksheet}`,
          taskData.id
        );
      }
      pushNotification(
        'Task Updated',
        `"${taskData.title}" (${taskData.id}) updated and synced.`,
        'info',
        taskData.id
      );
    } else {
      // Create new task
      const newId = generateNextTaskId();
      const newTask: Task = {
        id: newId,
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        taskDate: taskData.taskDate,
        deadline: taskData.deadline || taskData.taskDate,
        scheduledTime: taskData.scheduledTime,
        status: 'Pending',
        createdAt: nowIso,
        completedAt: null,
        notes: taskData.notes,
        lastUpdated: nowIso,
        syncState: isOffline ? 'pending_sync' : 'synced',
        sheetRowNumber: tasks.length + 2,
      };
      const updatedList = [newTask, ...tasks];
      setTasks(updatedList);
      if (connection.autoSync) {
        synchronizeWithSheets(
          updatedList,
          'CREATE',
          `Appended new task ${newId} ("${newTask.title}") to ${connection.selectedWorksheet}`,
          newId
        );
      }
      pushNotification(
        'Task Created & Synced',
        `Added "${newTask.title}" (${newId}) for ${formatReadableDate(newTask.taskDate)}.`,
        'success',
        newId
      );
    }
  };

  // Quick Inline Task Creation
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    handleSaveTask({
      title: quickTitle.trim(),
      description: '',
      category: quickCategory,
      priority: quickPriority,
      taskDate: quickDate || todayIso,
      deadline: quickDate || todayIso,
      notes: '',
    });
    setQuickTitle('');
  };

  // Step 4-6 of Task Confirmation System: Confirm Completion
  const handleConfirmTaskCompletion = (task: Task, completionNote: string) => {
    const completedIso = new Date().toISOString();
    const updatedList = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: 'Completed' as const,
            completedAt: completedIso,
            notes: completionNote.trim() || t.notes,
            lastUpdated: completedIso,
          }
        : t
    );
    setTasks(updatedList);
    setTaskToConfirmComplete(null);

    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'COMPLETE',
        `Confirmed completion of ${task.id} ("${task.title}") at ${formatTimestamp(completedIso)}`,
        task.id
      );
    }

    if (settings.remindersEnabled) {
      pushNotification(
        'Task Completed & Synced to Google Sheets',
        `"${task.title}" (${task.id}) marked Completed at ${formatTimestamp(completedIso)}.`,
        'success',
        task.id
      );
    }
  };

  // Restore Completed Task to Pending
  const handleRestoreTaskToPending = (task: Task) => {
    const nowIso = new Date().toISOString();
    const updatedList = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: 'Pending' as const,
            completedAt: null,
            lastUpdated: nowIso,
          }
        : t
    );
    setTasks(updatedList);
    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'RESTORE',
        `Reopened task ${task.id} ("${task.title}") to Pending status in Google Sheets`,
        task.id
      );
    }
    pushNotification(
      'Task Restored to Pending',
      `"${task.title}" (${task.id}) is now back in your Pending list.`,
      'info',
      task.id
    );
  };

  // Duplicate Task
  const handleDuplicateTask = (task: Task) => {
    const newId = generateNextTaskId();
    const nowIso = new Date().toISOString();
    const duplicated: Task = {
      ...task,
      id: newId,
      title: `${task.title} (Copy)`,
      status: 'Pending',
      createdAt: nowIso,
      completedAt: null,
      lastUpdated: nowIso,
      sheetRowNumber: tasks.length + 2,
    };
    const updatedList = [duplicated, ...tasks];
    setTasks(updatedList);
    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'CREATE',
        `Duplicated ${task.id} as new task ${newId} in ${connection.selectedWorksheet}`,
        newId
      );
    }
    pushNotification('Task Duplicated', `Created "${duplicated.title}" (${newId}).`, 'info', newId);
  };

  // Delete Task
  const handleDeleteTask = (task: Task) => {
    const updatedList = tasks.filter((t) => t.id !== task.id);
    setTasks(updatedList);
    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'DELETE',
        `Removed task ${task.id} ("${task.title}") and compacted Google Sheets rows`,
        task.id
      );
    }
    pushNotification(
      'Task Deleted',
      `Removed "${task.title}" (${task.id}) from local SQLite and Google Sheets.`,
      'warning',
      task.id
    );
  };

  // Quick Reschedule (+1 Day)
  const handleQuickReschedule = (task: Task, daysToAdd: number) => {
    const nextTaskDate = addDaysToIsoDate(task.taskDate || todayIso, daysToAdd);
    const nextDeadline = addDaysToIsoDate(task.deadline || task.taskDate || todayIso, daysToAdd);
    const nowIso = new Date().toISOString();
    const updatedList = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            taskDate: nextTaskDate,
            deadline: nextDeadline,
            lastUpdated: nowIso,
          }
        : t
    );
    setTasks(updatedList);
    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'UPDATE',
        `Rescheduled ${task.id} to ${nextTaskDate} in ${connection.selectedWorksheet}`,
        task.id
      );
    }
    pushNotification(
      'Task Rescheduled',
      `"${task.title}" rescheduled to ${formatReadableDate(nextTaskDate)}.`,
      'info',
      task.id
    );
  };

  const handleRescheduleToToday = (task: Task) => {
    const nowIso = new Date().toISOString();
    const updatedList = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            taskDate: todayIso,
            deadline: todayIso,
            lastUpdated: nowIso,
          }
        : t
    );
    setTasks(updatedList);
    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'UPDATE',
        `Rescheduled overdue task ${task.id} to Today in ${connection.selectedWorksheet}`,
        task.id
      );
    }
    pushNotification(
      'Rescheduled to Today',
      `"${task.title}" moved to today's schedule.`,
      'info',
      task.id
    );
  };

  const handleRescheduleAllOverdueToToday = () => {
    if (stats.overdueTasks.length === 0) return;
    const nowIso = new Date().toISOString();
    const overdueIds = new Set(stats.overdueTasks.map((t) => t.id));
    const updatedList = tasks.map((t) =>
      overdueIds.has(t.id)
        ? {
            ...t,
            taskDate: todayIso,
            deadline: todayIso,
            lastUpdated: nowIso,
          }
        : t
    );
    setTasks(updatedList);
    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'UPDATE',
        `Rescheduled ${stats.overdueTasks.length} overdue tasks to Today in ${connection.selectedWorksheet}`
      );
    }
    pushNotification(
      'All Overdue Moved to Today',
      `Moved ${stats.overdueTasks.length} overdue tasks to today's list.`,
      'success'
    );
  };

  // Drag-and-Drop Task Reordering
  const handleReorderTasks = useCallback(
    (sourceTaskId: string, targetTaskId: string, position: 'before' | 'after') => {
      if (sourceTaskId === targetTaskId) return;

      setTasks((prevTasks) => {
        const sourceIndex = prevTasks.findIndex((t) => t.id === sourceTaskId);
        const targetIndex = prevTasks.findIndex((t) => t.id === targetTaskId);

        if (sourceIndex === -1 || targetIndex === -1) return prevTasks;

        const sourceTask = prevTasks[sourceIndex];
        const targetTask = prevTasks[targetIndex];
        const reordered = [...prevTasks];

        // Remove source task
        reordered.splice(sourceIndex, 1);

        // Find insertion index in the new array
        const newTargetIndex = reordered.findIndex((t) => t.id === targetTaskId);
        const insertIndex = position === 'before' ? newTargetIndex : newTargetIndex + 1;

        reordered.splice(insertIndex, 0, sourceTask);

        // Re-index sheetRowNumber for clean 1:1 Google Sheets row mapping
        const resequenced = reordered.map((t, idx) => ({
          ...t,
          sheetRowNumber: idx + 2,
          lastUpdated: new Date().toISOString(),
        }));

        if (connection.autoSync) {
          synchronizeWithSheets(
            resequenced,
            'UPDATE',
            `Reordered: moved "${sourceTask.title}" (${sourceTask.id}) ${position} "${targetTask.title}" (${targetTask.id}) in ${connection.selectedWorksheet}`,
            sourceTask.id
          );
        }

        pushNotification(
          'Task Reordered',
          `Moved "${sourceTask.title}" ${position} "${targetTask.title}". Position updated in Google Sheets.`,
          'info',
          sourceTask.id
        );

        return resequenced;
      });
    },
    [connection.autoSync, connection.selectedWorksheet, synchronizeWithSheets, pushNotification]
  );

  // Accessible Move Up / Move Down
  const handleMoveTask = useCallback(
    (task: Task, direction: 'up' | 'down', listScope: Task[]) => {
      const listIndex = listScope.findIndex((t) => t.id === task.id);
      if (listIndex === -1) return;

      const targetIndex = direction === 'up' ? listIndex - 1 : listIndex + 1;
      if (targetIndex < 0 || targetIndex >= listScope.length) return;

      const targetTask = listScope[targetIndex];
      const position = direction === 'up' ? 'before' : 'after';
      handleReorderTasks(task.id, targetTask.id, position);
    },
    [handleReorderTasks]
  );

  // Google Sheets Operations
  const handleManualSyncNow = () => {
    synchronizeWithSheets(
      tasks,
      'FULL_SYNC',
      `Manual Sync Now: verified ${tasks.length} tasks and 12 column headers in ${connection.selectedWorksheet}`
    );
    pushNotification(
      'Synchronized with Google Sheets',
      `All ${tasks.length} task records are up to date in ${connection.selectedSpreadsheetTitle} / ${connection.selectedWorksheet}.`,
      'success'
    );
  };

  const handlePullFromSheet = async () => {
    if (connection.authMode === 'oauth_live' && connection.oauthAccessToken) {
      try {
        setConnection((prev) => ({ ...prev, syncStatus: 'Syncing' }));
        const liveTasks = await pullTasksFromLiveGoogleSheet(
          connection.oauthAccessToken,
          connection.selectedSpreadsheetId,
          connection.selectedWorksheet
        );
        setTasks(liveTasks);
        setConnection((prev) => ({
          ...prev,
          syncStatus: 'Synced',
          lastSyncedAt: new Date().toISOString(),
        }));
        appendSyncLog(
          'PULL_SHEET',
          'SUCCESS',
          `Loaded ${liveTasks.length} tasks from live Google Spreadsheet (${connection.selectedWorksheet})`
        );
        pushNotification(
          'Loaded Tasks from Google Sheets',
          `Successfully pulled ${liveTasks.length} tasks from ${connection.selectedWorksheet}.`,
          'success'
        );
      } catch (err: any) {
        setConnection((prev) => ({
          ...prev,
          syncStatus: 'Sync Failed',
          errorMessage: err?.message,
        }));
      }
    } else {
      // Pull from server SQLite / sheet store
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        const loaded = deduplicateTasks(data.tasks || []);
        setTasks(loaded);
        appendSyncLog(
          'PULL_SHEET',
          'SUCCESS',
          `Loaded ${loaded.length} existing task records from ${connection.selectedWorksheet}`
        );
        pushNotification(
          'Loaded Existing Spreadsheet Records',
          `Refreshed ${loaded.length} tasks from ${connection.selectedSpreadsheetTitle}.`,
          'success'
        );
      }
    }
  };

  const handleEnsureHeaders = async () => {
    if (connection.authMode === 'oauth_live' && connection.oauthAccessToken) {
      await ensureLiveGoogleSheetHeaders(
        connection.oauthAccessToken,
        connection.selectedSpreadsheetId,
        connection.selectedWorksheet
      );
    }
    appendSyncLog(
      'INIT_HEADERS',
      'SUCCESS',
      `Verified 12 required headers (${GOOGLE_SHEETS_HEADERS.join(' | ')}) in ${connection.selectedWorksheet}!A1:L1`,
      undefined,
      `${connection.selectedWorksheet}!A1:L1`
    );
    pushNotification(
      '12 Column Headers Verified',
      `Row 1 (A1:L1) in ${connection.selectedWorksheet} is configured with all 12 required columns.`,
      'success'
    );
  };

  const handleSelectSpreadsheet = (spreadsheetId: string) => {
    const found = spreadsheets.find((s) => s.spreadsheetId === spreadsheetId);
    const nextTitle = found?.title || 'Connected Google Spreadsheet';
    const nextWs = found?.worksheets[0] || 'Daily_Tasks_2026';
    const updatedConn: Partial<GoogleSheetsConnectionState> = {
      selectedSpreadsheetId: spreadsheetId,
      selectedSpreadsheetTitle: nextTitle,
      selectedWorksheet: nextWs,
    };
    setConnection((prev) => ({ ...prev, ...updatedConn }));
    synchronizeWithSheets(
      tasks,
      'FULL_SYNC',
      `Switched active spreadsheet to "${nextTitle}" (${nextWs}) and synchronized ${tasks.length} tasks`,
      undefined,
      updatedConn
    );
  };

  const handleSelectWorksheet = (worksheetName: string) => {
    const updatedConn: Partial<GoogleSheetsConnectionState> = {
      selectedWorksheet: worksheetName,
    };
    setConnection((prev) => ({ ...prev, ...updatedConn }));
    synchronizeWithSheets(
      tasks,
      'FULL_SYNC',
      `Switched active worksheet tab to "${worksheetName}" and verified 12 headers`,
      undefined,
      updatedConn
    );
  };

  const handleCreateSpreadsheet = async (title: string, worksheetName: string) => {
    try {
      if (connection.authMode === 'oauth_live' && connection.oauthAccessToken) {
        const created = await createLiveGoogleSpreadsheet(
          connection.oauthAccessToken,
          title,
          worksheetName,
          tasks
        );
        const nextList = [created, ...spreadsheets];
        setSpreadsheets(nextList);
        const updatedConn: Partial<GoogleSheetsConnectionState> = {
          selectedSpreadsheetId: created.spreadsheetId,
          selectedSpreadsheetTitle: created.title,
          selectedWorksheet: worksheetName,
        };
        synchronizeWithSheets(
          tasks,
          'INIT_HEADERS',
          `Created new live Google Spreadsheet "${title}" with tab "${worksheetName}"`,
          undefined,
          updatedConn,
          nextList
        );
      } else {
        const res = await fetch('/api/spreadsheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, worksheetName }),
        });
        if (res.ok) {
          const data = await res.json();
          setSpreadsheets(data.spreadsheets);
          setConnection(data.connection);
          appendSyncLog(
            'INIT_HEADERS',
            'SUCCESS',
            `Created new Google Spreadsheet "${title}" (${worksheetName}) and initialized 12 headers`
          );
          pushNotification(
            'New Google Spreadsheet Created',
            `Created "${title}" with worksheet "${worksheetName}" and synced ${tasks.length} tasks.`,
            'success'
          );
        }
      }
    } catch (err: any) {
      pushNotification('Spreadsheet Creation Failed', err?.message || 'Error creating sheet', 'warning');
    }
  };

  const handleCreateWorksheetTab = (tabName: string) => {
    const updatedSheets = spreadsheets.map((s) =>
      s.spreadsheetId === connection.selectedSpreadsheetId
        ? {
            ...s,
            worksheets: s.worksheets.includes(tabName)
              ? s.worksheets
              : [...s.worksheets, tabName],
          }
        : s
    );
    setSpreadsheets(updatedSheets);
    const updatedConn: Partial<GoogleSheetsConnectionState> = {
      selectedWorksheet: tabName,
    };
    setConnection((prev) => ({ ...prev, ...updatedConn }));
    synchronizeWithSheets(
      tasks,
      'INIT_HEADERS',
      `Created new worksheet tab "${tabName}" in ${connection.selectedSpreadsheetTitle} with 12 column headers`,
      undefined,
      updatedConn,
      updatedSheets
    );
    pushNotification(
      'New Worksheet Tab Created',
      `Initialized "${tabName}" with 12 column headers and synced tasks.`,
      'success'
    );
  };

  const handleExportCsv = () => {
    const csv = exportTasksToCsv(tasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${connection.selectedWorksheet}_${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushNotification(
      'Exported Google Sheets CSV',
      `Downloaded ${tasks.length} tasks with 12 standard columns.`,
      'info'
    );
  };

  const handleImportCsvText = (csvContent: string) => {
    const importedTasks = parseTasksFromCsv(csvContent);
    if (importedTasks.length === 0) {
      pushNotification(
        'CSV Import Notice',
        'No valid task rows were found in the selected CSV file.',
        'warning'
      );
      return;
    }
    const merged = deduplicateTasks([...importedTasks, ...tasks]);
    setTasks(merged);
    synchronizeWithSheets(
      merged,
      'PULL_SHEET',
      `Imported and deduplicated ${importedTasks.length} rows from CSV into ${connection.selectedWorksheet}`
    );
    pushNotification(
      'Imported Tasks from Spreadsheet CSV',
      `Merged ${importedTasks.length} spreadsheet rows (0 duplicates).`,
      'success'
    );
  };

  // Computed Statistics for Dashboard
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed');
    const pending = tasks.filter((t) => t.status === 'Pending');
    const todayAll = tasks.filter((t) => isTaskToday(t, todayIso));
    const todayCompleted = todayAll.filter((t) => t.status === 'Completed');
    const todayPending = todayAll.filter((t) => t.status === 'Pending');
    const upcoming = tasks.filter((t) => isTaskUpcoming(t, todayIso));
    const overdue = tasks.filter((t) => isTaskOverdue(t, todayIso));

    const dailyCompletionPct =
      todayAll.length > 0
        ? Math.round((todayCompleted.length / todayAll.length) * 100)
        : total > 0
        ? Math.round((completed.length / total) * 100)
        : 0;

    return {
      total,
      completedCount: completed.length,
      pendingCount: pending.length,
      todayCount: todayAll.length,
      todayCompletedCount: todayCompleted.length,
      todayPendingCount: todayPending.length,
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      dailyCompletionPct,
      todayTasks: todayAll,
      upcomingTasks: upcoming,
      overdueTasks: overdue,
      completedTasks: completed,
      pendingTasks: pending,
    };
  }, [tasks, todayIso]);

  // Filtered Tasks for All Tasks / Views
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.id.toLowerCase().includes(q) ||
          task.notes.toLowerCase().includes(q) ||
          task.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (categoryFilter !== 'All' && task.category !== categoryFilter) {
        return false;
      }
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) {
        return false;
      }
      if (statusFilter === 'Pending' && task.status !== 'Pending') return false;
      if (statusFilter === 'Completed' && task.status !== 'Completed') return false;
      if (statusFilter === 'Overdue' && !isTaskOverdue(task, todayIso)) return false;
      return true;
    });
  }, [tasks, searchQuery, categoryFilter, priorityFilter, statusFilter, todayIso]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const navSections: {
    title: string;
    items: {
      id: NavigationTab;
      label: string;
      icon: React.FC<{ className?: string; size?: number; color?: string }>;
      accentColor: string;
      count?: number;
      badgeTone?: 'overdue' | 'normal';
      isLiveSync?: boolean;
    }[];
  }[] = [
    {
      title: 'Consultancy PMS',
      items: [
        {
          id: 'dashboard',
          label: 'Executive Pipeline',
          icon: LayoutDashboard,
          accentColor: 'text-[#1769E8] dark:text-blue-400',
        },
        {
          id: 'students',
          label: 'Student Dossiers',
          icon: Users as any,
          count: students.length,
          accentColor: 'text-[#16A36A] dark:text-emerald-400',
        },
        {
          id: 'projects',
          label: 'Intake Projects',
          icon: FolderKanban as any,
          count: projects.length,
          accentColor: 'text-[#36A5F5] dark:text-sky-400',
        },
        {
          id: 'universities',
          label: 'Korean Universities',
          icon: Building2 as any,
          count: universities.length,
          accentColor: 'text-[#E9A23B] dark:text-amber-400',
        },
        {
          id: 'document-handover',
          label: 'Document Handover',
          icon: FileCheck2 as any,
          count:
            currentUser.team === 'Counseling Team'
              ? (handoverStats?.actionNeededRequestsAssignedToMe || 0) +
                (handoverStats?.myNeedsFollowUp || 0)
              : handoverStats?.myPendingVerifications ?? handoverStats?.pendingReceipts ?? 0,
          accentColor: 'text-[#1769E8] dark:text-cyan-400',
        },
      ],
    },
    {
      title: 'Tasks & Schedule',
      items: [
        {
          id: 'all-tasks',
          label: 'All Tasks Directory',
          icon: ListTodo,
          count: stats.total,
          accentColor: 'text-[#36A5F5] dark:text-sky-400',
        },
        {
          id: 'my-day',
          label: 'My Day',
          icon: Sun,
          count: stats.todayCount,
          accentColor: 'text-[#E9A23B] dark:text-amber-400',
        },
        {
          id: 'upcoming',
          label: 'Upcoming Deadlines',
          icon: CalendarClock,
          count: stats.upcomingCount,
          accentColor: 'text-[#1769E8] dark:text-indigo-400',
        },
        {
          id: 'calendar',
          label: 'Calendar Schedule',
          icon: CalendarIcon,
          accentColor: 'text-[#DC4545] dark:text-rose-400',
        },
        {
          id: 'completed',
          label: 'Completed Archive',
          icon: CheckCircle2,
          count: stats.completedCount,
          accentColor: 'text-[#16A36A] dark:text-emerald-400',
        },
      ],
    },
    {
      title: 'Workspace',
      items: [
        {
          id: 'sheets-connection',
          label: 'Google Sheets',
          icon: FileSpreadsheet,
          accentColor: 'text-[#16A36A] dark:text-green-400',
          isLiveSync: true,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: SettingsIcon,
          accentColor: 'text-[#123B78] dark:text-slate-300',
        },
      ],
    },
  ];

  const allNavItems = useMemo(() => navSections.flatMap((s) => s.items), [navSections]);

  const currentNavTitle =
    allNavItems.find((item) => item.id === activeNav)?.label || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100">
      {/* LEFT SIDEBAR NAVIGATION (Collapsible: 256px expanded / 64px collapsed) */}
      <aside
        className={`shrink-0 bg-[#FFFFFF] dark:bg-slate-900 border-r border-[#E3EAF3] dark:border-slate-800 flex flex-col h-screen sticky top-0 select-none transition-all duration-300 ease-in-out z-30 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header — Mathematically aligned with top workspace header (h-14, matching bottom border) */}
        <div className="h-14 shrink-0 px-3.5 flex items-center border-b border-[#E3EAF3] dark:border-slate-800">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#1769E8] text-white flex items-center justify-center font-display font-bold text-sm shadow-[0_0_12px_rgba(23,105,232,0.3)] shrink-0">
                SS
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm tracking-tight text-[#172B4D] dark:text-slate-100 leading-none truncate">
                  SheetSync PMS
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Korea Visa & Tasks
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-[#1769E8] text-white flex items-center justify-center font-display font-bold text-sm shadow-[0_0_12px_rgba(23,105,232,0.3)] shrink-0">
                SS
              </div>
            </div>
          )}
        </div>

        {/* Middle Scrollable Area: Main Navigation */}
        <div className={`flex-1 overflow-y-auto overscroll-contain ${isSidebarCollapsed ? 'p-2 py-2' : 'px-4 py-3'}`}>
          <nav className="space-y-3.5" aria-label="Main Navigation">
            {navSections.map((section, idx) => (
              <div key={section.title} className="space-y-1">
                {!isSidebarCollapsed ? (
                  <div className="px-2 pt-1 pb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-mono">
                      {section.title}
                    </span>
                  </div>
                ) : (
                  idx > 0 && (
                    <div className="my-1.5 mx-2 border-t border-[#E3EAF3] dark:border-slate-800" />
                  )
                )}
                <div className={`space-y-0.5 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;

                    if (isSidebarCollapsed) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveNav(item.id)}
                          title={`${item.label}${typeof item.count === 'number' ? ` (${item.count})` : ''}`}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center relative sidebar-nav-btn group ${
                            isActive
                              ? 'bg-[#123B78] text-white dark:bg-slate-800 dark:text-white shadow-xs'
                              : 'text-[#172B4D]/75 dark:text-slate-400 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800/60 hover:text-[#123B78] dark:hover:text-slate-200'
                          }`}
                          aria-label={item.label}
                        >
                          <Icon
                            className={`sidebar-nav-icon w-4 h-4 shrink-0 group-hover:scale-110 ${
                              isActive ? 'text-[#36A5F5]' : item.accentColor
                            } ${
                              isActive
                                ? 'opacity-100'
                                : 'opacity-85 group-hover:opacity-100'
                            }`}
                          />
                          {item.isLiveSync ? (
                            <span
                              className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                isOffline || connection.syncStatus === 'Sync Failed'
                                  ? 'bg-[#DC4545]'
                                  : connection.syncStatus === 'Syncing'
                                  ? 'bg-[#E9A23B]'
                                  : 'bg-[#16A36A]'
                              }`}
                            />
                          ) : typeof item.count === 'number' && item.count > 0 ? (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1769E8] ring-2 ring-white dark:ring-slate-900" />
                          ) : null}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveNav(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium sidebar-nav-btn group whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-[#123B78] text-white dark:bg-slate-800 dark:text-white shadow-xs'
                            : 'text-[#172B4D]/80 dark:text-slate-400 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800/60 hover:text-[#123B78] dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`sidebar-nav-icon w-4 h-4 shrink-0 group-hover:scale-110 ${
                              isActive ? 'text-[#36A5F5]' : item.accentColor
                            } ${
                              isActive
                                ? 'opacity-100'
                                : 'opacity-85 group-hover:opacity-100'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.isLiveSync && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOffline || connection.syncStatus === 'Sync Failed'
                                  ? 'bg-[#DC4545]'
                                  : connection.syncStatus === 'Syncing'
                                  ? 'bg-[#E9A23B]'
                                  : 'bg-[#16A36A]'
                              }`}
                              title={`Google Sheets: ${isOffline ? 'Offline' : connection.syncStatus}`}
                            />
                          )}
                          {typeof item.count === 'number' && (
                            <span
                              className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${
                                isActive
                                  ? 'text-[#DCEBFF] bg-white/15'
                                  : 'text-[#123B78]/75 dark:text-slate-400 bg-[#F4F2EE] border border-[#E3EAF3] dark:border-slate-700 dark:bg-slate-800/80'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Dedicated Sticky Footer Container inside Sidebar */}
        {!isSidebarCollapsed ? (
          <div className="shrink-0 p-4 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 space-y-3 shadow-[0_-4px_16px_rgba(18,59,120,0.03)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
            {/* Primary Action Button (Pinned in Dedicated Sticky Footer for High Visibility) */}
            <button
              type="button"
              onClick={() => {
                setTaskContextStudentId(undefined);
                setTaskContextProjectId(undefined);
                setIsEnhancedTaskModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] active:scale-[0.98] rounded-lg transition-all shadow-[0_2px_10px_rgba(23,105,232,0.28)] whitespace-nowrap shrink-0 group"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
              <span>{currentUser.role === 'Admission_Manager' ? 'Assign Task' : 'New Task'}</span>
            </button>

            {/* Google Sheets Live Sync Card */}
            <div className="p-3 rounded-lg bg-[#F4F2EE] dark:bg-slate-800/50 border border-[#E3EAF3] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#172B4D] dark:text-slate-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A36A] dark:text-emerald-400" />
                  Google Sheets
                </span>
                <span
                  className={`font-mono text-[11px] font-semibold flex items-center gap-1 ${
                    isOffline || connection.syncStatus === 'Sync Failed'
                      ? 'text-[#DC4545] dark:text-red-400'
                      : connection.syncStatus === 'Syncing'
                      ? 'text-[#E9A23B] dark:text-amber-400'
                      : 'text-[#16A36A] dark:text-emerald-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOffline || connection.syncStatus === 'Sync Failed'
                        ? 'bg-[#DC4545]'
                        : connection.syncStatus === 'Syncing'
                        ? 'bg-[#E9A23B]'
                        : 'bg-[#16A36A]'
                    }`}
                  />
                  {isOffline ? 'Sync Failed' : connection.syncStatus}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {connection.selectedSpreadsheetTitle}
              </div>
              <div className="text-[11px] font-mono text-[#172B4D]/80 dark:text-slate-300 truncate">
                Tab: {connection.selectedWorksheet}
              </div>

              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleManualSyncNow}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#16A36A] dark:text-emerald-300 bg-[#16A36A]/10 dark:bg-emerald-950/60 hover:bg-[#16A36A]/20 dark:hover:bg-emerald-900/70 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${
                      connection.syncStatus === 'Syncing' ? 'animate-spin' : ''
                    }`}
                  />
                  Sync Now
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('sheets-connection')}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-[#172B4D] dark:text-slate-300 hover:bg-[#DCEBFF] dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Inspect
                </button>
              </div>
            </div>

            {/* Collapse Sidebar Button - Consolidated in Sticky Footer */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-[#123B78] dark:hover:text-slate-100 hover:bg-[#F4F2EE] dark:hover:bg-slate-800/80 rounded-lg transition-colors group border border-transparent hover:border-[#E3EAF3] dark:hover:border-slate-700/60"
              aria-label="Collapse sidebar"
            >
              <span className="flex items-center gap-2">
                <PanelLeftClose className="w-4 h-4 text-slate-400 group-hover:text-[#1769E8] dark:group-hover:text-slate-200 transition-colors" />
                <span>Collapse Sidebar</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded">
                Ctrl+B
              </kbd>
            </button>
          </div>
        ) : (
          <div className="shrink-0 p-3 border-t border-[#E3EAF3] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 flex flex-col items-center gap-2.5 shadow-[0_-4px_16px_rgba(18,59,120,0.03)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
            {/* Primary Action Button (Collapsed Icon Form) */}
            <button
              type="button"
              onClick={() => {
                setTaskContextStudentId(undefined);
                setTaskContextProjectId(undefined);
                setIsEnhancedTaskModalOpen(true);
              }}
              title={currentUser.role === 'Admission_Manager' ? 'Assign Task' : 'New Task'}
              className="w-10 h-10 rounded-lg bg-[#1769E8] hover:bg-[#123B78] active:scale-95 text-white flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(23,105,232,0.28)] shrink-0 group"
              aria-label={currentUser.role === 'Admission_Manager' ? 'Assign Task' : 'New Task'}
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            </button>

            {/* Collapsed Google Sheets Icon Button */}
            <button
              type="button"
              onClick={() => setActiveNav('sheets-connection')}
              title={`Google Sheets: ${isOffline ? 'Sync Failed' : connection.syncStatus}\nSpreadsheet: ${connection.selectedSpreadsheetTitle}\nTab: ${connection.selectedWorksheet}\nClick to inspect connection`}
              className="w-10 h-10 rounded-lg flex items-center justify-center relative bg-[#F4F2EE] dark:bg-slate-800/50 border border-[#E3EAF3] dark:border-slate-800 hover:border-[#16A36A]/50 transition-colors group"
              aria-label="Google Sheets synchronization status"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#16A36A] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  isOffline || connection.syncStatus === 'Sync Failed'
                    ? 'bg-[#DC4545]'
                    : connection.syncStatus === 'Syncing'
                    ? 'bg-[#E9A23B]'
                    : 'bg-[#16A36A]'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={handleManualSyncNow}
              title="Sync Now with Google Sheets"
              className="p-2 text-slate-400 hover:text-[#16A36A] dark:hover:text-emerald-400 hover:bg-[#F4F2EE] dark:hover:bg-slate-800 rounded-md transition-colors"
              aria-label="Sync now"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  connection.syncStatus === 'Syncing' ? 'animate-spin text-[#16A36A]' : ''
                }`}
              />
            </button>

            {/* Expand Sidebar Button - Consolidated in Sticky Footer */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar (Ctrl+B)"
              className="w-10 h-10 rounded-lg bg-[#F4F2EE] dark:bg-slate-800 hover:bg-[#DCEBFF] dark:hover:bg-slate-700 text-[#172B4D] dark:text-slate-300 flex items-center justify-center transition-colors group mt-1 border border-[#E3EAF3] dark:border-slate-700/60"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          </div>
        )}
      </aside>

      {/* MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR (Fixed, Reduced Height h-14, Perfectly Aligned with Sidebar Brand Logo) */}
        <header className="sticky top-0 z-20 h-14 px-4 sm:px-6 bg-[#FFFFFF]/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-[#E3EAF3] dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-[0_1px_3px_rgba(18,59,120,0.02)]">
          {/* Left: Contextual Breadcrumb */}
          <div className="flex items-center gap-3 text-sm min-w-0">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                Workspace
              </span>
              <span className="text-[#E3EAF3] dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#172B4D] dark:text-slate-100 truncate">
                {currentNavTitle}
              </span>
            </div>
            {stats.overdueCount > 0 && (
              <>
                <span className="text-[#E3EAF3] dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('Overdue');
                    setActiveNav('all-tasks');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#DC4545] dark:text-red-400 hover:underline whitespace-nowrap shrink-0"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {stats.overdueCount} Overdue
                </button>
              </>
            )}
          </div>

          {/* Center: Global Task Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeNav === 'sheets-connection' || activeNav === 'settings') {
                  setActiveNav('all-tasks');
                }
              }}
              placeholder="Search tasks by title, ID (TSK-1001), category, or notes..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 placeholder:text-slate-400 focus:bg-[#FFFFFF] dark:focus:bg-slate-900 focus:border-[#1769E8] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#172B4D]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Role Switcher, Offline Toggle, Notification Center, Theme Toggle, Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Interactive Admin Role Switcher (Admission Manager vs Consultant) */}
            <RoleSwitcherBar
              currentUser={currentUser}
              team={team}
              onSwitchUser={handleSwitchUser}
            />

            {/* Offline Simulator / Network Status Button */}
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  simulateOffline: !prev.simulateOffline,
                }))
              }
              title={
                isOffline
                  ? 'Offline Mode Active — Click to reconnect & flush queue to Google Sheets'
                  : 'Online & Connected — Click to test Offline SQLite Queue'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                isOffline
                  ? 'bg-[#DC4545]/10 dark:bg-red-950/50 text-[#DC4545] dark:text-red-300 border-[#DC4545]/30 dark:border-red-900'
                  : 'bg-[#F4F2EE] dark:bg-slate-800 text-[#172B4D] dark:text-slate-300 border-[#E3EAF3] dark:border-slate-700 hover:bg-[#DCEBFF]/60'
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#DC4545] dark:text-red-400" />
                  <span>Offline ({syncQueue.length} queued)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#16A36A] dark:text-emerald-400" />
                  <span>{connection.syncStatus}</span>
                </>
              )}
            </button>

            {/* Real-time In-App Notification Center Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 text-[#172B4D] dark:text-slate-300 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Open Real-time Notifications & Operational Alerts"
              aria-label="Notifications and Reminders"
            >
              <Bell className="w-4 h-4" />
              {pmsNotifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#1769E8] text-white font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {pmsNotifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            {/* Theme Toggle (Light / Dark / System) */}
            <button
              type="button"
              onClick={() => {
                const nextTheme: 'light' | 'dark' | 'system' =
                  settings.theme === 'light'
                    ? 'dark'
                    : settings.theme === 'dark'
                    ? 'system'
                    : 'light';
                const nextSettings = { ...settings, theme: nextTheme };
                setSettings(nextSettings);
                try {
                  localStorage.setItem('pms_theme_preference', nextTheme);
                  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.settings = nextSettings;
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                  }
                } catch {}
              }}
              className="p-2 text-[#172B4D] dark:text-slate-300 hover:bg-[#DCEBFF]/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={`Theme: ${settings.theme === 'system' ? 'System' : settings.theme === 'dark' ? 'Dark' : 'Light'} (Click to cycle)`}
              aria-label="Toggle color theme"
            >
              {settings.theme === 'dark' ? (
                <Moon className="w-4 h-4 text-[#60B8F5]" />
              ) : settings.theme === 'system' ? (
                <Monitor className="w-4 h-4 text-[#1769E8] dark:text-[#60B8F5]" />
              ) : (
                <Sun className="w-4 h-4 text-[#E9A23B]" />
              )}
            </button>

            {/* Primary CTA: Assign Task / New Task */}
            <button
              type="button"
              onClick={() => {
                setTaskContextStudentId(undefined);
                setTaskContextProjectId(undefined);
                setIsEnhancedTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {currentUser.role === 'Admission_Manager' ? 'Assign Task' : 'New Task'}
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5 w-full">
          <div key={activeNav} className="animate-page-enter space-y-3.5">
          {/* VIEW 1: DASHBOARD */}
          {activeNav === 'dashboard' && (
            isInitialLoading ? (
              <DashboardSkeleton />
            ) : (
            <>
              {/* Executive Management Dashboard: 8-Stage Korean Visa Pipeline, Active Intakes & Workload */}
              <ExecutiveDashboard
                analytics={analytics}
                currentUser={currentUser}
                onNavigateTab={(tab) => setActiveNav(tab)}
                onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
                onOpenNewTaskModal={() => {
                  setTaskContextStudentId(undefined);
                  setTaskContextProjectId(undefined);
                  setIsEnhancedTaskModalOpen(true);
                }}
              />

              {/* Welcome Banner & Daily Progress */}
              <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatFullHeaderDate()}
                    </div>
                    <h1 className="text-2xl font-display font-bold text-[#172B4D] dark:text-slate-100 tracking-tight">
                      Daily Task Command Center
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Connected to Google Sheets:{' '}
                      <span className="font-mono text-[#123B78] dark:text-slate-200">
                        {connection.selectedSpreadsheetTitle} / {connection.selectedWorksheet}
                      </span>{' '}
                      · Last Synced: <span className="font-mono">{formatTimestamp(connection.lastSyncedAt)}</span>
                    </p>
                  </div>

                  {/* List vs Calendar Switcher */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDashboardViewMode('list')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          dashboardViewMode === 'list'
                            ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[#172B4D]'
                        }`}
                      >
                        <LayoutList className="w-3.5 h-3.5" />
                        List View
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardViewMode('calendar')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          dashboardViewMode === 'calendar'
                            ? 'bg-[#FFFFFF] dark:bg-slate-900 text-[#123B78] dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-[#172B4D]'
                        }`}
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Calendar View
                      </button>
                    </div>
                  </div>
                </div>

                {/* Daily Progress Bar */}
                <div className="mt-6 pt-5 border-t border-[#E3EAF3] dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-[#172B4D] dark:text-slate-300">
                      Daily Completion Progress ({stats.todayCompletedCount} of {stats.todayCount}{' '}
                      today&apos;s tasks completed)
                    </span>
                    <span className="font-mono tabular-nums font-bold text-sm text-[#1769E8] dark:text-blue-400">
                      {stats.dailyCompletionPct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#DCEBFF]/60 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1769E8] dark:bg-blue-500 transition-transform duration-200 origin-left"
                      style={{
                        transform: `scaleX(${Math.min(1, Math.max(0, stats.dailyCompletionPct / 100))})`,
                      }}
                    />
                  </div>
                </div>

                {/* 7-Metric Task Summary Strip */}
                <div className="mt-6 pt-5 border-t border-[#E3EAF3] dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
                  <div className="p-3 rounded-md bg-[#E9A23B]/8 dark:bg-amber-500/10 border border-[#E9A23B]/25 transition-all hover:border-[#E9A23B]/50">
                    <div className="flex items-center gap-1.5 text-xs text-[#E9A23B] dark:text-amber-400 font-medium">
                      <Sun className="w-3.5 h-3.5 shrink-0" />
                      <span>Today</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-100">
                      {stats.todayCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] transition-all hover:border-[#36A5F5]">
                    <div className="flex items-center gap-1.5 text-xs text-[#123B78] dark:text-blue-300 font-medium">
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      <span>Upcoming</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#123B78] dark:text-blue-300">
                      {stats.upcomingCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#16A36A]/8 dark:bg-emerald-500/10 border border-[#16A36A]/25 transition-all hover:border-[#16A36A]/50">
                    <div className="flex items-center gap-1.5 text-xs text-[#16A36A] dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Completed</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#16A36A] dark:text-emerald-400">
                      {stats.completedCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#DCEBFF]/50 dark:bg-sky-500/10 border border-[#36A5F5]/25 transition-all hover:border-[#36A5F5]/60">
                    <div className="flex items-center gap-1.5 text-xs text-[#1769E8] dark:text-sky-400 font-medium">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Pending</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-200">
                      {stats.pendingCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#DC4545]/8 dark:bg-red-500/10 border border-[#DC4545]/25 transition-all hover:border-[#DC4545]/50">
                    <div className="flex items-center gap-1.5 text-xs text-[#DC4545] dark:text-red-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Overdue</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#DC4545] dark:text-red-400">
                      {stats.overdueCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#F4F2EE] dark:bg-slate-800/40 border border-[#E3EAF3] transition-all hover:border-[#36A5F5]">
                    <div className="flex items-center gap-1.5 text-xs text-[#123B78] dark:text-indigo-400 font-medium">
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span>Total</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-100">
                      {stats.total}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#DCEBFF]/60 dark:bg-blue-950/30 border border-[#36A5F5]/30 transition-all hover:border-[#1769E8]/50">
                    <div className="flex items-center gap-1.5 text-xs text-[#1769E8] dark:text-sky-400 font-medium">
                      <Percent className="w-3.5 h-3.5 shrink-0" />
                      <span>Rate</span>
                    </div>
                    <div className="mt-1.5 text-xl font-mono font-bold tabular-nums text-[#1769E8] dark:text-sky-400">
                      {stats.dailyCompletionPct}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Inline Task Creation Bar */}
              <form
                onSubmit={handleQuickAddSubmit}
                className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-4 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Quick add a task for today (press Enter to save & sync to Google Sheets)..."
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-100 placeholder:text-slate-400 focus:bg-[#FFFFFF] dark:focus:bg-slate-900 focus:border-[#1769E8] focus:outline-none"
                  />
                </div>

                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value as TaskCategory)}
                  aria-label="Quick task category"
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-200"
                >
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Study">Study</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
                  aria-label="Quick task priority"
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-200"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>

                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  aria-label="Quick task scheduled date"
                  className="px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-[#E3EAF3] dark:border-slate-800 bg-[#F4F2EE] dark:bg-slate-950 text-[#172B4D] dark:text-slate-200"
                />

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Quick Add
                </button>
              </form>

              {dashboardViewMode === 'calendar' ? (
                <CalendarView
                  tasks={tasks}
                  onCreateTaskForDate={(dateIso) => {
                    setEditingTask(null);
                    setModalInitialDate(dateIso);
                    setIsTaskModalOpen(true);
                  }}
                  onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                  onRestorePending={handleRestoreTaskToPending}
                  onEdit={(t) => {
                    setEditingTask(t);
                    setIsTaskModalOpen(true);
                  }}
                  onDuplicate={handleDuplicateTask}
                  onDelete={handleDeleteTask}
                  onQuickReschedule={handleQuickReschedule}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left 7 Columns: Today's Tasks & Overdue Tasks */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Overdue Tasks Section - Modern Minimal Widget */}
                    {stats.overdueTasks.length > 0 && (
                      <OverdueTasksWidget
                        tasks={stats.overdueTasks}
                        onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                        onRestorePending={handleRestoreTaskToPending}
                        onEdit={(t) => {
                          setEditingTask(t);
                          setIsTaskModalOpen(true);
                        }}
                        onDuplicate={handleDuplicateTask}
                        onDelete={handleDeleteTask}
                        onQuickReschedule={handleQuickReschedule}
                        onRescheduleToToday={handleRescheduleToToday}
                        onRescheduleAllToToday={handleRescheduleAllOverdueToToday}
                        onReorderTasks={handleReorderTasks}
                      />
                    )}

                    {/* Today's Schedule */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold text-[#172B4D] dark:text-slate-100">
                            Today&apos;s Tasks ({stats.todayTasks.length})
                          </h2>
                          {stats.todayTasks.length > 1 && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                              <GripVertical className="w-3 h-3" />
                              Drag to reorder
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveNav('my-day')}
                          className="text-xs font-medium text-[#1769E8] dark:text-blue-400 hover:underline"
                        >
                          Focus My Day →
                        </button>
                      </div>

                      {stats.todayTasks.length === 0 ? (
                        <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-8 text-center space-y-2">
                          <p className="text-sm font-medium text-[#172B4D] dark:text-slate-300">
                            No tasks scheduled for today yet.
                          </p>
                          <p className="text-xs text-slate-500">
                            Use the Quick Add bar above or click New Task to plan your day.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {stats.todayTasks.map((task, idx) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                              onRestorePending={handleRestoreTaskToPending}
                              onEdit={(t) => {
                                setEditingTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              onDuplicate={handleDuplicateTask}
                              onDelete={handleDeleteTask}
                              onQuickReschedule={handleQuickReschedule}
                              onReorderTasks={handleReorderTasks}
                              onMoveTask={(t, dir) => handleMoveTask(t, dir, stats.todayTasks)}
                              canMoveUp={idx > 0}
                              canMoveDown={idx < stats.todayTasks.length - 1}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Right 5 Columns: Upcoming Deadlines Widget & Recent Sheet Syncs */}
                  <div className="lg:col-span-5 space-y-6">
                    <UpcomingDeadlinesWidget
                      tasks={tasks}
                      onViewAll={() => setActiveNav('upcoming')}
                      onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                      onQuickReschedule={handleQuickReschedule}
                      onCreateTaskWithDate={(dateIso) => {
                        setEditingTask(null);
                        setModalInitialDate(dateIso);
                        setIsTaskModalOpen(true);
                      }}
                    />

                    {/* Live Google Sheets Connection Summary Card */}
                    <section className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-[#16A36A] dark:text-emerald-400" />
                          <h3 className="text-sm font-semibold text-[#172B4D] dark:text-slate-100">
                            Connected Google Sheet
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveNav('sheets-connection')}
                          className="text-xs font-medium text-[#1769E8] dark:text-blue-400 hover:underline"
                        >
                          Open Sheet Grid →
                        </button>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono tabular-nums">
                        <div>File: {connection.selectedSpreadsheetTitle}</div>
                        <div>Worksheet: {connection.selectedWorksheet}!A1:L{tasks.length + 1}</div>
                        <div>Account: {connection.accountEmail}</div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {/* Weekly Task Completion Trend Section */}
              <WeeklyCompletionTrend
                tasks={tasks}
                onOpenDayTasks={(dateIso) => {
                  setEditingTask(null);
                  setModalInitialDate(dateIso);
                  setIsTaskModalOpen(true);
                }}
              />
            </>
            )
          )}

          {/* VIEW: STUDENT DOSSIERS (CRM) */}
          {activeNav === 'students' && (
            <StudentDossierList
              students={students}
              currentUser={currentUser}
              onSelectStudent={(student) => setSelectedStudentForDossier(student)}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
            />
          )}

          {/* VIEW: INTAKE PROJECTS */}
          {activeNav === 'projects' && (
            <IntakeProjectsView
              projects={projects}
              universities={universities}
              team={team}
              currentUser={currentUser}
              onRefresh={refreshPmsData}
              onSelectProject={(proj) => {
                setTaskContextProjectId(proj.id);
                setIsEnhancedTaskModalOpen(true);
              }}
            />
          )}

          {/* VIEW: KOREAN UNIVERSITY DIRECTORY */}
          {activeNav === 'universities' && (
            <UniversityDirectoryView
              universities={universities}
              currentUser={currentUser}
              onRefresh={refreshPmsData}
              onApplyStudentForProgram={(uniId, prog, term) => {
                setPrefillStudentUniversityId(uniId);
                setPrefillStudentProgramId(prog.id);
                setPrefillStudentIntakeTerm(term || prog.intakeTerms?.[0]);
                setIsNewStudentModalOpen(true);
              }}
            />
          )}

          {/* VIEW: PHYSICAL DOCUMENT HANDOVER & ACKNOWLEDGEMENT */}
          {activeNav === 'document-handover' && (
            <DocumentHandoverView
              currentUser={currentUser}
              initialHandoverId={selectedHandoverIdFromNotif}
              onClearInitialHandoverId={clearSelectedHandoverFromNotif}
              onNotifyToast={pushNotification}
              onStatsChanged={setHandoverStats}
            />
          )}

          {/* VIEW 2: MY DAY */}
          {activeNav === 'my-day' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-6">
                <div>
                  <h1 className="text-xl font-display font-bold text-[#172B4D] dark:text-slate-100">
                    My Day — {formatFullHeaderDate()}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {stats.todayCompletedCount} completed · {stats.todayPendingCount} remaining for
                    today ({stats.dailyCompletionPct}% complete)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setModalInitialDate(todayIso);
                    setIsTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule Task for Today
                </button>
              </div>

              <div className="space-y-3">
                {stats.todayTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                    onRestorePending={handleRestoreTaskToPending}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsTaskModalOpen(true);
                    }}
                    onDuplicate={handleDuplicateTask}
                    onDelete={handleDeleteTask}
                    onQuickReschedule={handleQuickReschedule}
                    onReorderTasks={handleReorderTasks}
                    onMoveTask={(t, dir) => handleMoveTask(t, dir, stats.todayTasks)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < stats.todayTasks.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: UPCOMING TASKS */}
          {activeNav === 'upcoming' && (() => {
            const tomorrowIso = addDaysToIsoDate(todayIso, 1);
            const tomorrowTasks = stats.upcomingTasks.filter(
              (t) => (t.deadline || t.taskDate) === tomorrowIso
            );
            const thisWeekTasks = stats.upcomingTasks.filter((t) => {
              const d = t.deadline || t.taskDate;
              const diff = getDaysDifference(d, todayIso);
              return diff >= 2 && diff <= 7;
            });
            const laterTasks = stats.upcomingTasks.filter((t) => {
              const d = t.deadline || t.taskDate;
              const diff = getDaysDifference(d, todayIso);
              return diff > 7;
            });

            return (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <CalendarClock className="w-5 h-5 text-[#1769E8] dark:text-blue-400" />
                        <h1 className="text-xl font-display font-bold text-[#172B4D] dark:text-slate-100">
                          Upcoming Schedule & Deadlines
                        </h1>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Timeline of future commitments and deliverables, synchronized with Google Sheets
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setModalInitialDate(tomorrowIso);
                        setIsTaskModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Schedule Upcoming Task
                    </button>
                  </div>

                  {/* Horizon Summary Strip */}
                  <div className="mt-6 pt-5 border-t border-[#E3EAF3] dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Total Upcoming</div>
                      <div className="mt-1 text-xl font-mono font-bold tabular-nums text-[#172B4D] dark:text-slate-100">
                        {stats.upcomingTasks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Due Tomorrow</div>
                      <div className="mt-1 text-xl font-mono font-bold tabular-nums text-[#E9A23B] dark:text-amber-400">
                        {tomorrowTasks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Due This Week (2–7d)</div>
                      <div className="mt-1 text-xl font-mono font-bold tabular-nums text-[#1769E8] dark:text-blue-400">
                        {thisWeekTasks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Later Milestones (8d+)</div>
                      <div className="mt-1 text-xl font-mono font-bold tabular-nums text-[#123B78] dark:text-slate-300">
                        {laterTasks.length}
                      </div>
                    </div>
                  </div>
                </div>

                {stats.upcomingTasks.length === 0 ? (
                  <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-12 text-center space-y-3">
                    <p className="text-sm font-semibold text-[#172B4D] dark:text-slate-200">
                      No upcoming tasks scheduled yet
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Schedule your future tasks and deadlines to stay organized and keep Google Sheets in sync.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setModalInitialDate(tomorrowIso);
                          setIsTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E8] hover:bg-[#123B78] rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Your First Upcoming Task
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Horizon 1: Tomorrow */}
                    {tomorrowTasks.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-[#E3EAF3] dark:border-slate-800">
                          <h2 className="text-sm font-semibold text-[#E9A23B] dark:text-amber-400 flex items-center gap-2">
                            <span>Tomorrow</span>
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              ({tomorrowTasks.length}) · {formatReadableDate(tomorrowIso, todayIso)}
                            </span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {tomorrowTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                              onRestorePending={handleRestoreTaskToPending}
                              onEdit={(t) => {
                                setEditingTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              onDuplicate={handleDuplicateTask}
                              onDelete={handleDeleteTask}
                              onQuickReschedule={handleQuickReschedule}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Horizon 2: This Week (2-7 Days) */}
                    {thisWeekTasks.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-[#E3EAF3] dark:border-slate-800">
                          <h2 className="text-sm font-semibold text-[#1769E8] dark:text-blue-400 flex items-center gap-2">
                            <span>This Week (Next 2–7 Days)</span>
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              ({thisWeekTasks.length})
                            </span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {thisWeekTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                              onRestorePending={handleRestoreTaskToPending}
                              onEdit={(t) => {
                                setEditingTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              onDuplicate={handleDuplicateTask}
                              onDelete={handleDeleteTask}
                              onQuickReschedule={handleQuickReschedule}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Horizon 3: Later (8+ Days) */}
                    {laterTasks.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-[#E3EAF3] dark:border-slate-800">
                          <h2 className="text-sm font-semibold text-[#172B4D] dark:text-slate-300 flex items-center gap-2">
                            <span>Later Milestones</span>
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                              ({laterTasks.length})
                            </span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {laterTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                              onRestorePending={handleRestoreTaskToPending}
                              onEdit={(t) => {
                                setEditingTask(t);
                                setIsTaskModalOpen(true);
                              }}
                              onDuplicate={handleDuplicateTask}
                              onDelete={handleDeleteTask}
                              onQuickReschedule={handleQuickReschedule}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* VIEW 4: CALENDAR */}
          {activeNav === 'calendar' && (
            <CalendarView
              tasks={tasks}
              onCreateTaskForDate={(dateIso) => {
                setEditingTask(null);
                setModalInitialDate(dateIso);
                setIsTaskModalOpen(true);
              }}
              onRequestComplete={(t) => setTaskToConfirmComplete(t)}
              onRestorePending={handleRestoreTaskToPending}
              onEdit={(t) => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
              onDuplicate={handleDuplicateTask}
              onDelete={handleDeleteTask}
              onQuickReschedule={handleQuickReschedule}
            />
          )}

          {/* VIEW 5: ALL TASKS (TEAM-BASED WORKLOAD & TASK MANAGEMENT DIRECTORY) */}
          {activeNav === 'all-tasks' && (
            <TeamTaskManagementView
              currentUser={currentUser}
              team={team}
              tasks={tasks as PmsTask[]}
              projects={projects}
              universities={universities}
              students={students}
              onRefreshTasks={handleReloadTasks}
              onRefreshTeam={async () => {
                try {
                  const refreshed = await fetchTeam();
                  setTeam(refreshed);
                } catch (err) {
                  console.warn('Failed to refresh team', err);
                }
              }}
              onRequestComplete={(t) => setTaskToConfirmComplete(t)}
              onRestorePending={handleRestoreTaskToPending}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {/* VIEW 6: COMPLETED ARCHIVE */}
          {activeNav === 'completed' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-display font-bold text-[#172B4D] dark:text-slate-100">
                    Completed Tasks Archive ({stats.completedTasks.length})
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Every completed task below has a verified completion timestamp synced to Column
                    J in Google Sheets. Click Restore if you marked a task completed by accident.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {stats.completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRequestComplete={(t) => setTaskToConfirmComplete(t)}
                    onRestorePending={handleRestoreTaskToPending}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsTaskModalOpen(true);
                    }}
                    onDuplicate={handleDuplicateTask}
                    onDelete={handleDeleteTask}
                    onQuickReschedule={handleQuickReschedule}
                  />
                ))}
              </div>
            </div>
          )}

          {/* VIEW 7: GOOGLE SHEETS CONNECTION & LIVE GRID */}
          {activeNav === 'sheets-connection' && (
            <GoogleSheetsPanel
              tasks={tasks}
              connection={connection}
              spreadsheets={spreadsheets}
              syncLogs={syncLogs}
              syncQueue={syncQueue}
              isOffline={isOffline}
              onSyncNow={handleManualSyncNow}
              onPullFromSheet={handlePullFromSheet}
              onEnsureHeaders={handleEnsureHeaders}
              onSelectSpreadsheet={handleSelectSpreadsheet}
              onSelectWorksheet={handleSelectWorksheet}
              onCreateSpreadsheet={handleCreateSpreadsheet}
              onCreateWorksheetTab={handleCreateWorksheetTab}
              onToggleAutoSync={(enabled) =>
                setConnection((prev) => ({ ...prev, autoSync: enabled }))
              }
              onUpdateOAuthCredentials={(mode, clientId, accessToken, accountEmail) => {
                const updatedConn: Partial<GoogleSheetsConnectionState> = {
                  authMode: mode,
                  oauthClientId: clientId,
                  oauthAccessToken: accessToken,
                  accountEmail,
                };
                setConnection((prev) => ({ ...prev, ...updatedConn }));
                synchronizeWithSheets(
                  tasks,
                  'FULL_SYNC',
                  `Updated Google OAuth 2.0 credentials for ${accountEmail}`,
                  undefined,
                  updatedConn
                );
              }}
              onExportCsv={handleExportCsv}
              onImportCsvText={handleImportCsvText}
            />
          )}

          {/* VIEW 8: SETTINGS */}
          {activeNav === 'settings' && (
            <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 rounded-md p-6 space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-display font-bold text-[#172B4D] dark:text-slate-100">
                  Application Settings & Preferences
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure appearance, reminders, offline simulation, and default task properties.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-[#E3EAF3] dark:divide-slate-800">
                {/* Appearance */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-100">
                      Color Theme
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Select Light, Dark, or follow your System OS preference
                    </div>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-[#F4F2EE] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const nextSettings = { ...settings, theme: 'light' as const };
                        setSettings(nextSettings);
                        try {
                          localStorage.setItem('pms_theme_preference', 'light');
                          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
                          if (raw) {
                            const parsed = JSON.parse(raw);
                            parsed.settings = nextSettings;
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                          }
                        } catch {}
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        settings.theme === 'light'
                          ? 'bg-[#FFFFFF] text-[#123B78] shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-[#E9A23B]" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSettings = { ...settings, theme: 'dark' as const };
                        setSettings(nextSettings);
                        try {
                          localStorage.setItem('pms_theme_preference', 'dark');
                          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
                          if (raw) {
                            const parsed = JSON.parse(raw);
                            parsed.settings = nextSettings;
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                          }
                        } catch {}
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        settings.theme === 'dark'
                          ? 'bg-[#3B82F6] text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSettings = { ...settings, theme: 'system' as const };
                        setSettings(nextSettings);
                        try {
                          localStorage.setItem('pms_theme_preference', 'system');
                          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
                          if (raw) {
                            const parsed = JSON.parse(raw);
                            parsed.settings = nextSettings;
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                          }
                        } catch {}
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        settings.theme === 'system'
                          ? 'bg-[#3B82F6] text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      System
                    </button>
                  </div>
                </div>

                {/* Reminders */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-100">
                      Task Reminders & Completion Notifications
                    </div>
                    <div className="text-xs text-slate-500">
                      Show alerts for today&apos;s tasks, overdue deadlines, and completion confirmations
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.remindersEnabled}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, remindersEnabled: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[#E3EAF3] text-[#1769E8]"
                  />
                </div>

                {/* Offline Mode Test Switch */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-100">
                      Simulate Network Interruption (Offline SQLite Mode)
                    </div>
                    <div className="text-xs text-slate-500">
                      Test offline task creation & editing. Changes queue locally and auto-sync when
                      turned off.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.simulateOffline}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, simulateOffline: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[#E3EAF3] text-[#1769E8]"
                  />
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* MANDATORY TASK COMPLETION CONFIRMATION DIALOG */}
      <CompletionConfirmModal
        task={taskToConfirmComplete}
        spreadsheetTitle={connection.selectedSpreadsheetTitle}
        worksheetName={connection.selectedWorksheet}
        onConfirm={handleConfirmTaskCompletion}
        onCancel={() => setTaskToConfirmComplete(null)}
      />

      {/* CREATE / EDIT TASK MODAL (Legacy Quick Modal) */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        editingTask={editingTask}
        defaultCategory={settings.defaultCategory}
        defaultPriority={settings.defaultPriority}
        initialDate={modalInitialDate}
        onSave={handleSaveTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
      />

      {/* ENHANCED CONSULTANCY TASK ASSIGNMENT MODAL */}
      <EnhancedTaskModal
        isOpen={isEnhancedTaskModalOpen}
        editingTask={null}
        currentUser={currentUser}
        team={team}
        universities={universities}
        projects={projects}
        students={students}
        defaultCategory={settings.defaultCategory}
        defaultPriority={settings.defaultPriority}
        initialDate={todayIso}
        initialStudentId={taskContextStudentId}
        initialProjectId={taskContextProjectId}
        onSave={handleSaveEnhancedTask}
        onClose={() => {
          setIsEnhancedTaskModalOpen(false);
          setTaskContextStudentId(undefined);
          setTaskContextProjectId(undefined);
        }}
      />

      {/* STUDENT APPLICATION DOSSIER MODAL */}
      <StudentDossierModal
        student={selectedStudentForDossier}
        currentUser={currentUser}
        isOpen={!!selectedStudentForDossier}
        onClose={() => setSelectedStudentForDossier(null)}
        onRefresh={refreshPmsData}
        onCreateTaskForStudent={(stu) => {
          setTaskContextStudentId(stu.id);
          setSelectedStudentForDossier(null);
          setIsEnhancedTaskModalOpen(true);
        }}
      />

      {/* NEW CANDIDATE REGISTRATION MODAL */}
      <NewStudentModal
        isOpen={isNewStudentModalOpen}
        universities={universities}
        projects={projects}
        team={team}
        currentUser={currentUser}
        initialUniversityId={prefillStudentUniversityId}
        initialProgramId={prefillStudentProgramId}
        initialIntakeTerm={prefillStudentIntakeTerm}
        onClose={() => {
          setIsNewStudentModalOpen(false);
          setPrefillStudentUniversityId(undefined);
          setPrefillStudentProgramId(undefined);
          setPrefillStudentIntakeTerm(undefined);
        }}
        onSuccess={() => {
          setIsNewStudentModalOpen(false);
          setPrefillStudentUniversityId(undefined);
          setPrefillStudentProgramId(undefined);
          setPrefillStudentIntakeTerm(undefined);
          refreshPmsData();
        }}
      />

      {/* REAL-TIME IN-APP NOTIFICATION DRAWER */}
      <NotificationDrawer
        notifications={pmsNotifications}
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onMarkRead={async (id) => {
          await markNotificationAsRead(id);
          setPmsNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllRead={async () => {
          await markAllNotificationsAsRead();
          setPmsNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onNavigateToEntity={(entityType, entityId) => {
          if (entityType === 'student') {
            const found = students.find((s) => s.id === entityId);
            if (found) setSelectedStudentForDossier(found);
            setActiveNav('students');
          } else if (entityType === 'project') {
            setActiveNav('projects');
          } else if (entityType === 'task') {
            setActiveNav('all-tasks');
            setSearchQuery(entityId);
          } else if (entityType === 'handover') {
            setSelectedHandoverIdFromNotif(entityId);
            setActiveNav('document-handover');
          }
        }}
      />

      {/* FLOATING NOTIFICATION TOAST */}
      {activeToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-md bg-[#123B78] dark:bg-slate-800 text-white border border-[#1769E8]/40 dark:border-slate-700 px-4 py-3 shadow-xl flex items-start gap-3"
        >
          <Check className="w-4 h-4 text-[#16A36A] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-semibold">{activeToast.title}</div>
            <div className="text-[#DCEBFF]">{activeToast.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="text-[#DCEBFF]/80 hover:text-white ml-2"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
