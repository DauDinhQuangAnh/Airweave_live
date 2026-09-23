import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getStoredLanguage } from '@/lib/language';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AirWeave ErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      const lang = getStoredLanguage();
      return (
        <div className="min-h-[400px] w-full p-8 flex flex-col items-center justify-center text-center bg-slate-950/90 border border-rose-500/30 rounded-2xl m-4 text-white space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="max-w-lg space-y-2">
            <h2 className="text-lg font-heading font-bold text-white">
              {this.props.fallbackTitle || (lang === 'vi' ? 'Đã xảy ra lỗi hiển thị' : 'A display error occurred')}
            </h2>
            <p className="text-xs text-rose-300 font-mono bg-black/50 p-3 rounded-xl border border-rose-500/20 text-left overflow-x-auto">
              {this.state.error?.toString()}
            </p>
            {this.state.errorInfo?.componentStack && (
              <pre className="text-[10px] text-white/40 font-mono bg-black/30 p-2 rounded text-left max-h-40 overflow-y-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs flex items-center gap-2 transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{lang === 'vi' ? 'Tải lại trang' : 'Reload page'}</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
