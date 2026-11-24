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
  UserCheck,
} from 'lucide-react';
import { getAuthorById } from '../data/authors';
import { BLOG_POSTS, getBlogPostBySlug, type BlogPost } from '../data/blogs';
import { getRecordToolBySlug, type RecordToolConfig } from '../data/recordTools';
import type { DnsRecordType } from '../types/dns';

interface BlogSectionProps {
  activeSlug: string | null;
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
  onNavigatePath?: (path: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

export default function BlogSection({
  activeSlug,
  onNavigateHome,
  onNavigateBlogIndex,
  onSelectPost,
  onNavigatePath,
  onRunDnsCheck,
}: BlogSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(BLOG_POSTS.map((p) => p.category)))],
    []
  );

  const activePost = useMemo(() => {
    if (!activeSlug) return undefined;
    return getBlogPostBySlug(activeSlug);
  }, [activeSlug]);

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

  const pillarPost = useMemo(
    () => BLOG_POSTS.find((p) => p.isPillarGuide) ?? BLOG_POSTS[0],
    []
  );

  if (activeSlug && activePost) {
    return (
      <BlogArticleView
        post={activePost}
        onNavigateHome={onNavigateHome}
        onNavigateBlogIndex={onNavigateBlogIndex}
        onSelectPost={onSelectPost}
        onNavigatePath={onNavigatePath}
        onRunDnsCheck={onRunDnsCheck}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to DNS Lookup</span>
        </a>

        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
          {BLOG_POSTS.length} Verified Engineering Guides
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
            DNS Propagation &amp; Network Engineering Guides
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            In-depth field manuals written by the DNS Locator engineering team covering global DNS propagation, TTL strategy, IP/ASN diagnostics, traceroute troubleshooting, and email/TLS security.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative w-full md:max-w-md">
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
              placeholder="Search topics (e.g., propagation, ttl, spf, dmarc, ipv6)..."
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

      {/* Featured Pillar Guide */}
      {pillarPost && !searchQuery && selectedCategory === 'All' && (
        <section
          aria-labelledby="pillar-guide-heading"
          className="rounded-2xl border border-emerald-200/90 dark:border-emerald-800/70 bg-gradient-to-br from-white via-emerald-50/25 to-sky-50/35 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/25 p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        >
          <div className="lg:col-span-5">
            <a
              href={`/blog/${pillarPost.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectPost(pillarPost.slug);
              }}
              className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <img
                src={pillarPost.shareImage}
                alt={pillarPost.shareImageAlt}
                width={800}
                height={450}
                className="w-full h-auto object-cover"
              />
            </a>
          </div>
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Featured Pillar Guide · {pillarPost.readTimeMinutes} min read
            </div>
            <h2
              id="pillar-guide-heading"
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug"
            >
              <a
                href={`/blog/${pillarPost.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectPost(pillarPost.slug);
                }}
                className="hover:text-sky-700 dark:hover:text-sky-400"
              >
                {pillarPost.title}
              </a>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {pillarPost.excerpt}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>
                By <strong className="text-slate-800 dark:text-slate-200">{getAuthorById(pillarPost.authorId).name}</strong> · Updated{' '}
                <time dateTime={pillarPost.updatedAt}>{pillarPost.updatedAt}</time>
              </span>
              <a
                href={`/blog/${pillarPost.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectPost(pillarPost.slug);
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-sky-700 dark:text-sky-400 hover:underline"
              >
                <span>Read Complete Guide</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Technical Guides Grid */}
      <section aria-labelledby="curated-guides-heading" className="space-y-4">
        <div className="space-y-0.5">
          <h2
            id="curated-guides-heading"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100"
          >
            Technical Engineering Guides
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Reference manuals for DNS propagation checks, IP/ASN verification, traceroute debugging, and zone security.
          </p>
        </div>

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
              Reset filters and view all {BLOG_POSTS.length} guides
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredPosts.map((post, idx) => (
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

interface BlogCardProps {
  post: BlogPost;
  index: number;
  onSelectPost: (slug: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

function BlogCard({ post, index, onSelectPost, onRunDnsCheck }: BlogCardProps) {
  const author = getAuthorById(post.authorId);

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-300 dark:hover:border-sky-700 overflow-hidden flex flex-col justify-between transition-colors">
      <div>
        <a
          href={`/blog/${post.slug}`}
          onClick={(e) => {
            e.preventDefault();
            onSelectPost(post.slug);
          }}
          className="block border-b border-slate-100 dark:border-slate-800"
        >
          <img
            src={post.shareImage}
            alt={post.shareImageAlt}
            width={800}
            height={450}
            loading="lazy"
            className="w-full h-44 object-cover"
          />
        </a>

        <div className="p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-sky-700 dark:text-sky-400">
              {String(index + 1).padStart(2, '0')} · {post.category}
            </span>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                <time dateTime={post.updatedAt}>{post.updatedAt}</time>
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
      </div>

      <div className="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          By <strong className="text-slate-800 dark:text-slate-200">{author.name}</strong>
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
  onNavigateHome: () => void;
  onNavigateBlogIndex: () => void;
  onSelectPost: (slug: string) => void;
  onNavigatePath?: (path: string) => void;
  onRunDnsCheck: (domain: string, recordType: DnsRecordType) => void;
}

function BlogArticleView({
  post,
  onNavigateHome,
  onNavigateBlogIndex,
  onSelectPost,
  onNavigatePath,
  onRunDnsCheck,
}: BlogArticleViewProps) {
  const author = getAuthorById(post.authorId);

  const relatedTools = useMemo(
    () =>
      post.relatedRecordSlugs
        .map((slug) => getRecordToolBySlug(slug))
        .filter((tool): tool is RecordToolConfig => Boolean(tool)),
    [post.relatedRecordSlugs]
  );

  const relatedPosts = useMemo(() => {
    const sameCategory = BLOG_POSTS.filter(
      (item) => item.slug !== post.slug && item.category === post.category
    );
    const others = BLOG_POSTS.filter(
      (item) => item.slug !== post.slug && item.category !== post.category
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [post]);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigatePath && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onNavigatePath(path);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="/blog"
            onClick={(e) => {
              e.preventDefault();
              onNavigateBlogIndex();
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>All Blog Articles</span>
          </a>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            /
          </span>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            DNS Locator Tool
          </a>
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
              <span>
                Published <time dateTime={post.publishedAt}>{post.publishedAt}</time> · Updated{' '}
                <time dateTime={post.updatedAt}>{post.updatedAt}</time>
              </span>
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

          <figure className="pt-1">
            <img
              src={post.shareImage}
              alt={post.shareImageAlt}
              width={1200}
              height={675}
              className="w-full h-auto rounded-xl border border-slate-200 dark:border-slate-800"
            />
          </figure>

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

        {/* Pillar Back-Link Banner for Supporting Guides */}
        {!post.isPillarGuide && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <span className="text-emerald-900 dark:text-emerald-200">
              Part of our DNS Propagation Series. Looking for full TTL &amp; cutover theory?
            </span>
            <a
              href="/blog/complete-guide-to-dns-propagation"
              onClick={(e) => handleLink(e, '/blog/complete-guide-to-dns-propagation')}
              className="font-semibold text-emerald-700 dark:text-emerald-300 hover:underline whitespace-nowrap shrink-0"
            >
              Read Complete Propagation Guide →
            </a>
          </div>
        )}

        <div className="space-y-8">
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
              {section.image && (
                <figure className="pt-2">
                  <img
                    src={section.image.src}
                    alt={section.image.alt}
                    width={960}
                    height={540}
                    loading="lazy"
                    className="w-full h-auto rounded-xl border border-slate-200 dark:border-slate-800"
                  />
                  <figcaption className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    {section.image.caption}
                  </figcaption>
                </figure>
              )}
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

        {/* Related Record-Type Tools inside Article */}
        {relatedTools.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Focused DNS Diagnostic Tools Referenced in This Guide
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {relatedTools.map((tool) => (
                <a
                  key={tool.slug}
                  href={`/${tool.slug}`}
                  onClick={(e) => handleLink(e, `/${tool.slug}`)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-600 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5"
                >
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {tool.recordType}
                  </span>
                  <span>{tool.navLabel}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio Box */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {author.name}{' '}
              <span className="font-normal text-slate-500 dark:text-slate-400">
                · {author.role}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{author.bio}</p>
            <a
              href="/about"
              onClick={(e) => handleLink(e, '/about')}
              className="inline-block font-semibold text-sky-700 dark:text-sky-400 hover:underline pt-0.5"
            >
              About DNS Locator Team →
            </a>
          </div>
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
          More DNS Locator Engineering Guides
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
