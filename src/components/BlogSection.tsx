import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Globe,
  Lightbulb,
  Search,
  Tag,
} from 'lucide-react';
import { BLOG_POSTS, getBlogPostBySlug, type BlogPost } from '../data/blogs';
import type { DnsRecordType } from '../types/dns';
import { SkeletonBlock } from './Skeleton';

interface BlogSectionProps {
  activeSlug: string | null;
  dailyPosts: BlogPost[];
  isDailyLoading?: boolean;
  dailyError?: string | null;
  onRetryDaily?: () => void;
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

export default function BlogSection({
  activeSlug,
  dailyPosts,
  isDailyLoading = false,
  dailyError = null,
  onRetryDaily,
  onNavigateHome,
  onNavigateBlogIndex,
  onSelectPost,
  onRunDnsCheck,
}: BlogSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const allPosts = useMemo(() => {
    const seen = new Set<string>();
    const combined: BlogPost[] = [];
    for (const post of [...dailyPosts, ...BLOG_POSTS]) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      combined.push(post);
    }
    return combined;
  }, [dailyPosts]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(allPosts.map((p) => p.category)))],
    [allPosts]
  );

  const activePost = useMemo(() => {
    if (!activeSlug) return undefined;
    return allPosts.find((p) => p.slug === activeSlug) ?? getBlogPostBySlug(activeSlug);
  }, [activeSlug, allPosts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPosts.filter((post) => {
      const categoryMatch = selectedCategory === 'All' || post.category === selectedCategory;
      if (!categoryMatch) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    });
  }, [allPosts, searchQuery, selectedCategory]);

  const filteredDailyPosts = useMemo(
    () => filteredPosts.filter((p) => p.isDailyBrief),
    [filteredPosts]
  );

  const filteredGuidePosts = useMemo(
    () => filteredPosts.filter((p) => !p.isDailyBrief),
    [filteredPosts]
  );

  if (activeSlug && activePost) {
    return (
      <BlogArticleView
        post={activePost}
        allPosts={allPosts}
        onNavigateHome={onNavigateHome}
        onNavigateBlogIndex={onNavigateBlogIndex}
        onSelectPost={onSelectPost}
        onRunDnsCheck={onRunDnsCheck}
      />
    );
  }

  if (activeSlug && !activePost && isDailyLoading && activeSlug.startsWith('daily-')) {
    return (
      <BlogArticleSkeleton
        onNavigateHome={onNavigateHome}
        onNavigateBlogIndex={onNavigateBlogIndex}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to DNS Lookup</span>
        </button>

        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
          {allPosts.length} DNS Locator Articles
        </span>
      </div>

      {/* Blog Index Hero */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
        <div className="space-y-2.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>DNS Locator Engineering Blog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Daily DNS Briefings &amp; Network Engineering Guides
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            In-depth field guides and daily engineering briefings from DNS Locator covering global DNS checks, IP address lookup, routing verification, DNSSEC, and domain health monitoring.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="blog-search-input" className="sr-only">
              Search DNS Locator blog topics or keywords
            </label>
            <input
              id="blog-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics (e.g., dns check, tracert, ip lookup, dnssec)..."
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter articles by category"
            className="flex flex-wrap items-center gap-2"
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === category
                    ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Daily Briefings */}
      <section aria-labelledby="daily-blogs-heading" className="space-y-4">
        <div className="space-y-0.5">
          <h2
            id="daily-blogs-heading"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100"
          >
            Daily DNS Locator Briefings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Today&apos;s featured DNS and network operations article published by the DNS Locator team.
          </p>
        </div>

        {dailyError && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{dailyError}</span>
            </div>
            {onRetryDaily && (
              <button
                type="button"
                onClick={onRetryDaily}
                className="h-8 px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {isDailyLoading && filteredDailyPosts.length === 0 ? (
          <div role="status" aria-busy="true" aria-live="polite" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <span className="sr-only">Loading today&apos;s DNS Locator daily briefing</span>
            <BlogCardSkeleton isDaily />
          </div>
        ) : filteredDailyPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredDailyPosts.map((post, idx) => (
              <BlogCard
                key={post.slug}
                post={post}
                index={idx}
                isDaily
                onSelectPost={onSelectPost}
                onRunDnsCheck={onRunDnsCheck}
              />
            ))}
          </div>
        ) : (
          !dailyError && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              No daily briefings match the current search filter.
            </div>
          )
        )}
      </section>

      {/* Section 2: Curated Technical Guides */}
      <section aria-labelledby="curated-guides-heading" className="space-y-4">
        <div className="space-y-0.5">
          <h2
            id="curated-guides-heading"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100"
          >
            Technical Engineering Guides
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            In-depth reference manuals for DNS checks, IP/ASN verification, traceroute, and zone audits.
          </p>
        </div>

        {filteredGuidePosts.length === 0 && filteredDailyPosts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No blog articles match &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset filters and view all {allPosts.length} articles
            </button>
          </div>
        ) : filteredGuidePosts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            No technical guides match the current filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGuidePosts.map((post, idx) => (
              <BlogCard
                key={post.slug}
                post={post}
                index={idx}
                onSelectPost={onSelectPost}
                onRunDnsCheck={onRunDnsCheck}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BlogCardSkeleton({ isDaily = false }: { isDaily?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-6 flex flex-col justify-between gap-4 ${
        isDaily
          ? 'border-emerald-200/90 dark:border-emerald-800/70 bg-gradient-to-br from-white via-emerald-50/25 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SkeletonBlock
            tone={isDaily ? 'emerald' : 'sky'}
            className="h-3.5 w-40 rounded-md"
          />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-3.5 w-20 rounded-md" />
            <SkeletonBlock className="h-3.5 w-16 rounded-md" />
          </div>
        </div>

        <div className="space-y-2 pt-0.5">
          <SkeletonBlock className="h-5 w-11/12 rounded-md" />
          <SkeletonBlock className="h-5 w-3/4 rounded-md" />
        </div>

        <div className="space-y-2 pt-1">
          <SkeletonBlock className="h-3.5 w-full rounded-md" />
          <SkeletonBlock className="h-3.5 w-5/6 rounded-md" />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <SkeletonBlock className="h-5 w-20 rounded-md" />
          <SkeletonBlock className="h-5 w-24 rounded-md" />
          <SkeletonBlock className="h-5 w-16 rounded-md" />
          <SkeletonBlock className="h-5 w-20 rounded-md" />
          <SkeletonBlock className="h-5 w-14 rounded-md" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <SkeletonBlock tone="sky" className="h-3.5 w-28 rounded-md" />
          <SkeletonBlock className="h-3.5 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function BlogArticleSkeleton({
  onNavigateHome,
  onNavigateBlogIndex,
}: {
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6">
      <span className="sr-only">Loading DNS Locator blog article</span>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onNavigateBlogIndex}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>All Blog Articles</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            /
          </span>
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            DNS Locator Tool
          </button>
        </div>

        <SkeletonBlock tone="emerald" className="h-9 w-36 rounded-lg" />
      </div>

      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 space-y-7">
        <header className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <SkeletonBlock tone="sky" className="h-3.5 w-36 rounded-md" />
            <SkeletonBlock className="h-3.5 w-24 rounded-md" />
            <SkeletonBlock className="h-3.5 w-20 rounded-md" />
          </div>

          <div className="space-y-2.5">
            <SkeletonBlock className="h-8 w-11/12 rounded-lg" />
            <SkeletonBlock className="h-8 w-2/3 rounded-lg" />
          </div>

          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-full rounded-md" />
            <SkeletonBlock className="h-4 w-5/6 rounded-md" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <SkeletonBlock className="h-5 w-20 rounded-md" />
            <SkeletonBlock className="h-5 w-24 rounded-md" />
            <SkeletonBlock className="h-5 w-20 rounded-md" />
            <SkeletonBlock className="h-5 w-16 rounded-md" />
            <SkeletonBlock className="h-5 w-24 rounded-md" />
          </div>
        </header>

        <div className="space-y-7">
          {Array.from({ length: 3 }).map((_, secIdx) => (
            <div key={secIdx} className="space-y-3">
              <SkeletonBlock className="h-6 w-64 rounded-md" />
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-full rounded-md" />
                <SkeletonBlock className="h-4 w-11/12 rounded-md" />
                <SkeletonBlock className="h-4 w-4/5 rounded-md" />
              </div>
              <div className="pl-4 space-y-2 pt-1">
                <SkeletonBlock className="h-3.5 w-5/6 rounded-md" />
                <SkeletonBlock className="h-3.5 w-3/4 rounded-md" />
              </div>
              {secIdx === 0 && (
                <SkeletonBlock tone="sky" className="h-12 w-full rounded-lg border border-sky-200/70 dark:border-sky-800/50" />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-4 w-52 rounded-md" />
            <SkeletonBlock className="h-3.5 w-80 max-w-full rounded-md" />
          </div>
          <SkeletonBlock tone="emerald" className="h-9 w-36 rounded-lg shrink-0" />
        </div>
      </article>
    </div>
  );
}

interface BlogCardProps {
  post: BlogPost;
  index: number;
  isDaily?: boolean;
  onSelectPost: (slug: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

function BlogCard({ post, index, isDaily = false, onSelectPost, onRunDnsCheck }: BlogCardProps) {
  return (
    <article
      className={`rounded-xl border p-6 flex flex-col justify-between gap-4 transition-colors ${
        isDaily
          ? 'border-emerald-200/90 dark:border-emerald-800/70 bg-gradient-to-br from-white via-emerald-50/25 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 hover:border-emerald-400 dark:hover:border-emerald-600'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-300 dark:hover:border-sky-700'
      }`}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span
            className={`font-semibold ${
              isDaily ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'
            }`}
          >
            {isDaily ? 'DNS Locator Daily' : String(index + 1).padStart(2, '0')} · {post.category}
          </span>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <time dateTime={post.publishedAt}>{post.publishedAt}</time>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{post.readTimeMinutes} min read</span>
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
          <a
            href={`/blog/${post.slug}`}
            onClick={(e) => {
              e.preventDefault();
              onSelectPost(post.slug);
            }}
            className="hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
          >
            {post.title}
          </a>
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {post.excerpt}
        </p>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.keywords.slice(0, 5).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300"
            >
              {kw}
            </span>
          ))}
          {post.keywords.length > 5 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              +{post.keywords.length - 5} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <a
            href={`/blog/${post.slug}`}
            onClick={(e) => {
              e.preventDefault();
              onSelectPost(post.slug);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline"
          >
            <span>Read Full Article</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => onRunDnsCheck(post.suggestedDomain, post.suggestedRecordType)}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            Test {post.suggestedRecordType} record →
          </button>
        </div>
      </div>
    </article>
  );
}

interface BlogArticleViewProps {
  post: BlogPost;
  allPosts: BlogPost[];
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

function BlogArticleView({
  post,
  allPosts,
  onNavigateHome,
  onNavigateBlogIndex,
  onSelectPost,
  onRunDnsCheck,
}: BlogArticleViewProps) {
  const relatedPosts = useMemo(() => {
    const sameCategory = allPosts.filter(
      (item) => item.slug !== post.slug && item.category === post.category
    );
    const others = allPosts.filter(
      (item) => item.slug !== post.slug && item.category !== post.category
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [post, allPosts]);

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onNavigateBlogIndex}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>All Blog Articles</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            /
          </span>
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            DNS Locator Tool
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRunDnsCheck(post.suggestedDomain, post.suggestedRecordType)}
          className="h-9 px-3.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Run Live DNS Check</span>
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 space-y-7">
        <header className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-sky-700 dark:text-sky-400">
              DNS Locator · {post.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <time dateTime={post.publishedAt}>{post.publishedAt}</time>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{post.readTimeMinutes} min read</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" aria-hidden="true" />
            {post.keywords.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300"
              >
                {kw}
              </span>
            ))}
          </div>
        </header>

        <div className="space-y-7">
          {post.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {section.bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              )}
              {section.tip && (
                <div className="rounded-lg border border-sky-200 dark:border-sky-800/70 bg-sky-50/70 dark:bg-sky-950/30 p-4 flex items-start gap-2.5 text-xs sm:text-sm text-sky-900 dark:text-sky-200">
                  <Lightbulb className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{section.tip}</span>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Diagnostic CTA inside Article */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Verify Live Records on DNS Locator
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Inspect <span className="font-mono font-semibold">{post.suggestedDomain}</span> ({post.suggestedRecordType} records) across 18 global checkpoints in one click.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRunDnsCheck(post.suggestedDomain, post.suggestedRecordType)}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 text-white dark:text-slate-950 text-xs font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Live Lookup</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </article>

      {/* Related Guides */}
      <section aria-label="Related DNS Locator articles" className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          More DNS Locator Articles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedPosts.map((related) => (
            <a
              key={related.slug}
              href={`/blog/${related.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectPost(related.slug);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 hover:border-sky-300 dark:hover:border-sky-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
                  {related.category}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {related.title}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 pt-2">
                <span>Read article</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
