import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Globe,
  Mail,
  Search,
  Server,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { formatTtl } from '../lib/domain';
import { useI18n } from '../lib/i18n';
import {
  ALL_ZONE_RECORD_TYPES,
  type DnsLookupResponse,
  type DnsRecordType,
} from '../types/dns';

interface AllRecordsResultsProps {
  data: DnsLookupResponse | null;
  isLoading: boolean;
  error: string | null;
  onInspectPropagationType?: (type: DnsRecordType) => void;
}

export default function AllRecordsResults({
  data,
  isLoading,
  error,
  onInspectPropagationType,
}: AllRecordsResultsProps) {
  const { t } = useI18n();
  const [activeType, setActiveType] = useState<'ALL' | DnsRecordType>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const visibleRecords = useMemo(() => {
    if (!data) return [];
    const base =
      activeType === 'ALL' ? data.records : data.recordsByType[activeType] ?? [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.type.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.data.toLowerCase().includes(q)
    );
  }, [data, activeType, searchTerm]);

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

  const handleExportZone = () => {
    if (!data) return;
    const lines = [
      `; DNS Zone Snapshot for ${data.domain} (${data.queriedAt})`,
      `; Resolver: ${data.resolver}`,
      '',
      ...data.records.map((r) => {
        const host = r.name.endsWith('.') ? r.name : `${r.name}.`;
        const val =
          r.type === 'TXT'
            ? `"${r.data.replace(/"/g, '\\"')}"`
            : r.priority !== undefined
              ? `${r.priority} ${r.data}`
              : r.data;
        return `${host}\t${r.ttl}\tIN\t${r.type}\t${val}`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.domain}-zone.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[420px] flex flex-col gap-7">
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
              {t('allRecordsTitle')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('allRecordsDesc')}
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-8 text-center flex flex-col items-center justify-center flex-1">
            <Server className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t('readyZoneLookup')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              {t('readyZoneLookupDesc')}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center justify-between">
            <div className="h-5 w-60 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-36 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-12 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 px-4 flex items-center justify-between gap-4"
              >
                <div className="h-3.5 w-16 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-64 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Header Metadata & Exports */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-sm">
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                {data.domain}
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-300">{data.resolver}</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                {data.records.length} {t('recordsFound')}
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                {data.cached ? t('cachedLabel') : `${t('liveLabel')} ${data.queryTimeMs} ms`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportZone}
                className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>BIND Zone</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Email & DNSSEC Health Strip */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="flex items-start gap-2.5 sm:pr-4">
              <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">MX</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className={data.emailHealth.hasMx ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                    {data.emailHealth.hasMx ? `${data.emailHealth.mxCount} ${t('configured')}` : t('noneFound')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate font-mono" dir="ltr">
                  {data.recordsByType.MX?.[0]?.data ?? 'No inbound mail server'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-3 sm:pt-0 sm:px-4">
              {data.emailHealth.hasSpf ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">SPF</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className={data.emailHealth.hasSpf ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                    {data.emailHealth.hasSpf ? t('present') : t('missingLabel')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate font-mono" dir="ltr">
                  {data.emailHealth.spfRecord ?? 'No v=spf1 TXT record'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-3 lg:pt-0 sm:px-4">
              {data.emailHealth.hasDmarc ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">DMARC</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className={data.emailHealth.hasDmarc ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                    {data.emailHealth.hasDmarc
                      ? `p=${data.emailHealth.dmarcPolicy ?? 'configured'}`
                      : t('missingLabel')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate font-mono" dir="ltr">
                  {data.emailHealth.dmarcRecord ?? 'No _dmarc TXT record'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-3 lg:pt-0 sm:pl-4">
              <ShieldCheck
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  data.dnssecValidated
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">DNSSEC</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span
                    className={
                      data.dnssecValidated
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }
                  >
                    {data.dnssecValidated ? t('validatedAd') : t('unsigned')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {data.dnssecValidated
                    ? t('cryptoVerified')
                    : t('noAdSignature')}
                </p>
              </div>
            </div>
          </div>

          {/* Record Type Filter Tabs + Search Input */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveType('ALL')}
                className={`px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  activeType === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t('continentAll')} ({data.records.length})
              </button>
              {ALL_ZONE_RECORD_TYPES.map((type) => {
                const count = data.recordsByType[type]?.length ?? 0;
                const active = activeType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveType(type)}
                    className={`px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                        : count > 0
                          ? 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                          : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                    }`}
                  >
                    {type} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative flex-1 sm:w-64">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('filterRecordsPlaceholder')}
                  aria-label={t('filterRecordsPlaceholder')}
                  className="w-full h-10 pl-9 pr-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear record filter"
                    className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {activeType !== 'ALL' && onInspectPropagationType && (
                <button
                  type="button"
                  onClick={() => onInspectPropagationType(activeType)}
                  className="h-10 px-3.5 text-xs font-semibold rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{activeType} · {t('checkRegionsBtn')}</span>
                </button>
              )}
            </div>
          </div>

          {/* DNS Records Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3.5 px-5 whitespace-nowrap w-20">{t('colType')}</th>
                    <th className="py-3.5 px-5 whitespace-nowrap">{t('colName')}</th>
                    <th className="py-3.5 px-5 whitespace-nowrap text-right w-20">{t('colPriority')}</th>
                    <th className="py-3.5 px-5 whitespace-nowrap">{t('colValue')}</th>
                    <th className="py-3.5 px-5 whitespace-nowrap text-right w-24">{t('colTtl')}</th>
                    <th className="py-3.5 px-5 whitespace-nowrap text-right w-16">{t('colCopy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {visibleRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 px-5 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {searchTerm.trim()
                          ? `No records matching "${searchTerm.trim()}".`
                          : `No ${activeType === 'ALL' ? '' : `${activeType} `}records found for ${data.domain}.`}
                      </td>
                    </tr>
                  ) : (
                    visibleRecords.map((rec, idx) => {
                      const rowKey = `${rec.type}-${rec.name}-${idx}`;
                      return (
                        <tr
                          key={rowKey}
                          className="min-h-[48px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3.5 px-5 font-mono text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                            {rec.type}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {rec.name}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                            {rec.priority !== undefined ? rec.priority : '—'}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-xs text-slate-900 dark:text-slate-100 break-all max-w-[460px]">
                            {rec.data}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                            {formatTtl(rec.ttl)}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleCopy(rowKey, rec.data)}
                              aria-label={`Copy ${rec.type} value`}
                              className="w-8 h-8 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              {copiedKey === rowKey ? (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
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
