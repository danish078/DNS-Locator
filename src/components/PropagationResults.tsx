import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Globe,
  XCircle,
} from 'lucide-react';
import { formatTtl } from '../lib/domain';
import type {
  ContinentKey,
  PropagationResponse,
  RegionalCheckpointResult,
} from '../types/dns';
import WorldPropagationMap from './WorldPropagationMap';

interface PropagationResultsProps {
  data: PropagationResponse | null;
  isLoading: boolean;
  error: string | null;
  expectedValue: string;
  onExpectedValueChange: (val: string) => void;
}

const CONTINENTS: ContinentKey[] = [
  'All',
  'North America',
  'Europe',
  'Asia-Pacific',
  'South America',
  'Oceania',
  'Middle East & Africa',
];

function StatusBadge({
  region,
  expectedValue,
}: {
  region: RegionalCheckpointResult;
  expectedValue: string;
}) {
  if (region.status === 'resolved') {
    const trimmed = expectedValue.trim().toLowerCase();
    const matches = trimmed
      ? region.answers.some((a) => a.value.toLowerCase().includes(trimmed))
      : region.matchesConsensus;

    if (matches) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{trimmed ? 'Expected Match' : 'Propagated'}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{trimmed ? 'Mismatch' : 'Geo Variance'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{region.statusLabel}</span>
    </span>
  );
}

export default function PropagationResults({
  data,
  isLoading,
  error,
  expectedValue,
  onExpectedValueChange,
}: PropagationResultsProps) {
  const [continent, setContinent] = useState<ContinentKey>('All');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRegions = useMemo(() => {
    if (!data) return [];
    if (continent === 'All') return data.regions;
    return data.regions.filter((r) => r.continent === continent);
  }, [data, continent]);

  const expectedMatchedCount = useMemo(() => {
    if (!data) return 0;
    const trimmed = expectedValue.trim().toLowerCase();
    if (!trimmed) {
      return data.regions.filter((r) => r.status === 'resolved' && r.matchesConsensus).length;
    }
    return data.regions.filter(
      (r) =>
        r.status === 'resolved' &&
        r.answers.some((a) => a.value.toLowerCase().includes(trimmed))
    ).length;
  }, [data, expectedValue]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.domain}-${data.recordType}-propagation.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!data) return;
    const header = ['City', 'Country', 'Continent', 'Provider', 'Status', 'Values', 'TTL', 'LatencyMs'];
    const rows = data.regions.map((r) => [
      r.city,
      r.country,
      r.continent,
      r.provider,
      r.statusLabel,
      r.answers.map((a) => (a.priority !== undefined ? `${a.priority} ${a.value}` : a.value)).join('; '),
      r.answers[0]?.ttl ?? '',
      String(r.latencyMs),
    ]);
    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.domain}-${data.recordType}-propagation.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[620px] flex flex-col gap-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2.5"
        >
          <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!data && !isLoading && !error && (
        <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Global DNS Propagation Map &amp; Regional Resolvers
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter a domain above to inspect every DNS record type and verify how 18 worldwide checkpoints resolve your domain in real time.
            </p>
          </div>

          <WorldPropagationMap
            regions={[]}
            selectedRegionId={null}
            onSelectRegion={() => {}}
            isLoading={false}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">18 Worldwide Checkpoints</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Queries Cloudflare 1.1.1.1, AdGuard, Control D, AliDNS, IIJ Tokyo, TWNIC, DNS.SB, and regional Google ECS nodes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Expected Value Matching</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compare every region against the consensus IP or paste your target IP to track rollout completion.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Download className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Offline-Ready Cache &amp; Export</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  5-minute client and server TTL caching prevents redundant lookups, with one-click JSON, CSV, and BIND exports.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
            <div className="h-5 w-64 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
          <WorldPropagationMap
            regions={[]}
            selectedRegionId={null}
            onSelectRegion={() => {}}
            isLoading={true}
          />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="h-10 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 flex items-center justify-between">
              <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 px-4 flex items-center justify-between gap-4"
              >
                <div className="h-3.5 w-36 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse hidden sm:block" />
                <div className="h-3.5 w-44 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Summary Bar + Expected Value Filter */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {data.domain}
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="font-medium text-sky-700 dark:text-sky-400">
                {data.recordType} Propagation
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                {expectedMatchedCount}/{data.totalRegions}{' '}
                {expectedValue.trim() ? 'matched expected' : 'consensus'}
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                {data.cached ? 'Cached (5m)' : `Live ${data.queryTimeMs} ms`}
              </span>
              {data.hasGeoVariance && (
                <>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    GeoDNS / CDN regional variance
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="expected-value-input" className="sr-only">
                Expected DNS record value
              </label>
              <input
                id="expected-value-input"
                type="text"
                value={expectedValue}
                onChange={(e) => onExpectedValueChange(e.target.value)}
                placeholder="Match expected value (optional)"
                className="h-8 px-2.5 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 w-56"
              />
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Interactive World Map */}
          <WorldPropagationMap
            regions={data.regions}
            expectedValue={expectedValue}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            isLoading={false}
          />

          {/* Continent Segmented Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 overflow-x-auto">
            {CONTINENTS.map((item) => {
              const count =
                item === 'All'
                  ? data.regions.length
                  : data.regions.filter((r) => r.continent === item).length;
              if (item !== 'All' && count === 0) return null;
              const active = continent === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setContinent(item)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item} ({count})
                </button>
              );
            })}
          </div>

          {/* Regional Breakdown Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-4 whitespace-nowrap">Location</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Resolver</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Resolved Value(s)</th>
                    <th className="py-2.5 px-4 whitespace-nowrap text-right">TTL</th>
                    <th className="py-2.5 px-4 whitespace-nowrap text-right">Latency</th>
                    <th className="py-2.5 px-4 whitespace-nowrap text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {filteredRegions.map((region) => {
                    const isSelected = selectedRegionId === region.id;
                    const valueText =
                      region.answers.length > 0
                        ? region.answers
                            .map((a) =>
                              a.priority !== undefined ? `${a.priority} ${a.value}` : a.value
                            )
                            .join('\n')
                        : '—';
                    return (
                      <tr
                        key={region.id}
                        onClick={() =>
                          setSelectedRegionId(isSelected ? null : region.id)
                        }
                        className={`min-h-[42px] cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-50/70 dark:bg-sky-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {region.city}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {region.countryCode} · {region.continent}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 text-xs font-medium">
                            {region.provider}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {region.transport}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 max-w-[340px]">
                          {region.answers.length > 0 ? (
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-mono text-xs text-slate-900 dark:text-slate-100 space-y-0.5 break-all">
                                {region.answers.slice(0, 3).map((ans, idx) => (
                                  <div key={idx}>
                                    {ans.priority !== undefined && (
                                      <span className="text-slate-500 dark:text-slate-400 mr-1.5 tabular-nums">
                                        [{ans.priority}]
                                      </span>
                                    )}
                                    <span>{ans.value}</span>
                                  </div>
                                ))}
                                {region.answers.length > 3 && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    +{region.answers.length - 3} more records
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(region.id, valueText);
                                }}
                                aria-label={`Copy resolved value for ${region.city}`}
                                className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                              >
                                {copiedId === region.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {region.answers[0] ? formatTtl(region.answers[0].ttl) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {region.latencyMs} ms
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <StatusBadge region={region} expectedValue={expectedValue} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
