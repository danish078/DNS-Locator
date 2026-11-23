import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { generateAiGameDebrief, generateAiGameMission } from './server/gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SOA'
  | 'CAA'
  | 'PTR';

type Continent =
  | 'North America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'South America'
  | 'Oceania'
  | 'Middle East & Africa';

interface DnsRecordItem {
  type: DnsRecordType;
  name: string;
  ttl: number;
  data: string;
  priority?: number;
}

interface RegionalAnswerItem {
  value: string;
  ttl: number;
  priority?: number;
}

interface RegionalCheckpointDef {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  continent: Continent;
  lat: number;
  lng: number;
  provider: string;
  mode: 'cloudflare-json' | 'google-ecs-json' | 'doh-json' | 'doh-wire';
  endpoint: string;
  ecsSubnet?: string;
}

const ALL_ZONE_TYPES: DnsRecordType[] = [
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'SOA',
  'CAA',
];

const VALID_PROPAGATION_TYPES = new Set<DnsRecordType>([
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'PTR',
  'SOA',
  'CAA',
]);

const DNS_TYPE_CODES: Record<DnsRecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  PTR: 12,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  CAA: 257,
};

const GLOBAL_CHECKPOINTS: RegionalCheckpointDef[] = [
  // North America
  {
    id: 'us-sjc-cf',
    city: 'San Jose, CA',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    lat: 37.3382,
    lng: -121.8863,
    provider: 'Public 1.1.1.1 Anycast',
    mode: 'cloudflare-json',
    endpoint: 'https://cloudflare-dns.com/dns-query',
  },
  {
    id: 'us-iad-google',
    city: 'Ashburn, VA',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    lat: 39.0438,
    lng: -77.4874,
    provider: 'Google Public DNS (US-East)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '54.144.0.0/24',
  },
  {
    id: 'us-lax-google',
    city: 'Los Angeles, CA',
    country: 'United States',
    countryCode: 'US',
    continent: 'North America',
    lat: 34.0522,
    lng: -118.2437,
    provider: 'Google Public DNS (US-West)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '13.52.0.0/24',
  },
  {
    id: 'ca-yyz-google',
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    continent: 'North America',
    lat: 43.6532,
    lng: -79.3832,
    provider: 'Google Public DNS (Canada)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '99.79.0.0/24',
  },
  // South America
  {
    id: 'br-gru-google',
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    continent: 'South America',
    lat: -23.5505,
    lng: -46.6333,
    provider: 'Google Public DNS (SA-East)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '177.71.128.0/24',
  },
  {
    id: 'cl-scl-google',
    city: 'Santiago',
    country: 'Chile',
    countryCode: 'CL',
    continent: 'South America',
    lat: -33.4489,
    lng: -70.6693,
    provider: 'Google Public DNS (Chile)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '200.27.0.0/24',
  },
  // Europe
  {
    id: 'gb-lhr-google',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    continent: 'Europe',
    lat: 51.5074,
    lng: -0.1278,
    provider: 'Google Public DNS (UK)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '51.140.0.0/24',
  },
  {
    id: 'eu-nic-adguard',
    city: 'Nicosia',
    country: 'Cyprus (EU)',
    countryCode: 'CY',
    continent: 'Europe',
    lat: 35.1856,
    lng: 33.3823,
    provider: 'AdGuard Public DNS',
    mode: 'doh-wire',
    endpoint: 'https://dns.adguard-dns.com/dns-query',
  },
  {
    id: 'ch-zrh-google',
    city: 'Zurich',
    country: 'Switzerland',
    countryCode: 'CH',
    continent: 'Europe',
    lat: 47.3769,
    lng: 8.5417,
    provider: 'Google Public DNS (CH)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '51.154.0.0/24',
  },
  {
    id: 'de-fra-dnssb',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    continent: 'Europe',
    lat: 50.1109,
    lng: 8.6821,
    provider: 'DNS.SB Anycast (EU)',
    mode: 'doh-json',
    endpoint: 'https://doh.dns.sb/dns-query',
  },
  {
    id: 'nl-ams-controld',
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    continent: 'Europe',
    lat: 52.3676,
    lng: 4.9041,
    provider: 'Control D Public DNS',
    mode: 'doh-wire',
    endpoint: 'https://freedns.controld.com/p0',
  },
  // Asia-Pacific
  {
    id: 'jp-tyo-iij',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    continent: 'Asia-Pacific',
    lat: 35.6762,
    lng: 139.6503,
    provider: 'IIJ Public DNS (JP)',
    mode: 'doh-wire',
    endpoint: 'https://public.dns.iij.jp/dns-query',
  },
  {
    id: 'tw-tpe-twnic',
    city: 'Taipei',
    country: 'Taiwan',
    countryCode: 'TW',
    continent: 'Asia-Pacific',
    lat: 25.033,
    lng: 121.5654,
    provider: 'TWNIC Quad101 (TW)',
    mode: 'doh-wire',
    endpoint: 'https://dns.twnic.tw/dns-query',
  },
  {
    id: 'cn-hgh-alidns',
    city: 'Hangzhou',
    country: 'China',
    countryCode: 'CN',
    continent: 'Asia-Pacific',
    lat: 30.2741,
    lng: 120.1551,
    provider: 'AliDNS 223.5.5.5 (CN)',
    mode: 'doh-json',
    endpoint: 'https://dns.alidns.com/resolve',
  },
  {
    id: 'sg-sin-google',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    continent: 'Asia-Pacific',
    lat: 1.3521,
    lng: 103.8198,
    provider: 'Google Public DNS (SG)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '52.74.0.0/24',
  },
  {
    id: 'in-bom-google',
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    continent: 'Asia-Pacific',
    lat: 19.076,
    lng: 72.8777,
    provider: 'Google Public DNS (IN)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '13.126.0.0/24',
  },
  // Oceania
  {
    id: 'au-syd-google',
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    continent: 'Oceania',
    lat: -33.8688,
    lng: 151.2093,
    provider: 'Google Public DNS (AU)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '13.54.0.0/24',
  },
  // Middle East & Africa
  {
    id: 'za-jnb-google',
    city: 'Johannesburg',
    country: 'South Africa',
    countryCode: 'ZA',
    continent: 'Middle East & Africa',
    lat: -26.2041,
    lng: 28.0473,
    provider: 'Google Public DNS (ZA)',
    mode: 'google-ecs-json',
    endpoint: 'https://dns.google/resolve',
    ecsSubnet: '13.244.0.0/24',
  },
];

// --- Input Sanitization ---

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

function sanitizeServerDomain(raw: string, recordType?: DnsRecordType): string | null {
  let candidate = raw.trim().toLowerCase();
  if (!candidate) return null;

  candidate = candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  candidate = candidate.replace(/^mailto:/i, '');
  const atIdx = candidate.lastIndexOf('@');
  if (atIdx !== -1 && (candidate.indexOf('/') === -1 || atIdx < candidate.indexOf('/'))) {
    candidate = candidate.slice(atIdx + 1);
  }
  candidate = (candidate.split(/[/?#]/)[0] ?? '').replace(/:\d+$/, '').replace(/\.+$/, '');

  if (IPV4_REGEX.test(candidate)) {
    if (recordType === 'PTR') {
      return `${candidate.split('.').reverse().join('.')}.in-addr.arpa`;
    }
    return null;
  }

  if (!HOSTNAME_REGEX.test(candidate)) {
    return null;
  }
  return candidate;
}

// --- Value Normalization ---

function cleanTxtValue(raw: string): string {
  const trimmed = raw.trim();
  // Join adjacent quoted segments like `"v=spf1 " "include:..."`
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const segments = trimmed.match(/"((?:[^"\\]|\\.)*)"/g);
    if (segments && segments.length > 0) {
      return segments
        .map((seg) => seg.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
        .join('');
    }
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripTrailingDot(val: string): string {
  return val.endsWith('.') ? val.slice(0, -1) : val;
}

function parseRecordAnswer(
  type: DnsRecordType,
  rawData: string,
  ttl: number
): RegionalAnswerItem {
  if (type === 'MX') {
    const match = rawData.trim().match(/^(\d+)\s+(.+)$/);
    if (match) {
      return {
        priority: Number(match[1]),
        value: stripTrailingDot(match[2].trim()),
        ttl,
      };
    }
  }
  if (type === 'TXT') {
    return { value: cleanTxtValue(rawData), ttl };
  }
  if (type === 'CNAME' || type === 'NS' || type === 'PTR') {
    return { value: stripTrailingDot(rawData.trim()), ttl };
  }
  return { value: rawData.trim(), ttl };
}

// --- RFC 1035 / RFC 8484 DNS Wireformat Encoder & Decoder ---

function encodeDnsWireQuery(domain: string, qtypeCode: number): Uint8Array {
  const labels = domain.split('.').filter(Boolean);
  const qnameBytes: number[] = [];
  for (const label of labels) {
    const buf = Buffer.from(label, 'ascii');
    qnameBytes.push(buf.length, ...buf);
  }
  qnameBytes.push(0); // root label

  // 12-byte header + QNAME + QTYPE (2) + QCLASS (2) + OPT (11 bytes EDNS0)
  const packet = Buffer.alloc(12 + qnameBytes.length + 4 + 11);
  // ID = 0 per RFC 8484 recommendation for caching
  packet.writeUInt16BE(0, 0);
  // Flags: RD = 1 (0x0100)
  packet.writeUInt16BE(0x0100, 2);
  // QDCOUNT = 1, ANCOUNT = 0, NSCOUNT = 0, ARCOUNT = 1 (EDNS0 OPT)
  packet.writeUInt16BE(1, 4);
  packet.writeUInt16BE(0, 6);
  packet.writeUInt16BE(0, 8);
  packet.writeUInt16BE(1, 10);

  let offset = 12;
  for (const b of qnameBytes) {
    packet[offset++] = b;
  }
  packet.writeUInt16BE(qtypeCode, offset);
  offset += 2;
  packet.writeUInt16BE(1, offset); // IN class
  offset += 2;

  // EDNS0 OPT pseudo-record (root 0, type 41, UDP payload 4096, ext RCODE/flags 0, rdlen 0)
  packet[offset++] = 0;
  packet.writeUInt16BE(41, offset);
  offset += 2;
  packet.writeUInt16BE(4096, offset);
  offset += 2;
  packet.writeUInt32BE(0, offset);
  offset += 4;
  packet.writeUInt16BE(0, offset);

  return new Uint8Array(packet);
}

function readDnsName(buf: Buffer, startOffset: number): { name: string; nextOffset: number } {
  const labels: string[] = [];
  let offset = startOffset;
  let jumped = false;
  let endOffset = startOffset;
  let guard = 0;

  while (offset < buf.length && guard++ < 128) {
    const len = buf[offset];
    if (len === 0) {
      if (!jumped) endOffset = offset + 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      const pointer = ((len & 0x3f) << 8) | buf[offset + 1];
      if (!jumped) endOffset = offset + 2;
      offset = pointer;
      jumped = true;
      continue;
    }
    offset += 1;
    labels.push(buf.toString('utf8', offset, offset + len));
    offset += len;
  }

  return {
    name: labels.join('.'),
    nextOffset: endOffset,
  };
}

function formatIpv6(bytes: Buffer): string {
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(bytes.readUInt16BE(i).toString(16));
  }
  // Compress longest run of zero groups
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < 8; i++) {
    if (groups[i] === '0') {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }
  if (bestLen > 1) {
    const before = groups.slice(0, bestStart).join(':');
    const after = groups.slice(bestStart + bestLen).join(':');
    return `${before}::${after}`;
  }
  return groups.join(':');
}

function decodeDnsWireResponse(
  buf: Buffer,
  expectedType: DnsRecordType
): { rcode: number; answers: RegionalAnswerItem[] } {
  if (buf.length < 12) {
    throw new Error('Malformed DNS wire response');
  }
  const flags = buf.readUInt16BE(2);
  const rcode = flags & 0x0f;
  const qdCount = buf.readUInt16BE(4);
  const anCount = buf.readUInt16BE(6);

  let offset = 12;
  for (let i = 0; i < qdCount; i++) {
    const q = readDnsName(buf, offset);
    offset = q.nextOffset + 4;
  }

  const expectedCode = DNS_TYPE_CODES[expectedType];
  const answers: RegionalAnswerItem[] = [];

  for (let i = 0; i < anCount && offset + 10 <= buf.length; i++) {
    const rrName = readDnsName(buf, offset);
    offset = rrName.nextOffset;
    if (offset + 10 > buf.length) break;

    const rrType = buf.readUInt16BE(offset);
    // class at +2
    const ttl = buf.readUInt32BE(offset + 4);
    const rdLength = buf.readUInt16BE(offset + 8);
    offset += 10;
    if (offset + rdLength > buf.length) break;

    const rdataStart = offset;
    const rdataEnd = offset + rdLength;

    if (rrType === expectedCode) {
      if (rrType === 1 && rdLength === 4) {
        answers.push({
          value: `${buf[rdataStart]}.${buf[rdataStart + 1]}.${buf[rdataStart + 2]}.${buf[rdataStart + 3]}`,
          ttl,
        });
      } else if (rrType === 28 && rdLength === 16) {
        answers.push({
          value: formatIpv6(buf.subarray(rdataStart, rdataEnd)),
          ttl,
        });
      } else if (rrType === 2 || rrType === 5 || rrType === 12) {
        const parsed = readDnsName(buf, rdataStart);
        answers.push({ value: stripTrailingDot(parsed.name), ttl });
      } else if (rrType === 15 && rdLength >= 3) {
        const priority = buf.readUInt16BE(rdataStart);
        const exchange = readDnsName(buf, rdataStart + 2);
        answers.push({
          priority,
          value: stripTrailingDot(exchange.name),
          ttl,
        });
      } else if (rrType === 16) {
        let p = rdataStart;
        let text = '';
        while (p < rdataEnd) {
          const segLen = buf[p++];
          if (p + segLen > rdataEnd) break;
          text += buf.toString('utf8', p, p + segLen);
          p += segLen;
        }
        answers.push({ value: text, ttl });
      } else if (rrType === 6) {
        const mname = readDnsName(buf, rdataStart);
        const rname = readDnsName(buf, mname.nextOffset);
        if (rname.nextOffset + 20 <= rdataEnd) {
          const serial = buf.readUInt32BE(rname.nextOffset);
          const refresh = buf.readUInt32BE(rname.nextOffset + 4);
          const retry = buf.readUInt32BE(rname.nextOffset + 8);
          const expire = buf.readUInt32BE(rname.nextOffset + 12);
          const minimum = buf.readUInt32BE(rname.nextOffset + 16);
          answers.push({
            value: `${stripTrailingDot(mname.name)} ${stripTrailingDot(rname.name)} ${serial} ${refresh} ${retry} ${expire} ${minimum}`,
            ttl,
          });
        }
      } else if (rrType === 257 && rdLength >= 2) {
        const flagsCaa = buf[rdataStart];
        const tagLen = buf[rdataStart + 1];
        const tag = buf.toString('ascii', rdataStart + 2, rdataStart + 2 + tagLen);
        const val = buf.toString('utf8', rdataStart + 2 + tagLen, rdataEnd);
        answers.push({ value: `${flagsCaa} ${tag} "${val}"`, ttl });
      }
    }

    offset = rdataEnd;
  }

  return { rcode, answers };
}

// --- DoH Query Helpers ---

interface DohJsonResponse {
  Status: number;
  AD?: boolean;
  Answer?: { name: string; type: number; TTL: number; data: string }[];
  Comment?: string;
}

async function fetchCloudflareDohJson(
  domain: string,
  type: DnsRecordType,
  timeoutMs = 4500
): Promise<{ status: number; ad: boolean; records: DnsRecordItem[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Cloudflare DoH HTTP ${res.status}`);
    }
    const json = (await res.json()) as DohJsonResponse;
    const expectedCode = DNS_TYPE_CODES[type];
    const records: DnsRecordItem[] = (json.Answer ?? [])
      .filter((ans) => ans.type === expectedCode)
      .map((ans) => {
        const parsed = parseRecordAnswer(type, ans.data, ans.TTL);
        return {
          type,
          name: stripTrailingDot(ans.name),
          ttl: parsed.ttl,
          data: parsed.value,
          ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
        };
      });

    if (type === 'MX') {
      records.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }

    return { status: json.Status ?? 0, ad: Boolean(json.AD), records };
  } finally {
    clearTimeout(timer);
  }
}

async function queryCheckpoint(
  cp: RegionalCheckpointDef,
  domain: string,
  type: DnsRecordType
) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);

  try {
    let rcode = 0;
    let answers: RegionalAnswerItem[] = [];

    if (cp.mode === 'doh-wire') {
      const wireQuery = encodeDnsWireQuery(domain, DNS_TYPE_CODES[type]);
      const res = await fetch(cp.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/dns-message',
          Accept: 'application/dns-message',
        },
        body: Buffer.from(wireQuery),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const arrayBuf = await res.arrayBuffer();
      const decoded = decodeDnsWireResponse(Buffer.from(arrayBuf), type);
      rcode = decoded.rcode;
      answers = decoded.answers;
    } else {
      const url = new URL(cp.endpoint);
      url.searchParams.set('name', domain);
      url.searchParams.set('type', type);
      if (cp.mode === 'google-ecs-json' && cp.ecsSubnet) {
        url.searchParams.set('edns_client_subnet', cp.ecsSubnet);
      }
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/dns-json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as DohJsonResponse;
      rcode = json.Status ?? 0;
      const expectedCode = DNS_TYPE_CODES[type];
      answers = (json.Answer ?? [])
        .filter((ans) => ans.type === expectedCode)
        .map((ans) => parseRecordAnswer(type, ans.data, ans.TTL));
    }

    if (type === 'MX') {
      answers.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    } else {
      answers.sort((a, b) => a.value.localeCompare(b.value));
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - started));

    let status: 'resolved' | 'nxdomain' | 'nodata' | 'error' = 'resolved';
    let statusLabel = 'Propagated';

    if (rcode === 3) {
      status = 'nxdomain';
      statusLabel = 'Non-Propagated';
    } else if (rcode !== 0) {
      status = 'error';
      statusLabel = 'Non-Propagated';
    } else if (answers.length === 0) {
      status = 'nodata';
      statusLabel = 'Non-Propagated';
    }

    return {
      id: cp.id,
      city: cp.city,
      country: cp.country,
      countryCode: cp.countryCode,
      continent: cp.continent,
      lat: cp.lat,
      lng: cp.lng,
      provider: cp.provider,
      transport: cp.mode === 'doh-wire' ? 'DoH RFC 8484' : cp.ecsSubnet ? 'DoH + ECS' : 'DoH JSON',
      status,
      statusLabel,
      answers,
      primaryValue: answers[0]?.value ?? null,
      matchesConsensus: status === 'resolved' && answers.length > 0,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - started));
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      id: cp.id,
      city: cp.city,
      country: cp.country,
      countryCode: cp.countryCode,
      continent: cp.continent,
      lat: cp.lat,
      lng: cp.lng,
      provider: cp.provider,
      transport: cp.mode === 'doh-wire' ? 'DoH RFC 8484' : cp.ecsSubnet ? 'DoH + ECS' : 'DoH JSON',
      status: isTimeout ? ('timeout' as const) : ('error' as const),
      statusLabel: 'Non-Propagated',
      answers: [] as RegionalAnswerItem[],
      primaryValue: null,
      matchesConsensus: false,
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

// --- Sliding-Window Per-IP Rate Limiter ---

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(ip: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(ip) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] ?? now;
      const resetAt = oldest + this.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
      this.hits.set(ip, timestamps);
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetAt,
        retryAfterSeconds,
      };
    }

    timestamps.push(now);
    this.hits.set(ip, timestamps);

    // Opportunistic cleanup to keep memory bounded
    if (this.hits.size > 5000) {
      for (const [k, list] of this.hits.entries()) {
        if (list.every((ts) => ts <= cutoff)) {
          this.hits.delete(k);
        }
      }
    }

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      resetAt: (timestamps[0] ?? now) + this.windowMs,
      retryAfterSeconds: 0,
    };
  }
}

// --- TTL-Aware LRU Server Cache ---

interface ServerCacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlMemoryCache<T> {
  private store = new Map<string, ServerCacheEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): { value: T; expiresAt: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  set(key: string, value: T, ttlMs: number): number {
    const clampedTtl = Math.max(30_000, Math.min(ttlMs, 300_000));
    const expiresAt = Date.now() + clampedTtl;
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }
    this.store.set(key, { value, expiresAt });
    return expiresAt;
  }
}

function getClientIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cfIp.trim();
  }
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  const raw = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

type RegionalLangCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ru';

const COUNTRY_TO_REGIONAL_LANG: Record<string, RegionalLangCode> = {
  // Spanish
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  GQ: 'es',
  // French
  FR: 'fr',
  BE: 'fr',
  MC: 'fr',
  LU: 'fr',
  SN: 'fr',
  CI: 'fr',
  CM: 'fr',
  CD: 'fr',
  MG: 'fr',
  ML: 'fr',
  BF: 'fr',
  NE: 'fr',
  TG: 'fr',
  BJ: 'fr',
  GA: 'fr',
  CG: 'fr',
  HT: 'fr',
  // German
  DE: 'de',
  AT: 'de',
  CH: 'de',
  LI: 'de',
  // Portuguese
  BR: 'pt',
  PT: 'pt',
  AO: 'pt',
  MZ: 'pt',
  CV: 'pt',
  // Russian
  RU: 'ru',
  BY: 'ru',
};

function isPrivateOrLoopbackIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase();
  if (!clean || clean === '::1' || clean === 'localhost') return true;
  if (clean.startsWith('127.') || clean.startsWith('10.') || clean.startsWith('192.168.')) {
    return true;
  }
  const match172 = clean.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) {
    return true;
  }
  if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80:')) {
    return true;
  }
  return false;
}

function mapCountryToLang(countryCode: string | null | undefined): RegionalLangCode {
  if (!countryCode) return 'en';
  return COUNTRY_TO_REGIONAL_LANG[countryCode.trim().toUpperCase()] ?? 'en';
}

const geoIpCache = new Map<string, { countryCode: string | null; expiresAt: number }>();

async function lookupCountryByIp(ip: string): Promise<string | null> {
  const cached = geoIpCache.get(ip);
  if (cached && Date.now() <= cached.expiresAt) {
    return cached.countryCode;
  }

  let countryCode: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as { success?: boolean; country_code?: string };
      if (data.success && typeof data.country_code === 'string' && data.country_code.length === 2) {
        countryCode = data.country_code.toUpperCase();
      }
    }
  } catch {
    // Try fallback IP geolocation provider
  }

  if (!countryCode) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`https://get.geojs.io/v1/ip/country/${encodeURIComponent(ip)}.json`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as { country?: string };
        if (typeof data.country === 'string' && data.country.length === 2 && data.country !== 'nil') {
          countryCode = data.country.toUpperCase();
        }
      }
    } catch {
      // Ignore fallback timeout
    }
  }

  if (geoIpCache.size > 2000) {
    geoIpCache.clear();
  }
  geoIpCache.set(ip, { countryCode, expiresAt: Date.now() + 60 * 60 * 1000 });
  return countryCode;
}

// --- Express App ---

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  const dnsRateLimiter = new SlidingWindowRateLimiter(45, 60_000);
  const contactRateLimiter = new SlidingWindowRateLimiter(8, 60_000);
  const dnsCache = new TtlMemoryCache<Record<string, unknown>>(500);
  const propagationCache = new TtlMemoryCache<Record<string, unknown>>(500);

  // SEO: robots.txt allowing indexing of all pages and linking sitemap.xml
  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin =
      process.env.APP_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host') || 'dnslocator.online'}`;
    const publicRobotsPath = path.resolve(__dirname, 'public/robots.txt');
    if (fs.existsSync(publicRobotsPath)) {
      const template = fs.readFileSync(publicRobotsPath, 'utf-8');
      res
        .type('text/plain')
        .send(template.replace(/https:\/\/dnslocator\.online/g, origin));
      return;
    }
    res
      .type('text/plain')
      .send(['User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n'));
  });

  // SEO: sitemap.xml with only static authoritative pages (no programmatic /dns/* pages)
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const origin =
      process.env.APP_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host') || 'dnslocator.online'}`;
    const pages = [
      '/',
      '/blog',
      '/blog/how-to-run-a-global-dns-check-with-dns-locator',
      '/blog/ip-address-lookup-and-ip-number-search-guide',
      '/blog/what-is-my-isp-number-troubleshooting-local-dns-cache',
      '/blog/using-tracert-and-dns-check-to-diagnose-routing-delays',
      '/blog/find-open-ports-after-dns-a-record-migration',
      '/blog/mac-address-lookup-and-mac-oui-lookup-for-network-admins',
      '/blog/reverse-image-search-and-google-photo-lookup-for-brand-security',
      '/blog/morse-code-translator-to-dns-packets-signal-encoding-history',
      '/blog/hex-color-to-pantone-visual-qa-for-multi-region-dns-deployments',
      '/blog/complete-website-launch-toolkit-dns-ip-mac-signal-and-brand-checks',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/disclaimer',
    ];
    const today = new Date().toISOString().split('T')[0];
    const urls = pages
      .map(
        (p) =>
          `  <url>\n    <loc>${origin}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p === '/' || p === '/blog' ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${p === '/' ? '1.0' : p.startsWith('/blog') ? '0.8' : '0.6'}</priority>\n  </url>`
      )
      .join('\n');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'dnslocator.online', regions: GLOBAL_CHECKPOINTS.length });
  });

  // IP-based Regional Language Detection
  app.get('/api/geo-lang', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const headerCountryRaw =
      req.headers['cf-ipcountry'] ||
      req.headers['x-appengine-country'] ||
      req.headers['x-vercel-ip-country'] ||
      req.headers['x-country-code'];
    const headerCountry =
      typeof headerCountryRaw === 'string' ? headerCountryRaw.trim().toUpperCase() : '';

    if (headerCountry && /^[A-Z]{2}$/.test(headerCountry) && headerCountry !== 'XX' && headerCountry !== 'ZZ' && headerCountry !== 'T1') {
      return res.json({
        countryCode: headerCountry,
        lang: mapCountryToLang(headerCountry),
        source: 'edge-header',
      });
    }

    const ip = getClientIp(req);
    if (isPrivateOrLoopbackIp(ip)) {
      return res.json({
        countryCode: null,
        lang: null,
        source: 'private-ip',
      });
    }

    const countryCode = await lookupCountryByIp(ip);
    return res.json({
      countryCode,
      lang: countryCode ? mapCountryToLang(countryCode) : null,
      source: countryCode ? 'ip-lookup' : 'unavailable',
    });
  });

  // All-Record Parallel Lookup via Public 1.1.1.1 DoH JSON API
  app.get('/api/dns', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = dnsRateLimiter.check(ip);
    res.setHeader('X-RateLimit-Limit', String(rate.limit));
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rate.resetAt / 1000)));

    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before querying again.`,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }

    const rawDomain = String(req.query.domain || '');
    const domain = sanitizeServerDomain(rawDomain);
    if (!domain) {
      return res.status(400).json({
        error: 'Invalid domain name. Enter a valid hostname such as www.dnslocator.online.',
      });
    }

    const bypassCache = req.query.refresh === '1';
    const cacheKey = `all:${domain}`;
    if (!bypassCache) {
      const hit = dnsCache.get(cacheKey);
      if (hit) {
        return res.json({
          ...hit.value,
          cached: true,
          cacheExpiresAt: new Date(hit.expiresAt).toISOString(),
          rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
        });
      }
    }

    const started = performance.now();
    try {
      const [zoneResults, dmarcResult] = await Promise.all([
        Promise.all(
          ALL_ZONE_TYPES.map(async (type) => {
            try {
              const result = await fetchCloudflareDohJson(domain, type);
              return { type, ok: true, ...result };
            } catch {
              return { type, ok: false, status: 2, ad: false, records: [] as DnsRecordItem[] };
            }
          })
        ),
        fetchCloudflareDohJson(`_dmarc.${domain}`, 'TXT').catch(() => ({
          status: 2,
          ad: false,
          records: [] as DnsRecordItem[],
        })),
      ]);

      const records: DnsRecordItem[] = [];
      const recordsByType: Record<string, DnsRecordItem[]> = {};
      const statusByType: Record<string, number> = {};
      let minTtl = 300;
      let dnssecValidated = false;

      for (const entry of zoneResults) {
        recordsByType[entry.type] = entry.records;
        statusByType[entry.type] = entry.status;
        if (entry.ad) dnssecValidated = true;
        for (const rec of entry.records) {
          records.push(rec);
          if (rec.ttl > 0 && rec.ttl < minTtl) {
            minTtl = rec.ttl;
          }
        }
      }

      const mxRecords = recordsByType.MX ?? [];
      const txtRecords = recordsByType.TXT ?? [];
      const spfRec = txtRecords.find((r) => r.data.toLowerCase().startsWith('v=spf1'));
      const dmarcRec = dmarcResult.records.find((r) =>
        r.data.toLowerCase().startsWith('v=dmarc1')
      );
      const dmarcPolicyMatch = dmarcRec?.data.match(/\bp=([a-z]+)/i);

      const parts = domain.split('.');
      const apexDomain = parts.length > 2 ? parts.slice(-2).join('.') : domain;
      const queryTimeMs = Math.max(1, Math.round(performance.now() - started));

      const payload = {
        domain,
        apexDomain,
        queriedAt: new Date().toISOString(),
        cached: false,
        queryTimeMs,
        resolver: 'Public 1.1.1.1 DoH',
        dnssecValidated,
        records,
        recordsByType,
        statusByType,
        emailHealth: {
          hasMx: mxRecords.length > 0,
          mxCount: mxRecords.length,
          hasSpf: Boolean(spfRec),
          spfRecord: spfRec?.data,
          spfValid: Boolean(spfRec && /\b(all|~all|-all|\?all|redirect=)/i.test(spfRec.data)),
          hasDmarc: Boolean(dmarcRec),
          dmarcRecord: dmarcRec?.data,
          dmarcPolicy: dmarcPolicyMatch?.[1]?.toLowerCase(),
        },
      };

      const expiresAt = dnsCache.set(cacheKey, payload, Math.max(60, minTtl) * 1000);

      return res.json({
        ...payload,
        cacheExpiresAt: new Date(expiresAt).toISOString(),
        rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
      });
    } catch {
      return res.status(502).json({
        error: 'Unable to reach public DoH resolver right now. Please retry shortly.',
      });
    }
  });

  // Global Multi-Region DNS Propagation Checker (18 worldwide checkpoints)
  app.get('/api/propagation', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = dnsRateLimiter.check(ip);
    res.setHeader('X-RateLimit-Limit', String(rate.limit));
    res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rate.resetAt / 1000)));

    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before running another global check.`,
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }

    const rawType = String(req.query.type || 'A').toUpperCase() as DnsRecordType;
    const recordType: DnsRecordType = VALID_PROPAGATION_TYPES.has(rawType) ? rawType : 'A';
    const rawDomain = String(req.query.domain || '');
    const domain = sanitizeServerDomain(rawDomain, recordType);

    if (!domain) {
      return res.status(400).json({
        error:
          recordType === 'PTR'
            ? 'Enter a valid IPv4 address (e.g., 1.1.1.1) or .in-addr.arpa hostname.'
            : 'Invalid domain name. Enter a valid hostname such as www.dnslocator.online.',
      });
    }

    const bypassCache = req.query.refresh === '1';
    const cacheKey = `prop:${recordType}:${domain}`;
    if (!bypassCache) {
      const hit = propagationCache.get(cacheKey);
      if (hit) {
        return res.json({
          ...hit.value,
          cached: true,
          cacheExpiresAt: new Date(hit.expiresAt).toISOString(),
          rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
        });
      }
    }

    const started = performance.now();
    const regions = await Promise.all(
      GLOBAL_CHECKPOINTS.map((cp) => queryCheckpoint(cp, domain, recordType))
    );

    // Compute consensus across resolved regions
    const signatureCounts = new Map<string, { count: number; values: string[] }>();
    let resolvedCount = 0;

    for (const region of regions) {
      if (region.status === 'resolved' && region.answers.length > 0) {
        resolvedCount++;
        const values = region.answers.map((a) => a.value);
        const sig = [...values].map((v) => v.toLowerCase()).sort().join(' | ');
        const existing = signatureCounts.get(sig);
        if (existing) {
          existing.count++;
        } else {
          signatureCounts.set(sig, { count: 1, values });
        }
      }
    }

    let topSig = '';
    let topCount = 0;
    let consensusValues: string[] = [];

    for (const [sig, entry] of signatureCounts.entries()) {
      if (entry.count > topCount) {
        topCount = entry.count;
        topSig = sig;
        consensusValues = entry.values;
      }
    }

    const hasGeoVariance = signatureCounts.size > 1;

    for (const region of regions) {
      if (region.status === 'resolved' && region.answers.length > 0 && topSig) {
        const sig = region.answers
          .map((a) => a.value.toLowerCase())
          .sort()
          .join(' | ');
        region.matchesConsensus = sig === topSig;
      }
    }

    const minTtl = regions
      .flatMap((r) => r.answers.map((a) => a.ttl))
      .filter((t) => t > 0)
      .reduce((acc, t) => Math.min(acc, t), 300);

    const queryTimeMs = Math.max(1, Math.round(performance.now() - started));

    const payload = {
      domain,
      recordType,
      queriedAt: new Date().toISOString(),
      cached: false,
      queryTimeMs,
      consensusValues,
      resolvedCount,
      totalRegions: regions.length,
      hasGeoVariance,
      regions,
    };

    const expiresAt = propagationCache.set(cacheKey, payload, Math.max(60, minTtl) * 1000);

    return res.json({
      ...payload,
      cacheExpiresAt: new Date(expiresAt).toISOString(),
      rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
    });
  });

  // Contact form submission endpoint
  app.post('/api/contact', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = contactRateLimiter.check(ip);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Please wait ${rate.retryAfterSeconds}s before submitting another message.`,
      });
    }

    const { name, email, subject, message } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof message !== 'string' ||
      message.trim().length < 10
    ) {
      return res.status(400).json({
        error: 'Provide a valid name, email address, and message (at least 10 characters).',
      });
    }

    const referenceId = `DL-${Date.now().toString(36).toUpperCase()}`;
    return res.json({
      ok: true,
      referenceId,
      subject: typeof subject === 'string' && subject.trim() ? subject.trim() : 'General Inquiry',
      receivedAt: new Date().toISOString(),
    });
  });

  // Server-side Gemini AI Game Mission Generator
  app.post('/api/game/ai-mission', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = dnsRateLimiter.check(ip);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before requesting another AI mission.`,
      });
    }

    try {
      const { domain, difficulty, previousScore } = req.body ?? {};
      const validDifficulty =
        difficulty === 'chill' || difficulty === 'standard' || difficulty === 'turbo'
          ? difficulty
          : 'standard';
      const mission = await generateAiGameMission({
        domain: typeof domain === 'string' ? domain.slice(0, 120) : undefined,
        difficulty: validDifficulty,
        previousScore: typeof previousScore === 'number' ? previousScore : 0,
      });
      return res.json({ mission });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate AI mission via Gemini.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 502;
      return res.status(status).json({ error: message });
    }
  });

  // Server-side Gemini AI Run Debrief Coach
  app.post('/api/game/ai-debrief', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = dnsRateLimiter.check(ip);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before requesting another AI debrief.`,
      });
    }

    try {
      const {
        score,
        bestScore,
        dodgedCount,
        orbsCollected,
        maxCombo,
        crashCause,
        speedMultiplier,
        activeDomain,
        missionTitle,
      } = req.body ?? {};

      const validCrash =
        crashCause === 'nxdomain' || crashCause === 'timeout' || crashCause === 'none'
          ? crashCause
          : 'nxdomain';

      const debrief = await generateAiGameDebrief({
        score: typeof score === 'number' ? Math.max(0, Math.floor(score)) : 0,
        bestScore: typeof bestScore === 'number' ? Math.max(0, Math.floor(bestScore)) : 0,
        dodgedCount: typeof dodgedCount === 'number' ? Math.max(0, Math.floor(dodgedCount)) : 0,
        orbsCollected:
          typeof orbsCollected === 'number' ? Math.max(0, Math.floor(orbsCollected)) : 0,
        maxCombo: typeof maxCombo === 'number' ? Math.max(1, Math.floor(maxCombo)) : 1,
        crashCause: validCrash,
        speedMultiplier:
          typeof speedMultiplier === 'number' && Number.isFinite(speedMultiplier)
            ? speedMultiplier
            : 1,
        activeDomain: typeof activeDomain === 'string' ? activeDomain.slice(0, 120) : undefined,
        missionTitle: typeof missionTitle === 'string' ? missionTitle.slice(0, 60) : undefined,
      });
      return res.json({ debrief });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate AI run debrief via Gemini.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 502;
      return res.status(status).json({ error: message });
    }
  });

  const httpServer = http.createServer(app);

  // Optional Google Search Console HTML file verification support
  const googleVerifyToken = (
    process.env.GOOGLE_SITE_VERIFICATION ||
    process.env.VITE_GOOGLE_SITE_VERIFICATION ||
    ''
  ).trim();
  const googleVerifyFile = (process.env.GOOGLE_SITE_VERIFICATION_FILE || '').trim();
  if (googleVerifyFile && /^google[a-z0-9]+\.html$/i.test(googleVerifyFile)) {
    app.get(`/${googleVerifyFile}`, (_req: Request, res: Response) => {
      res.type('text/html').send(`google-site-verification: ${googleVerifyFile}`);
    });
  }

  const injectHeadVerification = (html: string): string => {
    if (!googleVerifyToken) {
      return html;
    }
    const escaped = googleVerifyToken.replace(/"/g, '&quot;');
    if (html.includes('name="google-site-verification"')) {
      return html.replace(
        /(<meta\s+name="google-site-verification"\s+content=")[^"]*(")/i,
        `$1${escaped}$2`
      );
    }
    return html.replace(
      '</head>',
      `    <meta name="google-site-verification" content="${escaped}" />\n  </head>`
    );
  };

  // Vite dev middleware or production static assets
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    if (process.env.DISABLE_HMR === 'true') {
      // Unregister any previously installed dev Service Worker so stale cached HTML cannot invoke HMR
      app.get('/dev-sw.js', (_req: Request, res: Response) => {
        res
          .status(200)
          .set({
            'Content-Type': 'text/javascript',
            'Cache-Control': 'no-store',
          })
          .send(
            `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await self.caches.keys();
      await Promise.all(keys.map((key) => self.caches.delete(key)));
    } catch {}
    await self.registration.unregister();
  })());
});
`
          );
      });

      app.get('/@vite-plugin-pwa/pwa-entry-point-loaded', (_req: Request, res: Response) => {
        res
          .status(200)
          .set({
            'Content-Type': 'text/javascript',
            'Cache-Control': 'no-store',
          })
          .send('export default function registerDevSW() {}\n');
      });

      app.get('/@vite/client', async (_req: Request, res: Response, next) => {
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (!result) {
            next();
            return;
          }
          let code = result.code;
          if (code.includes('ws.send(JSON.stringify(data));')) {
            code = code.replace(
              'ws.send(JSON.stringify(data));',
              'if (ws && ws.readyState === ws.OPEN) { ws.send(JSON.stringify(data)); }'
            );
          }
          if (code.includes('async connect(handlers) {')) {
            code = code.replace(
              'async connect(handlers) {',
              'async connect(handlers) { return;'
            );
          }
          res
            .status(200)
            .set({
              'Content-Type': 'text/javascript',
              'Cache-Control': 'no-store',
            })
            .send(code);
        } catch (err) {
          next(err);
        }
      });
    }

    if (googleVerifyToken) {
      app.use(async (req, res, next) => {
        if (
          req.method === 'GET' &&
          !req.path.startsWith('/api/') &&
          !req.path.includes('.') &&
          req.headers.accept?.includes('text/html')
        ) {
          try {
            const rawHtml = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
            const transformed = await vite.transformIndexHtml(
              req.originalUrl,
              injectHeadVerification(rawHtml)
            );
            res.status(200).set({ 'Content-Type': 'text/html' }).end(transformed);
            return;
          } catch (err) {
            vite.ssrFixStacktrace(err as Error);
          }
        }
        next();
      });
    }
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        if (googleVerifyToken) {
          const raw = fs.readFileSync(indexHtml, 'utf-8');
          res.type('text/html').send(injectHeadVerification(raw));
        } else {
          res.sendFile(indexHtml);
        }
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`dnslocator.online server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
