import { useMemo, useState } from 'react';
import {
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

interface BlogSectionProps {
  activeSlug: string | null;
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

const ALL_CATEGORIES = ['All', ...Array.from(new Set(BLOG_POSTS.map((p) => p.category)))];

export default function BlogSection({
  activeSlug,
  onNavigateHome,
  onNavigateBlogIndex,
  onSelectPost,
  onRunDnsCheck,
}: BlogSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const activePost = useMemo(
    () => (activeSlug ? getBlogPostBySlug(activeSlug) : undefined),
    [activeSlug]
  );

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BLOG_POSTS.filter((post) => {
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
  }, [searchQuery, selectedCategory]);

  if (activeSlug && activePost) {
    return (
      <BlogArticleView
        post={activePost}
        onNavigateHome={onNavigateHome}
        onNavigateBlogIndex={onNavigateBlogIndex}
        onSelectPost={onSelectPost}
        onRunDnsCheck={onRunDnsCheck}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to DNS Locator</span>
        </button>

        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {BLOG_POSTS.length} Technical Guides
        </span>
      </div>

      {/* Blog Index Hero */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>DNS Locator Knowledge Blog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            DNS Check, IP Lookup, Network Diagnostics &amp; Domain Engineering Guides
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            In-depth field guides covering global dns check workflows, ip address lookup, ip number search,
            what is my isp number troubleshooting, tracert analysis, open port auditing, mac oui lookup,
            signal encoding, and visual domain verification.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
              placeholder="Search topics (e.g., dns check, tracert, mac oui lookup, ip location)..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter articles by category"
            className="flex flex-wrap items-center gap-1.5"
          >
            {ALL_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
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

      {/* Articles Grid */}
      {filteredPosts.length === 0 ? (
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
            Reset filters and view all 10 guides
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPosts.map((post, idx) => (
            <article
              key={post.slug}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-sky-700 dark:text-sky-400">
                    {String(idx + 1).padStart(2, '0')} · {post.category}
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

                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
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
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  {post.keywords.slice(0, 4).map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                  {post.keywords.length > 4 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      +{post.keywords.length - 4} more
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
          ))}
        </div>
      )}
    </div>
  );
}

interface BlogArticleViewProps {
  post: BlogPost;
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

function BlogArticleView({
  post,
  onNavigateHome,
  onNavigateBlogIndex,
  onSelectPost,
  onRunDnsCheck,
}: BlogArticleViewProps) {
  const relatedPosts = useMemo(() => {
    const sameCategory = BLOG_POSTS.filter(
      (item) => item.slug !== post.slug && item.category === post.category
    );
    const others = BLOG_POSTS.filter(
      (item) => item.slug !== post.slug && item.category !== post.category
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [post]);

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onNavigateBlogIndex}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>All Blog Guides</span>
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
            <span className="font-semibold text-sky-700 dark:text-sky-400">{post.category}</span>
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
      <section aria-label="Related DNS Locator guides" className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          More DNS Locator Guides
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

interface BlogPreviewStripProps {
  onOpenBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
}

export function BlogPreviewStrip({ onOpenBlogIndex, onSelectPost }: BlogPreviewStripProps) {
  const featured = BLOG_POSTS.slice(0, 3);

  return (
    <section
      aria-labelledby="blog-preview-heading"
      className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>DNS &amp; Network Engineering Blog</span>
          </div>
          <h2
            id="blog-preview-heading"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100"
          >
            Latest Diagnostic Guides ({BLOG_POSTS.length} Articles)
          </h2>
        </div>

        <a
          href="/blog"
          onClick={(e) => {
            e.preventDefault();
            onOpenBlogIndex();
          }}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
        >
          <span>View All {BLOG_POSTS.length} Blogs</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featured.map((post) => (
          <a
            key={post.slug}
            href={`/blog/${post.slug}`}
            onClick={(e) => {
              e.preventDefault();
              onSelectPost(post.slug);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4 flex flex-col justify-between gap-3 hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-sky-700 dark:text-sky-400">{post.category}</span>
                <span>{post.readTimeMinutes} min</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {post.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {post.excerpt}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
              <span>Read guide</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
