import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              حدث خطأ غير متوقع
            </h1>
            
            <p className="text-sm text-slate-600 mb-6">
              نعتذر عن هذا الخطأ. لقد واجه التطبيق مشكلة غير متوقعة. يرجى إعادة تحميل الصفحة للمتابعة.
            </p>

            {this.state.error && (
              <details className="text-left bg-slate-100 p-3 rounded-lg text-xs text-slate-700 mb-6 max-h-40 overflow-auto border border-slate-200">
                <summary className="cursor-pointer font-medium text-slate-600 text-right mb-1">
                  تفاصيل الخطأ التقني
                </summary>
                <div className="font-mono whitespace-pre-wrap mt-2 text-red-600" dir="ltr">
                  {this.state.error.toString()}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة تحميل التطبيق</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
