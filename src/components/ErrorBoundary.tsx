import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[280px] p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FEE2E2] dark:bg-red-950/50 text-[#DC2626] dark:text-red-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-slate-100">
              {this.props.viewName ? `Unable to display ${this.props.viewName}` : 'Something went wrong'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              An unexpected error occurred while rendering this section. Your task data is safe in local storage and Google Sheets sync.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] text-[#DC2626] dark:text-red-400 bg-[#FEE2E2]/60 dark:bg-red-950/40 p-2 rounded-md font-mono mt-2 text-left truncate">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium text-[#0F172A] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:bg-[#F8FAFC] rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
