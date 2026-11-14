import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, FileSpreadsheet, Check } from 'lucide-react';
import { Task } from '../types/task';
import { formatReadableDate } from '../utils/dateUtils';

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

  useEffect(() => {
    if (task) {
      setCompletionNote(task.notes || '');
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#123B78]/40 dark:bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-complete-title"
    >
      <div className="w-full max-w-md rounded-lg bg-[#FFFFFF] dark:bg-slate-900 border border-[#E3EAF3] dark:border-slate-800 shadow-xl my-auto overflow-hidden animate-modal-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3EAF3] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#16A36A] shrink-0" />
            <h2
              id="confirm-complete-title"
              className="text-base font-semibold text-[#172B4D] dark:text-slate-100"
            >
              Confirm Task Completion
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#172B4D]/50 hover:text-[#123B78] dark:hover:text-slate-200 rounded transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-medium text-[#172B4D] dark:text-slate-100">
            Are you sure you have completed this task?
          </p>

          <div className="p-3.5 rounded-md bg-[#F4F2EE] dark:bg-slate-800/60 border border-[#E3EAF3] dark:border-slate-800 space-y-1.5">
            <div className="text-xs font-mono tabular-nums text-[#1769E8] dark:text-slate-400">
              {task.category} · {task.priority} Priority
            </div>
            <div className="text-sm font-semibold text-[#172B4D] dark:text-slate-100">
              {task.title}
            </div>
            <div className="text-xs text-[#172B4D]/65 dark:text-slate-400 tabular-nums">
              Scheduled: {formatReadableDate(task.taskDate)} · Deadline:{' '}
              {formatReadableDate(task.deadline)}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="completion-note-input"
              className="block text-xs font-medium text-[#172B4D] dark:text-slate-300"
            >
              Completion Notes (Synced to Column K in Google Sheets)
            </label>
            <textarea
              id="completion-note-input"
              rows={2}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Optional summary or outcome note..."
              className="w-full rounded-md border border-[#E3EAF3] dark:border-slate-700 bg-[#FFFFFF] dark:bg-slate-950 px-3 py-2 text-sm text-[#172B4D] dark:text-slate-100 placeholder:text-[#172B4D]/40 focus:border-[#1769E8] focus:outline-none"
            />
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#172B4D]/80 dark:text-slate-400 bg-[#16A36A]/10 dark:bg-emerald-950/30 border border-[#16A36A]/35 dark:border-emerald-900/50 rounded-md p-3">
            <FileSpreadsheet className="w-4 h-4 text-[#16A36A] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-medium text-[#172B4D] dark:text-slate-200">
                Google Sheets Row Update Ready
              </div>
              <div className="tabular-nums">
                Status will be set to <strong>Completed</strong> with timestamp{' '}
                <span className="font-mono">{nowPreview}</span> in{' '}
                <span className="font-mono">
                  {spreadsheetTitle} / {worksheetName}
                </span>
                .
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F4F2EE] dark:bg-slate-900/90 border-t border-[#E3EAF3] dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#172B4D] dark:text-slate-300 bg-[#FFFFFF] dark:bg-slate-800 border border-[#E3EAF3] dark:border-slate-700 rounded-md hover:bg-[#DCEBFF] dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(task, completionNote)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A36A] hover:bg-[#138A59] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Check className="w-4 h-4" />
            Confirm Completion
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
