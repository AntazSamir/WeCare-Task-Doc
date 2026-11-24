import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { MotionButton } from './ui/MotionButton';

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
        <div className="min-h-[280px] p-6 bg-white dark:bg-[#1C1C1E] border border-[#E2E8F0] dark:border-[#2E2E32] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FEE2E2] dark:bg-[rgba(239,83,80,0.14)] text-[#DC2626] dark:text-[#EF5350] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-[16px] font-semibold text-[#0F172A] dark:text-[#ECECEE]">
              {this.props.viewName ? `Unable to display ${this.props.viewName}` : 'Something went wrong'}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#9A9AA2] leading-relaxed">
              An unexpected error occurred while rendering this section. Your task data is safe in local storage and Google Sheets sync.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] text-[#DC2626] dark:text-[#EF5350] bg-[#FEE2E2]/60 dark:bg-[rgba(239,83,80,0.14)] p-2 rounded-md font-mono mt-2 text-left truncate">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <MotionButton
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#4C8DF6] dark:hover:bg-[#6BA1F8] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E40AF] dark:focus:ring-[#4C8DF6] focus:ring-offset-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </MotionButton>
            <MotionButton
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium text-[#0F172A] dark:text-[#ECECEE] bg-white dark:bg-[#252528] border border-[#E2E8F0] dark:border-[#2E2E32] hover:bg-[#F8FAFC] dark:hover:bg-[#2E2E32] rounded-lg transition-colors"
            >
              Reload Page
            </MotionButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
