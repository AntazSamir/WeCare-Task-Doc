import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, FileSpreadsheet, Check } from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Task } from '../types/task';
import { formatReadableDate } from '../utils/dateUtils';
import { ModalTransition, MotionButton } from './animations';

interface CompletionConfirmModalProps {
  task: Task | null;
  spreadsheetTitle: string;
  worksheetName: string;
  onConfirm: (task: Task, completionNote: string) => void;
  onCancel: () => void;
}

export const CompletionConfirmModal: React.FC<CompletionConfirmModalProps> = ({
  task,
  spreadsheetTitle,
  worksheetName,
  onConfirm,
  onCancel,
}) => {
  const [completionNote, setCompletionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setCompletionNote(task.notes || '');
      setIsSubmitting(false);
    }
  }, [task]);

  if (!task) return null;

  const nowPreview = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <ModalTransition
      isOpen={Boolean(task)}
      onClose={onCancel}
      backdropClassName="fixed inset-0 z-50 bg-[#1E3A8A]/40 dark:bg-black/70 backdrop-blur-xs"
      cardClassName="w-full max-w-md rounded-lg bg-[#FFFFFF] dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] shadow-xl dark:shadow-none overflow-hidden"
    >
      {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E32]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-[#34C26B] shrink-0" />
            <h2
              id="confirm-complete-title"
              className="text-base font-semibold text-[#0F172A] dark:text-[#ECECEE]"
            >
              Confirm Task Completion
            </h2>
          </div>
          <MotionButton
            onClick={onCancel}
            className="p-1 text-[#0F172A]/50 dark:text-[#9A9AA2] hover:text-[#1E3A8A] dark:hover:text-[#ECECEE] rounded transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </MotionButton>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-medium text-[#0F172A] dark:text-[#ECECEE]">
            Are you sure you have completed this task?
          </p>

          <div className="p-3.5 rounded-md bg-[#F8FAFC] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] space-y-1.5">
            <div className="text-xs tabular-nums text-[#1E40AF] dark:text-[#4C8DF6]">
              {task.category} · {task.priority} Priority
            </div>
            <div className="text-sm font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              {task.title}
            </div>
            <div className="text-xs text-[#0F172A]/65 dark:text-[#9A9AA2] tabular-nums">
              Scheduled: {formatReadableDate(task.taskDate)} · Deadline:{' '}
              {formatReadableDate(task.deadline)}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="completion-note-input"
              className="block text-xs font-medium text-[#0F172A] dark:text-[#ECECEE]"
            >
              Completion Notes (Synced to Column K in Google Sheets)
            </label>
            <textarea
              id="completion-note-input"
              rows={2}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Optional summary or outcome note..."
              className="w-full rounded-md border border-[#E2E8F0] dark:border-[#2E2E32] bg-[#FFFFFF] dark:bg-[#252528] px-3 py-2 text-sm text-[#0F172A] dark:text-[#ECECEE] placeholder:text-[#0F172A]/40 dark:placeholder:text-[#66666E] focus:border-[#1E40AF] dark:focus:border-[#4C8DF6] focus:outline-none"
            />
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#0F172A]/80 dark:text-[#9A9AA2] bg-[#16A34A]/10 dark:bg-[rgba(52,194,107,0.14)] border border-[#16A34A]/35 dark:border-[#34C26B]/30 rounded-md p-3">
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A] dark:text-[#34C26B] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-medium text-[#0F172A] dark:text-[#ECECEE]">
                Google Sheets Row Update Ready
              </div>
              <div className="tabular-nums">
                Status will be set to <strong>Completed</strong> with timestamp{' '}
                <span className="tabular-nums">{nowPreview}</span> in{' '}
                <span className="tabular-nums">
                  {spreadsheetTitle} / {worksheetName}
                </span>
                .
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F8FAFC] dark:bg-[#161616] border-t border-[#E2E8F0] dark:border-[#2E2E32]">
          <MotionButton
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-[#FFFFFF] dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-md hover:bg-[#EFF6FF] dark:hover:bg-[#2E2E32] transition-colors whitespace-nowrap shrink-0"
          >
            Cancel
          </MotionButton>
          <MotionButton
            disabled={isSubmitting}
            onClick={async () => {
              if (isSubmitting) return;
              setIsSubmitting(true);
              try {
                await onConfirm(task, completionNote);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#138A59] dark:bg-[#34C26B] dark:hover:bg-[#34C26B]/90 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <Spinner size="sm" shade="inherit" aria-hidden="true" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isSubmitting ? 'Saving & Syncing...' : 'Confirm Completion'}
          </MotionButton>
        </div>
    </ModalTransition>
  );
};
