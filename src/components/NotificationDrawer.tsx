import React from 'react';
import {
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
import { Bell } from './animate-ui/icons/bell';
import { InAppNotification } from '../types/pms';
import { formatTimestamp } from '../utils/dateUtils';
import { requestDesktopNotificationPermission } from '../services/pmsService';
import { DrawerTransition, MotionButton } from './animations';

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
    await requestDesktopNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DrawerTransition
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/75 backdrop-blur-xs"
      panelClassName="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#FFFFFF] dark:bg-[#1C1C1E] border-l border-[#E2E8F0] dark:border-[#2E2E32] shadow-2xl dark:shadow-none z-50 flex flex-col"
    >
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-[#252528] border border-[#1E40AF]/40 dark:border-[#2E2E32] flex items-center justify-center text-[#1E40AF] dark:text-[#4C8DF6]">
              <Bell size={16} animate={isOpen} animateOnHover className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE] flex items-center gap-2">
                Operational Alerts
                {unreadCount > 0 && (
                  <span className="tabular-nums text-xs px-1.5 py-0.2 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6] text-white font-bold">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#0F172A]/65 dark:text-[#9A9AA2]">
                Real-time task assignments, visa updates & deadlines
              </p>
            </div>
          </div>
          <MotionButton
            type="button"
            onClick={onClose}
            className="p-1 text-[#0F172A]/50 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE] rounded transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </MotionButton>
        </div>

        {/* Browser Desktop Notification Status Bar */}
        <div className="px-4 py-2 bg-[#F8FAFC] dark:bg-[#161616] border-b border-[#E2E8F0] dark:border-[#2E2E32] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#0F172A]/75 dark:text-[#9A9AA2]">
            {browserPermission === 'granted' ? (
              <Bell size={14} animateOnHover className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#34C26B]" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F0A030]" />
            )}
            <span>
              Desktop alerts: <strong className="font-medium text-[#0F172A] dark:text-[#ECECEE]">{browserPermission}</strong>
            </span>
          </div>
          {browserPermission !== 'granted' && (
            <MotionButton
              type="button"
              onClick={handleEnableDesktopAlerts}
              className="text-[11px] font-semibold text-[#1E40AF] dark:text-[#4C8DF6] hover:underline"
            >
              Enable OS Notifications
            </MotionButton>
          )}
          {unreadCount > 0 && (
            <MotionButton
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F172A]/75 dark:text-[#9A9AA2] hover:text-[#1E40AF] dark:hover:text-[#4C8DF6]"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </MotionButton>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto scrollbar-stable divide-y divide-[#E2E8F0] dark:divide-[#2E2E32] p-2 space-y-1">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#EFF6FF] dark:bg-[#252528] border border-transparent dark:border-[#2E2E32] flex items-center justify-center text-[#1E40AF] dark:text-[#9A9AA2]">
                <Bell size={20} animateOnHover className="w-5 h-5 opacity-70" />
              </div>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#ECECEE]">
                No notifications yet
              </p>
              <p className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2] max-w-xs mx-auto">
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
                      ? 'bg-[#EFF6FF]/50 dark:bg-[#252528] border border-[#1E40AF]/40 dark:border-[#4C8DF6]/40 shadow-xs dark:shadow-none'
                      : 'hover:bg-[#F8FAFC] dark:hover:bg-[#252528]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] dark:text-[#ECECEE]">
                      {n.type === 'task_assigned' && <UserCheck className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />}
                      {n.type === 'task_completed' && <CheckCheck className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#34C26B] shrink-0" />}
                      {n.type === 'deadline_warning' && <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F0A030] shrink-0" />}
                      {n.type === 'visa_update' && n.targetEntity !== 'handover' && <FileText className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-[#4C8DF6] shrink-0" />}
                      {n.targetEntity === 'handover' && <FileCheck2 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#4C8DF6] shrink-0" />}
                      <span className="truncate">{n.title}</span>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#1E40AF] dark:bg-[#4C8DF6] shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-[#0F172A]/75 dark:text-[#9A9AA2] mt-1 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#0F172A]/50 dark:text-[#66666E] tabular-nums mt-2 pt-1 border-t border-[#E2E8F0] dark:border-[#2E2E32]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(n.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#1E40AF] dark:text-[#4C8DF6] font-medium">
                      View {n.targetEntity}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </DrawerTransition>
  );
};
