import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  GitCompareArrows,
  MinusCircle,
  PlusCircle,
  Search,
  ShieldCheck,
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
type DiffFilter = 'all' | 'diffs';

interface RecordDiffRow {
  type: DnsRecordType;
  diffKind: DiffKind;
  recordsA: DnsRecordItem[];
  recordsB: DnsRecordItem[];
  sharedKeys: Set<string>;
  onlyAKeys: Set<string>;
  onlyBKeys: Set<string>;
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

function DiffStatusLabel({ kind }: { kind: DiffKind }) {
  switch (kind) {
    case 'match':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Match</span>
        </span>
      );
    case 'empty':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
          <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Both Empty</span>
        </span>
      );
    case 'different':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Different</span>
        </span>
      );
    case 'only-a':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap">
          <PlusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Only Domain A</span>
        </span>
      );
    case 'only-b':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap">
          <PlusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Only Domain B</span>
        </span>
      );
  }
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
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('all');

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

      const keysA = new Set(recordsA.map(recordComparableKey));
      const keysB = new Set(recordsB.map(recordComparableKey));
      const sharedKeys = new Set<string>();
      const onlyAKeys = new Set<string>();
      const onlyBKeys = new Set<string>();

      for (const k of keysA) {
        if (keysB.has(k)) {
          sharedKeys.add(k);
        } else {
          onlyAKeys.add(k);
        }
      }

      for (const k of keysB) {
        if (!keysA.has(k)) {
          onlyBKeys.add(k);
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

      return {
        type,
        diffKind,
        recordsA,
        recordsB,
        sharedKeys,
        onlyAKeys,
        onlyBKeys,
      };
    });
  }, [zoneA, zoneB]);

  const diffSummary = useMemo(() => {
    const matching = diffRows.filter((r) => r.diffKind === 'match').length;
    const empty = diffRows.filter((r) => r.diffKind === 'empty').length;
    const different = diffRows.filter((r) => r.diffKind === 'different').length;
    const onlyA = diffRows.filter((r) => r.diffKind === 'only-a').length;
    const onlyB = diffRows.filter((r) => r.diffKind === 'only-b').length;
    const totalDiffs = different + onlyA + onlyB;
    return { matching, empty, different, onlyA, onlyB, totalDiffs };
  }, [diffRows]);

  const visibleRows = useMemo(() => {
    if (diffFilter === 'all') return diffRows;
    return diffRows.filter(
      (r) => r.diffKind === 'different' || r.diffKind === 'only-a' || r.diffKind === 'only-b'
    );
  }, [diffRows, diffFilter]);

  return (
    <section
      aria-labelledby="domain-comparison-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <GitCompareArrows
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <h2
                id="domain-comparison-heading"
                className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Side-by-Side Domain DNS Comparison
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select or enter two domains to compare live A, AAAA, CNAME, MX, TXT, NS, SOA, and CAA records and highlight differences.
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
            className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            Try {activeDomain && activeDomain !== 'cloudflare.com' ? activeDomain : 'google.com'} vs cloudflare.com
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            {/* Domain A Input */}
            <div className="flex-1 min-w-0">
              <label htmlFor="compare-domain-a" className="sr-only">
                Domain A
              </label>
              <div className="relative" dir="ltr">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-sky-700 dark:text-sky-400 pointer-events-none">
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
                  className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap Domain A and Domain B"
              title="Swap domains"
              className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="lg:hidden">Swap</span>
            </button>

            {/* Domain B Input */}
            <div className="flex-1 min-w-0">
              <label htmlFor="compare-domain-b" className="sr-only">
                Domain B
              </label>
              <div className="relative" dir="ltr">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-teal-700 dark:text-teal-400 pointer-events-none">
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
                  className="w-full h-10 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
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
              className="h-10 px-5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-400 dark:to-teal-300 dark:hover:from-emerald-300 dark:hover:to-teal-200 disabled:opacity-60 text-white dark:text-slate-950 text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-700/20 dark:shadow-emerald-400/15 inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{isComparing ? 'Comparing…' : 'Compare DNS'}</span>
            </button>
          </div>

          {/* Quick Domain Selectors from Recent Lookups */}
          {recentDomains.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-mono text-[11px] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
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
            className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-2.5 text-xs sm:text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2"
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

      {/* Populated Diff Summary + Table */}
      {!isComparing && zoneA && zoneB && (
        <>
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {diffSummary.totalDiffs} {diffSummary.totalDiffs === 1 ? 'Difference' : 'Differences'}
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {diffSummary.matching} Matching
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                {diffSummary.empty} Both Empty
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Filter comparison rows"
              className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 self-start md:self-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={diffFilter === 'all'}
                onClick={() => setDiffFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  diffFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Types ({diffRows.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={diffFilter === 'diffs'}
                onClick={() => setDiffFilter('diffs')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  diffFilter === 'diffs'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Differences Only ({diffSummary.totalDiffs})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-4 whitespace-nowrap w-24">Record</th>
                  <th className="py-2.5 px-4 whitespace-nowrap w-36">Comparison</th>
                  <th className="py-2.5 px-4 min-w-[240px]" dir="ltr">
                    <span className="text-sky-700 dark:text-sky-400 mr-1.5">A:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{zoneA.domain}</span>
                  </th>
                  <th className="py-2.5 px-4 min-w-[240px]" dir="ltr">
                    <span className="text-teal-700 dark:text-teal-400 mr-1.5">B:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{zoneB.domain}</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
                {/* Security & Email Posture Row */}
                <tr
                  className={
                    Boolean(zoneA.dnssecValidated) !== Boolean(zoneB.dnssecValidated) ||
                    zoneA.emailHealth.hasSpf !== zoneB.emailHealth.hasSpf ||
                    zoneA.emailHealth.hasDmarc !== zoneB.emailHealth.hasDmarc
                      ? 'bg-amber-50/40 dark:bg-amber-950/15'
                      : ''
                  }
                >
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap align-top">
                    Posture
                  </td>
                  <td className="py-3 px-4 align-top">
                    <DiffStatusLabel
                      kind={
                        Boolean(zoneA.dnssecValidated) === Boolean(zoneB.dnssecValidated) &&
                        zoneA.emailHealth.hasSpf === zoneB.emailHealth.hasSpf &&
                        zoneA.emailHealth.hasDmarc === zoneB.emailHealth.hasDmarc
                          ? 'match'
                          : 'different'
                      }
                    />
                  </td>
                  <td className="py-3 px-4 align-top text-xs text-slate-700 dark:text-slate-300 space-y-1">
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
                  <td className="py-3 px-4 align-top text-xs text-slate-700 dark:text-slate-300 space-y-1">
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
                      className="py-8 px-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400"
                    >
                      All checked DNS record types match between{' '}
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
                    const rowBg =
                      row.diffKind === 'different'
                        ? 'bg-amber-50/40 dark:bg-amber-950/15'
                        : row.diffKind === 'only-a' || row.diffKind === 'only-b'
                          ? 'bg-sky-50/40 dark:bg-sky-950/15'
                          : '';

                    return (
                      <tr key={row.type} className={rowBg}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap align-top">
                          {row.type}
                        </td>
                        <td className="py-3 px-4 align-top">
                          <DiffStatusLabel kind={row.diffKind} />
                        </td>
                        <td className="py-3 px-4 align-top" dir="ltr">
                          {row.recordsA.length === 0 ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              No {row.type} record published
                            </span>
                          ) : (
                            <ul className="space-y-1.5 font-mono text-xs">
                              {row.recordsA.map((item, idx) => {
                                const isUnique = row.onlyAKeys.has(recordComparableKey(item));
                                return (
                                  <li
                                    key={`${idx}-${item.data}`}
                                    className={`rounded-md px-2 py-1 break-all flex items-start justify-between gap-2 ${
                                      isUnique
                                        ? 'bg-amber-100/75 dark:bg-amber-900/35 text-amber-950 dark:text-amber-100 font-medium'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <span>{formatRecordLine(item)}</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                                      {formatTtl(item.ttl)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top" dir="ltr">
                          {row.recordsB.length === 0 ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              No {row.type} record published
                            </span>
                          ) : (
                            <ul className="space-y-1.5 font-mono text-xs">
                              {row.recordsB.map((item, idx) => {
                                const isUnique = row.onlyBKeys.has(recordComparableKey(item));
                                return (
                                  <li
                                    key={`${idx}-${item.data}`}
                                    className={`rounded-md px-2 py-1 break-all flex items-start justify-between gap-2 ${
                                      isUnique
                                        ? 'bg-amber-100/75 dark:bg-amber-900/35 text-amber-950 dark:text-amber-100 font-medium'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <span>{formatRecordLine(item)}</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
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
        </>
      )}
    </section>
  );
}
