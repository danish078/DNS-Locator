import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  stripThirdPartyAndAiMentions,
  synthesizeDnsLocatorNewsDispatches,
} from './gemini.ts';

export type NewsRelevance = 'dns' | 'routing' | 'security' | 'infrastructure';

export interface ServerNewsArticle {
  id: string;
  title: string;
  publisher: 'DNS Locator';
  publishedAt: string;
  summary: string;
  details: string;
  categories: string[];
  relevance: NewsRelevance;
  suggestedDomain?: string;
}

export interface ServerNewsFeedResponse {
  articles: ServerNewsArticle[];
  fetchedAt: string;
  cached: boolean;
}

interface FeedSourceDef {
  feedUrl: string;
  defaultRelevance: NewsRelevance;
}

interface RawParsedFeedItem {
  id: string;
  title: string;
  publishedAt: string;
  summary: string;
  details: string;
  categories: string[];
  relevance: NewsRelevance;
}

// Private server-side feed endpoints — never exposed in API responses or client UI
const PRIVATE_NEWS_FEEDS: FeedSourceDef[] = [
  { feedUrl: 'https://blog.apnic.net/feed/', defaultRelevance: 'routing' },
  { feedUrl: 'https://labs.ripe.net/rss/', defaultRelevance: 'dns' },
  { feedUrl: 'https://blog.cloudflare.com/rss/', defaultRelevance: 'infrastructure' },
  { feedUrl: 'https://isc.sans.edu/rssfeed.xml', defaultRelevance: 'security' },
  { feedUrl: 'https://www.bleepingcomputer.com/feed/', defaultRelevance: 'security' },
];

const NEWS_CACHE_TTL_MS = 25 * 60 * 1000;
const NEWS_STORE_VERSION = 3;
const NEWS_STORE_PATH = path.resolve(process.cwd(), '.cache', 'news-feed.json');

let cachedNewsState: {
  data: ServerNewsFeedResponse;
  expiresAt: number;
} | null = null;

let pendingNewsFetch: Promise<ServerNewsFeedResponse> | null = null;
let pendingNewsPolish: Promise<void> | null = null;

function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '‘',
    '&rsquo;': '’',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&hellip;': '…',
  };

  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#([0-9]+);/g, (_m, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(
      /&(amp|lt|gt|quot|apos|#39|nbsp|ndash|mdash|lsquo|rsquo|ldquo|rdquo|hellip);/g,
      (m) => named[m] ?? m
    );
}

function stripTagsAndClean(raw: string, maxLen = 240): string {
  const decoded = decodeHtmlEntities(raw);
  const plain = stripThirdPartyAndAiMentions(
    decoded
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  if (plain.length <= maxLen) return plain;
  const slice = plain.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

function extractTagContent(block: string, tagNames: string[]): string {
  for (const tag of tagNames) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const match = block.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function extractCategories(block: string): string[] {
  const cats: string[] = [];
  const rssCatRegex = /<category(?:\s+term="([^"]+)"[^>]*)?(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi;
  let match: RegExpExecArray | null;
  while ((match = rssCatRegex.exec(block)) !== null) {
    const raw = (match[1] || match[2] || '').trim();
    const clean = stripTagsAndClean(raw, 36);
    if (clean && !cats.includes(clean)) {
      cats.push(clean);
    }
  }
  const atomTermRegex = /<category\s+[^>]*term=["']([^"']+)["'][^>]*\/?>/gi;
  while ((match = atomTermRegex.exec(block)) !== null) {
    const clean = stripTagsAndClean(match[1], 36);
    if (clean && !cats.includes(clean)) {
      cats.push(clean);
    }
  }
  return cats.slice(0, 4);
}

function classifyRelevance(
  title: string,
  summary: string,
  categories: string[],
  fallback: NewsRelevance
): NewsRelevance {
  const text = `${title} ${summary} ${categories.join(' ')}`.toLowerCase();
  if (
    /\b(dns|dnssec|doh|dot|nameserver|resolver|tld|icann|registrar|cname|mx|dmarc|spf|dkim)\b/.test(
      text
    )
  ) {
    return 'dns';
  }
  if (
    /\b(bgp|routing|rpki|ipv6|ipv4|anycast|asn|peering|traceroute|latency|cdn)\b/.test(text)
  ) {
    return 'routing';
  }
  if (
    /\b(tls|ssl|certificate|ddos|ransomware|vulnerability|cve|exploit|phishing|malware|zero-day|security)\b/.test(
      text
    )
  ) {
    return 'security';
  }
  return fallback;
}

function parseFeedXml(xml: string, source: FeedSourceDef): RawParsedFeedItem[] {
  const items: RawParsedFeedItem[] = [];
  const blockMatches = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) ?? [];

  for (const block of blockMatches.slice(0, 8)) {
    const rawTitle = extractTagContent(block, ['title']);
    const title = stripTagsAndClean(rawTitle, 150);
    if (!title) continue;

    const rawDesc =
      extractTagContent(block, ['description', 'summary', 'content:encoded', 'content']) || title;
    const summary = stripTagsAndClean(rawDesc, 200) || title;
    const details = stripTagsAndClean(rawDesc, 520) || summary;

    const rawDate = extractTagContent(block, [
      'pubDate',
      'published',
      'updated',
      'dc:date',
    ]);
    const parsedTime = rawDate ? Date.parse(decodeHtmlEntities(rawDate)) : Number.NaN;
    const publishedAt = Number.isFinite(parsedTime)
      ? new Date(parsedTime).toISOString()
      : new Date().toISOString();

    const categories = extractCategories(block);
    const relevance = classifyRelevance(title, summary, categories, source.defaultRelevance);

    const idSeed = `${source.defaultRelevance}:${publishedAt}:${title}`.toLowerCase();
    const id = crypto.createHash('sha256').update(idSeed).digest('base64url').slice(0, 20);

    items.push({
      id,
      title,
      publishedAt,
      summary,
      details,
      categories,
      relevance,
    });
  }

  return items;
}

async function fetchSingleFeed(source: FeedSourceDef): Promise<RawParsedFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(source.feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DNSLocatorNewsroom/1.0 (+https://dnslocator.online)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const xml = await response.text();
    return parseFeedXml(xml, source);
  } finally {
    clearTimeout(timeout);
  }
}

interface StoredNewsEnvelope {
  version: number;
  expiresAt: number;
  data: ServerNewsFeedResponse;
}

function readStoredNewsFeed(): { data: ServerNewsFeedResponse; expiresAt: number } | null {
  if (cachedNewsState) {
    return cachedNewsState;
  }
  try {
    if (fs.existsSync(NEWS_STORE_PATH)) {
      const raw = fs.readFileSync(NEWS_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoredNewsEnvelope;
      if (
        parsed &&
        parsed.version === NEWS_STORE_VERSION &&
        parsed.data &&
        Array.isArray(parsed.data.articles) &&
        parsed.data.articles.length > 0
      ) {
        cachedNewsState = { data: parsed.data, expiresAt: parsed.expiresAt || 0 };
        return cachedNewsState;
      }
    }
  } catch {
    // Ignore corrupt disk cache
  }
  return null;
}

function writeStoredNewsFeed(data: ServerNewsFeedResponse, expiresAt: number): void {
  cachedNewsState = { data, expiresAt };
  try {
    fs.mkdirSync(path.dirname(NEWS_STORE_PATH), { recursive: true });
    const envelope: StoredNewsEnvelope = {
      version: NEWS_STORE_VERSION,
      expiresAt,
      data,
    };
    fs.writeFileSync(NEWS_STORE_PATH, JSON.stringify(envelope, null, 2), 'utf-8');
  } catch {
    // Continue with memory cache if filesystem is read-only
  }
}

function scheduleBackgroundNewsPolish(
  rawItems: RawParsedFeedItem[],
  basePayload: ServerNewsFeedResponse,
  expiresAt: number
): void {
  if (pendingNewsPolish) return;
  pendingNewsPolish = (async () => {
    try {
      const synthesized = await synthesizeDnsLocatorNewsDispatches(rawItems);
      if (synthesized.length === 0) return;
      const rewrittenMap = new Map(
        synthesized
          .filter((item) => item && typeof item.id === 'string')
          .map((item) => [
            item.id,
            {
              title: stripThirdPartyAndAiMentions(item.title || ''),
              summary: stripThirdPartyAndAiMentions(item.summary || ''),
              details: stripThirdPartyAndAiMentions(item.details || ''),
              categories: Array.isArray(item.categories)
                ? item.categories.map((c) => stripThirdPartyAndAiMentions(String(c))).slice(0, 3)
                : [],
              suggestedDomain:
                typeof item.suggestedDomain === 'string' &&
                /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(item.suggestedDomain.trim()) &&
                !/cloudflare|apnic|ripe|bleepingcomputer|sans\.edu/i.test(item.suggestedDomain)
                  ? item.suggestedDomain.trim().toLowerCase()
                  : 'www.dnslocator.online',
            },
          ])
      );

      const seenTitles = new Set<string>();
      const polishedArticles: ServerNewsArticle[] = [];
      for (const art of basePayload.articles) {
        const rw = rewrittenMap.get(art.id);
        const candidate: ServerNewsArticle = rw
          ? {
              ...art,
              title: rw.title || art.title,
              summary: rw.summary || art.summary,
              details: rw.details || art.details,
              categories: rw.categories.length > 0 ? rw.categories : art.categories,
              suggestedDomain: rw.suggestedDomain || art.suggestedDomain,
            }
          : art;
        const normTitle = candidate.title.toLowerCase();
        if (seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);
        polishedArticles.push(candidate);
      }

      writeStoredNewsFeed(
        {
          ...basePayload,
          articles: polishedArticles,
        },
        expiresAt
      );
    } catch {
      // Non-fatal: already serving sanitized articles
    } finally {
      pendingNewsPolish = null;
    }
  })();
}

export async function fetchLiveDnsNews(
  forceRefresh = false
): Promise<ServerNewsFeedResponse> {
  const now = Date.now();
  const stored = readStoredNewsFeed();
  if (!forceRefresh && stored && stored.expiresAt > now) {
    return {
      ...stored.data,
      cached: true,
    };
  }

  if (pendingNewsFetch) {
    return pendingNewsFetch;
  }

  pendingNewsFetch = (async () => {
    const settled = await Promise.allSettled(
      PRIVATE_NEWS_FEEDS.map((src) => fetchSingleFeed(src))
    );
    const collected: RawParsedFeedItem[] = [];

    for (const res of settled) {
      if (res.status === 'fulfilled' && res.value.length > 0) {
        collected.push(...res.value);
      }
    }

    if (collected.length === 0) {
      if (stored) {
        return {
          ...stored.data,
          cached: true,
        };
      }
      throw new Error('Unable to load DNS Locator news updates right now. Please retry shortly.');
    }

    const seen = new Set<string>();
    const deduped: RawParsedFeedItem[] = [];
    for (const article of collected) {
      const key = article.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(article);
    }

    const relevanceWeight: Record<NewsRelevance, number> = {
      dns: 36 * 60 * 60 * 1000,
      routing: 18 * 60 * 60 * 1000,
      infrastructure: 6 * 60 * 60 * 1000,
      security: 0,
    };

    deduped.sort((a, b) => {
      const scoreA = Date.parse(a.publishedAt) + relevanceWeight[a.relevance];
      const scoreB = Date.parse(b.publishedAt) + relevanceWeight[b.relevance];
      return scoreB - scoreA;
    });

    const topRaw = deduped.slice(0, 14);
    const articles: ServerNewsArticle[] = topRaw.map((raw) => ({
      id: raw.id,
      title: raw.title,
      publisher: 'DNS Locator',
      publishedAt: raw.publishedAt,
      summary: raw.summary,
      details: raw.details,
      categories: raw.categories.length > 0 ? raw.categories : [raw.relevance.toUpperCase()],
      relevance: raw.relevance,
      suggestedDomain: 'www.dnslocator.online',
    }));

    const payload: ServerNewsFeedResponse = {
      articles,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    const expiresAt = Date.now() + NEWS_CACHE_TTL_MS;
    writeStoredNewsFeed(payload, expiresAt);

    // Upgrade headlines & details asynchronously in the background so responses stay < 2s
    scheduleBackgroundNewsPolish(topRaw, payload, expiresAt);

    return payload;
  })().finally(() => {
    pendingNewsFetch = null;
  });

  return pendingNewsFetch;
}

