import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Copy,
  FileDiff,
  GitCompareArrows,
  MinusCircle,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getCachedResult, setCachedResult, type RecentLookupEntry } from '../lib/cache';
import { formatTtl, sanitizeDomainInput } from '../lib/domain';
import {
  ALL_ZONE_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordItem,
  type DnsRecordType,
} from '../types/dns';

interface DomainComparisonSectionProps {
  activeDomain: string | null;
  activeZoneData: DnsLookupResponse | null;
  recentLookups: RecentLookupEntry[];
}

type DiffKind = 'match' | 'empty' | 'different' | 'only-a' | 'only-b';
type DiffFilter = 'all' | 'matches' | 'mismatches';
type ComparisonViewMode = 'side-by-side' | 'dns-diff';

interface DiffLineEntry {
  key: string;
  status: 'match' | 'mismatch-a' | 'mismatch-b' | 'ttl-mismatch';
  text: string;
  ttlA?: number;
  ttlB?: number;
}

interface RecordDiffRow {
  type: DnsRecordType;
  diffKind: DiffKind;
  isMismatch: boolean;
  isMatch: boolean;
  recordsA: DnsRecordItem[];
  recordsB: DnsRecordItem[];
  sharedKeys: Set<string>;
  onlyAKeys: Set<string>;
  onlyBKeys: Set<string>;
  ttlMismatchKeys: Set<string>;
  unifiedLines: DiffLineEntry[];
}

function recordComparableKey(item: DnsRecordItem): string {
  const cleanData = item.data.trim().toLowerCase();
  return item.priority !== undefined ? `${item.priority}:${cleanData}` : cleanData;
}

function formatRecordLine(item: DnsRecordItem): string {
  return item.priority !== undefined ? `[${item.priority}] ${item.data}` : item.data;
}

async function fetchZoneForComparison(
  domain: string,
  activeZoneData: DnsLookupResponse | null
): Promise<DnsLookupResponse> {
  if (activeZoneData && activeZoneData.domain === domain) {
    return activeZoneData;
  }

  const cacheKey = `all:${domain}`;
  const cached = getCachedResult<DnsLookupResponse>(cacheKey);
  if (cached) {
    return {
      ...cached.data,
      cached: true,
      cacheExpiresAt: new Date(cached.expiresAt).toISOString(),
    };
  }

  const res = await fetch(`/api/dns?domain=${encodeURIComponent(domain)}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `DNS lookup failed for ${domain} (HTTP ${res.status}).`);
  }
  setCachedResult(cacheKey, json);
  return json as DnsLookupResponse;
}

function DiffStatusLabel({
  kind,
  hasTtlMismatch = false,
}: {
  kind: DiffKind;
  hasTtlMismatch?: boolean;
}) {
  if (kind === 'match' && !hasTtlMismatch) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Match</span>
      </span>
    );
  }
  if (kind === 'match' && hasTtlMismatch) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>TTL Mismatch</span>
      </span>
    );
  }
  if (kind === 'empty') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
        <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Both Empty</span>
      </span>
    );
  }
  if (kind === 'only-a') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Mismatch · Only A</span>
      </span>
    );
  }
  if (kind === 'only-b') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Mismatch · Only B</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Mismatch</span>
    </span>
  );
}

export default function DomainComparisonSection({
  activeDomain,
  activeZoneData,
  recentLookups,
}: DomainComparisonSectionProps) {
  const [domainAInput, setDomainAInput] = useState<string>(() => activeDomain ?? '');
  const [domainBInput, setDomainBInput] = useState<string>('');
  const [hasEditedA, setHasEditedA] = useState(false);

  const [zoneA, setZoneA] = useState<DnsLookupResponse | null>(null);
  const [zoneB, setZoneB] = useState<DnsLookupResponse | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ComparisonViewMode>('side-by-side');
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('all');
  const [auditTtl, setAuditTtl] = useState<boolean>(false);
  const [diffCopied, setDiffCopied] = useState<boolean>(false);

  // Keep Domain A synced with the user's active lookup until manually edited
  useEffect(() => {
    if (activeDomain && !hasEditedA) {
      setDomainAInput(activeDomain);
    }
  }, [activeDomain, hasEditedA]);

  const recentDomains = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    if (activeDomain) {
      seen.add(activeDomain);
      list.push(activeDomain);
    }
    for (const item of recentLookups) {
      if (!seen.has(item.domain)) {
        seen.add(item.domain);
        list.push(item.domain);
      }
    }
    return list.slice(0, 6);
  }, [activeDomain, recentLookups]);

  const runComparison = useCallback(
    async (rawA: string, rawB: string) => {
      const parsedA = sanitizeDomainInput(rawA);
      if (!parsedA.isValid) {
        setCompareError(`Domain A: ${parsedA.reason ?? 'Enter a valid domain name.'}`);
        return;
      }

      const parsedB = sanitizeDomainInput(rawB);
      if (!parsedB.isValid) {
        setCompareError(`Domain B: ${parsedB.reason ?? 'Enter a valid domain name.'}`);
        return;
      }

      if (parsedA.domain === parsedB.domain) {
        setCompareError('Select two different domains to compare DNS record differences.');
        return;
      }

      setDomainAInput(parsedA.domain);
      setDomainBInput(parsedB.domain);
      setCompareError(null);
      setIsComparing(true);

      try {
        const [resA, resB] = await Promise.all([
          fetchZoneForComparison(parsedA.domain, activeZoneData),
          fetchZoneForComparison(parsedB.domain, activeZoneData),
        ]);
        setZoneA(resA);
        setZoneB(resB);
      } catch (err) {
        setCompareError(
          err instanceof Error
            ? err.message
            : 'Unable to compare DNS records right now. Please try again.'
        );
      } finally {
        setIsComparing(false);
      }
    },
    [activeZoneData]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runComparison(domainAInput, domainBInput);
  };

  const handleSwap = () => {
    const nextA = domainBInput;
    const nextB = domainAInput;
    setHasEditedA(true);
    setDomainAInput(nextA);
    setDomainBInput(nextB);
    if (zoneA && zoneB) {
      setZoneA(zoneB);
      setZoneB(zoneA);
    }
  };

  const handlePresetCompare = (sampleA: string, sampleB: string) => {
    setHasEditedA(true);
    setDomainAInput(sampleA);
    setDomainBInput(sampleB);
    runComparison(sampleA, sampleB);
  };

  const diffRows = useMemo<RecordDiffRow[]>(() => {
    if (!zoneA || !zoneB) return [];

    return ALL_ZONE_RECORD_TYPES.map((type) => {
      const recordsA = zoneA.recordsByType[type] ?? [];
      const recordsB = zoneB.recordsByType[type] ?? [];

      const mapA = new Map<string, DnsRecordItem>();
      const mapB = new Map<string, DnsRecordItem>();
      recordsA.forEach((item) => mapA.set(recordComparableKey(item), item));
      recordsB.forEach((item) => mapB.set(recordComparableKey(item), item));

      const sharedKeys = new Set<string>();
      const onlyAKeys = new Set<string>();
      const onlyBKeys = new Set<string>();
      const ttlMismatchKeys = new Set<string>();
      const unifiedLines: DiffLineEntry[] = [];

      for (const [k, itemA] of mapA.entries()) {
        const itemB = mapB.get(k);
        if (itemB) {
          sharedKeys.add(k);
          const ttlDiffers = auditTtl && itemA.ttl !== itemB.ttl;
          if (ttlDiffers) {
            ttlMismatchKeys.add(k);
            unifiedLines.push({
              key: `ttl-${k}`,
              status: 'ttl-mismatch',
              text: formatRecordLine(itemA),
              ttlA: itemA.ttl,
              ttlB: itemB.ttl,
            });
          } else {
            unifiedLines.push({
              key: `eq-${k}`,
              status: 'match',
              text: formatRecordLine(itemA),
              ttlA: itemA.ttl,
              ttlB: itemB.ttl,
            });
          }
        } else {
          onlyAKeys.add(k);
          unifiedLines.push({
            key: `a-${k}`,
            status: 'mismatch-a',
            text: formatRecordLine(itemA),
            ttlA: itemA.ttl,
          });
        }
      }

      for (const [k, itemB] of mapB.entries()) {
        if (!mapA.has(k)) {
          onlyBKeys.add(k);
          unifiedLines.push({
            key: `b-${k}`,
            status: 'mismatch-b',
            text: formatRecordLine(itemB),
            ttlB: itemB.ttl,
          });
        }
      }

      let diffKind: DiffKind;
      if (recordsA.length === 0 && recordsB.length === 0) {
        diffKind = 'empty';
      } else if (recordsA.length > 0 && recordsB.length === 0) {
        diffKind = 'only-a';
      } else if (recordsA.length === 0 && recordsB.length > 0) {
        diffKind = 'only-b';
      } else if (onlyAKeys.size === 0 && onlyBKeys.size === 0) {
        diffKind = 'match';
      } else {
        diffKind = 'different';
      }

      const isMismatch =
        diffKind === 'different' ||
        diffKind === 'only-a' ||
        diffKind === 'only-b' ||
        (diffKind === 'match' && ttlMismatchKeys.size > 0);
      const isMatch = diffKind === 'match' && ttlMismatchKeys.size === 0;

      return {
        type,
        diffKind,
        isMismatch,
        isMatch,
        recordsA,
        recordsB,
        sharedKeys,
        onlyAKeys,
        onlyBKeys,
        ttlMismatchKeys,
        unifiedLines,
      };
    });
  }, [zoneA, zoneB, auditTtl]);

  const postureMatches = useMemo(() => {
    if (!zoneA || !zoneB) return true;
    return (
      Boolean(zoneA.dnssecValidated) === Boolean(zoneB.dnssecValidated) &&
      zoneA.emailHealth.hasSpf === zoneB.emailHealth.hasSpf &&
      zoneA.emailHealth.hasDmarc === zoneB.emailHealth.hasDmarc
    );
  }, [zoneA, zoneB]);

  const diffSummary = useMemo(() => {
    const matching = diffRows.filter((r) => r.isMatch).length;
    const empty = diffRows.filter((r) => r.diffKind === 'empty').length;
    const mismatches = diffRows.filter((r) => r.isMismatch).length;
    const auditedCount = matching + mismatches;
    const consistencyPct =
      auditedCount > 0 ? Math.round((matching / auditedCount) * 100) : 100;
    return { matching, empty, mismatches, auditedCount, consistencyPct };
  }, [diffRows]);

  const visibleRows = useMemo(() => {
    if (diffFilter === 'all') return diffRows;
    if (diffFilter === 'matches') return diffRows.filter((r) => r.isMatch);
    return diffRows.filter((r) => r.isMismatch);
  }, [diffRows, diffFilter]);

  const handleCopyDiffAudit = async () => {
    if (!zoneA || !zoneB) return;
    const lines: string[] = [
      `DNS Diff Zone Consistency Audit`,
      `Domain A: ${zoneA.domain}`,
      `Domain B: ${zoneB.domain}`,
      `Consistency: ${diffSummary.consistencyPct}% (${diffSummary.matching}/${diffSummary.auditedCount} active record types match)`,
      `TTL Audit: ${auditTtl ? 'Enabled' : 'Values Only'}`,
      `---`,
    ];

    for (const row of diffRows) {
      if (row.diffKind === 'empty') continue;
      lines.push(
        `[${row.type}] ${row.isMatch ? 'MATCH' : 'MISMATCH'}`
      );
      for (const entry of row.unifiedLines) {
        const prefix =
          entry.status === 'match'
            ? '  = '
            : entry.status === 'mismatch-a'
              ? '  - [A only] '
              : entry.status === 'mismatch-b'
                ? '  + [B only] '
                : `  ~ [TTL ${formatTtl(entry.ttlA ?? 0)} vs ${formatTtl(entry.ttlB ?? 0)}] `;
        lines.push(`${prefix}${entry.text}`);
      }
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setDiffCopied(true);
      window.setTimeout(() => setDiffCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <section
      aria-labelledby="domain-comparison-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Header & Controls */}
      <div className="p-5 sm:p-7 border-b border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GitCompareArrows
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <h2
                id="domain-comparison-heading"
                className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Side-by-Side Domain Comparison &amp; DNS Diff
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Compare live A, AAAA, CNAME, MX, TXT, NS, SOA, and CAA records with automatic green (match) and red (mismatch) zone consistency highlighting.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handlePresetCompare(
                activeDomain && activeDomain !== 'cloudflare.com' ? activeDomain : 'google.com',
                'cloudflare.com'
              )
            }
            className="h-9 px-3.5 rounded-lg border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100/80 dark:hover:bg-sky-900/50 text-xs font-semibold text-sky-700 dark:text-sky-300 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            Try {activeDomain && activeDomain !== 'cloudflare.com' ? activeDomain : 'google.com'} vs cloudflare.com
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Domain A Input */}
            <div className="flex-1 min-w-0">
              <label htmlFor="compare-domain-a" className="sr-only">
                Domain A
              </label>
              <div className="relative" dir="ltr">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-sky-700 dark:text-sky-400 pointer-events-none">
                  A
                </span>
                <input
                  id="compare-domain-a"
                  type="text"
                  list="compare-recent-domains"
                  value={domainAInput}
                  onChange={(e) => {
                    setHasEditedA(true);
                    setDomainAInput(e.target.value);
                  }}
                  placeholder="First domain (e.g. example.com)"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap Domain A and Domain B"
              title="Swap domains"
              className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
              <span className="lg:hidden">Swap</span>
            </button>

            {/* Domain B Input */}
            <div className="flex-1 min-w-0">
              <label htmlFor="compare-domain-b" className="sr-only">
                Domain B
              </label>
              <div className="relative" dir="ltr">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700 dark:text-teal-400 pointer-events-none">
                  B
                </span>
                <input
                  id="compare-domain-b"
                  type="text"
                  list="compare-recent-domains"
                  value={domainBInput}
                  onChange={(e) => setDomainBInput(e.target.value)}
                  placeholder="Second domain (e.g. cloudflare.com)"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            </div>

            <datalist id="compare-recent-domains">
              {recentDomains.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>

            {/* Compare CTA */}
            <button
              type="submit"
              disabled={isComparing}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 disabled:opacity-60 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isComparing ? 'Comparing…' : 'Compare DNS'}</span>
            </button>
          </div>

          {/* Quick Domain Selectors from Recent Lookups */}
          {recentDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Quick fill Domain B:
              </span>
              {recentDomains
                .filter((d) => d !== sanitizeDomainInput(domainAInput).domain)
                .slice(0, 4)
                .map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => {
                      setDomainBInput(domain);
                      if (sanitizeDomainInput(domainAInput).isValid) {
                        runComparison(domainAInput, domain);
                      }
                    }}
                    className="px-3 py-1.5 min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-mono text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {domain}
                  </button>
                ))}
            </div>
          )}
        </form>

        {compareError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-4 py-3 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <span>{compareError}</span>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isComparing && (
        <div className="p-4 sm:p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* DNS Diff Summary & Audit Toolbar */}
      {!isComparing && zoneA && zoneB && (
        <>
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-4">
            {/* Top Audit Metrics & View Mode */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm tabular-nums">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <FileDiff className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Zone Consistency: {diffSummary.consistencyPct}%</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
                  <span>{diffSummary.matching} Matches</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden="true" />
                  <span>{diffSummary.mismatches} Mismatches</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {diffSummary.empty} Both Empty
                </span>
              </div>

              {/* View Switch + Audit TTL + Copy Diff */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  role="tablist"
                  aria-label="DNS comparison layout"
                  className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 gap-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'side-by-side'}
                    onClick={() => setViewMode('side-by-side')}
                    className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      viewMode === 'side-by-side'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'dns-diff'}
                    onClick={() => setViewMode('dns-diff')}
                    className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      viewMode === 'dns-diff'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    DNS Diff Audit
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAuditTtl((prev) => !prev)}
                  aria-pressed={auditTtl}
                  className={`h-9 px-3.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    auditTtl
                      ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {auditTtl ? 'TTL Diffs: Flagged' : 'Audit TTL Diffs'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyDiffAudit}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {diffCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      <span>Diff Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Diff</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Row: All Types | Matches Only | Mismatches Only */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
              <div
                role="tablist"
                aria-label="Filter DNS Diff rows"
                className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 gap-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={diffFilter === 'all'}
                  onClick={() => setDiffFilter('all')}
                  className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    diffFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All Types ({diffRows.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={diffFilter === 'matches'}
                  onClick={() => setDiffFilter('matches')}
                  className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    diffFilter === 'matches'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
                  }`}
                >
                  Matches ({diffSummary.matching})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={diffFilter === 'mismatches'}
                  onClick={() => setDiffFilter('mismatches')}
                  className={`px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    diffFilter === 'mismatches'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 dark:text-rose-400 hover:text-rose-800'
                  }`}
                >
                  Mismatches ({diffSummary.mismatches})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-emerald-200 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-600" aria-hidden="true" />
                  <span>Green = Matching Record</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-rose-200 dark:bg-rose-900 border border-rose-400 dark:border-rose-700" aria-hidden="true" />
                  <span>Red = Record Mismatch</span>
                </span>
              </div>
            </div>
          </div>

          {viewMode === 'dns-diff' ? (
            /* Unified DNS Diff Audit Stream */
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {visibleRows.length === 0 ? (
                <div className="py-12 px-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  No DNS record types match the current filter between{' '}
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {zoneA.domain}
                  </span>{' '}
                  and{' '}
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {zoneB.domain}
                  </span>
                  .
                </div>
              ) : (
                visibleRows.map((row) => (
                  <div
                    key={row.type}
                    className={`p-5 sm:px-6 space-y-3 ${
                      row.isMatch
                        ? 'bg-emerald-50/45 dark:bg-emerald-950/15'
                        : row.isMismatch
                          ? 'bg-rose-50/45 dark:bg-rose-950/15'
                          : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          {row.type}
                        </span>
                        <DiffStatusLabel
                          kind={row.diffKind}
                          hasTtlMismatch={row.ttlMismatchKeys.size > 0}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        A: {row.recordsA.length} · B: {row.recordsB.length}
                      </span>
                    </div>

                    {row.unifiedLines.length === 0 ? (
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        No {row.type} records published on either domain.
                      </div>
                    ) : (
                      <ul className="space-y-2 font-mono text-xs" dir="ltr">
                        {row.unifiedLines.map((line) => {
                          const isLineMatch = line.status === 'match';
                          return (
                            <li
                              key={line.key}
                              className={`rounded-lg px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2.5 break-all ${
                                isLineMatch
                                  ? 'bg-emerald-100/75 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100'
                                  : 'bg-rose-100/80 dark:bg-rose-900/35 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-100 font-medium'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span
                                  className={`font-bold shrink-0 ${
                                    isLineMatch
                                      ? 'text-emerald-700 dark:text-emerald-300'
                                      : 'text-rose-700 dark:text-rose-300'
                                  }`}
                                >
                                  {line.status === 'match'
                                    ? '='
                                    : line.status === 'mismatch-a'
                                      ? '−A'
                                      : line.status === 'mismatch-b'
                                        ? '+B'
                                        : '~TTL'}
                                </span>
                                <span className="break-all">{line.text}</span>
                              </div>
                              <span className="text-[11px] shrink-0 tabular-nums opacity-80">
                                {line.status === 'match'
                                  ? `Match · ${formatTtl(line.ttlA ?? 0)}`
                                  : line.status === 'mismatch-a'
                                    ? `Only ${zoneA.domain} · ${formatTtl(line.ttlA ?? 0)}`
                                    : line.status === 'mismatch-b'
                                      ? `Only ${zoneB.domain} · ${formatTtl(line.ttlB ?? 0)}`
                                      : `TTL ${formatTtl(line.ttlA ?? 0)} vs ${formatTtl(line.ttlB ?? 0)}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Side-by-Side Table with Color-Coded Green (Match) & Red (Mismatch) Highlights */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3.5 px-5 whitespace-nowrap w-24">Record</th>
                    <th className="py-3.5 px-5 whitespace-nowrap w-40">DNS Diff</th>
                    <th className="py-3.5 px-5 min-w-[240px]" dir="ltr">
                      <span className="text-sky-700 dark:text-sky-400 mr-1.5">A:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">{zoneA.domain}</span>
                    </th>
                    <th className="py-3.5 px-5 min-w-[240px]" dir="ltr">
                      <span className="text-teal-700 dark:text-teal-400 mr-1.5">B:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">{zoneB.domain}</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
                  {/* Security & Email Posture Row */}
                  <tr
                    className={
                      postureMatches
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/15'
                        : 'bg-rose-50/55 dark:bg-rose-950/20'
                    }
                  >
                    <td className="py-4 px-5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap align-top">
                      Posture
                    </td>
                    <td className="py-4 px-5 align-top">
                      <DiffStatusLabel kind={postureMatches ? 'match' : 'different'} />
                    </td>
                    <td className="py-4 px-5 align-top text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 font-medium">
                        <ShieldCheck
                          className={`w-3.5 h-3.5 ${
                            zoneA.dnssecValidated
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span>DNSSEC {zoneA.dnssecValidated ? 'Signed' : 'Unsigned'}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                        MX {zoneA.emailHealth.hasMx ? 'OK' : 'Missing'} · SPF{' '}
                        {zoneA.emailHealth.hasSpf ? 'OK' : 'Missing'} · DMARC{' '}
                        {zoneA.emailHealth.hasDmarc ? 'OK' : 'Missing'}
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 font-medium">
                        <ShieldCheck
                          className={`w-3.5 h-3.5 ${
                            zoneB.dnssecValidated
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span>DNSSEC {zoneB.dnssecValidated ? 'Signed' : 'Unsigned'}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                        MX {zoneB.emailHealth.hasMx ? 'OK' : 'Missing'} · SPF{' '}
                        {zoneB.emailHealth.hasSpf ? 'OK' : 'Missing'} · DMARC{' '}
                        {zoneB.emailHealth.hasDmarc ? 'OK' : 'Missing'}
                      </div>
                    </td>
                  </tr>

                  {visibleRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 px-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400"
                      >
                        No DNS record types match the current filter between{' '}
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {zoneA.domain}
                        </span>{' '}
                        and{' '}
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {zoneB.domain}
                        </span>
                        .
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const rowBg = row.isMatch
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/15'
                        : row.isMismatch
                          ? 'bg-rose-50/55 dark:bg-rose-950/20'
                          : '';

                      return (
                        <tr key={row.type} className={rowBg}>
                          <td className="py-4 px-5 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap align-top">
                            {row.type}
                          </td>
                          <td className="py-4 px-5 align-top">
                            <DiffStatusLabel
                              kind={row.diffKind}
                              hasTtlMismatch={row.ttlMismatchKeys.size > 0}
                            />
                          </td>
                          <td className="py-4 px-5 align-top" dir="ltr">
                            {row.recordsA.length === 0 ? (
                              <span
                                className={`text-xs ${
                                  row.isMismatch
                                    ? 'text-rose-700 dark:text-rose-400 font-medium'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {row.isMismatch
                                  ? `Missing ${row.type} record`
                                  : `No ${row.type} record published`}
                              </span>
                            ) : (
                              <ul className="space-y-2 font-mono text-xs">
                                {row.recordsA.map((item, idx) => {
                                  const key = recordComparableKey(item);
                                  const isLineMismatch =
                                    row.onlyAKeys.has(key) || row.ttlMismatchKeys.has(key);
                                  return (
                                    <li
                                      key={`${idx}-${item.data}`}
                                      className={`rounded-lg px-3 py-2 border break-all flex items-start justify-between gap-2.5 ${
                                        isLineMismatch
                                          ? 'bg-rose-100/85 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-100 font-medium'
                                          : 'bg-emerald-100/75 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100'
                                      }`}
                                    >
                                      <span>{formatRecordLine(item)}</span>
                                      <span className="text-[11px] opacity-80 shrink-0 tabular-nums">
                                        {formatTtl(item.ttl)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </td>
                          <td className="py-4 px-5 align-top" dir="ltr">
                            {row.recordsB.length === 0 ? (
                              <span
                                className={`text-xs ${
                                  row.isMismatch
                                    ? 'text-rose-700 dark:text-rose-400 font-medium'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {row.isMismatch
                                  ? `Missing ${row.type} record`
                                  : `No ${row.type} record published`}
                              </span>
                            ) : (
                              <ul className="space-y-2 font-mono text-xs">
                                {row.recordsB.map((item, idx) => {
                                  const key = recordComparableKey(item);
                                  const isLineMismatch =
                                    row.onlyBKeys.has(key) || row.ttlMismatchKeys.has(key);
                                  return (
                                    <li
                                      key={`${idx}-${item.data}`}
                                      className={`rounded-lg px-3 py-2 border break-all flex items-start justify-between gap-2.5 ${
                                        isLineMismatch
                                          ? 'bg-rose-100/85 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-100 font-medium'
                                          : 'bg-emerald-100/75 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100'
                                      }`}
                                    >
                                      <span>{formatRecordLine(item)}</span>
                                      <span className="text-[11px] opacity-80 shrink-0 tabular-nums">
                                        {formatTtl(item.ttl)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
