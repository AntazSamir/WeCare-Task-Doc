import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { Spinner } from '@astryxdesign/core/Spinner';
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
  RefreshCw,
  Bell,
  Moon,
  Monitor,
  Wifi,
  WifiOff,
  AlertTriangle,
  LayoutList,
  Check,
  X,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  FolderKanban,
  Building2,
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
import { UpcomingDeadlinesWidget } from './components/UpcomingDeadlinesWidget';
import { OverdueTasksWidget } from './components/OverdueTasksWidget';
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
  togglePmsTask,
  deletePmsTask,
} from './services/pmsService';
import { RoleSwitcherBar } from './components/RoleSwitcherBar';
import { DashboardSkeleton } from './components/SkeletonLoaders';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './components/ui/MorphSelect';
import { ErrorBoundary } from './components/ErrorBoundary';
import { playCompletionChime, playNotificationChime } from './utils/soundUtils';
import { PageTransition, TabTransition, ToastTransition, MotionButton } from './components/animations';
import { SidebarTabBar } from '@/components/tab-bar';
import {
  GlobalSearchBar,
  type GlobalSearchItem,
  type GlobalSearchAction,
} from './components/GlobalSearchBar';
import { AnimatePresence } from 'motion/react';

// Lazy-loaded Views (Code Splitting)
const SettingsView = React.lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const ExecutiveDashboard = React.lazy(() =>
  import('./components/ExecutiveDashboard').then((m) => ({ default: m.ExecutiveDashboard }))
);
const CalendarView = React.lazy(() =>
  import('./components/CalendarView').then((m) => ({ default: m.CalendarView }))
);
const GoogleSheetsPanel = React.lazy(() =>
  import('./components/GoogleSheetsPanel').then((m) => ({ default: m.GoogleSheetsPanel }))
);
const StudentDossierList = React.lazy(() =>
  import('./components/StudentDossierList').then((m) => ({ default: m.StudentDossierList }))
);
const IntakeProjectsView = React.lazy(() =>
  import('./components/IntakeProjectsView').then((m) => ({ default: m.IntakeProjectsView }))
);
const IntakeWorkspaceView = React.lazy(() =>
  import('./components/IntakeWorkspaceView').then((m) => ({ default: m.IntakeWorkspaceView }))
);
const UniversityDirectoryView = React.lazy(() =>
  import('./components/UniversityDirectoryView').then((m) => ({ default: m.UniversityDirectoryView }))
);
const TeamTaskManagementView = React.lazy(() =>
  import('./components/TeamTaskManagementView').then((m) => ({ default: m.TeamTaskManagementView }))
);
const DocumentHandoverView = React.lazy(() =>
  import('./components/DocumentHandoverView').then((m) => ({ default: m.DocumentHandoverView }))
);
const WeeklyCompletionTrend = React.lazy(() =>
  import('./components/WeeklyCompletionTrend').then((m) => ({ default: m.WeeklyCompletionTrend }))
);

// Lazy-loaded Modals & Drawers
const EnhancedTaskModal = React.lazy(() =>
  import('./components/EnhancedTaskModal').then((m) => ({ default: m.EnhancedTaskModal }))
);
const StudentDossierModal = React.lazy(() =>
  import('./components/StudentDossierModal').then((m) => ({ default: m.StudentDossierModal }))
);
const NewStudentModal = React.lazy(() =>
  import('./components/NewStudentModal').then((m) => ({ default: m.NewStudentModal }))
);
const TaskFormModal = React.lazy(() =>
  import('./components/TaskFormModal').then((m) => ({ default: m.TaskFormModal }))
);
const CompletionConfirmModal = React.lazy(() =>
  import('./components/CompletionConfirmModal').then((m) => ({ default: m.CompletionConfirmModal }))
);
const NotificationDrawer = React.lazy(() =>
  import('./components/NotificationDrawer').then((m) => ({ default: m.NotificationDrawer }))
);

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
    let storedExtended: Partial<AppSettings> = {};
    try {
      const raw = localStorage.getItem('pms_app_settings');
      if (raw) storedExtended = JSON.parse(raw);
    } catch {}
    return {
      theme: initialTheme,
      remindersEnabled: true,
      todayReminderShownDate: null,
      defaultCategory: 'Work',
      defaultPriority: 'Medium',
      simulateOffline: false,
      compactMode: false,
      reducedMotion: false,
      soundEnabled: true,
      requireCompletionConfirm: true,
      defaultIntakeTerm: 'Fall 2026',
      defaultVisaType: 'D-2-2',
      defaultDegreeLevel: "Bachelor's",
      quotaWarningThreshold: 80,
      deadlineWarningDays: 30,
      autoSyncFrequency: 'realtime',
      syncConflictPolicy: 'last_modified',
      defaultWorksheetName: 'Personal Daily Task Master 2026',
      regionalBranch: 'Dhaka Central Liaison Office (HQ)',
      dispatchEmergencyPhone: '+880 1711-000000',
      tasksPerPage: 25,
      overdueAlertsEnabled: true,
      handoverAlertsEnabled: true,
      desktopNotificationsEnabled: false,
      ...storedExtended,
    };
  });

  // Network & Loading State
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Pagination
  const [completedPage, setCompletedPage] = useState(1);
  const COMPLETED_PAGE_SIZE = 20;

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
  const [_showNotificationsPopover, _setShowNotificationsPopover] = useState(false);

  // Notifications & Toast Banner
  const [_notifications, setNotifications] = useState<AppNotification[]>([]);
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [workspaceRefreshNonce, setWorkspaceRefreshNonce] = useState(0);
  const [prefillStudentProjectId, setPrefillStudentProjectId] = useState<string | undefined>(undefined);
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
      if (settingsRef.current.soundEnabled !== false && type !== 'info') {
        playNotificationChime();
      }
    },
    []
  );

  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.theme) {
        try {
          localStorage.setItem('pms_theme_preference', partial.theme);
        } catch {}
      }
      try {
        localStorage.setItem('pms_app_settings', JSON.stringify(next));
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.settings = next;
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {}
      return next;
    });
  }, []);

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

  // Load initial state with Stale-While-Revalidate: load immediately from localStorage cache, then sync from server
  useEffect(() => {
    let mounted = true;

    // 1. Instant Cache Load: Open pages immediately without blank spinner delay
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          setTasks(deduplicateTasks(parsed.tasks));
        }
        if (Array.isArray(parsed.spreadsheets)) {
          setSpreadsheets(parsed.spreadsheets);
        }
        if (parsed.connection) {
          setConnection(parsed.connection);
        }
        if (Array.isArray(parsed.syncLogs)) {
          setSyncLogs(parsed.syncLogs);
        }
        if (parsed.settings) {
          const storedTheme = localStorage.getItem('pms_theme_preference') as ('light' | 'dark' | 'system' | null);
          setSettings((prev) => ({
            ...prev,
            ...parsed.settings,
            theme: storedTheme || parsed.settings.theme || prev.theme,
          }));
        }
        // Cached data is immediately ready!
        setIsInitialLoading(false);
      } catch {
        // Continue to server fetch
      }
    }

    // 2. Background Revalidation from Server SQLite Store
    async function revalidateState() {
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
      } catch (err) {
        console.warn('Background state revalidation error:', err);
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    }

    revalidateState();
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
      setWorkspaceRefreshNonce((n) => n + 1);
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

  // Step 4-6 of Task Confirmation System: Confirm Completion (Optimistic with rollback)
  const handleConfirmTaskCompletion = (task: Task, completionNote: string) => {
    const previousTasks = [...tasks];
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
    // Instant optimistic update
    setTasks(updatedList);
    setTaskToConfirmComplete(null);

    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'COMPLETE',
        `Confirmed completion of ${task.id} ("${task.title}") at ${formatTimestamp(completedIso)}`,
        task.id
      ).catch((err) => {
        console.error('Task completion sync error, rolling back:', err);
        setTasks(previousTasks);
        pushNotification(
          'Sync Failed — Rolled Back',
          `Could not sync completion for "${task.title}". State restored.`,
          'warning',
          task.id
        );
      });
    }

    if (settings.remindersEnabled) {
      pushNotification(
        'Task Completed',
        `"${task.title}" (${task.id}) marked Completed.`,
        'success',
        task.id
      );
    }

    if (settings.soundEnabled !== false) {
      playCompletionChime();
    }

    if (task.status !== 'Completed') {
      togglePmsTask(task.id, completionNote.trim() || undefined)
        .then(() => {
          setWorkspaceRefreshNonce((n) => n + 1);
        })
        .catch(() => {});
    }
  };

  // Unified handler for task completion requests respecting settings
  const handleRequestCompleteTask = useCallback(
    (task: Task) => {
      if (settings.requireCompletionConfirm === false) {
        handleConfirmTaskCompletion(task, '');
      } else {
        setTaskToConfirmComplete(task);
      }
    },
    [settings.requireCompletionConfirm, tasks, connection.autoSync, settings.remindersEnabled, settings.soundEnabled]
  );

  // Restore Completed Task to Pending (Optimistic with rollback)
  const handleRestoreTaskToPending = (task: Task) => {
    const previousTasks = [...tasks];
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
    // Instant optimistic update
    setTasks(updatedList);

    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'RESTORE',
        `Reopened task ${task.id} ("${task.title}") to Pending status in Google Sheets`,
        task.id
      ).catch((err) => {
        console.error('Task restore sync error, rolling back:', err);
        setTasks(previousTasks);
        pushNotification(
          'Sync Failed — Rolled Back',
          `Could not sync restore for "${task.title}". State restored.`,
          'warning',
          task.id
        );
      });
    }
    pushNotification(
      'Task Restored to Pending',
      `"${task.title}" (${task.id}) is now back in your Pending list.`,
      'info',
      task.id
    );

    if (task.status === 'Completed') {
      togglePmsTask(task.id)
        .then(() => {
          setWorkspaceRefreshNonce((n) => n + 1);
        })
        .catch(() => {});
    }
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

  // Delete Task (Optimistic with rollback)
  const handleDeleteTask = (task: Task) => {
    const previousTasks = [...tasks];
    const updatedList = tasks.filter((t) => t.id !== task.id);
    // Instant optimistic update
    setTasks(updatedList);

    if (connection.autoSync) {
      synchronizeWithSheets(
        updatedList,
        'DELETE',
        `Removed task ${task.id} ("${task.title}") and compacted Google Sheets rows`,
        task.id
      ).catch((err) => {
        console.error('Task delete sync error, rolling back:', err);
        setTasks(previousTasks);
        pushNotification(
          'Sync Failed — Rolled Back',
          `Could not delete "${task.title}". State restored.`,
          'warning',
          task.id
        );
      });
    }
    pushNotification(
      'Task Deleted',
      `Removed "${task.title}" (${task.id}) from task list.`,
      'warning',
      task.id
    );

    deletePmsTask(task.id)
      .then(() => {
        setWorkspaceRefreshNonce((n) => n + 1);
      })
      .catch(() => {});
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
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'students',
          label: 'Student Dossiers',
          icon: Users as any,
          count: students.length,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'projects',
          label: 'Intake Projects',
          icon: FolderKanban as any,
          count: projects.length,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'universities',
          label: 'Korean Universities',
          icon: Building2 as any,
          count: universities.length,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
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
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
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
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'my-day',
          label: 'My Day',
          icon: Sun,
          count: stats.todayCount,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'upcoming',
          label: 'Upcoming Deadlines',
          icon: CalendarClock,
          count: stats.upcomingCount,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'calendar',
          label: 'Calendar Schedule',
          icon: CalendarIcon,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
        {
          id: 'completed',
          label: 'Completed Archive',
          icon: CheckCircle2,
          count: stats.completedCount,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
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
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
          isLiveSync: true,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: SettingsIcon,
          accentColor: 'text-[#1E40AF] dark:text-[#4C8DF6]',
        },
      ],
    },
  ];

  const allNavItems = useMemo(() => navSections.flatMap((s) => s.items), [navSections]);

  const currentNavTitle =
    allNavItems.find((item) => item.id === activeNav)?.label || 'Dashboard';

  const searchItems = useMemo<GlobalSearchItem[]>(() => {
    const taskItems: GlobalSearchItem[] = tasks.map((t) => {
      const pt = t as PmsTask;
      return {
        id: `task:${t.id}`,
        title: t.title,
        group: 'Tasks',
        meta: `${t.category} · ${t.deadline || t.taskDate} · ${t.status}`,
        keywords: [
          t.category,
          t.priority,
          t.status,
          t.deadline,
          t.taskDate,
          t.notes,
          pt.assignedToName,
          pt.studentName,
          pt.universityName,
        ]
          .filter(Boolean)
          .join(' '),
        badgeText: t.status === 'Completed' ? 'Done' : t.priority,
        badgeTone:
          t.status === 'Completed'
            ? 'green'
            : t.priority === 'Urgent'
            ? 'red'
            : t.priority === 'High'
            ? 'amber'
            : 'blue',
      };
    });

    const studentItems: GlobalSearchItem[] = students.map((s) => ({
      id: `student:${s.id}`,
      title: s.fullName,
      group: 'Students',
      meta: `${s.appliedUniversityName || 'Korean University'} · ${s.visaStage.replace(/_/g, ' ')}`,
      keywords: [
        s.passportNumber,
        s.contactEmail,
        s.contactPhone,
        s.major,
        s.degreeLevel,
        s.intakeTerm,
        s.visaType,
        s.visaStage,
        s.visaStage.replace(/_/g, ' '),
        s.appliedUniversityName,
        s.assignedConsultantName,
        s.courierTrackingNumber,
      ]
        .filter(Boolean)
        .join(' '),
      badgeText: s.visaType,
      badgeTone: s.visaStage === 'Visa_Issued' ? 'green' : 'blue',
    }));

    const uniItems: GlobalSearchItem[] = universities.map((u) => ({
      id: `uni:${u.id}`,
      title: u.nameEn,
      group: 'Universities',
      meta: `${u.city || 'South Korea'}${u.nameKo ? ` · ${u.nameKo}` : ''}`,
      keywords: [
        u.nameKo,
        u.city,
        u.ranking,
        u.topikRequirement,
        u.ieltsRequirement,
        ...(u.programs || []).map((p) => `${p.name} ${p.degreeLevel}`),
      ]
        .filter(Boolean)
        .join(' '),
      badgeText: u.verificationStatus === 'Verified' ? 'Verified' : 'Partner',
      badgeTone: u.verificationStatus === 'Verified' ? 'green' : 'neutral',
    }));

    const projectItems: GlobalSearchItem[] = projects.map((p) => ({
      id: `project:${p.id}`,
      title: p.name,
      group: 'Projects',
      meta: `${p.universityName} · ${p.intakeTerm} · ${p.studentCount || 0}/${p.targetQuota}`,
      keywords: [p.id, p.universityName, p.intakeTerm, p.status, p.deadline]
        .filter(Boolean)
        .join(' '),
      badgeText: p.status,
      badgeTone: p.status === 'Active' ? 'green' : 'neutral',
    }));

    return [...taskItems, ...studentItems, ...uniItems, ...projectItems];
  }, [tasks, students, universities, projects]);

  const recentSearchIds = useMemo<string[]>(() => {
    const ids: string[] = [];
    const pendingTasks = tasks.filter((t) => t.status === 'Pending').slice(0, 2);
    for (const t of pendingTasks) ids.push(`task:${t.id}`);
    if (students[0]) ids.push(`student:${students[0].id}`);
    if (universities[0]) ids.push(`uni:${universities[0].id}`);
    return ids.slice(0, 4);
  }, [tasks, students, universities]);

  const searchActions = useMemo<GlobalSearchAction[]>(
    () => [
      { id: 'nav:dashboard', label: 'Executive Pipeline', icon: 'chart', shortcutKey: '1' },
      { id: 'nav:all-tasks', label: 'All Tasks Directory', icon: 'grid', shortcutKey: '2' },
      { id: 'nav:universities', label: 'Korean Universities', icon: 'compass', shortcutKey: '3' },
      { id: 'nav:team-tasks', label: 'Team Workload', icon: 'trend', shortcutKey: '4' },
    ],
    []
  );

  const searchExamples = useMemo<string[]>(() => {
    const list: string[] = [];
    if (universities[0]?.nameEn) list.push(universities[0].nameEn.split(' ')[0]);
    if (students[0]?.fullName) list.push(students[0].fullName);
    list.push('Visa', 'Documents', 'Spring 2027');
    return Array.from(new Set(list)).slice(0, 4);
  }, [universities, students]);

  const handleGlobalSearchSelect = useCallback(
    (entry: GlobalSearchItem | GlobalSearchAction) => {
      if ('label' in entry) {
        const navTarget = entry.id.replace('nav:', '') as NavigationTab;
        if (navTarget === 'universities') setSelectedUniversityId(null);
        if (navTarget === 'projects') setSelectedProjectId(null);
        setActiveNav(navTarget);
        return;
      }
      if (entry.id.startsWith('task:')) {
        const taskId = entry.id.slice(5);
        const found = tasks.find((t) => t.id === taskId);
        if (found) {
          setEditingTask(found);
          setIsTaskModalOpen(true);
        } else {
          setActiveNav('all-tasks');
        }
        return;
      }
      if (entry.id.startsWith('student:')) {
        const studentId = entry.id.slice(8);
        const found = students.find((s) => s.id === studentId);
        setActiveNav('students');
        if (found) {
          setSelectedStudentForDossier(found);
        }
        return;
      }
      if (entry.id.startsWith('uni:')) {
        const uniId = entry.id.slice(4);
        setSelectedUniversityId(uniId);
        setActiveNav('universities');
        return;
      }
      if (entry.id.startsWith('project:')) {
        const projectId = entry.id.slice(8);
        setSelectedProjectId(projectId);
        setActiveNav('projects');
      }
    },
    [tasks, students]
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#121212] text-[#0F172A] dark:text-[#ECECEE]">
      {/* LEFT SIDEBAR NAVIGATION (Collapsible: 224px expanded / 56px collapsed) */}
      <aside
        className={`shrink-0 bg-white dark:bg-[#161616] border-r border-[#E2E8F0] dark:border-[#2E2E32] flex flex-col h-screen sticky top-0 select-none transition-all z-30 ${
          isSidebarCollapsed ? 'w-14' : 'w-56'
        }`}
        style={{
          transitionDuration: 'var(--anim-dur-slow)',
          transitionTimingFunction: 'var(--anim-ease-standard)',
        }}
      >
        {/* Brand Header */}
        <div className="h-14 shrink-0 px-3 flex items-center border-b border-[#E2E8F0] dark:border-[#2E2E32]">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/assets/wecare_task_logo.webp"
                alt="WeCare Task"
                className="w-8 h-8 object-contain shrink-0 select-none"
              />
              <div className="min-w-0">
                <div className="font-bold text-[13.5px] tracking-tight text-[#0F172A] dark:text-[#ECECEE] leading-tight truncate">
                  WeCare Task
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-[#9A9AA2] mt-0.5 truncate">
                  Korea Visa &amp; Tasks
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center" title="WeCare Task">
              <img
                src="/assets/wecare_task_logo.webp"
                alt="WeCare Task"
                className="w-8 h-8 object-contain shrink-0 select-none"
              />
            </div>
          )}
        </div>

        {/* Middle Scrollable Area: Main Navigation */}
        <div className={`flex-1 overflow-y-auto overscroll-contain ${isSidebarCollapsed ? 'p-1.5 py-2' : 'px-2.5 py-2.5'}`}>
          <SidebarTabBar
            sections={navSections.map((section) => ({
              title: section.title,
              items: section.items.map((item) => ({
                id: item.id,
                label: item.label,
                icon: item.icon,
                count: item.count,
                isLiveSync: item.isLiveSync,
                syncStatusColor:
                  isOffline || connection.syncStatus === 'Sync Failed'
                    ? 'bg-[#DC2626]'
                    : connection.syncStatus === 'Syncing'
                    ? 'bg-[#D97706]'
                    : 'bg-[#16A34A]',
                syncTitle: `Google Sheets: ${isOffline ? 'Offline' : connection.syncStatus}`,
              })),
            }))}
            value={activeNav}
            onChange={(id) => {
              setActiveNav(id as NavigationTab);
              setSelectedProjectId(null);
              setSelectedUniversityId(null);
            }}
            collapsed={isSidebarCollapsed}
          />
        </div>

        {/* Dedicated Sticky Footer Container inside Sidebar */}
        {!isSidebarCollapsed ? (
          <div className="shrink-0 p-2.5 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#161616] space-y-1.5">
            {/* Google Sheets Live Sync: Compact Row */}
            <div
              className="flex items-center justify-between px-2 py-1 rounded-md bg-[#F8FAFC] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] group"
              title={`${connection.selectedSpreadsheetTitle}\nTab: ${connection.selectedWorksheet}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#34C26B] shrink-0" />
                <span className="flex items-center gap-1.5 text-[11px] text-[#0F172A] dark:text-[#ECECEE] min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isOffline || connection.syncStatus === 'Sync Failed'
                        ? 'bg-[#DC2626] dark:bg-[#EF5350]'
                        : connection.syncStatus === 'Syncing'
                        ? 'bg-[#D97706] dark:bg-[#F0A030]'
                        : 'bg-[#16A34A] dark:bg-[#34C26B]'
                    }`}
                  />
                  <span className="truncate">{isOffline ? 'Sync Failed' : connection.syncStatus}</span>
                </span>
              </div>
              <MotionButton
                type="button"
                onClick={handleManualSyncNow}
                title="Sync now with Google Sheets"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:bg-[#EFF6FF] dark:hover:bg-[rgba(76,141,246,0.14)] rounded transition-colors shrink-0"
              >
                {connection.syncStatus === 'Syncing' ? (
                  <Spinner size="sm" shade="inherit" aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-2.5 h-2.5" />
                )}
                <span>Sync now</span>
              </MotionButton>
            </div>

            {/* Collapse Sidebar Button */}
            <MotionButton
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
              className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-[#64748B] dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#ECECEE] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] rounded-md transition-colors duration-150 group border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#3A3A3F]"
              aria-label="Collapse sidebar"
            >
              <span className="flex items-center gap-1.5">
                <PanelLeftClose className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9A9AA2] group-hover:text-[#1E40AF] dark:group-hover:text-[#ECECEE] transition-colors" />
                <span>Collapse Sidebar</span>
              </span>
              <kbd className="hidden sm:inline-block px-1 py-0.5 text-[9.5px] text-[#64748B] dark:text-[#9A9AA2] bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded">
                Ctrl+B
              </kbd>
            </MotionButton>
          </div>
        ) : (
          <div className="shrink-0 p-2 border-t border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#161616] flex flex-col items-center gap-1.5 shadow-xs dark:shadow-none">
            {/* Collapsed Google Sheets Icon Button */}
            <MotionButton
              type="button"
              onClick={handleManualSyncNow}
              title={`Google Sheets: ${isOffline ? 'Sync Failed' : connection.syncStatus}\nSpreadsheet: ${connection.selectedSpreadsheetTitle}\nTab: ${connection.selectedWorksheet}\nClick to sync now`}
              className="w-8 h-8 rounded-md flex items-center justify-center relative bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] hover:border-[#16A34A]/50 dark:hover:border-[#34C26B]/60 transition-colors group"
              aria-label="Google Sheets synchronization status"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#34C26B] group-hover:scale-105 transition-transform" />
              <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#161616] ${
                  isOffline || connection.syncStatus === 'Sync Failed'
                    ? 'bg-[#DC2626] dark:bg-[#EF5350]'
                    : connection.syncStatus === 'Syncing'
                    ? 'bg-[#D97706] dark:bg-[#F0A030]'
                    : 'bg-[#16A34A] dark:bg-[#34C26B]'
                }`}
              />
            </MotionButton>

            {/* Expand Sidebar Button */}
            <MotionButton
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar (Ctrl+B)"
              className="w-8 h-8 rounded-md bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] text-[#0F172A] dark:text-[#ECECEE] flex items-center justify-center transition-colors group border border-[#E2E8F0] dark:border-[#2E2E32]"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 transition-transform group-hover:scale-105" />
            </MotionButton>
          </div>
        )}
      </aside>

      {/* MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR */}
        <header className="sticky top-0 z-30 h-14 px-3 sm:px-3.5 bg-white/95 dark:bg-[#161616] backdrop-blur-xs border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-3 shrink-0 shadow-xs dark:shadow-none">
          {/* Global Inline Animated Search Bar */}
          <GlobalSearchBar
            items={searchItems}
            groups={['Tasks', 'Students', 'Universities', 'Projects']}
            recentIds={recentSearchIds}
            actions={searchActions}
            examples={searchExamples}
            placeholder="Search tasks, students, universities..."
            onSelect={handleGlobalSearchSelect}
          />

          {/* Right: Role Switcher, Offline Toggle, Notification Center, Theme Toggle, Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Interactive Admin Role Switcher (Admission Manager vs Consultant) */}
            <RoleSwitcherBar
              currentUser={currentUser}
              team={team}
              onSwitchUser={handleSwitchUser}
            />

            {/* Offline Simulator / Network Status */}
            <MotionButton
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
              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] hover:bg-[#F8FAFC] dark:hover:bg-[#252528] transition-colors whitespace-nowrap shrink-0"
            >
              {isOffline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] dark:bg-[#EF5350] shrink-0" />
                  <span className="text-[#DC2626] dark:text-[#EF5350]">Offline (<span className="tabular-nums">{syncQueue.length}</span> queued)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#34C26B] shrink-0" />
                  <span>{connection.syncStatus}</span>
                </>
              )}
            </MotionButton>

            {/* Real-time In-App Notification Center Drawer Trigger */}
            <MotionButton
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 text-[#0F172A] dark:text-[#ECECEE] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-lg transition-colors h-9 w-9 flex items-center justify-center border border-[#E2E8F0] dark:border-[#2E2E32]"
              title="Open Real-time Notifications & Operational Alerts"
              aria-label="Notifications and Reminders"
            >
              <Bell className="w-4 h-4" />
              {pmsNotifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {pmsNotifications.filter((n) => !n.read).length}
                </span>
              )}
            </MotionButton>

            {/* Theme Toggle (Light / Dark / System) */}
            <MotionButton
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
              className="p-2 text-[#0F172A] dark:text-[#ECECEE] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] rounded-lg transition-colors h-9 w-9 flex items-center justify-center border border-[#E2E8F0] dark:border-[#2E2E32]"
              title={`Theme: ${settings.theme === 'system' ? 'System' : settings.theme === 'dark' ? 'Dark' : 'Light'} (Click to cycle)`}
              aria-label="Toggle color theme"
            >
              {settings.theme === 'dark' ? (
                <Moon className="w-4 h-4 text-[#4C8DF6]" />
              ) : settings.theme === 'system' ? (
                <Monitor className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
              ) : (
                <Sun className="w-4 h-4 text-[#D97706]" />
              )}
            </MotionButton>

            {/* Primary CTA: Assign Task / New Task */}
            <MotionButton
              type="button"
              onClick={() => {
                setTaskContextStudentId(undefined);
                setTaskContextProjectId(undefined);
                setIsEnhancedTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg shadow-xs dark:shadow-none transition-colors duration-150 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              {currentUser.role === 'Admission_Manager' ? 'Assign Task' : 'New Task'}
            </MotionButton>
          </div>
        </header>

        {/* MAIN SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto px-2 py-2 sm:px-2.5 sm:py-2.5 w-full">
          <ErrorBoundary viewName={currentNavTitle}>
            <Suspense fallback={<DashboardSkeleton />}>
              <PageTransition viewKey={activeNav} className="space-y-2">
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
              <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-slate-500 dark:text-[#9A9AA2]">
                      {formatFullHeaderDate()}
                    </div>
                    <h1 className="text-2xl font-display font-bold text-[#0F172A] dark:text-[#ECECEE] tracking-tight">
                      Daily Task Command Center
                    </h1>
                    <p className="text-xs text-slate-600 dark:text-[#9A9AA2]">
                      Connected to Google Sheets:{' '}
                      <span className="tabular-nums text-[#1E3A8A] dark:text-[#ECECEE]">
                        {connection.selectedSpreadsheetTitle} / {connection.selectedWorksheet}
                      </span>{' '}
                      · Last Synced: <span className="tabular-nums">{formatTimestamp(connection.lastSyncedAt)}</span>
                    </p>
                  </div>

                  {/* List vs Calendar Switcher */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg">
                      <MotionButton
                        type="button"
                        onClick={() => setDashboardViewMode('list')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          dashboardViewMode === 'list'
                            ? 'bg-[#FFFFFF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E3A8A] dark:text-[#4C8DF6] shadow-xs dark:shadow-none'
                            : 'text-slate-600 dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE]'
                        }`}
                      >
                        <LayoutList className="w-3.5 h-3.5" />
                        List View
                      </MotionButton>
                      <MotionButton
                        type="button"
                        onClick={() => setDashboardViewMode('calendar')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          dashboardViewMode === 'calendar'
                            ? 'bg-[#FFFFFF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E3A8A] dark:text-[#4C8DF6] shadow-xs dark:shadow-none'
                            : 'text-slate-600 dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE]'
                        }`}
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Calendar View
                      </MotionButton>
                    </div>
                  </div>
                </div>

                {/* Daily Progress Bar */}
                <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      Daily Completion Progress ({stats.todayCompletedCount} of {stats.todayCount}{' '}
                      today&apos;s tasks completed)
                    </span>
                    <span className={`tabular-nums font-bold text-sm ${stats.dailyCompletionPct === 0 ? 'text-[#1E40AF] dark:text-[#66666E]' : 'text-[#1E40AF] dark:text-[#4C8DF6]'}`}>
                      {stats.dailyCompletionPct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#EFF6FF]/60 dark:bg-[#252528] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1E40AF] dark:bg-[#4C8DF6] transition-transform origin-left"
                      style={{
                        transform: `scaleX(${Math.min(1, Math.max(0, stats.dailyCompletionPct / 100))})`,
                        transitionDuration: 'var(--anim-dur-normal)',
                        transitionTimingFunction: 'var(--anim-ease-standard)',
                      }}
                    />
                  </div>
                </div>

                {/* 7-Metric Task Summary Strip */}
                <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] dark:border-[#2E2E32] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  <div className="p-3 rounded-md bg-[#D97706]/8 dark:bg-[#1C1C1E] border border-[#D97706]/25 dark:border-[#2E2E32] transition-all hover:border-[#D97706]/50 dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#D97706] dark:text-[#9A9AA2] font-medium">
                      <Sun className="w-3.5 h-3.5 shrink-0" />
                      <span>Today</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.todayCount === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
                      {stats.todayCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] transition-all hover:border-[#1E40AF] dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#1E3A8A] dark:text-[#9A9AA2] font-medium">
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      <span>Upcoming</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.upcomingCount === 0 ? 'text-[#1E3A8A] dark:text-[#66666E]' : 'text-[#1E3A8A] dark:text-[#ECECEE]'}`}>
                      {stats.upcomingCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#16A34A]/8 dark:bg-[#1C1C1E] border border-[#16A34A]/25 dark:border-[#2E2E32] transition-all hover:border-[#16A34A]/50 dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#16A34A] dark:text-[#34C26B] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Completed</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.completedCount === 0 ? 'text-[#16A34A] dark:text-[#66666E]' : 'text-[#16A34A] dark:text-[#34C26B]'}`}>
                      {stats.completedCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#EFF6FF]/50 dark:bg-[#1C1C1E] border border-[#1E40AF]/25 dark:border-[#2E2E32] transition-all hover:border-[#1E40AF]/60 dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#1E40AF] dark:text-[#F0A030] font-medium">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Pending</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.pendingCount === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#F0A030]'}`}>
                      {stats.pendingCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#DC2626]/8 dark:bg-[#1C1C1E] border border-[#DC2626]/25 dark:border-[#2E2E32] transition-all hover:border-[#DC2626]/50 dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#DC2626] dark:text-[#EF5350] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Overdue</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.overdueCount === 0 ? 'text-[#DC2626] dark:text-[#66666E]' : 'text-[#DC2626] dark:text-[#EF5350]'}`}>
                      {stats.overdueCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#F8FAFC] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] transition-all hover:border-[#1E40AF] dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#1E3A8A] dark:text-[#9A9AA2] font-medium">
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span>Total</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.total === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
                      {stats.total}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-[#EFF6FF]/60 dark:bg-[#1C1C1E] border border-[#1E40AF]/30 dark:border-[#2E2E32] transition-all hover:border-[#1E40AF]/50 dark:hover:border-[#3A3A3F]">
                    <div className="flex items-center gap-1.5 text-xs text-[#1E40AF] dark:text-[#9A9AA2] font-medium">
                      <Percent className="w-3.5 h-3.5 shrink-0" />
                      <span>Rate</span>
                    </div>
                    <div className={`mt-1.5 text-xl tabular-nums font-bold ${stats.dailyCompletionPct === 0 ? 'text-[#1E40AF] dark:text-[#66666E]' : 'text-[#1E40AF] dark:text-[#ECECEE]'}`}>
                      {stats.dailyCompletionPct}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Inline Task Creation Bar */}
              <form
                onSubmit={handleQuickAddSubmit}
                className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-4 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Quick add a task for today (press Enter to save & sync to Google Sheets)..."
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] placeholder:text-slate-400 dark:placeholder:text-[#9A9AA2] focus:bg-[#FFFFFF] dark:focus:bg-[#252528] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
                  />
                </div>

                <div className="w-36">
                  <MorphSelect
                    value={quickCategory}
                    onValueChange={(v) => setQuickCategory(v as TaskCategory)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Category" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Work">Work</MorphSelectItem>
                      <MorphSelectItem value="Personal">Personal</MorphSelectItem>
                      <MorphSelectItem value="Study">Study</MorphSelectItem>
                      <MorphSelectItem value="Business">Business</MorphSelectItem>
                      <MorphSelectItem value="Other">Other</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <div className="w-40">
                  <MorphSelect
                    value={quickPriority}
                    onValueChange={(v) => setQuickPriority(v as TaskPriority)}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Priority" />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="High">High Priority</MorphSelectItem>
                      <MorphSelectItem value="Medium">Medium Priority</MorphSelectItem>
                      <MorphSelectItem value="Low">Low Priority</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  aria-label="Quick task scheduled date"
                  className="px-3 py-1.5 text-xs tabular-nums rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE]"
                />

                <MotionButton
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Quick Add
                </MotionButton>
              </form>

              <TabTransition viewKey={dashboardViewMode}>
              {dashboardViewMode === 'calendar' ? (
                <CalendarView
                  tasks={tasks}
                  onCreateTaskForDate={(dateIso) => {
                    setEditingTask(null);
                    setModalInitialDate(dateIso);
                    setIsTaskModalOpen(true);
                  }}
                  onRequestComplete={handleRequestCompleteTask}
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
                        onRequestComplete={handleRequestCompleteTask}
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
                          <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                            Today&apos;s Tasks ({stats.todayTasks.length})
                          </h2>
                          {stats.todayTasks.length > 1 && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-[#9A9AA2] font-normal">
                              <GripVertical className="w-3 h-3" />
                              Drag to reorder
                            </span>
                          )}
                        </div>
                        <MotionButton
                          type="button"
                          onClick={() => setActiveNav('my-day')}
                          className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
                        >
                          Focus My Day →
                        </MotionButton>
                      </div>

                      {stats.todayTasks.length === 0 ? (
                        <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-8 text-center space-y-2">
                          <p className="text-sm font-medium text-[#0F172A] dark:text-[#ECECEE]">
                            No tasks scheduled for today yet.
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                            Use the Quick Add bar above or click New Task to plan your day.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {stats.todayTasks.map((task, idx) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={handleRequestCompleteTask}
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
                      onRequestComplete={handleRequestCompleteTask}
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
                    <section className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-[#16A34A] dark:text-[#34C26B]" />
                          <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                            Connected Google Sheet
                          </h3>
                        </div>
                        <MotionButton
                          type="button"
                          onClick={() => setActiveNav('sheets-connection')}
                          className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
                        >
                          Open Sheet Grid →
                        </MotionButton>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-[#9A9AA2] space-y-1 tabular-nums">
                        <div>File: {connection.selectedSpreadsheetTitle}</div>
                        <div>Worksheet: {connection.selectedWorksheet}!A1:L{tasks.length + 1}</div>
                        <div>Account: {connection.accountEmail}</div>
                      </div>
                    </section>
                  </div>
                </div>
              )}
              </TabTransition>

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

          {/* VIEW: INTAKE PROJECTS & WORKSPACE */}
          {activeNav === 'projects' &&
            (selectedProjectId ? (
              <IntakeWorkspaceView
                projectId={selectedProjectId}
                currentUser={currentUser}
                team={team}
                refreshKey={workspaceRefreshNonce}
                onBack={() => setSelectedProjectId(null)}
                onRefreshParent={refreshPmsData}
                onReloadTasks={handleReloadTasks}
                onOpenStudentDossier={(student) => setSelectedStudentForDossier(student)}
                onOpenNewStudentModal={(proj) => {
                  setPrefillStudentProjectId(proj.id);
                  setPrefillStudentUniversityId(proj.universityId);
                  setPrefillStudentIntakeTerm(proj.intakeTerm);
                  setIsNewStudentModalOpen(true);
                }}
                onCreateIntakeTask={(pid) => {
                  setTaskContextProjectId(pid);
                  setIsEnhancedTaskModalOpen(true);
                }}
                onRequestCompleteTask={handleRequestCompleteTask}
                onRestoreTaskToPending={handleRestoreTaskToPending}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <IntakeProjectsView
                projects={projects}
                universities={universities}
                team={team}
                currentUser={currentUser}
                onRefresh={refreshPmsData}
                onSelectProject={(proj) => {
                  setSelectedProjectId(proj.id);
                }}
              />
            ))}

          {/* VIEW: KOREAN UNIVERSITY DIRECTORY */}
          {activeNav === 'universities' && (
            <UniversityDirectoryView
              universities={universities}
              currentUser={currentUser}
              onRefresh={refreshPmsData}
              selectedUniversityId={selectedUniversityId}
              onSelectUniversity={setSelectedUniversityId}
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
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-6">
                <div>
                  <h1 className="text-xl font-display font-bold text-[#0F172A] dark:text-[#ECECEE]">
                    My Day — {formatFullHeaderDate()}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-1">
                    {stats.todayCompletedCount} completed · {stats.todayPendingCount} remaining for
                    today ({stats.dailyCompletionPct}% complete)
                  </p>
                </div>
                <MotionButton
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setModalInitialDate(todayIso);
                    setIsTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule Task for Today
                </MotionButton>
              </div>

              <div className="space-y-3">
                {stats.todayTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRequestComplete={handleRequestCompleteTask}
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
                <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <CalendarClock className="w-5 h-5 text-[#1E40AF] dark:text-[#4C8DF6]" />
                        <h1 className="text-xl font-display font-bold text-[#0F172A] dark:text-[#ECECEE]">
                          Upcoming Schedule & Deadlines
                        </h1>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-1">
                        Timeline of future commitments and deliverables, synchronized with Google Sheets
                      </p>
                    </div>

                    <MotionButton
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setModalInitialDate(tomorrowIso);
                        setIsTaskModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Schedule Upcoming Task
                    </MotionButton>
                  </div>

                  {/* Horizon Summary Strip */}
                  <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#2E2E32] grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">Total Upcoming</div>
                      <div className={`mt-1 text-xl tabular-nums font-bold ${stats.upcomingTasks.length === 0 ? 'text-[#0F172A] dark:text-[#66666E]' : 'text-[#0F172A] dark:text-[#ECECEE]'}`}>
                        {stats.upcomingTasks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">Due Tomorrow</div>
                      <div className={`mt-1 text-xl tabular-nums font-bold ${tomorrowTasks.length === 0 ? 'text-[#D97706] dark:text-[#66666E]' : 'text-[#D97706] dark:text-[#F0A030]'}`}>
                        {tomorrowTasks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">Due This Week (2–7d)</div>
                      <div className={`mt-1 text-xl tabular-nums font-bold ${thisWeekTasks.length === 0 ? 'text-[#1E40AF] dark:text-[#66666E]' : 'text-[#1E40AF] dark:text-[#ECECEE]'}`}>
                        {thisWeekTasks.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">Later Milestones (8d+)</div>
                      <div className={`mt-1 text-xl tabular-nums font-bold ${laterTasks.length === 0 ? 'text-[#1E3A8A] dark:text-[#66666E]' : 'text-[#1E3A8A] dark:text-[#ECECEE]'}`}>
                        {laterTasks.length}
                      </div>
                    </div>
                  </div>
                </div>

                {stats.upcomingTasks.length === 0 ? (
                  <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-12 text-center space-y-3">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      No upcoming tasks scheduled yet
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#9A9AA2] max-w-sm mx-auto">
                      Schedule your future tasks and deadlines to stay organized and keep Google Sheets in sync.
                    </p>
                    <div className="pt-2">
                      <MotionButton
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setModalInitialDate(tomorrowIso);
                          setIsTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Your First Upcoming Task
                      </MotionButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Horizon 1: Tomorrow */}
                    {tomorrowTasks.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                          <h2 className="text-sm font-semibold text-[#D97706] dark:text-[#F0A030] flex items-center gap-2">
                            <span>Tomorrow</span>
                            <span className="tabular-nums text-xs text-slate-500 dark:text-[#9A9AA2]">
                              ({tomorrowTasks.length}) · {formatReadableDate(tomorrowIso, todayIso)}
                            </span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {tomorrowTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={handleRequestCompleteTask}
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
                        <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                          <h2 className="text-sm font-semibold text-[#1E40AF] dark:text-[#ECECEE] flex items-center gap-2">
                            <span>This Week (Next 2–7 Days)</span>
                            <span className="tabular-nums text-xs text-slate-500 dark:text-[#9A9AA2]">
                              ({thisWeekTasks.length})
                            </span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {thisWeekTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={handleRequestCompleteTask}
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
                        <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
                          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                            <span>Later Milestones</span>
                            <span className="tabular-nums text-xs text-slate-500 dark:text-[#9A9AA2]">
                              ({laterTasks.length})
                            </span>
                          </h2>
                        </div>
                        <div className="space-y-2.5">
                          {laterTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onRequestComplete={handleRequestCompleteTask}
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
              onRequestComplete={handleRequestCompleteTask}
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
              onRequestComplete={handleRequestCompleteTask}
              onRestorePending={handleRestoreTaskToPending}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {/* VIEW 6: COMPLETED ARCHIVE (Client-side Paginated) */}
          {activeNav === 'completed' && (() => {
            const totalPages = Math.max(1, Math.ceil(stats.completedTasks.length / COMPLETED_PAGE_SIZE));
            const paginatedCompleted = stats.completedTasks.slice(
              (completedPage - 1) * COMPLETED_PAGE_SIZE,
              completedPage * COMPLETED_PAGE_SIZE
            );

            return (
              <div className="space-y-6">
                <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-display font-bold text-[#0F172A] dark:text-[#ECECEE]">
                      Completed Tasks Archive ({stats.completedTasks.length})
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-1">
                      Every completed task below has a verified completion timestamp synced to Column
                      J in Google Sheets. Click Restore if you marked a task completed by accident.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {paginatedCompleted.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onRequestComplete={handleRequestCompleteTask}
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

                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-xl text-xs text-[#64748B] dark:text-[#9A9AA2]">
                    <span>
                      Showing <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE] tabular-nums">{(completedPage - 1) * COMPLETED_PAGE_SIZE + 1}</span>–<span className="font-semibold text-[#0F172A] dark:text-[#ECECEE] tabular-nums">{Math.min(completedPage * COMPLETED_PAGE_SIZE, stats.completedTasks.length)}</span> of{' '}
                      <span className="font-semibold text-[#0F172A] dark:text-[#ECECEE] tabular-nums">{stats.completedTasks.length}</span> tasks
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MotionButton
                        type="button"
                        disabled={completedPage === 1}
                        onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-[#2E2E32] transition-colors font-medium"
                      >
                        Previous
                      </MotionButton>
                      <span className="px-2 font-medium text-[#0F172A] dark:text-[#ECECEE] tabular-nums">
                        Page {completedPage} of {totalPages}
                      </span>
                      <MotionButton
                        type="button"
                        disabled={completedPage >= totalPages}
                        onClick={() => setCompletedPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] dark:hover:bg-[#2E2E32] transition-colors font-medium"
                      >
                        Next
                      </MotionButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              currentUser={currentUser}
              onSwitchUser={handleSwitchUser}
              team={team}
              connection={connection}
              onRefreshData={refreshPmsData}
              pushNotification={pushNotification}
              tasks={tasks}
              students={students}
              universities={universities}
              onNavigateTab={(tab) => setActiveNav(tab)}
            />
          )}
          </PageTransition>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <Suspense fallback={null}>
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
          initialProjectId={prefillStudentProjectId}
          initialUniversityId={prefillStudentUniversityId}
          initialProgramId={prefillStudentProgramId}
          initialIntakeTerm={prefillStudentIntakeTerm}
          onClose={() => {
            setIsNewStudentModalOpen(false);
            setPrefillStudentProjectId(undefined);
            setPrefillStudentUniversityId(undefined);
            setPrefillStudentProgramId(undefined);
            setPrefillStudentIntakeTerm(undefined);
          }}
          onSuccess={() => {
            setIsNewStudentModalOpen(false);
            setPrefillStudentProjectId(undefined);
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
              setSelectedProjectId(entityId);
              setActiveNav('projects');
            } else if (entityType === 'task') {
              const found = tasks.find((t) => t.id === entityId);
              if (found) {
                setEditingTask(found);
                setIsTaskModalOpen(true);
              } else {
                setActiveNav('all-tasks');
              }
            } else if (entityType === 'handover') {
              setSelectedHandoverIdFromNotif(entityId);
              setActiveNav('document-handover');
            }
          }}
        />
      </Suspense>

      {/* FLOATING NOTIFICATION TOAST */}
      <AnimatePresence>
        {activeToast && (
          <ToastTransition
            key={activeToast.id}
            role="status"
            aria-live="polite"
            className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-lg text-white px-4 py-3 shadow-xl dark:shadow-none flex items-start gap-3 ${
              activeToast.type === 'overdue'
                ? 'bg-[#DC2626] dark:bg-[#1C1C1E] border border-red-700 dark:border-[#EF5350]'
                : activeToast.type === 'warning'
                ? 'bg-[#D97706] dark:bg-[#1C1C1E] border border-amber-700 dark:border-[#F0A030]'
                : 'bg-[#1E3A8A] dark:bg-[#1C1C1E] border border-[#1E40AF]/40 dark:border-[#3A3A3F]'
            }`}
          >
            {activeToast.type === 'overdue' || activeToast.type === 'warning' ? (
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${activeToast.type === 'overdue' ? 'text-white dark:text-[#EF5350]' : 'text-white dark:text-[#F0A030]'}`} />
            ) : (
              <Check className="w-4 h-4 text-[#16A34A] dark:text-[#34C26B] shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-0.5 min-w-0">
              <div className="font-semibold dark:text-[#ECECEE]">{activeToast.title}</div>
              <div className="text-[#EFF6FF] dark:text-[#9A9AA2] truncate">{activeToast.message}</div>
            </div>
            <MotionButton
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-[#EFF6FF]/80 dark:text-[#9A9AA2] hover:text-white dark:hover:text-[#ECECEE] ml-auto"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </MotionButton>
          </ToastTransition>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
