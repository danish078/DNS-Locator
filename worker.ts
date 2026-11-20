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

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  APP_URL?: string;
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

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function sanitizeDomain(raw: string, recordType?: DnsRecordType): string | null {
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
    return recordType === 'PTR'
      ? `${candidate.split('.').reverse().join('.')}.in-addr.arpa`
      : null;
  }

  return HOSTNAME_REGEX.test(candidate) ? candidate : null;
}

function cleanTxtValue(raw: string): string {
  const trimmed = raw.trim();
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

// Pure Web-API RFC 1035 / RFC 8484 DNS Wireformat Encoder & Decoder
function encodeDnsWireQuery(domain: string, qtypeCode: number): Uint8Array {
  const labels = domain.split('.').filter(Boolean);
  const qnameBytes: number[] = [];
  for (const label of labels) {
    const encoded = textEncoder.encode(label);
    qnameBytes.push(encoded.length, ...encoded);
  }
  qnameBytes.push(0);

  const packet = new Uint8Array(12 + qnameBytes.length + 4 + 11);
  const view = new DataView(packet.buffer);
  view.setUint16(0, 0); // ID = 0
  view.setUint16(2, 0x0100); // RD = 1
  view.setUint16(4, 1); // QDCOUNT
  view.setUint16(10, 1); // ARCOUNT (EDNS0)

  let offset = 12;
  for (const b of qnameBytes) {
    packet[offset++] = b;
  }
  view.setUint16(offset, qtypeCode);
  offset += 2;
  view.setUint16(offset, 1); // IN class
  offset += 2;

  // EDNS0 OPT pseudo-record
  packet[offset++] = 0;
  view.setUint16(offset, 41);
  offset += 2;
  view.setUint16(offset, 4096);
  offset += 2;
  view.setUint32(offset, 0);
  offset += 4;
  view.setUint16(offset, 0);

  return packet;
}

function readDnsName(bytes: Uint8Array, startOffset: number): { name: string; nextOffset: number } {
  const labels: string[] = [];
  let offset = startOffset;
  let jumped = false;
  let endOffset = startOffset;
  let guard = 0;

  while (offset < bytes.length && guard++ < 128) {
    const len = bytes[offset];
    if (len === 0) {
      if (!jumped) endOffset = offset + 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      const pointer = ((len & 0x3f) << 8) | bytes[offset + 1];
      if (!jumped) endOffset = offset + 2;
      offset = pointer;
      jumped = true;
      continue;
    }
    offset += 1;
    labels.push(textDecoder.decode(bytes.subarray(offset, offset + len)));
    offset += len;
  }

  return { name: labels.join('.'), nextOffset: endOffset };
}

function formatIpv6(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(view.getUint16(i).toString(16));
  }
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
    return `${groups.slice(0, bestStart).join(':')}::${groups.slice(bestStart + bestLen).join(':')}`;
  }
  return groups.join(':');
}

function decodeDnsWireResponse(
  bytes: Uint8Array,
  expectedType: DnsRecordType
): { rcode: number; answers: RegionalAnswerItem[] } {
  if (bytes.length < 12) {
    throw new Error('Malformed DNS wire response');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rcode = view.getUint16(2) & 0x0f;
  const qdCount = view.getUint16(4);
  const anCount = view.getUint16(6);

  let offset = 12;
  for (let i = 0; i < qdCount; i++) {
    const q = readDnsName(bytes, offset);
    offset = q.nextOffset + 4;
  }

  const expectedCode = DNS_TYPE_CODES[expectedType];
  const answers: RegionalAnswerItem[] = [];

  for (let i = 0; i < anCount && offset + 10 <= bytes.length; i++) {
    const rrName = readDnsName(bytes, offset);
    offset = rrName.nextOffset;
    if (offset + 10 > bytes.length) break;

    const rrType = view.getUint16(offset);
    const ttl = view.getUint32(offset + 4);
    const rdLength = view.getUint16(offset + 8);
    offset += 10;
    if (offset + rdLength > bytes.length) break;

    const rdataStart = offset;
    const rdataEnd = offset + rdLength;

    if (rrType === expectedCode) {
      if (rrType === 1 && rdLength === 4) {
        answers.push({
          value: `${bytes[rdataStart]}.${bytes[rdataStart + 1]}.${bytes[rdataStart + 2]}.${bytes[rdataStart + 3]}`,
          ttl,
        });
      } else if (rrType === 28 && rdLength === 16) {
        answers.push({ value: formatIpv6(bytes.subarray(rdataStart, rdataEnd)), ttl });
      } else if (rrType === 2 || rrType === 5 || rrType === 12) {
        const parsed = readDnsName(bytes, rdataStart);
        answers.push({ value: stripTrailingDot(parsed.name), ttl });
      } else if (rrType === 15 && rdLength >= 3) {
        const priority = view.getUint16(rdataStart);
        const exchange = readDnsName(bytes, rdataStart + 2);
        answers.push({ priority, value: stripTrailingDot(exchange.name), ttl });
      } else if (rrType === 16) {
        let p = rdataStart;
        let text = '';
        while (p < rdataEnd) {
          const segLen = bytes[p++];
          if (p + segLen > rdataEnd) break;
          text += textDecoder.decode(bytes.subarray(p, p + segLen));
          p += segLen;
        }
        answers.push({ value: text, ttl });
      } else if (rrType === 6) {
        const mname = readDnsName(bytes, rdataStart);
        const rname = readDnsName(bytes, mname.nextOffset);
        if (rname.nextOffset + 20 <= rdataEnd) {
          const serial = view.getUint32(rname.nextOffset);
          const refresh = view.getUint32(rname.nextOffset + 4);
          const retry = view.getUint32(rname.nextOffset + 8);
          const expire = view.getUint32(rname.nextOffset + 12);
          const minimum = view.getUint32(rname.nextOffset + 16);
          answers.push({
            value: `${stripTrailingDot(mname.name)} ${stripTrailingDot(rname.name)} ${serial} ${refresh} ${retry} ${expire} ${minimum}`,
            ttl,
          });
        }
      } else if (rrType === 257 && rdLength >= 2) {
        const flagsCaa = bytes[rdataStart];
        const tagLen = bytes[rdataStart + 1];
        const tag = textDecoder.decode(bytes.subarray(rdataStart + 2, rdataStart + 2 + tagLen));
        const val = textDecoder.decode(bytes.subarray(rdataStart + 2 + tagLen, rdataEnd));
        answers.push({ value: `${flagsCaa} ${tag} "${val}"`, ttl });
      }
    }
    offset = rdataEnd;
  }

  return { rcode, answers };
}

interface DohJsonResponse {
  Status: number;
  AD?: boolean;
  Answer?: { name: string; type: number; TTL: number; data: string }[];
}

async function fetchCloudflareDohJson(
  domain: string,
  type: DnsRecordType
): Promise<{ status: number; ad: boolean; records: DnsRecordItem[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Cloudflare DoH HTTP ${res.status}`);
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
  const started = Date.now();
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
        body: new Uint8Array(wireQuery),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const decoded = decodeDnsWireResponse(new Uint8Array(await res.arrayBuffer()), type);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

    const latencyMs = Math.max(1, Date.now() - started);
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
    const latencyMs = Math.max(1, Date.now() - started);
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

// Per-isolate sliding-window rate limiter & TTL cache
const rateLimitMap = new Map<string, number[]>();
const memoryCache = new Map<string, { value: Record<string, unknown>; expiresAt: number }>();

function checkRateLimit(ip: string, maxReq: number, windowMs: number) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (rateLimitMap.get(ip) ?? []).filter((ts) => ts > cutoff);
  if (timestamps.length >= maxReq) {
    const resetAt = (timestamps[0] ?? now) + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    rateLimitMap.set(ip, timestamps);
    return { allowed: false, limit: maxReq, remaining: 0, resetAt, retryAfterSeconds };
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return {
    allowed: true,
    limit: maxReq,
    remaining: Math.max(0, maxReq - timestamps.length),
    resetAt: (timestamps[0] ?? now) + windowMs,
    retryAfterSeconds: 0,
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

type RegionalLangCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ru';

const COUNTRY_TO_REGIONAL_LANG: Record<string, RegionalLangCode> = {
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es',
  CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
  FR: 'fr', BE: 'fr', MC: 'fr', LU: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', CD: 'fr',
  MG: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', TG: 'fr', BJ: 'fr', GA: 'fr', CG: 'fr', HT: 'fr',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt',
  RU: 'ru', BY: 'ru',
};

function mapCountryToLang(countryCode: string | null | undefined): RegionalLangCode {
  if (!countryCode) return 'en';
  return COUNTRY_TO_REGIONAL_LANG[countryCode.trim().toUpperCase()] ?? 'en';
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const origin = (env.APP_URL || url.origin).replace(/\/$/, '');
    const clientIp =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      '127.0.0.1';

    if (url.pathname === '/robots.txt') {
      return new Response(
        [
          'User-agent: *',
          'Allow: /',
          'Allow: /about',
          'Allow: /contact',
          'Allow: /privacy',
          'Allow: /terms',
          'Allow: /disclaimer',
          'Allow: /cookies-policy',
          'Allow: /cookies-notice',
          'Disallow: /*?domain=*',
          'Disallow: /*?q=*',
          'Disallow: /api/',
          `Sitemap: ${origin}/sitemap.xml`,
          '',
        ].join('\n'),
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    if (url.pathname === '/sitemap.xml') {
      const pages = [
        '/',
        '/about',
        '/contact',
        '/privacy',
        '/terms',
        '/disclaimer',
        '/cookies-policy',
        '/cookies-notice',
      ];
      const today = new Date().toISOString().split('T')[0];
      const urls = pages
        .map(
          (p) =>
            `  <url>\n    <loc>${origin}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.6'}</priority>\n  </url>`
        )
        .join('\n');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
      );
    }

    if (url.pathname === '/api/health') {
      return jsonResponse({
        ok: true,
        service: 'dnslocator.online',
        runtime: 'edge-worker',
        regions: GLOBAL_CHECKPOINTS.length,
      });
    }

    if (url.pathname === '/api/geo-lang' && request.method === 'GET') {
      const cfCountry = (request as Request & { cf?: { country?: string } }).cf?.country;
      const headerCountry = (
        cfCountry ||
        request.headers.get('CF-IPCountry') ||
        request.headers.get('X-Country-Code') ||
        ''
      )
        .trim()
        .toUpperCase();

      if (
        headerCountry &&
        /^[A-Z]{2}$/.test(headerCountry) &&
        headerCountry !== 'XX' &&
        headerCountry !== 'ZZ' &&
        headerCountry !== 'T1'
      ) {
        return jsonResponse(
          {
            countryCode: headerCountry,
            lang: mapCountryToLang(headerCountry),
            source: 'edge-ip',
          },
          200,
          { 'Cache-Control': 'no-store' }
        );
      }

      return jsonResponse(
        { countryCode: null, lang: null, source: 'unavailable' },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    if (url.pathname === '/api/dns' && request.method === 'GET') {
      const rate = checkRateLimit(clientIp, 45, 60_000);
      const rateHeaders = {
        'X-RateLimit-Limit': String(rate.limit),
        'X-RateLimit-Remaining': String(rate.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rate.resetAt / 1000)),
      };
      if (!rate.allowed) {
        return jsonResponse(
          {
            error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before querying again.`,
            retryAfterSeconds: rate.retryAfterSeconds,
          },
          429,
          { ...rateHeaders, 'Retry-After': String(rate.retryAfterSeconds) }
        );
      }

      const domain = sanitizeDomain(url.searchParams.get('domain') || '');
      if (!domain) {
        return jsonResponse(
          { error: 'Invalid domain name. Enter a valid hostname such as example.com.' },
          400,
          rateHeaders
        );
      }

      const bypassCache = url.searchParams.get('refresh') === '1';
      const cacheKey = `all:${domain}`;
      if (!bypassCache) {
        const hit = memoryCache.get(cacheKey);
        if (hit && Date.now() <= hit.expiresAt) {
          return jsonResponse(
            {
              ...hit.value,
              cached: true,
              cacheExpiresAt: new Date(hit.expiresAt).toISOString(),
              rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
            },
            200,
            rateHeaders
          );
        }
      }

      const started = Date.now();
      const [zoneResults, dmarcResult] = await Promise.all([
        Promise.all(
          ALL_ZONE_TYPES.map(async (type) => {
            try {
              const result = await fetchCloudflareDohJson(domain, type);
              return { type, ...result };
            } catch {
              return { type, status: 2, ad: false, records: [] as DnsRecordItem[] };
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
          if (rec.ttl > 0 && rec.ttl < minTtl) minTtl = rec.ttl;
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

      const payload = {
        domain,
        apexDomain,
        queriedAt: new Date().toISOString(),
        cached: false,
        queryTimeMs: Math.max(1, Date.now() - started),
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

      const ttlMs = Math.max(60_000, Math.min(minTtl * 1000, 300_000));
      const expiresAt = Date.now() + ttlMs;
      memoryCache.set(cacheKey, { value: payload, expiresAt });

      return jsonResponse(
        {
          ...payload,
          cacheExpiresAt: new Date(expiresAt).toISOString(),
          rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
        },
        200,
        rateHeaders
      );
    }

    if (url.pathname === '/api/propagation' && request.method === 'GET') {
      const rate = checkRateLimit(clientIp, 45, 60_000);
      const rateHeaders = {
        'X-RateLimit-Limit': String(rate.limit),
        'X-RateLimit-Remaining': String(rate.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rate.resetAt / 1000)),
      };
      if (!rate.allowed) {
        return jsonResponse(
          {
            error: `Rate limit exceeded. Please wait ${rate.retryAfterSeconds}s before running another global check.`,
            retryAfterSeconds: rate.retryAfterSeconds,
          },
          429,
          { ...rateHeaders, 'Retry-After': String(rate.retryAfterSeconds) }
        );
      }

      const rawType = (url.searchParams.get('type') || 'A').toUpperCase() as DnsRecordType;
      const recordType: DnsRecordType = VALID_PROPAGATION_TYPES.has(rawType) ? rawType : 'A';
      const domain = sanitizeDomain(url.searchParams.get('domain') || '', recordType);
      if (!domain) {
        return jsonResponse(
          {
            error:
              recordType === 'PTR'
                ? 'Enter a valid IPv4 address (e.g., 1.1.1.1) or .in-addr.arpa hostname.'
                : 'Invalid domain name. Enter a valid hostname such as example.com.',
          },
          400,
          rateHeaders
        );
      }

      const bypassCache = url.searchParams.get('refresh') === '1';
      const cacheKey = `prop:${recordType}:${domain}`;
      if (!bypassCache) {
        const hit = memoryCache.get(cacheKey);
        if (hit && Date.now() <= hit.expiresAt) {
          return jsonResponse(
            {
              ...hit.value,
              cached: true,
              cacheExpiresAt: new Date(hit.expiresAt).toISOString(),
              rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
            },
            200,
            rateHeaders
          );
        }
      }

      const started = Date.now();
      const regions = await Promise.all(
        GLOBAL_CHECKPOINTS.map((cp) => queryCheckpoint(cp, domain, recordType))
      );

      const signatureCounts = new Map<string, { count: number; values: string[] }>();
      let resolvedCount = 0;

      for (const region of regions) {
        if (region.status === 'resolved' && region.answers.length > 0) {
          resolvedCount++;
          const values = region.answers.map((a) => a.value);
          const sig = [...values].map((v) => v.toLowerCase()).sort().join(' | ');
          const existing = signatureCounts.get(sig);
          if (existing) existing.count++;
          else signatureCounts.set(sig, { count: 1, values });
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

      const payload = {
        domain,
        recordType,
        queriedAt: new Date().toISOString(),
        cached: false,
        queryTimeMs: Math.max(1, Date.now() - started),
        consensusValues,
        resolvedCount,
        totalRegions: regions.length,
        hasGeoVariance,
        regions,
      };

      const ttlMs = Math.max(60_000, Math.min(minTtl * 1000, 300_000));
      const expiresAt = Date.now() + ttlMs;
      memoryCache.set(cacheKey, { value: payload, expiresAt });

      return jsonResponse(
        {
          ...payload,
          cacheExpiresAt: new Date(expiresAt).toISOString(),
          rateLimit: { limit: rate.limit, remaining: rate.remaining, resetAt: rate.resetAt },
        },
        200,
        rateHeaders
      );
    }

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      const rate = checkRateLimit(`contact:${clientIp}`, 8, 60_000);
      if (!rate.allowed) {
        return jsonResponse(
          { error: `Please wait ${rate.retryAfterSeconds}s before submitting another message.` },
          429
        );
      }

      try {
        const body = (await request.json()) as Record<string, unknown>;
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const email = typeof body?.email === 'string' ? body.email.trim() : '';
        const subject =
          typeof body?.subject === 'string' && body.subject.trim()
            ? body.subject.trim()
            : 'General Inquiry';
        const message = typeof body?.message === 'string' ? body.message.trim() : '';

        if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
          return jsonResponse(
            {
              error:
                'Provide a valid name, email address, and message (at least 10 characters).',
            },
            400
          );
        }

        return jsonResponse({
          ok: true,
          referenceId: `DL-${Date.now().toString(36).toUpperCase()}`,
          subject,
          receivedAt: new Date().toISOString(),
        });
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
