export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SOA'
  | 'CAA'
  | 'PTR';

export const ALL_ZONE_RECORD_TYPES: DnsRecordType[] = [
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'SOA',
  'CAA',
];

export const PROPAGATION_RECORD_TYPES: DnsRecordType[] = [
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'PTR',
  'SOA',
  'CAA',
];

export type ContinentKey =
  | 'All'
  | 'North America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'South America'
  | 'Oceania'
  | 'Middle East & Africa';

export interface DnsRecordItem {
  type: DnsRecordType;
  name: string;
  ttl: number;
  data: string;
  priority?: number;
}

export interface EmailHealthSummary {
  hasMx: boolean;
  mxCount: number;
  hasSpf: boolean;
  spfRecord?: string;
  spfValid: boolean;
  hasDmarc: boolean;
  dmarcRecord?: string;
  dmarcPolicy?: string;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface DnsLookupResponse {
  domain: string;
  apexDomain: string;
  queriedAt: string;
  cached: boolean;
  cacheExpiresAt: string;
  queryTimeMs: number;
  resolver: string;
  records: DnsRecordItem[];
  recordsByType: Record<string, DnsRecordItem[]>;
  statusByType: Record<string, number>;
  dnssecValidated?: boolean;
  emailHealth: EmailHealthSummary;
  rateLimit?: RateLimitMeta;
}

export type RegionalStatus = 'resolved' | 'nxdomain' | 'nodata' | 'error' | 'timeout';

export interface RegionalAnswerItem {
  value: string;
  ttl: number;
  priority?: number;
}

export interface RegionalCheckpointResult {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  continent: Exclude<ContinentKey, 'All'>;
  lat: number;
  lng: number;
  provider: string;
  transport: string;
  status: RegionalStatus;
  statusLabel: string;
  answers: RegionalAnswerItem[];
  primaryValue: string | null;
  matchesConsensus: boolean;
  latencyMs: number;
}

export interface PropagationResponse {
  domain: string;
  recordType: DnsRecordType;
  queriedAt: string;
  cached: boolean;
  cacheExpiresAt: string;
  queryTimeMs: number;
  consensusValues: string[];
  resolvedCount: number;
  totalRegions: number;
  hasGeoVariance: boolean;
  regions: RegionalCheckpointResult[];
  rateLimit?: RateLimitMeta;
}
