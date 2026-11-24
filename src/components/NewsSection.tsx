import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Globe,
  Newspaper,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { DnsRecordType } from '../types/dns';
import type { NewsArticle, NewsFeedResponse, NewsRelevance } from '../types/news';
import { SkeletonBlock } from './Skeleton';

interface NewsSectionProps {
  feed: NewsFeedResponse | null;
  isLoading: boolean;
  retryAttempt?: number;
  error: string | null;
  onRefresh: () => void;
  onRetry?: () => void;
  onNavigateHome: () => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

const TOPIC_FILTERS: Array<{ id: 'all' | NewsRelevance; label: string }> = [
  { id: 'all', label: 'All News' },
  { id: 'dns', label: 'DNS & Resolvers' },
  { id: 'routing', label: 'Routing & IPv6' },
  { id: 'infrastructure', label: 'Edge & Network' },
  { id: 'security', label: 'Security' },
];

const RELEVANCE_LABEL: Record<NewsRelevance, string> = {
  dns: 'DNS & Resolvers',
  routing: 'Routing & IPv6',
  infrastructure: 'Edge & Network',
  security: 'Security',
};

function formatNewsDate(iso: string): string {
  try {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function NewsCardSkeleton({ variant = 0 }: { variant?: number }) {
  const titleSecondWidth = variant % 2 === 0 ? 'w-3/4' : 'w-4/5';
  const bodyThirdWidth = variant % 2 === 0 ? 'w-2/3' : 'w-3/4';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SkeletonBlock tone="emerald" className="h-3.5 w-36 rounded-md" />
          <SkeletonBlock className="h-3.5 w-20 rounded-md" />
        </div>

        <div className="space-y-2 pt-0.5">
          <SkeletonBlock className="h-5 w-11/12 rounded-md" />
          <SkeletonBlock className={`h-5 ${titleSecondWidth} rounded-md`} />
        </div>

        <div className="space-y-2 pt-1">
          <SkeletonBlock className="h-3.5 w-full rounded-md" />
          <SkeletonBlock className="h-3.5 w-11/12 rounded-md" />
          <SkeletonBlock className={`h-3.5 ${bodyThirdWidth} rounded-md`} />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <SkeletonBlock className="h-5 w-16 rounded-md" />
          <SkeletonBlock className="h-5 w-20 rounded-md" />
          <SkeletonBlock className="h-5 w-14 rounded-md" />
        </div>

        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock tone="sky" className="h-3.5 w-24 rounded-md" />
          <SkeletonBlock className="h-3.5 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function NewsSection({
  feed,
  isLoading,
  retryAttempt = 0,
  error,
  onRefresh,
  onRetry,
  onNavigateHome,
  onRunDnsCheck,
}: NewsSectionProps) {
  const [topicFilter, setTopicFilter] = useState<'all' | NewsRelevance>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const articles = useMemo(
    () => (Array.isArray(feed?.articles) ? feed.articles : []),
    [feed]
  );

  const availableTopics = useMemo(() => {
    const present = new Set(articles.map((a) => a.relevance));
    return TOPIC_FILTERS.filter((t) => t.id === 'all' || present.has(t.id));
  }, [articles]);

  useEffect(() => {
    if (topicFilter !== 'all' && !availableTopics.some((t) => t.id === topicFilter)) {
      setTopicFilter('all');
    }
  }, [availableTopics, topicFilter]);

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((item) => {
      if (topicFilter !== 'all' && item.relevance !== topicFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [articles, topicFilter, query]);

  const handleRetryAction = onRetry ?? onRefresh;
  const isInitialLoading = isLoading && articles.length === 0;

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to DNS Lookup</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {articles.length > 0 ? (
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {articles.length} DNS Locator Reports
            </span>
          ) : (
            isInitialLoading && <SkeletonBlock className="h-4 w-32 rounded-md" />
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isLoading ? 'Refreshing…' : 'Refresh News'}</span>
          </button>
        </div>
      </div>

      {/* News Hero & Filter Controls */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
        <div className="space-y-2.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <Newspaper className="w-4 h-4" aria-hidden="true" />
            <span>DNS Locator Newsroom</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            DNS Locator Network &amp; Infrastructure News
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Daily briefings and technical updates from DNS Locator covering global DNS resolution, routing stability, IPv6 adoption, and internet security.
          </p>
        </div>

        {/* Search & Topic Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="news-search-input" className="sr-only">
              Search DNS Locator news
            </label>
            <input
              id="news-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search DNS Locator news (e.g., DNSSEC, BGP, IPv6, latency)..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter news by topic"
            className="flex flex-wrap items-center gap-2"
          >
            {availableTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                role="tab"
                aria-selected={topicFilter === topic.id}
                onClick={() => setTopicFilter(topic.id)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  topicFilter === topic.id
                    ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {topic.label}
              </button>
            ))}

            {isInitialLoading && (
              <>
                <SkeletonBlock className="h-[34px] w-28 rounded-lg border border-slate-200/80 dark:border-slate-800" />
                <SkeletonBlock className="h-[34px] w-24 rounded-lg border border-slate-200/80 dark:border-slate-800" />
                <SkeletonBlock className="h-[34px] w-20 rounded-lg border border-slate-200/80 dark:border-slate-800" />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Error Banner with Retry Handling */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/75 dark:bg-rose-950/30 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Could Not Load DNS Locator News
              </h2>
              <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryAction}
            disabled={isLoading}
            className="h-9 px-4 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isLoading ? 'Retrying…' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* Refined Shimmering Skeleton Grid (Initial Load & Auto-Retry) */}
      {isInitialLoading && (
        <div role="status" aria-busy="true" aria-live="polite" className="space-y-5">
          <span className="sr-only">
            {retryAttempt > 0
              ? `Reconnecting to DNS Locator Newsroom (attempt ${retryAttempt + 1} of 3)`
              : 'Loading latest DNS Locator network and infrastructure news'}
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <NewsCardSkeleton key={idx} variant={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Subtle Shimmer Progress Bar while Refreshing Existing Feed */}
      {isLoading && articles.length > 0 && (
        <div role="status" aria-busy="true" aria-live="polite" className="space-y-1">
          <span className="sr-only">Refreshing DNS Locator news reports</span>
          <SkeletonBlock tone="sky" className="h-1.5 w-full rounded-full" />
        </div>
      )}

      {/* Fallback Empty Prompt if not loading, no error, and no feed yet */}
      {!isLoading && !error && articles.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            DNS Locator news reports are not loaded yet.
          </p>
          <button
            type="button"
            onClick={handleRetryAction}
            className="h-9 px-4 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Load News Reports</span>
          </button>
        </div>
      )}

      {/* News Cards Grid */}
      {articles.length > 0 && filteredArticles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No news reports matched your current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setTopicFilter('all');
            }}
            className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Reset filters and show all {articles.length} reports
          </button>
        </div>
      ) : (
        articles.length > 0 && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity duration-200 ${
              isLoading ? 'opacity-75' : 'opacity-100'
            }`}
          >
            {filteredArticles.map((article: NewsArticle) => {
              const isExpanded = expandedId === article.id;
              const checkDomain = article.suggestedDomain || 'www.dnslocator.online';
              const relevanceLabel = RELEVANCE_LABEL[article.relevance] ?? 'DNS & Resolvers';
              return (
                <article
                  key={article.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        DNS Locator · {relevanceLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        <time dateTime={article.publishedAt}>
                          {formatNewsDate(article.publishedAt)}
                        </time>
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        className="text-left hover:text-sky-700 dark:hover:text-sky-400 transition-colors cursor-pointer"
                      >
                        {article.title}
                      </button>
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isExpanded ? article.details : article.summary}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {article.categories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {article.categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : article.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Read Briefing'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onRunDnsCheck(checkDomain, 'A')}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Check {checkDomain}</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
