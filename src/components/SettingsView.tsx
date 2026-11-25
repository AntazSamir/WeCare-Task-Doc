import React, { useState } from 'react';
import {
  Sun,
  Moon,
  CheckCircle2,
  Bell,
  Volume2,
  VolumeX,
  Layers,
  GraduationCap,
  Calendar,
  ListTodo,
  FileSpreadsheet,
  WifiOff,
  User,
  Building2,
  Phone,
  Database,
  Download,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Sliders,
  AlertTriangle,
  ArrowRight,
  Clock,
  HardDrive,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import {
  AppSettings,
  TaskCategory,
  TaskPriority,
  GoogleSheetsConnectionState,
  Task,
  NavigationTab,
  DashboardWidgetsConfig,
  DEFAULT_DASHBOARD_WIDGETS,
} from '../types/task';
import { Spinner } from '@astryxdesign/core/Spinner';
import { UserProfile, StudentApplication, KoreanUniversity } from '../types/pms';
import { playNotificationChime, playCompletionChime } from '../utils/soundUtils';
import {
  ThemeTogglerButton,
  ThemeTogglerButtonIcon,
  type ThemeSelection,
} from './animate-ui/buttons/theme-toggler';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { TabTransition, MotionButton } from './animations';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  team: UserProfile[];
  connection: GoogleSheetsConnectionState;
  onRefreshData: () => Promise<void>;
  pushNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'overdue') => void;
  tasks: Task[];
  students: StudentApplication[];
  universities: KoreanUniversity[];
  onNavigateTab?: (tab: NavigationTab) => void;
}

type SettingsSection =
  | 'appearance'
  | 'dashboard'
  | 'admissions'
  | 'tasks'
  | 'sheets'
  | 'notifications'
  | 'profile'
  | 'backup';

const UserAvatarImg: React.FC<{ avatar?: string; name: string; className?: string }> = ({
  avatar,
  name,
  className = 'w-9 h-9',
}) => {
  const [hasError, setHasError] = useState(false);
  const isUrl = avatar && (avatar.startsWith('http') || avatar.startsWith('/'));
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (isUrl && !hasError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setHasError(true)}
        className={`${className} rounded-full object-cover shrink-0 border border-[#E2E8F0] dark:border-[#2E2E32]`}
      />
    );
  }

  return (
    <span
      className={`${className} rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6] text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase tracking-tight`}
    >
      {initials}
    </span>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onSwitchUser,
  team,
  connection,
  onRefreshData,
  pushNotification,
  tasks,
  students,
  universities,
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupFile, setLastBackupFile] = useState<string | null>(null);
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });

  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLastBackupFile(data.backupFile);
        pushNotification(
          'Backup Created',
          `SQLite snapshot successfully saved: ${data.backupFile}`,
          'success'
        );
      } else {
        throw new Error(data.error || 'Failed to create database snapshot');
      }
    } catch (err) {
      console.error('Backup error:', err);
      pushNotification(
        'Backup Failed',
        err instanceof Error ? err.message : 'Unable to create backup snapshot',
        'warning'
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportJson = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        system: 'WeCare Task',
        settings,
        taskCount: tasks.length,
        studentCount: students.length,
        universityCount: universities.length,
        tasks,
        students,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wecare-pms-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      pushNotification('Data Exported', 'Full PMS JSON snapshot downloaded successfully.', 'success');
    } catch {
      pushNotification('Export Failed', 'Could not generate JSON export file.', 'warning');
    }
  };

  const handleClearLocalCache = async () => {
    if (!window.confirm('Clear local offline cache? Your database data will remain safe and reload fresh from the server.')) {
      return;
    }
    setIsFlushingCache(true);
    try {
      localStorage.removeItem('wecare_pms_cached_state_v1');
      await onRefreshData();
      pushNotification('Cache Cleared', 'Local client cache revalidated from SQLite database.', 'success');
    } catch {
      pushNotification('Cache Error', 'Failed to refresh after clearing cache.', 'warning');
    } finally {
      setIsFlushingCache(false);
    }
  };

  const handleRequestDesktopNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Desktop notifications are not supported in this browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setDesktopPermission(permission);
      if (permission === 'granted') {
        onUpdateSettings({ desktopNotificationsEnabled: true });
        new Notification('WeCare Task Notifications Enabled', {
          body: 'You will receive real-time intake deadlines and handover alerts.',
          icon: '/assets/wecare_task_logo.webp',
        });
        pushNotification('Notifications Enabled', 'Desktop push notifications granted.', 'success');
      } else {
        onUpdateSettings({ desktopNotificationsEnabled: false });
        pushNotification('Permission Denied', 'Browser blocked desktop notifications.', 'warning');
      }
    } catch {
      pushNotification('Permission Error', 'Could not request notification permission.', 'warning');
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all application preferences to factory defaults?')) return;
    onUpdateSettings({
      theme: 'light',
      remindersEnabled: true,
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
      dashboardWidgets: { ...DEFAULT_DASHBOARD_WIDGETS },
    });
    pushNotification('Settings Reset', 'All settings restored to factory defaults.', 'info');
  };

  const navItems: { id: SettingsSection; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
    {
      id: 'appearance',
      label: 'Appearance & Display',
      icon: Sun,
      description: 'Theme, density & motion',
    },
    {
      id: 'dashboard',
      label: 'Dashboard Widgets',
      icon: LayoutGrid,
      description: 'Show or hide cards, progress & metrics',
    },
    {
      id: 'admissions',
      label: 'Admissions & Operations',
      icon: GraduationCap,
      description: 'Intake defaults & quota thresholds',
    },
    {
      id: 'tasks',
      label: 'Tasks & Automation',
      icon: ListTodo,
      description: 'Priorities, pagination & confirmation',
    },
    {
      id: 'sheets',
      label: 'Google Sheets Sync',
      icon: FileSpreadsheet,
      description: 'Two-way sync & conflict policy',
    },
    {
      id: 'notifications',
      label: 'Notifications & Alerts',
      icon: Bell,
      description: 'Reminders, sound chimes & SSE',
    },
    {
      id: 'profile',
      label: 'Team Persona & Office',
      icon: Building2,
      description: 'Active role & branch contact',
    },
    {
      id: 'backup',
      label: 'Data, Backup & Diagnostics',
      icon: Database,
      description: 'SQLite snapshots & cache control',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* HEADER BANNER */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E40AF] dark:text-[#4C8DF6]">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#0F172A] dark:text-[#ECECEE] tracking-tight">
              Settings & Operational Preferences
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-1 max-w-2xl">
            Configure workspace appearance, Korean admissions defaults, task automation rules, Google Sheets sync policies, team profiles, and database snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-[rgba(52,194,107,0.14)] dark:text-[#34C26B] border border-emerald-200 dark:border-[#34C26B]/30 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Preferences Auto-Saved</span>
          </div>

          <MotionButton
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-[#9A9AA2] hover:text-slate-900 dark:hover:text-[#ECECEE] bg-slate-100 dark:bg-[#252528] hover:bg-slate-200 dark:hover:bg-[#2E2E32] rounded-md transition-colors"
            title="Reset preferences to default values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </MotionButton>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAV SIDEBAR */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-2 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#66666E]">
            Configuration Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <MotionButton
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                whileHover={{ scale: 1.01 }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E40AF] dark:text-[#4C8DF6] font-semibold'
                    : 'text-slate-700 dark:text-[#ECECEE] hover:bg-slate-50 dark:hover:bg-[#252528]'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-[#1E40AF] dark:text-[#4C8DF6]' : 'text-slate-400 dark:text-[#9A9AA2]'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-snug">{item.label}</div>
                  <div className="text-[11px] text-slate-400 dark:text-[#9A9AA2] truncate">{item.description}</div>
                </div>
              </MotionButton>
            );
          })}

          {/* Quick System Status Card in Sidebar */}
          <div className="pt-4 mt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] px-3 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#66666E] mb-2">
              System Health
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-[#9A9AA2]">
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className="font-medium text-emerald-600 dark:text-[#34C26B] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#34C26B] inline-block"></span>
                  SQLite WAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sheets Sync:</span>
                <span className="font-medium text-slate-700 dark:text-[#ECECEE]">
                  {connection.connected ? 'Authenticated' : 'Not Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Tasks:</span>
                <span className={`font-medium text-slate-900 ${tasks.length === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'}`}>{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Dossiers:</span>
                <span className={`font-medium text-slate-900 ${students.length === 0 ? 'dark:text-[#66666E]' : 'dark:text-[#ECECEE]'}`}>{students.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION DETAIL */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-lg p-6">
          <TabTransition viewKey={activeSection}>
          {/* SECTION 1: APPEARANCE & DISPLAY */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Appearance & Interface Density
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Customize the theme palette, table density, and transition responsiveness across the consultancy portal.
                </p>
              </div>

              {/* Theme Palette */}
              <div className="pt-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] uppercase tracking-wider">
                    Color Theme
                  </label>
                  <ThemeTogglerButton
                    type="button"
                    theme={settings.theme}
                    resolvedTheme={settings.theme === 'dark' ? 'dark' : 'light'}
                    setTheme={(nextTheme: ThemeSelection) =>
                      onUpdateSettings({ theme: nextTheme === 'dark' ? 'dark' : 'light' })
                    }
                    modes={['light', 'dark']}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 rounded-lg border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#1C1C1E] hover:bg-[#EFF6FF] dark:hover:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] shadow-none"
                    title={settings.theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                    aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    <ThemeTogglerButtonIcon
                      light={<Sun className="w-3.5 h-3.5 text-[#D97706]" />}
                      dark={<Moon className="w-3.5 h-3.5 text-white" />}
                    />
                  </ThemeTogglerButton>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MotionButton
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors ${
                      settings.theme === 'light'
                        ? 'border-[#1E40AF] dark:border-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] ring-2 ring-[#1E40AF]/20 dark:ring-[#4C8DF6]/25'
                        : 'border-[#E2E8F0] dark:border-[#2E2E32] hover:border-slate-300 dark:hover:border-[#3A3A3F]'
                    }`}
                  >
                    <span className="p-2 rounded-md bg-amber-50 dark:bg-[rgba(240,160,48,0.14)] text-amber-600 dark:text-[#F0A030] border border-amber-200 dark:border-[#F0A030]/30">
                      <Sun className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">Light Mode</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] mt-0.5">High-contrast daytime clarity</div>
                    </div>
                  </MotionButton>

                  <MotionButton
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-colors ${
                      settings.theme === 'dark'
                        ? 'border-[#1E40AF] dark:border-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] ring-2 ring-[#1E40AF]/20 dark:ring-[#4C8DF6]/25'
                        : 'border-[#E2E8F0] dark:border-[#2E2E32] hover:border-slate-300 dark:hover:border-[#3A3A3F]'
                    }`}
                  >
                    <span className="p-2 rounded-md bg-[#1C1C1E] dark:bg-[#252528] text-white border border-[#2E2E32] dark:border-[#3A3A3F]">
                      <Moon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">Dark Mode</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] mt-0.5">Neutral charcoal for night shifts</div>
                    </div>
                  </MotionButton>
                </div>
              </div>

              {/* High Density Mode */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    High-Density Operational Layout
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Condense task list rows and cards for high-throughput admission file handling.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!settings.compactMode}
                    onChange={(e) => onUpdateSettings({ compactMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                </label>
              </div>

              {/* Reduced Motion */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Reduce Animations & Layout Shifts
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Minimize CSS transitions and drawer animations for instant, battery-saving rendering.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!settings.reducedMotion}
                    onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 1B: DASHBOARD WIDGETS VISIBILITY */}
          {activeSection === 'dashboard' && (() => {
            const widgetState: DashboardWidgetsConfig = {
              ...DEFAULT_DASHBOARD_WIDGETS,
              ...settings.dashboardWidgets,
            };

            const toggleWidget = (key: keyof DashboardWidgetsConfig, checked: boolean) => {
              onUpdateSettings({
                dashboardWidgets: {
                  ...widgetState,
                  [key]: checked,
                },
              });
            };

            const executiveItems: { key: keyof DashboardWidgetsConfig; title: string; desc: string }[] = [
              {
                key: 'executiveBanner',
                title: 'Executive Command Banner',
                desc: 'Top overview hero banner with Register Student and Assign Task shortcuts.',
              },
              {
                key: 'kpiMetrics',
                title: 'Executive KPI Metric Cards',
                desc: 'Four-card summary row for Intake Campaigns, Candidates, Pending Tasks, and Visas Issued.',
              },
              {
                key: 'visaPipeline',
                title: 'Visa Pipeline Funnel Matrix',
                desc: 'Eight-stage student dossier progression from document prep through visa issuance.',
              },
              {
                key: 'universityDeadlines',
                title: 'University Intake Deadlines',
                desc: 'Upcoming partner university intake deadline dates and quota progress bars.',
              },
              {
                key: 'teamWorkload',
                title: 'Team Workload & Accountability',
                desc: 'Consultant roster allocation showing pending and completed task counts.',
              },
            ];

            const dailyItems: { key: keyof DashboardWidgetsConfig; title: string; desc: string }[] = [
              {
                key: 'dailyProgressBar',
                title: 'Daily Completion Progress Bar',
                desc: 'Horizontal progress bar showing percentage of today’s scheduled tasks completed.',
              },
              {
                key: 'taskMetricStrip',
                title: 'Task Summary Metric Strip',
                desc: 'Row of daily task counters (individual cards can also be toggled below).',
              },
              {
                key: 'quickAddBar',
                title: 'Quick Add Task Bar',
                desc: 'Inline creation bar for quickly adding tasks directly from the dashboard.',
              },
              {
                key: 'overdueTasks',
                title: 'Overdue Tasks Alert Widget',
                desc: 'Highlighted overdue tasks panel with quick reschedule-to-today actions.',
              },
              {
                key: 'upcomingDeadlines',
                title: 'Upcoming Deadlines Widget',
                desc: 'Side panel listing upcoming task deadlines alongside Today’s Tasks.',
              },
              {
                key: 'connectedSheetCard',
                title: 'Connected Google Sheet Card',
                desc: 'Summary card displaying the active spreadsheet, worksheet range, and sync account.',
              },
              {
                key: 'weeklyCompletionTrend',
                title: 'Weekly Completion Trend Chart',
                desc: 'Seven-day visual completion trend chart at the bottom of the dashboard.',
              },
            ];

            const individualMetrics: { key: keyof DashboardWidgetsConfig; label: string }[] = [
              { key: 'metricToday', label: 'Today' },
              { key: 'metricUpcoming', label: 'Upcoming' },
              { key: 'metricCompleted', label: 'Completed' },
              { key: 'metricPending', label: 'Pending' },
              { key: 'metricOverdue', label: 'Overdue' },
              { key: 'metricTotal', label: 'Total' },
              { key: 'metricRate', label: 'Rate (%)' },
            ];

            const mainKeys = [...executiveItems, ...dailyItems].map((i) => i.key);
            const visibleCount = mainKeys.filter((k) => widgetState[k]).length;

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                      Dashboard Widget &amp; Metric Visibility
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                      Hide progress bars, summary sections, or individual metric cards on the Dashboard to reduce visual clutter.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-[#9A9AA2] mr-1">
                      {visibleCount}/{mainKeys.length} visible
                    </span>
                    <MotionButton
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          dashboardWidgets: {
                            ...DEFAULT_DASHBOARD_WIDGETS,
                            executiveBanner: false,
                            visaPipeline: false,
                            dailyProgressBar: false,
                            connectedSheetCard: false,
                            weeklyCompletionTrend: false,
                          },
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-[#ECECEE] bg-slate-100 dark:bg-[#252528] hover:bg-slate-200 dark:hover:bg-[#2E2E32] border border-[#E2E8F0] dark:border-[#3A3A3F] rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Minimal Focus
                    </MotionButton>
                    <MotionButton
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          dashboardWidgets: { ...DEFAULT_DASHBOARD_WIDGETS },
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] hover:bg-[#DBEAFE] dark:hover:bg-[rgba(76,141,246,0.22)] rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Show All
                    </MotionButton>
                  </div>
                </div>

                {/* Executive Overview Widgets */}
                <div className="space-y-3 pt-2 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9A9AA2]">
                    Executive Overview Widgets
                  </h3>
                  <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                    {executiveItems.map((item) => (
                      <div key={item.key} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                            {item.desc}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={widgetState[item.key]}
                            onChange={(e) => toggleWidget(item.key, e.target.checked)}
                            aria-label={`Toggle ${item.title}`}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Command Center & Task Widgets */}
                <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9A9AA2]">
                    Daily Command Center &amp; Task Widgets
                  </h3>
                  <div className="divide-y divide-[#E2E8F0] dark:divide-[#2E2E32]">
                    {dailyItems.map((item) => (
                      <div key={item.key} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                            {item.desc}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={widgetState[item.key]}
                            onChange={(e) => toggleWidget(item.key, e.target.checked)}
                            aria-label={`Toggle ${item.title}`}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Task Summary Metric Cards */}
                <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#9A9AA2]">
                        Individual Task Metric Cards
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                        {widgetState.taskMetricStrip
                          ? 'Choose which individual summary cards appear in the Task Summary Metric Strip.'
                          : 'Enable "Task Summary Metric Strip" above to display these cards on the dashboard.'}
                      </p>
                    </div>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${!widgetState.taskMetricStrip ? 'opacity-50 pointer-events-none' : ''}`}>
                    {individualMetrics.map((metric) => (
                      <div
                        key={metric.key}
                        className="px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] flex items-center justify-between gap-3"
                      >
                        <span className="text-xs font-medium text-[#0F172A] dark:text-[#ECECEE]">
                          {metric.label} Card
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            disabled={!widgetState.taskMetricStrip}
                            checked={widgetState[metric.key]}
                            onChange={(e) => toggleWidget(metric.key, e.target.checked)}
                            aria-label={`Toggle ${metric.label} metric card`}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#161616] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SECTION 2: ADMISSIONS & VISA OPERATIONS */}
          {activeSection === 'admissions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Korean Admissions & Visa Defaults
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Configure default intake periods, visa classifications, and automated quota warning thresholds.
                </p>
              </div>

              {/* Default Intake Season */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                    Active Intake Term (Default)
                  </label>
                  <MorphSelect
                    value={settings.defaultIntakeTerm || 'Fall 2026'}
                    onValueChange={(v) => onUpdateSettings({ defaultIntakeTerm: v })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select intake term..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Fall 2026">Fall 2026 (Active Intake)</MorphSelectItem>
                      <MorphSelectItem value="Spring 2027">Spring 2027 (Upcoming Cycle)</MorphSelectItem>
                      <MorphSelectItem value="Summer 2026">Summer 2026 (Language Session)</MorphSelectItem>
                      <MorphSelectItem value="Winter 2026">Winter 2026 (Intensive D-4)</MorphSelectItem>
                      <MorphSelectItem value="Fall 2027">Fall 2027 (Long-Range Pipeline)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                  <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">Pre-fills student dossier registrations and intake projects.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                    Default Visa Classification
                  </label>
                  <MorphSelect
                    value={settings.defaultVisaType || 'D-2-2'}
                    onValueChange={(v) => onUpdateSettings({ defaultVisaType: v })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select visa classification..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="D-2-2">D-2-2 (Bachelor&apos;s Degree Student)</MorphSelectItem>
                      <MorphSelectItem value="D-2-3">D-2-3 (Master&apos;s Degree Student)</MorphSelectItem>
                      <MorphSelectItem value="D-2-1">D-2-1 (Associate Degree Student)</MorphSelectItem>
                      <MorphSelectItem value="D-2-4">D-2-4 (Doctoral / PhD Candidate)</MorphSelectItem>
                      <MorphSelectItem value="D-4-1">D-4-1 (Korean Language Trainee)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                  <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">Initial visa stage template applied to new applicants.</p>
                </div>
              </div>

              {/* Default Degree Level */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                  Default Degree Target Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Bachelor's", "Master's", 'Doctoral', 'Language Training', 'Associate'].map((lvl) => (
                    <MotionButton
                      key={lvl}
                      onClick={() => onUpdateSettings({ defaultDegreeLevel: lvl })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        (settings.defaultDegreeLevel || "Bachelor's") === lvl
                          ? 'border-[#1E40AF] dark:border-[#4C8DF6] bg-[#EFF6FF] text-[#1E40AF] font-semibold dark:bg-[rgba(76,141,246,0.14)] dark:text-[#4C8DF6]'
                          : 'border-[#E2E8F0] dark:border-[#2E2E32] text-slate-600 dark:text-[#9A9AA2] hover:bg-slate-50 dark:hover:bg-[#252528] dark:hover:text-[#ECECEE]'
                      }`}
                    >
                      {lvl}
                    </MotionButton>
                  ))}
                </div>
              </div>

              {/* Thresholds */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-[#ECECEE]">
                      Intake Quota Warning Threshold
                    </label>
                    <span className="text-xs font-bold text-[#1E40AF] dark:text-[#4C8DF6]">
                      {settings.quotaWarningThreshold ?? 80}% Full
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={settings.quotaWarningThreshold ?? 80}
                    onChange={(e) => onUpdateSettings({ quotaWarningThreshold: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#1E40AF] dark:accent-[#4C8DF6]"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">
                    Triggers warning banner when university intake applications approach quota limits.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                    Deadline Urgency Horizon
                  </label>
                  <MorphSelect
                    value={String(settings.deadlineWarningDays ?? 30)}
                    onValueChange={(v) => onUpdateSettings({ deadlineWarningDays: parseInt(v, 10) })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select warning horizon..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="14">14 Days (Critical Urgency Only)</MorphSelectItem>
                      <MorphSelectItem value="30">30 Days (Standard 1-Month Window)</MorphSelectItem>
                      <MorphSelectItem value="45">45 Days (Extended Intake Notice)</MorphSelectItem>
                      <MorphSelectItem value="60">60 Days (Comprehensive Preparation)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                  <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">
                    Highlights intake deadlines in warning/danger color schemes when approaching this date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: TASKS & AUTOMATION */}
          {activeSection === 'tasks' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Task & Workflow Automation
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Set default task priorities, categories, completion confirmation prompts, and pagination sizes.
                </p>
              </div>

              {/* Default Priority & Category */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                    Default Task Priority
                  </label>
                  <MorphSelect
                    value={settings.defaultPriority || 'Medium'}
                    onValueChange={(v) => onUpdateSettings({ defaultPriority: v as TaskPriority })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select priority..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Urgent">Urgent (Red Alert)</MorphSelectItem>
                      <MorphSelectItem value="High">High (Immediate Action)</MorphSelectItem>
                      <MorphSelectItem value="Medium">Medium (Normal Schedule)</MorphSelectItem>
                      <MorphSelectItem value="Low">Low (Backlog Item)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                    Default Task Category
                  </label>
                  <MorphSelect
                    value={settings.defaultCategory || 'Work'}
                    onValueChange={(v) => onUpdateSettings({ defaultCategory: v as TaskCategory })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select category..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="Work">Work (Admissions & Visa Operations)</MorphSelectItem>
                      <MorphSelectItem value="Study">Study (Application Research & Tests)</MorphSelectItem>
                      <MorphSelectItem value="Business">Business (Embassy & Courier Logistics)</MorphSelectItem>
                      <MorphSelectItem value="Personal">Personal (Consultant Follow-ups)</MorphSelectItem>
                      <MorphSelectItem value="Other">Other</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>

              {/* Completion Confirmation Modal Switch */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Mandatory Task Completion Confirmation Dialog
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Prompt with Google Sheets sync timestamp confirmation before marking a task complete. (Disable for 1-click completion).
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireCompletionConfirm !== false}
                    onChange={(e) => onUpdateSettings({ requireCompletionConfirm: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                </label>
              </div>

              {/* Audio Chime on Completion */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Audio Chime on Task Completion
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Play a gentle melodic chime when completing an admission task.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MotionButton
                    onClick={() => playCompletionChime()}
                    className="p-1.5 text-xs text-slate-500 dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] bg-slate-100 dark:bg-[#252528] rounded hover:bg-slate-200 dark:hover:bg-[#2E2E32] transition-colors"
                    title="Test audio chime"
                    aria-label="Test audio chime"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </MotionButton>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled !== false}
                      onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                  </label>
                </div>
              </div>

              {/* Tasks Pagination Size */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Task List & Archive Pagination Size
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Items displayed per page in All Tasks and Completed views.
                  </div>
                </div>
                <div className="w-48 shrink-0">
                  <MorphSelect
                    value={String(settings.tasksPerPage ?? 25)}
                    onValueChange={(v) => onUpdateSettings({ tasksPerPage: parseInt(v, 10) })}
                  >
                    <MorphSelectTrigger>
                      <MorphSelectValue placeholder="Select size..." />
                    </MorphSelectTrigger>
                    <MorphSelectContent>
                      <MorphSelectItem value="15">15 items</MorphSelectItem>
                      <MorphSelectItem value="25">25 items (Standard)</MorphSelectItem>
                      <MorphSelectItem value="50">50 items (Large)</MorphSelectItem>
                      <MorphSelectItem value="100">100 items (Audit View)</MorphSelectItem>
                    </MorphSelectContent>
                  </MorphSelect>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: GOOGLE SHEETS SYNC */}
          {activeSection === 'sheets' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Google Sheets Synchronization Policies
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Configure bi-directional sync frequency, conflict resolution rules, and offline simulation.
                </p>
              </div>

              {/* Current Connection Status Box */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-md bg-emerald-100 dark:bg-[rgba(52,194,107,0.14)] text-emerald-700 dark:text-[#34C26B]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE]">
                      {connection.selectedSpreadsheetTitle || 'Personal Daily Task Master 2026'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2]">
                      Worksheet: <span className="tabular-nums text-[#1E40AF] dark:text-[#4C8DF6]">{connection.selectedWorksheet || 'Tasks'}</span>
                      {connection.connected ? ' · OAuth 2.0 Connected' : ' · Ready for Connection'}
                    </div>
                  </div>
                </div>

                {onNavigateTab && (
                  <MotionButton
                    onClick={() => onNavigateTab('sheets-connection')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] dark:hover:text-[#6BA1F8] hover:underline shrink-0"
                  >
                    Open Sheets Console <ArrowRight className="w-3.5 h-3.5" />
                  </MotionButton>
                )}
              </div>

              {/* Sync Frequency */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                  Background Synchronization Cadence
                </label>
                <MorphSelect
                  value={settings.autoSyncFrequency || 'realtime'}
                  onValueChange={(v) => onUpdateSettings({ autoSyncFrequency: v as 'realtime' | '5m' | '15m' | 'manual' })}
                >
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select sync cadence..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="realtime">Real-time (Immediate push on every task change) [Recommended]</MorphSelectItem>
                    <MorphSelectItem value="5m">Every 5 Minutes (Periodic background sweep)</MorphSelectItem>
                    <MorphSelectItem value="15m">Every 15 Minutes (Low API consumption)</MorphSelectItem>
                    <MorphSelectItem value="manual">Manual Only (Only synchronize when clicking &quot;Sync Now&quot;)</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
                <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">
                  Adjusts how quickly local changes are dispatched to Google Sheets API v4.
                </p>
              </div>

              {/* Conflict Resolution Policy */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                  Sync Conflict Resolution Strategy
                </label>
                <MorphSelect
                  value={settings.syncConflictPolicy || 'last_modified'}
                  onValueChange={(v) => onUpdateSettings({ syncConflictPolicy: v as 'sheets_wins' | 'local_wins' | 'last_modified' })}
                >
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select conflict policy..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="last_modified">Last Modified Wins (Compare Last Updated timestamp) [Standard]</MorphSelectItem>
                    <MorphSelectItem value="sheets_wins">Google Sheets Wins (Spreadsheet is single source of truth)</MorphSelectItem>
                    <MorphSelectItem value="local_wins">Local SQLite Wins (Consultancy portal takes absolute precedence)</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
                <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">
                  Determines behavior if a task was edited simultaneously on Google Sheets and in the PMS portal.
                </p>
              </div>

              {/* Default Worksheet Name */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                  Default Worksheet Tab Name
                </label>
                <input
                  type="text"
                  value={settings.defaultWorksheetName || 'Personal Daily Task Master 2026'}
                  onChange={(e) => onUpdateSettings({ defaultWorksheetName: e.target.value })}
                  placeholder="e.g. Personal Daily Task Master 2026"
                  className="w-full h-9 px-3 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:ring-1 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:outline-none"
                />
              </div>

              {/* Developer Offline Switch */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4 p-3 rounded-lg bg-amber-50/50 dark:bg-[rgba(240,160,48,0.14)] border border-amber-200/60 dark:border-[#F0A030]/30">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-[#F0A030] flex items-center gap-1.5">
                    <WifiOff className="w-3.5 h-3.5" />
                    Simulate Network Interruption (Offline SQLite Queue QA)
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-[#F0A030]/90 mt-0.5">
                    Forces offline state to test SQLite local mutation queueing and auto-flush reconciliation.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!settings.simulateOffline}
                    onChange={(e) => onUpdateSettings({ simulateOffline: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600 dark:peer-checked:bg-[#F0A030]"></div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 5: NOTIFICATIONS & ALERTS */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Notification Channels & Alerts
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Manage in-app toasts, daily briefing digests, audio chimes, and browser desktop notifications.
                </p>
              </div>

              {/* Daily Morning Reminders */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Daily Morning Task Briefing & Digest
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Display alert notifications for tasks scheduled for today upon workspace launch.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.remindersEnabled !== false}
                    onChange={(e) => onUpdateSettings({ remindersEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                </label>
              </div>

              {/* Overdue Task Banners */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Sticky Overdue Task Warning Banners
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Show persistent alert badges for tasks that have crossed their deadline dates.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.overdueAlertsEnabled !== false}
                    onChange={(e) => onUpdateSettings({ overdueAlertsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                </label>
              </div>

              {/* Handover & Document Requests Real-time Alerts */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Document Handover & Courier Push Alerts (SSE)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Instant notifications when counselors dispatch documents or admission requests missing files.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.handoverAlertsEnabled !== false}
                    onChange={(e) => onUpdateSettings({ handoverAlertsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                </label>
              </div>

              {/* Audio Chime on Notification */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Audio Chime on Notification Event
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Play a discreet acoustic chime on incoming notifications and assignment handovers.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MotionButton
                    onClick={() => playNotificationChime()}
                    className="p-1.5 text-xs text-slate-500 dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6] bg-slate-100 dark:bg-[#252528] rounded hover:bg-slate-200 dark:hover:bg-[#2E2E32] transition-colors"
                    title="Test chime"
                    aria-label="Test notification chime"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </MotionButton>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled !== false}
                      onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#2E2E32] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF] dark:peer-checked:bg-[#4C8DF6]"></div>
                  </label>
                </div>
              </div>

              {/* Browser Desktop Notifications Permission */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    OS Native Desktop Notifications
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Status: <span className="font-semibold uppercase text-xs">{desktopPermission}</span>
                  </div>
                </div>
                <MotionButton
                  onClick={handleRequestDesktopNotifications}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#1E40AF] dark:border-[#4C8DF6] text-[#1E40AF] dark:text-[#4C8DF6] hover:bg-[#EFF6FF] dark:hover:bg-[rgba(76,141,246,0.14)] transition-colors"
                >
                  {desktopPermission === 'granted' ? 'Notifications Granted' : 'Request Permission'}
                </MotionButton>
              </div>
            </div>
          )}

          {/* SECTION 6: TEAM PERSONA & OFFICE PROFILE */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Team Persona & Regional Branch Office
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Switch active user persona and update regional liaison office contact information for dispatch documents.
                </p>
              </div>

              {/* Active User Switcher Cards */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] uppercase tracking-wider mb-2">
                  Active Team Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {team.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <MotionButton
                        key={user.id}
                        onClick={() => onSwitchUser(user)}
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-lg border text-left transition-colors flex items-start gap-3 ${
                          isSelected
                            ? 'border-[#1E40AF] dark:border-[#4C8DF6] bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] ring-2 ring-[#1E40AF]/20 dark:ring-[#4C8DF6]/25'
                            : 'border-[#E2E8F0] dark:border-[#2E2E32] hover:border-slate-300 dark:hover:border-[#3A3A3F]'
                        }`}
                      >
                        <UserAvatarImg avatar={user.avatar} name={user.name} className="w-9 h-9" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE] truncate">
                              {user.name}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                user.role === 'Admission_Manager'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-[rgba(76,141,246,0.14)] dark:text-[#4C8DF6]'
                                  : 'bg-blue-100 text-blue-700 dark:bg-[#252528] dark:text-[#9A9AA2]'
                              }`}
                            >
                              {user.role === 'Admission_Manager' ? 'Admission Manager' : 'Consultant'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] truncate mt-0.5">
                            {user.title || user.email}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-[#66666E] mt-1">
                            Team: {user.team || 'General Operations'}
                          </div>
                        </div>
                      </MotionButton>
                    );
                  })}
                </div>
              </div>

              {/* Regional Branch Office */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                  Regional Consultancy Liaison Office
                </label>
                <MorphSelect
                  value={settings.regionalBranch || 'Dhaka Central Liaison Office (HQ)'}
                  onValueChange={(v) => onUpdateSettings({ regionalBranch: v })}
                >
                  <MorphSelectTrigger>
                    <MorphSelectValue placeholder="Select regional branch..." />
                  </MorphSelectTrigger>
                  <MorphSelectContent>
                    <MorphSelectItem value="Dhaka Central Liaison Office (HQ)">Dhaka Central Liaison Office (HQ - Gulshan)</MorphSelectItem>
                    <MorphSelectItem value="Seoul Gangnam Admissions Center">Seoul Gangnam Admissions Center (South Korea HQ)</MorphSelectItem>
                    <MorphSelectItem value="Busan Visa Processing Unit">Busan Visa Processing & Apostille Unit</MorphSelectItem>
                    <MorphSelectItem value="Chittagong Student Advisory Center">Chittagong Student Advisory Center</MorphSelectItem>
                  </MorphSelectContent>
                </MorphSelect>
                <p className="text-[11px] text-slate-400 dark:text-[#9A9AA2] mt-1">
                  Printed on formal document handover acknowledgement slips and DHL courier declarations.
                </p>
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#ECECEE] mb-1.5">
                  Emergency Dispatch Phone & WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-[#9A9AA2] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={settings.dispatchEmergencyPhone || '+880 1711-000000'}
                    onChange={(e) => onUpdateSettings({ dispatchEmergencyPhone: e.target.value })}
                    placeholder="+880 1711-000000"
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-white dark:bg-[#252528] text-[#0F172A] dark:text-[#ECECEE] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:ring-1 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: DATA, BACKUP & DIAGNOSTICS */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-[#ECECEE]">
                  Data Governance, Database Backup & Diagnostics
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                  Create immutable SQLite backup snapshots, download JSON audit archives, and inspect storage health.
                </p>
              </div>

              {/* Instant Database Snapshot */}
              <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-slate-50/50 dark:bg-[#252528] space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#1E40AF] dark:text-[#4C8DF6]" />
                      Create SQLite Database Backup Snapshot
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#9A9AA2] mt-0.5">
                      Generates a point-in-time immutable backup file in the server&apos;s <code className="text-[10px] bg-slate-200 dark:bg-[#1C1C1E] px-1 py-0.5 rounded">data/backups/</code> directory.
                    </div>
                  </div>

                  <MotionButton
                    disabled={isBackingUp}
                    onClick={handleBackupDatabase}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1E40AF] hover:bg-blue-800 dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] text-white shadow-xs dark:shadow-none disabled:opacity-50 transition-colors shrink-0"
                  >
                    {isBackingUp ? (
                      <>
                        <Spinner size="sm" shade="inherit" aria-hidden="true" />
                        Generating Snapshot...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Create Snapshot Now
                      </>
                    )}
                  </MotionButton>
                </div>

                {lastBackupFile && (
                  <div className="p-2.5 rounded bg-emerald-50 dark:bg-[rgba(52,194,107,0.14)] border border-emerald-200 dark:border-[#34C26B]/30 text-xs text-emerald-800 dark:text-[#34C26B] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#34C26B] shrink-0" />
                    <span>Snapshot created: <strong className="tabular-nums">{lastBackupFile}</strong></span>
                  </div>
                )}
              </div>

              {/* JSON Audit Export */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Export Complete Workspace Data (JSON)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Download full client data payload including tasks, student applications, and configuration settings.
                  </div>
                </div>
                <MotionButton
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-slate-50 dark:hover:bg-[#252528] text-slate-700 dark:text-[#ECECEE] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-[#9A9AA2]" />
                  Download JSON
                </MotionButton>
              </div>

              {/* Clear Local Cache */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                    Flush Stale-While-Revalidate Local Cache
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#9A9AA2]">
                    Clears client-side browser cache and revalidates fresh state from the SQLite database.
                  </div>
                </div>
                <MotionButton
                  disabled={isFlushingCache}
                  onClick={handleClearLocalCache}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-[#EF5350]/40 dark:text-[#EF5350] dark:hover:bg-[rgba(239,83,80,0.14)] transition-colors"
                >
                  {isFlushingCache ? <Spinner size="sm" shade="inherit" aria-hidden="true" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Flush Cache
                </MotionButton>
              </div>

              {/* System Diagnostics Table */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#9A9AA2] mb-2">
                  System Architecture Diagnostics
                </div>
                <div className="rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] overflow-hidden divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] text-xs">
                  <div className="flex justify-between px-3 py-2 bg-slate-50 dark:bg-[#252528] tabular-nums text-[11px]">
                    <span className="text-slate-500 dark:text-[#9A9AA2]">Database Engine</span>
                    <span className="font-semibold text-slate-800 dark:text-[#ECECEE]">SQLite 3 (WAL Mode + Foreign Keys)</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 tabular-nums text-[11px]">
                    <span className="text-slate-500 dark:text-[#9A9AA2]">Database Location</span>
                    <span className="text-slate-800 dark:text-[#ECECEE]">data/consultancy_pms.sqlite</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 tabular-nums text-[11px]">
                    <span className="text-slate-500 dark:text-[#9A9AA2]">Sync Pipeline</span>
                    <span className="text-slate-800 dark:text-[#ECECEE]">Google Sheets API v4 (12-column schema)</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 tabular-nums text-[11px]">
                    <span className="text-slate-500 dark:text-[#9A9AA2]">Event Stream (SSE)</span>
                    <span className="text-emerald-600 dark:text-[#34C26B] font-semibold">Active (/api/notifications/stream)</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 tabular-nums text-[11px]">
                    <span className="text-slate-500 dark:text-[#9A9AA2]">Bundle Partitioning</span>
                    <span className="text-slate-800 dark:text-[#ECECEE]">Vite 8 + Rollup manualChunks (81% reduced)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          </TabTransition>
        </div>
      </div>
    </div>
  );
};
