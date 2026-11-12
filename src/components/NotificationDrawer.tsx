import React from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  ExternalLink,
  Clock,
  AlertTriangle,
  UserCheck,
  FileText,
  FileCheck2,
  X,
} from 'lucide-react';
import { InAppNotification } from '../types/pms';
import { formatTimestamp } from '../utils/dateUtils';
import { requestDesktopNotificationPermission } from '../services/pmsService';

interface NotificationDrawerProps {
  notifications: InAppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateToEntity: (entityType: string, entityId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigateToEntity,
}) => {
  const [browserPermission, setBrowserPermission] = React.useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const handleEnableDesktopAlerts = async () => {
    const granted = await requestDesktopNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Operational Alerts
                {unreadCount > 0 && (
                  <span className="font-mono text-xs px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Real-time task assignments, visa updates & deadlines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Browser Desktop Notification Status Bar */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            {browserPermission === 'granted' ? (
              <Bell className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>
              Desktop alerts: <strong className="font-medium text-slate-800 dark:text-slate-200">{browserPermission}</strong>
            </span>
          </div>
          {browserPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleEnableDesktopAlerts}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Enable OS Notifications
            </button>
          )}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Bell className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No notifications yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Task assignments, visa stage advancements, and admission deadlines will notify you here instantly.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (isUnread) onMarkRead(n.id);
                    onNavigateToEntity(n.targetEntity, n.targetEntityId);
                    onClose();
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isUnread
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {n.type === 'task_assigned' && <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                      {n.type === 'task_completed' && <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      {n.type === 'deadline_warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      {n.type === 'visa_update' && n.targetEntity !== 'handover' && <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                      {n.targetEntity === 'handover' && <FileCheck2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                      <span className="truncate">{n.title}</span>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(n.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      View {n.targetEntity}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
