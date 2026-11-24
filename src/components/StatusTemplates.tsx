import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, ArchiveX, ArrowLeft, BookOpen, Compass, Home, RefreshCw } from 'lucide-react';
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
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="h-10 px-5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-sm font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Back to DNS Lookup</span>
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              onNavigatePage('contact');
            }}
            className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center transition-colors"
          >
            Contact Support
          </a>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {(['about', 'privacy', 'terms', 'disclaimer'] as LegalPageRoute[]).map((p) => (
            <a
              key={p}
              href={`/${p}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigatePage(p);
              }}
              className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline capitalize"
            >
              {p === 'privacy' ? 'Privacy Policy' : p === 'terms' ? 'Terms and Conditions' : p}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

interface GoneTemplateProps {
  pathname: string;
  onNavigateHome: () => void;
  onNavigateBlog: () => void;
}

export function GoneTemplate({
  pathname,
  onNavigateHome,
  onNavigateBlog,
}: GoneTemplateProps) {
  return (
    <section
      aria-labelledby="gone-heading"
      className="max-w-2xl mx-auto py-12 sm:py-16"
    >
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center shadow-sm space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <ArchiveX className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono font-bold tracking-widest uppercase text-amber-700 dark:text-amber-400">
            HTTP 410 Gone
          </p>
          <h1
            id="gone-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100"
          >
            Article Permanently Removed
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            The resource{' '}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {pathname}
            </code>{' '}
            has been permanently retired as DNS Locator focuses exclusively on verified DNS propagation, routing, and domain security engineering guides.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="/blog"
            onClick={(e) => {
              e.preventDefault();
              onNavigateBlog();
            }}
            className="h-10 px-5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-sm font-semibold inline-flex items-center gap-2 transition-all"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>Browse DNS Guides</span>
          </a>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Back to DNS Lookup</span>
          </a>
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
            className="h-10 px-5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-sm font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Reload Page</span>
          </button>

          <a
            href="/"
            onClick={(e) => {
              if (onBackHome) {
                e.preventDefault();
                onBackHome();
              }
            }}
            className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </a>
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
