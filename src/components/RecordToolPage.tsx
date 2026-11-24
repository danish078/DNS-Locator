import type { FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Search,
  Terminal,
  UserCheck,
  X,
} from 'lucide-react';
import { getAuthorById } from '../data/authors';
import { RECORD_TOOLS, getRecordToolBySlug, type RecordToolConfig } from '../data/recordTools';
import type { DnsRecordType } from '../types/dns';

interface RecordToolPageProps {
  tool: RecordToolConfig;
  rawInput: string;
  onChangeInput: (value: string) => void;
  isLoading: boolean;
  inputError: string | null;
  onSubmitLookup: (domainOverride?: string) => void;
  onNavigatePath: (path: string) => void;
  hasActiveResults: boolean;
  children?: React.ReactNode;
}

export default function RecordToolPage({
  tool,
  rawInput,
  onChangeInput,
  isLoading,
  inputError,
  onSubmitLookup,
  onNavigatePath,
  hasActiveResults,
  children,
}: RecordToolPageProps) {
  const author = getAuthorById(tool.authorId);
  const relatedTools = tool.relatedSlugs
    .map((slug) => getRecordToolBySlug(slug))
    .filter((item): item is RecordToolConfig => Boolean(item));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmitLookup();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/');
          }}
          className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline font-medium"
        >
          DNS Locator
        </a>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        <a
          href="/a-record-lookup"
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/a-record-lookup');
          }}
          className="hover:text-sky-700 dark:hover:text-sky-400 hover:underline font-medium"
        >
          DNS Record Tools
        </a>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        <span className="font-semibold text-slate-800 dark:text-slate-200">{tool.navLabel}</span>
      </nav>

      {/* Hero + Focused Lookup Tool */}
      <section className="space-y-6">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <span className="font-mono">{tool.recordType} RECORD DIAGNOSTIC</span>
            <span aria-hidden="true">·</span>
            <span>18 Global Checkpoints</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            {tool.h1}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {tool.lead}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border-2 border-sky-200/80 dark:border-sky-800/70 bg-gradient-to-br from-white via-sky-50/45 to-cyan-50/55 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 shadow-lg shadow-sky-900/5 dark:shadow-black/30 p-5 sm:p-7 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-sky-700 dark:text-sky-400">
              Instant {tool.recordType} Record Lookup Across 18 Worldwide Resolvers
            </span>
            <button
              type="button"
              onClick={() => {
                onChangeInput(tool.exampleDomain);
                onSubmitLookup(tool.exampleDomain);
              }}
              className="text-left sm:text-right font-mono text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Test example: {tool.exampleDomain} →
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0" dir="ltr">
              <Search
                className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 dark:text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="record-tool-domain-input" className="sr-only">
                Enter domain name or IP for {tool.recordType} lookup
              </label>
              <input
                id="record-tool-domain-input"
                type="text"
                value={rawInput}
                onChange={(e) => onChangeInput(e.target.value)}
                placeholder={
                  tool.recordType === 'PTR'
                    ? 'Enter IPv4 address (e.g., 1.1.1.1) or .in-addr.arpa hostname'
                    : `Enter domain for ${tool.recordType} lookup (e.g., ${tool.exampleDomain})`
                }
                autoComplete="off"
                spellCheck={false}
                className="w-full h-12 sm:h-14 pl-10 pr-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/90 text-sm sm:text-base font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
              {rawInput && (
                <button
                  type="button"
                  onClick={() => onChangeInput('')}
                  aria-label="Clear domain input"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div
                aria-label="Selected DNS record type"
                className="h-12 sm:h-14 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 inline-flex items-center"
              >
                {tool.recordType}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-initial h-12 sm:h-14 px-6 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 disabled:opacity-60 text-white dark:text-slate-950 text-sm sm:text-base font-bold shadow-md shadow-emerald-700/25 inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer"
              >
                <span>{isLoading ? 'Checking…' : `Check ${tool.recordType}`}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Direct Links to Other Record Tools */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Record Tools:
            </span>
            {RECORD_TOOLS.map((item) => {
              const isCurrent = item.slug === tool.slug;
              return (
                <a
                  key={item.slug}
                  href={`/${item.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePath(`/${item.slug}`);
                  }}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-emerald-700 dark:bg-emerald-400 text-white dark:text-slate-950'
                      : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-700 dark:hover:text-sky-400'
                  }`}
                >
                  {item.recordType}
                </a>
              );
            })}
          </div>
        </form>

        {inputError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/35 px-4 py-3 text-xs sm:text-sm text-rose-800 dark:text-rose-200"
          >
            {inputError}
          </div>
        )}
      </section>

      {/* Live Results Workspace when visitor runs lookup on this tool page */}
      {hasActiveResults && children}

      {/* Technical Documentation for this Record Type */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            What Is a DNS {tool.recordType} Record and How Does It Work?
          </h2>
          {tool.whatItDoes.map((paragraph, idx) => (
            <p key={idx} className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Example Zone File Syntax & CLI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Standard Zone File Syntax
            </div>
            <pre className="font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 overflow-x-auto">
              <code>{tool.syntaxExample}</code>
            </pre>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Command-Line Equivalent</span>
            </div>
            <pre className="font-mono text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 overflow-x-auto">
              <code>{tool.cliCommand}</code>
            </pre>
          </div>
        </div>

        {/* When to Check & Common Mistakes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              When Should You Check {tool.recordType} Propagation?
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
              {tool.whenToCheck.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Common {tool.recordType} Configuration Pitfalls
            </h3>
            <dl className="space-y-3 text-sm">
              {tool.commonMistakes.map((mistake) => (
                <div
                  key={mistake.issue}
                  className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5"
                >
                  <dt className="font-semibold text-slate-900 dark:text-slate-100">
                    {mistake.issue}
                  </dt>
                  <dd className="text-slate-600 dark:text-slate-300 mt-1 text-xs sm:text-sm leading-relaxed">
                    {mistake.fix}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Visual Aid & Pillar Guide Link */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center pt-4 border-t border-slate-100 dark:border-slate-800">
          <figure className="md:col-span-6">
            <img
              src="/images/dns-results-preview.jpg"
              alt={`Multi-region ${tool.recordType} record propagation panel showing resolver latencies across global checkpoints`}
              width={800}
              height={450}
              loading="lazy"
              className="w-full h-auto rounded-xl border border-slate-200 dark:border-slate-800"
            />
            <figcaption className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Real-time regional checkpoint comparison verifies {tool.recordType} consistency across North America, Europe, and Asia-Pacific.
            </figcaption>
          </figure>

          <div className="md:col-span-6 space-y-4">
            <div className="rounded-xl border border-sky-200 dark:border-sky-800/70 bg-sky-50/70 dark:bg-sky-950/30 p-5 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Pillar Propagation Guide</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Planning a Migration or Seeing Regional Mismatches?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Read our step-by-step engineering manual covering TTL reduction, GeoDNS routing, and zero-downtime zone cutovers.
              </p>
              <a
                href="/blog/complete-guide-to-dns-propagation"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath('/blog/complete-guide-to-dns-propagation');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline"
              >
                <span>Read Complete Guide to DNS Propagation</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>

            {/* Author Attribution */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Reviewed by {author.name} ·{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {author.role}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {author.bio}{' '}
                  <a
                    href="/about"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigatePath('/about');
                    }}
                    className="text-sky-700 dark:text-sky-400 hover:underline font-medium"
                  >
                    Meet our engineering team →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Diagnostic Tools */}
      <section aria-label="Related DNS record lookup tools" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Related DNS Lookup Tools
          </h2>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/');
            }}
            className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline"
          >
            Inspect All Record Types on Homepage →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedTools.map((rel) => (
            <a
              key={rel.slug}
              href={`/${rel.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath(`/${rel.slug}`);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 hover:border-sky-300 dark:hover:border-sky-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {rel.recordType} RECORD
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {rel.navLabel}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rel.lead}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 pt-2">
                <span>Open {rel.recordType} Checker</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export type RecordToolLookupHandler = (domain: string, recordType: DnsRecordType) => void;
