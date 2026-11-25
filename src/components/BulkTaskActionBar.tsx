import React, { useState } from 'react';
import {
  CheckCircle2,
  CalendarPlus,
  Sun,
  UserCheck,
  X,
  CheckSquare,
} from 'lucide-react';
import { UserProfile } from '../types/pms';
import {
  MorphSelect,
  MorphSelectTrigger,
  MorphSelectValue,
  MorphSelectContent,
  MorphSelectItem,
} from './ui/MorphSelect';
import { MotionButton } from './animations';

interface BulkTaskActionBarProps {
  selectedCount: number;
  totalSelectableCount: number;
  pendingSelectedCount: number;
  team?: UserProfile[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkComplete: () => void;
  onBulkPostpone: (mode: 'plus1' | 'today') => void;
  onBulkReassign?: (targetUserId: string) => void;
  className?: string;
}

export const BulkTaskActionBar: React.FC<BulkTaskActionBarProps> = ({
  selectedCount,
  totalSelectableCount,
  pendingSelectedCount,
  team = [],
  onSelectAll,
  onClearSelection,
  onBulkComplete,
  onBulkPostpone,
  onBulkReassign,
  className = '',
}) => {
  const [targetUserId, setTargetUserId] = useState<string>(team[0]?.id || '');

  React.useEffect(() => {
    if (!targetUserId && team.length > 0) {
      setTargetUserId(team[0].id);
    } else if (targetUserId && team.length > 0 && !team.some((m) => m.id === targetUserId)) {
      setTargetUserId(team[0].id);
    }
  }, [team, targetUserId]);

  if (selectedCount === 0) return null;

  const allSelected = totalSelectableCount > 0 && selectedCount >= totalSelectableCount;

  return (
    <div
      role="region"
      aria-label="Bulk task actions"
      className={`bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#1E40AF]/35 dark:border-[#4C8DF6]/45 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm dark:shadow-none ${className}`}
    >
      {/* Selection count & Select All / Clear */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF6FF] dark:bg-[rgba(76,141,246,0.14)] text-[#1E40AF] dark:text-[#4C8DF6] tabular-nums">
          <CheckSquare className="w-3.5 h-3.5" />
          {selectedCount} selected
        </span>

        {!allSelected && totalSelectableCount > 0 && (
          <MotionButton
            type="button"
            onClick={onSelectAll}
            className="text-xs font-medium text-[#1E40AF] dark:text-[#4C8DF6] hover:underline px-1.5 py-1 rounded"
          >
            Select all ({totalSelectableCount})
          </MotionButton>
        )}

        <MotionButton
          type="button"
          onClick={onClearSelection}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] dark:text-[#9A9AA2] hover:text-[#0F172A] dark:hover:text-[#ECECEE] px-1.5 py-1 rounded"
          aria-label="Clear task selection"
        >
          <X className="w-3 h-3" />
          Clear
        </MotionButton>
      </div>

      {/* Bulk Action Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <MotionButton
          type="button"
          disabled={pendingSelectedCount === 0}
          onClick={onBulkComplete}
          title={
            pendingSelectedCount === 0
              ? 'All selected tasks are already completed'
              : `Mark ${pendingSelectedCount} pending task(s) as completed`
          }
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-[#16A34A] hover:bg-[#15803d] dark:bg-[#34C26B] dark:hover:bg-[#34C26B]/90 text-white dark:text-[#121212] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Complete{pendingSelectedCount > 0 ? ` (${pendingSelectedCount})` : ''}</span>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => onBulkPostpone('plus1')}
          title="Postpone selected tasks by 1 day"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] text-[#0F172A] dark:text-[#ECECEE] transition-colors whitespace-nowrap"
        >
          <CalendarPlus className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#ECECEE]" />
          <span>+1 Day</span>
        </MotionButton>

        <MotionButton
          type="button"
          onClick={() => onBulkPostpone('today')}
          title="Move selected tasks to today"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#F8FAFC] dark:bg-[#252528] hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] text-[#0F172A] dark:text-[#ECECEE] transition-colors whitespace-nowrap"
        >
          <Sun className="w-3.5 h-3.5 text-[#D97706] dark:text-[#ECECEE]" />
          <span>Move to Today</span>
        </MotionButton>

        {onBulkReassign && team.length > 0 && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#E2E8F0] dark:border-[#2E2E32]">
            <div className="w-40">
              <MorphSelect
                value={targetUserId}
                onValueChange={setTargetUserId}
              >
                <MorphSelectTrigger aria-label="Select assignee for bulk reassign" className="h-8 text-xs">
                  <MorphSelectValue placeholder="Reassign to..." />
                </MorphSelectTrigger>
                <MorphSelectContent>
                  {team.map((member) => (
                    <MorphSelectItem key={member.id} value={member.id}>
                      {member.name}
                    </MorphSelectItem>
                  ))}
                </MorphSelectContent>
              </MorphSelect>
            </div>
            <MotionButton
              type="button"
              disabled={!targetUserId}
              onClick={() => targetUserId && onBulkReassign(targetUserId)}
              className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold rounded-lg bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] text-white disabled:opacity-45 transition-colors whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Reassign</span>
            </MotionButton>
          </div>
        )}
      </div>
    </div>
  );
};
