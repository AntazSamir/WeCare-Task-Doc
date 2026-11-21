import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
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
} from 'lucide-react';
import { AppSettings, TaskCategory, TaskPriority, GoogleSheetsConnectionState, Task, NavigationTab } from '../types/task';
import { Spinner } from '@astryxdesign/core/Spinner';
import { UserProfile, StudentApplication, KoreanUniversity } from '../types/pms';
import { playNotificationChime, playCompletionChime } from '../utils/soundUtils';
import { MorphSelect, MorphSelectTrigger, MorphSelectValue, MorphSelectContent, MorphSelectItem } from './ui/MorphSelect';
import { TabTransition } from './animations';

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
        className={`${className} rounded-full object-cover shrink-0 border border-[#E2E8F0] dark:border-slate-700`}
      />
    );
  }

  return (
    <span
      className={`${className} rounded-full bg-[#1E40AF] text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase tracking-tight`}
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
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-md bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
              Settings & Operational Preferences
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure workspace appearance, Korean admissions defaults, task automation rules, Google Sheets sync policies, team profiles, and database snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Preferences Auto-Saved</span>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            title="Reset preferences to default values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAV SIDEBAR */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-2 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Configuration Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] dark:bg-blue-950/50 text-[#1E40AF] dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-[#1E40AF] dark:text-blue-400' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-snug">{item.label}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{item.description}</div>
                </div>
              </button>
            );
          })}

          {/* Quick System Status Card in Sidebar */}
          <div className="pt-4 mt-4 border-t border-[#E2E8F0] dark:border-slate-800 px-3 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              System Health
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  SQLite WAL
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sheets Sync:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {connection.connected ? 'Authenticated' : 'Not Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Tasks:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{tasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Dossiers:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{students.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION DETAIL */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6">
          <TabTransition viewKey={activeSection}>
          {/* SECTION 1: APPEARANCE & DISPLAY */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Appearance & Interface Density
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize the theme palette, table density, and transition responsiveness across the consultancy portal.
                </p>
              </div>

              {/* Theme Palette */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Color Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                      settings.theme === 'light'
                        ? 'border-[#1E40AF] bg-[#EFF6FF] dark:bg-blue-950/40 ring-2 ring-[#1E40AF]/20'
                        : 'border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="p-2 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                      <Sun className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">Light Mode</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">High-contrast daytime clarity</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                      settings.theme === 'dark'
                        ? 'border-[#1E40AF] bg-[#EFF6FF] dark:bg-blue-950/40 ring-2 ring-[#1E40AF]/20'
                        : 'border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="p-2 rounded-md bg-slate-800 text-blue-400 border border-slate-700">
                      <Moon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">Dark Navy</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Reduced eye strain for night shifts</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ theme: 'system' })}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                      settings.theme === 'system'
                        ? 'border-[#1E40AF] bg-[#EFF6FF] dark:bg-blue-950/40 ring-2 ring-[#1E40AF]/20'
                        : 'border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Monitor className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">System OS</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Sync with Windows/macOS</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* High Density Mode */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    High-Density Operational Layout
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>

              {/* Reduced Motion */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Reduce Animations & Layout Shifts
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 2: ADMISSIONS & VISA OPERATIONS */}
          {activeSection === 'admissions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Korean Admissions & Visa Defaults
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure default intake periods, visa classifications, and automated quota warning thresholds.
                </p>
              </div>

              {/* Default Intake Season */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <p className="text-[11px] text-slate-400 mt-1">Pre-fills student dossier registrations and intake projects.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <p className="text-[11px] text-slate-400 mt-1">Initial visa stage template applied to new applicants.</p>
                </div>
              </div>

              {/* Default Degree Level */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Degree Target Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Bachelor's", "Master's", 'Doctoral', 'Language Training', 'Associate'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultDegreeLevel: lvl })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        (settings.defaultDegreeLevel || "Bachelor's") === lvl
                          ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF] font-semibold dark:bg-blue-950/40 dark:text-blue-400'
                          : 'border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thresholds */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Intake Quota Warning Threshold
                    </label>
                    <span className="text-xs font-bold text-[#1E40AF] dark:text-blue-400">
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
                    className="w-full accent-[#1E40AF]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Triggers warning banner when university intake applications approach quota limits.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <p className="text-[11px] text-slate-400 mt-1">
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
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Task & Workflow Automation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set default task priorities, categories, completion confirmation prompts, and pagination sizes.
                </p>
              </div>

              {/* Default Priority & Category */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Mandatory Task Completion Confirmation Dialog
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>

              {/* Audio Chime on Completion */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Audio Chime on Task Completion
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Play a gentle melodic chime when completing an admission task.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => playCompletionChime()}
                    className="p-1.5 text-xs text-slate-500 hover:text-[#1E40AF] bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Test audio chime"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled !== false}
                      onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                  </label>
                </div>
              </div>

              {/* Tasks Pagination Size */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Task List & Archive Pagination Size
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Items displayed per page in Team Tasks and Completed Archive views.
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
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Google Sheets Synchronization Policies
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure bi-directional sync frequency, conflict resolution rules, and offline simulation.
                </p>
              </div>

              {/* Current Connection Status Box */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                      {connection.selectedSpreadsheetTitle || 'Personal Daily Task Master 2026'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Worksheet: <span className="font-mono text-[#1E40AF] dark:text-blue-400">{connection.selectedWorksheet || 'Tasks'}</span>
                      {connection.connected ? ' · OAuth 2.0 Connected' : ' · Ready for Connection'}
                    </div>
                  </div>
                </div>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('sheets-connection')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-blue-400 hover:underline shrink-0"
                  >
                    Open Sheets Console <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sync Frequency */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                <p className="text-[11px] text-slate-400 mt-1">
                  Adjusts how quickly local changes are dispatched to Google Sheets API v4.
                </p>
              </div>

              {/* Conflict Resolution Policy */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                <p className="text-[11px] text-slate-400 mt-1">
                  Determines behavior if a task was edited simultaneously on Google Sheets and in the PMS portal.
                </p>
              </div>

              {/* Default Worksheet Name */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Default Worksheet Tab Name
                </label>
                <input
                  type="text"
                  value={settings.defaultWorksheetName || 'Personal Daily Task Master 2026'}
                  onChange={(e) => onUpdateSettings({ defaultWorksheetName: e.target.value })}
                  placeholder="e.g. Personal Daily Task Master 2026"
                  className="w-full h-9 px-3 text-xs rounded-md border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] focus:outline-none"
                />
              </div>

              {/* Developer Offline Switch */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <WifiOff className="w-3.5 h-3.5" />
                    Simulate Network Interruption (Offline SQLite Queue QA)
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
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
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 5: NOTIFICATIONS & ALERTS */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Notification Channels & Alerts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage in-app toasts, daily briefing digests, audio chimes, and browser desktop notifications.
                </p>
              </div>

              {/* Daily Morning Reminders */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Daily Morning Task Briefing & Digest
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>

              {/* Overdue Task Banners */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Sticky Overdue Task Warning Banners
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>

              {/* Handover & Document Requests Real-time Alerts */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Document Handover & Courier Push Alerts (SSE)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                </label>
              </div>

              {/* Audio Chime on Notification */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Audio Chime on Notification Event
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Play a discreet acoustic chime on incoming notifications and assignment handovers.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => playNotificationChime()}
                    className="p-1.5 text-xs text-slate-500 hover:text-[#1E40AF] bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Test chime"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled !== false}
                      onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E40AF]"></div>
                  </label>
                </div>
              </div>

              {/* Browser Desktop Notifications Permission */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    OS Native Desktop Notifications
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Status: <span className="font-semibold uppercase text-xs">{desktopPermission}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestDesktopNotifications}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#1E40AF] text-[#1E40AF] hover:bg-[#EFF6FF] dark:hover:bg-blue-950/40 transition-colors"
                >
                  {desktopPermission === 'granted' ? 'Notifications Granted' : 'Request Permission'}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 6: TEAM PERSONA & OFFICE PROFILE */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Team Persona & Regional Branch Office
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Switch active user persona and update regional liaison office contact information for dispatch documents.
                </p>
              </div>

              {/* Active User Switcher Cards */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Active Team Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {team.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => onSwitchUser(user)}
                        className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-[#1E40AF] bg-[#EFF6FF] dark:bg-blue-950/40 ring-2 ring-[#1E40AF]/20'
                            : 'border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <UserAvatarImg avatar={user.avatar} name={user.name} className="w-9 h-9" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100 truncate">
                              {user.name}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                user.role === 'Admission_Manager'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                              }`}
                            >
                              {user.role === 'Admission_Manager' ? 'Admission Manager' : 'Consultant'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {user.title || user.email}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Team: {user.team || 'General Operations'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Regional Branch Office */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                <p className="text-[11px] text-slate-400 mt-1">
                  Printed on formal document handover acknowledgement slips and DHL courier declarations.
                </p>
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Emergency Dispatch Phone & WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={settings.dispatchEmergencyPhone || '+880 1711-000000'}
                    onChange={(e) => onUpdateSettings({ dispatchEmergencyPhone: e.target.value })}
                    placeholder="+880 1711-000000"
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: DATA, BACKUP & DIAGNOSTICS */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Data Governance, Database Backup & Diagnostics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create immutable SQLite backup snapshots, download JSON audit archives, and inspect storage health.
                </p>
              </div>

              {/* Instant Database Snapshot */}
              <div className="p-4 rounded-lg border border-[#E2E8F0] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
                      Create SQLite Database Backup Snapshot
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Generates a point-in-time immutable backup file in the server&apos;s <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">data/backups/</code> directory.
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handleBackupDatabase}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1E40AF] hover:bg-blue-800 text-white shadow-xs disabled:opacity-50 transition-colors shrink-0"
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
                  </button>
                </div>

                {lastBackupFile && (
                  <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Snapshot created: <strong className="font-mono">{lastBackupFile}</strong></span>
                  </div>
                )}
              </div>

              {/* JSON Audit Export */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Export Complete Workspace Data (JSON)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Download full client data payload including tasks, student applications, and configuration settings.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Download JSON
                </button>
              </div>

              {/* Clear Local Cache */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
                    Flush Stale-While-Revalidate Local Cache
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Clears client-side browser cache and revalidates fresh state from the SQLite database.
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isFlushingCache}
                  onClick={handleClearLocalCache}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                >
                  {isFlushingCache ? <Spinner size="sm" shade="inherit" aria-hidden="true" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Flush Cache
                </button>
              </div>

              {/* System Diagnostics Table */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  System Architecture Diagnostics
                </div>
                <div className="rounded-lg border border-[#E2E8F0] dark:border-slate-800 overflow-hidden divide-y divide-[#E2E8F0] dark:divide-slate-800 text-xs">
                  <div className="flex justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/40 font-mono text-[11px]">
                    <span className="text-slate-500">Database Engine</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">SQLite 3 (WAL Mode + Foreign Keys)</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 font-mono text-[11px]">
                    <span className="text-slate-500">Database Location</span>
                    <span className="text-slate-800 dark:text-slate-200">data/consultancy_pms.sqlite</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 font-mono text-[11px]">
                    <span className="text-slate-500">Sync Pipeline</span>
                    <span className="text-slate-800 dark:text-slate-200">Google Sheets API v4 (12-column schema)</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 font-mono text-[11px]">
                    <span className="text-slate-500">Event Stream (SSE)</span>
                    <span className="text-emerald-600 font-semibold">Active (/api/notifications/stream)</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 font-mono text-[11px]">
                    <span className="text-slate-500">Bundle Partitioning</span>
                    <span className="text-slate-800 dark:text-slate-200">Vite 8 + Rollup manualChunks (81% reduced)</span>
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
