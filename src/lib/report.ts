import type {
  DnsLookupResponse,
  PropagationResponse,
  RegionalCheckpointResult,
} from '../types/dns';

export type ReportFormat = 'json' | 'csv';

function isRegionPropagated(
  region: RegionalCheckpointResult,
  expectedValue: string
): boolean {
  if (region.status !== 'resolved' || region.answers.length === 0) {
    return false;
  }
  const trimmed = expectedValue.trim().toLowerCase();
  if (trimmed) {
    return region.answers.some((a) => a.value.toLowerCase().includes(trimmed));
  }
  return true;
}

function getPropagationHealthLabel(
  region: RegionalCheckpointResult,
  expectedValue: string
): 'Propagated' | 'Variance / Mismatch' | 'Failed / Unresolved' {
  if (region.status !== 'resolved' || region.answers.length === 0) {
    return 'Failed / Unresolved';
  }
  const trimmed = expectedValue.trim().toLowerCase();
  if (trimmed) {
    const matchesExpected = region.answers.some((a) =>
      a.value.toLowerCase().includes(trimmed)
    );
    return matchesExpected ? 'Propagated' : 'Variance / Mismatch';
  }
  return region.matchesConsensus ? 'Propagated' : 'Variance / Mismatch';
}

function computePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(percentile * sortedValues.length) - 1)
  );
  return Math.round(sortedValues[idx]);
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]+/g, '-').replace(/^-+|-+$/g, '') || 'domain';
}

export function buildPropagationReportFilename(
  domain: string,
  recordType: string,
  format: ReportFormat
): string {
  const safeDomain = sanitizeFilenamePart(domain);
  const safeType = sanitizeFilenamePart(recordType);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `dnslocator-${safeDomain}-${safeType}-${dateStamp}-report.${format}`;
}

export function buildStructuredPropagationJson(
  propagation: PropagationResponse,
  expectedValue: string,
  zoneData?: DnsLookupResponse | null
): string {
  const trimmedExpected = expectedValue.trim();
  const latencies = propagation.regions
    .map((r) => r.latencyMs)
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);

  const avgMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length)
      : 0;
  const minMs = latencies.length > 0 ? Math.round(latencies[0]) : 0;
  const maxMs = latencies.length > 0 ? Math.round(latencies[latencies.length - 1]) : 0;
  const p95Ms = computePercentile(latencies, 0.95);

  const classified = propagation.regions.map((region) => ({
    region,
    propagated: isRegionPropagated(region, expectedValue),
    healthLabel: getPropagationHealthLabel(region, expectedValue),
  }));

  const propagatedCount = classified.filter((c) => c.healthLabel === 'Propagated').length;
  const varianceCount = classified.filter((c) => c.healthLabel === 'Variance / Mismatch').length;
  const failedCount = classified.filter((c) => c.healthLabel === 'Failed / Unresolved').length;
  const totalRegions = propagation.regions.length;
  const healthPercent = totalRegions > 0 ? Math.round((propagatedCount / totalRegions) * 100) : 0;

  const matchingZone =
    zoneData && zoneData.domain === propagation.domain
      ? {
          dnssecValidated: Boolean(zoneData.dnssecValidated),
          totalRecords: zoneData.records.length,
          emailHealth: {
            hasMx: zoneData.emailHealth.hasMx,
            mxCount: zoneData.emailHealth.mxCount,
            hasSpf: zoneData.emailHealth.hasSpf,
            spfValid: zoneData.emailHealth.spfValid,
            hasDmarc: zoneData.emailHealth.hasDmarc,
            dmarcPolicy: zoneData.emailHealth.dmarcPolicy ?? null,
          },
        }
      : null;

  const payload = {
    reportVersion: '1.0',
    generator: 'DNS Locator',
    generatedAt: new Date().toISOString(),
    query: {
      domain: propagation.domain,
      recordType: propagation.recordType,
      expectedValueFilter: trimmedExpected || null,
      queriedAt: propagation.queriedAt,
      cached: propagation.cached,
      queryTimeMs: propagation.queryTimeMs,
    },
    summary: {
      totalRegions,
      propagatedCount,
      consensusMatchCount: propagation.regions.filter((r) => r.matchesConsensus).length,
      varianceCount,
      failedCount,
      healthPercent,
      hasGeoVariance: propagation.hasGeoVariance,
      consensusValues: propagation.consensusValues,
      latencyMs: {
        avg: avgMs,
        min: minMs,
        max: maxMs,
        p95: p95Ms,
      },
    },
    zoneSummary: matchingZone,
    regions: classified.map(({ region, propagated, healthLabel }) => ({
      id: region.id,
      city: region.city,
      country: region.country,
      countryCode: region.countryCode,
      continent: region.continent,
      coordinates: { lat: region.lat, lng: region.lng },
      provider: region.provider,
      transport: region.transport,
      status: region.status,
      statusLabel: region.statusLabel,
      propagationStatus: propagated ? 'Propagated' : 'Non-Propagated',
      healthCategory: healthLabel,
      matchesConsensus: region.matchesConsensus,
      matchesExpectedFilter: trimmedExpected ? propagated : null,
      latencyMs: region.latencyMs,
      primaryValue: region.primaryValue,
      answers: region.answers,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildStructuredPropagationCsv(
  propagation: PropagationResponse,
  expectedValue: string
): string {
  const trimmedExpected = expectedValue.trim();
  const headers = [
    'Domain',
    'RecordType',
    'QueriedAt',
    'City',
    'Country',
    'CountryCode',
    'Continent',
    'ResolverProvider',
    'Transport',
    'ResolverStatus',
    'PropagationStatus',
    'HealthCategory',
    'MatchesConsensus',
    'MatchesExpectedFilter',
    'ResolvedValues',
    'TTLSeconds',
    'LatencyMs',
  ];

  const rows = propagation.regions.map((region) => {
    const propagated = isRegionPropagated(region, expectedValue);
    const healthCategory = getPropagationHealthLabel(region, expectedValue);
    const resolvedValues = region.answers
      .map((a) => (a.priority !== undefined ? `${a.priority} ${a.value}` : a.value))
      .join('; ');
    const ttl = region.answers[0]?.ttl ?? '';

    return [
      propagation.domain,
      propagation.recordType,
      propagation.queriedAt,
      region.city,
      region.country,
      region.countryCode,
      region.continent,
      region.provider,
      region.transport,
      region.status,
      propagated ? 'Propagated' : 'Non-Propagated',
      healthCategory,
      region.matchesConsensus ? 'Yes' : 'No',
      trimmedExpected ? (propagated ? 'Yes' : 'No') : 'N/A',
      resolvedValues,
      ttl,
      region.latencyMs,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');

  return `\uFEFF${csvContent}`;
}

export function triggerReportDownload(
  propagation: PropagationResponse,
  expectedValue: string,
  format: ReportFormat,
  zoneData?: DnsLookupResponse | null
): void {
  const content =
    format === 'json'
      ? buildStructuredPropagationJson(propagation, expectedValue, zoneData)
      : buildStructuredPropagationCsv(propagation, expectedValue);

  const mimeType =
    format === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/csv;charset=utf-8';

  const filename = buildPropagationReportFilename(
    propagation.domain,
    propagation.recordType,
    format
  );

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
