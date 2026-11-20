import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, ArrowLeft, Compass, Home, RefreshCw } from 'lucide-react';
import type { LegalPageRoute } from './LegalPages';

interface NotFoundTemplateProps {
  pathname: string;
  onNavigateHome: () => void;
  onNavigatePage: (page: LegalPageRoute) => void;
}

export function NotFoundTemplate({
  pathname,
  onNavigateHome,
  onNavigatePage,
}: NotFoundTemplateProps) {
  return (
    <section
      aria-labelledby="not-found-heading"
      className="max-w-2xl mx-auto py-12 sm:py-16"
    >
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center shadow-sm space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
          <Compass className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-sky-700 dark:text-sky-400">
            Error 404
          </p>
          <h1
            id="not-found-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100"
          >
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            The route{' '}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {pathname}
            </code>{' '}
            could not be found on DNS Locator. It may have been moved or does not exist.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="h-10 px-5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Back to DNS Lookup</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('contact')}
            className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer"
          >
            Contact Support
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => onNavigatePage('about')}
            className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline cursor-pointer"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('privacy')}
            className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('terms')}
            className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline cursor-pointer"
          >
            Terms and Conditions
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('disclaimer')}
            className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline cursor-pointer"
          >
            Disclaimer
          </button>
        </div>
      </div>
    </section>
  );
}

interface GeneralErrorTemplateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBackHome?: () => void;
}

export function GeneralErrorTemplate({
  title = 'Unexpected Application Error',
  message = 'DNS Locator encountered an unexpected problem while rendering this view. No lookup data was lost—please retry or return to the main diagnostic tool.',
  onRetry,
  onBackHome,
}: GeneralErrorTemplateProps) {
  return (
    <section
      role="alert"
      aria-labelledby="general-error-heading"
      className="max-w-2xl mx-auto py-12 sm:py-16 px-4"
    >
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/80 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center shadow-sm space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <AlertOctagon className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-rose-700 dark:text-rose-400">
            System Error
          </p>
          <h1
            id="general-error-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onRetry ?? (() => window.location.reload())}
            className="h-10 px-5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Reload Page</span>
          </button>

          <button
            type="button"
            onClick={
              onBackHome ??
              (() => {
                window.location.assign('/');
              })
            }
            className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </section>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Handled gracefully by GeneralErrorTemplate
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center">
          <GeneralErrorTemplate
            onRetry={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            onBackHome={() => {
              this.setState({ hasError: false });
              window.location.assign('/');
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
