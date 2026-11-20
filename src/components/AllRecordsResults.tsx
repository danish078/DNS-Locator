import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  Server,
  XCircle,
} from 'lucide-react';
import { formatTtl } from '../lib/domain';
import {
  ALL_ZONE_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordType,
} from '../types/dns';

interface AllRecordsResultsProps {
  data: DnsLookupResponse | null;
  isLoading: boolean;
  error: string | null;
  onQuickDomain: (domain: string) => void;
}

export default function AllRecordsResults({
  data,
  isLoading,
  error,
  onQuickDomain,
}: AllRecordsResultsProps) {
  const [activeType, setActiveType] = useState<'ALL' | DnsRecordType>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const visibleRecords = useMemo(() => {
    if (!data) return [];
    if (activeType === 'ALL') return data.records;
    return data.recordsByType[activeType] ?? [];
  }, [data, activeType]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.domain}-dns-records.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!data) return;
    const header = ['Type', 'Name', 'Priority', 'Value', 'TTL'];
    const rows = data.records.map((r) => [
      r.type,
      r.name,
      r.priority !== undefined ? String(r.priority) : '',
      r.data,
      String(r.ttl),
    ]);
    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.domain}-dns-records.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[680px] flex flex-col gap-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center gap-2.5"
        >
          <XCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!data && !isLoading && !error && (
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Parallel All-Record Zone Inspector (Cloudflare 1.1.1.1 DoH)
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Simultaneously queries A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, and DMARC records via Cloudflare&apos;s DNS over HTTPS JSON API.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Try:</span>
              {['cloudflare.com', 'google.com', 'stripe.com'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => onQuickDomain(sample)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-colors font-mono"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center flex flex-col items-center justify-center flex-1">
            <Server className="w-8 h-8 text-slate-400 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-900">
              Ready for parallel zone lookup
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Paste any URL or hostname above. Results include record values, TTL durations, MX priorities, and automatic SPF/DMARC email verification.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center justify-between">
            <div className="h-5 w-60 rounded bg-slate-100 animate-pulse" />
            <div className="h-5 w-36 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-12 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 border-b border-slate-100 last:border-b-0 px-4 flex items-center justify-between gap-4"
              >
                <div className="h-3.5 w-16 rounded bg-slate-100 animate-pulse" />
                <div className="h-3.5 w-40 rounded bg-slate-100 animate-pulse" />
                <div className="h-3.5 w-64 rounded bg-slate-100 animate-pulse" />
                <div className="h-3.5 w-14 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Header Metadata & Export */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-slate-900 font-mono">{data.domain}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-600">{data.resolver}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-600 tabular-nums">
                {data.records.length} records
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-500 tabular-nums">
                {data.cached ? 'Cached (5m)' : `Live ${data.queryTimeMs} ms`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Email Deliverability Health Strip */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="flex items-start gap-2.5 md:pr-4">
              <Mail className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500">MX Mail Exchangers</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className={data.emailHealth.hasMx ? 'text-emerald-700' : 'text-amber-700'}>
                    {data.emailHealth.hasMx ? `${data.emailHealth.mxCount} Configured` : 'None Found'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 truncate font-mono">
                  {data.recordsByType.MX?.[0]?.data ?? 'No inbound mail server'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-3 md:pt-0 md:px-4">
              {data.emailHealth.hasSpf ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500">SPF Policy</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className={data.emailHealth.hasSpf ? 'text-emerald-700' : 'text-amber-700'}>
                    {data.emailHealth.hasSpf ? 'Present' : 'Missing'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 truncate font-mono">
                  {data.emailHealth.spfRecord ?? 'No v=spf1 TXT record'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-3 md:pt-0 md:pl-4">
              {data.emailHealth.hasDmarc ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500">DMARC (_dmarc)</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className={data.emailHealth.hasDmarc ? 'text-emerald-700' : 'text-amber-700'}>
                    {data.emailHealth.hasDmarc
                      ? `p=${data.emailHealth.dmarcPolicy ?? 'configured'}`
                      : 'Missing'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 truncate font-mono">
                  {data.emailHealth.dmarcRecord ?? 'No _dmarc TXT record'}
                </p>
              </div>
            </div>
          </div>

          {/* Record Type Segmented Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveType('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                activeType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({data.records.length})
            </button>
            {ALL_ZONE_RECORD_TYPES.map((type) => {
              const count = data.recordsByType[type]?.length ?? 0;
              const active = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : count > 0
                        ? 'text-slate-700 hover:text-slate-900'
                        : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>

          {/* DNS Records Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4 whitespace-nowrap w-20">Type</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Name</th>
                    <th className="py-2.5 px-4 whitespace-nowrap text-right w-20">Priority</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Value</th>
                    <th className="py-2.5 px-4 whitespace-nowrap text-right w-24">TTL</th>
                    <th className="py-2.5 px-4 whitespace-nowrap text-right w-16">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {visibleRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center text-sm text-slate-500">
                        No {activeType === 'ALL' ? '' : `${activeType} `}records found for {data.domain}.
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((rec, idx) => {
                      const rowKey = `${rec.type}-${rec.name}-${idx}`;
                      return (
                        <tr key={rowKey} className="min-h-[42px] hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-xs font-semibold text-sky-700 whitespace-nowrap">
                            {rec.type}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                            {rec.name}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                            {rec.priority !== undefined ? rec.priority : '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-900 break-all max-w-[460px]">
                            {rec.data}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                            {formatTtl(rec.ttl)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopy(rowKey, rec.data)}
                              aria-label={`Copy ${rec.type} value`}
                              className="p-1.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              {copiedKey === rowKey ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
