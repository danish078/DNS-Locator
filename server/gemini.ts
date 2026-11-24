import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface AiMissionConfig {
  missionTitle: string;
  briefing: string;
  speedScale: number;
  gravityScale: number;
  timeoutRatio: number;
  orbDensity: number;
  hazardGroundLabel: string;
  hazardAirLabel: string;
  targetScore: number;
}

export interface AiDebriefResult {
  rankTitle: string;
  coachingTip: string;
  dnsFact: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add an API key in Settings > Secrets to use AI game features.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return (min + max) / 2;
  return Math.min(max, Math.max(min, val));
}

function sanitizeHazardTag(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return cleaned.length >= 2 ? cleaned : fallback;
}

function extractCleanGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown Gemini error');
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Not raw JSON
  }
  return raw;
}

function isTransientHighDemand(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand');
}

async function callGeminiStructured(
  ai: GoogleGenAI,
  contents: string,
  config: Parameters<GoogleGenAI['models']['generateContent']>[0]['config']
) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config,
    });
  } catch (err) {
    if (!isTransientHighDemand(err)) {
      throw new Error(extractCleanGeminiError(err));
    }
    try {
      return await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config,
      });
    } catch (retryErr) {
      throw new Error(extractCleanGeminiError(retryErr));
    }
  }
}

export async function generateAiGameMission(params: {
  domain?: string;
  difficulty?: 'chill' | 'standard' | 'turbo';
  previousScore?: number;
}): Promise<AiMissionConfig> {
  const ai = getGeminiClient();
  const domainHint = params.domain?.trim() ? `target domain "${params.domain.trim()}"` : 'global DNS propagation';
  const difficulty = params.difficulty ?? 'standard';
  const prevScore = typeof params.previousScore === 'number' && params.previousScore >= 0 ? Math.floor(params.previousScore) : 0;

  const response = await callGeminiStructured(
    ai,
    `Generate a custom 2D arcade mission for "DNS Packet Runner" themed around ${domainHint}. Difficulty preset: ${difficulty}. Player's previous score: ${prevScore}. Keep missionTitle under 5 words and briefing to 1 crisp sentence under 110 characters.`,
    {
      systemInstruction:
        'You are an arcade game wave director for a DNS diagnostics mini-game. Return balanced physics parameters and concise DNS-themed labels.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          missionTitle: {
            type: Type.STRING,
            description: 'Short catchy DNS mission name (2 to 4 words).',
          },
          briefing: {
            type: Type.STRING,
            description: 'Single concise tactical sentence under 110 characters.',
          },
          speedScale: {
            type: Type.NUMBER,
            description: 'Game speed multiplier: 0.85 for chill, 1.0-1.15 for standard, 1.2-1.45 for turbo.',
          },
          gravityScale: {
            type: Type.NUMBER,
            description: 'Jump gravity multiplier between 0.90 and 1.15.',
          },
          timeoutRatio: {
            type: Type.NUMBER,
            description: 'Fraction of floating aerial barriers vs ground blocks, between 0.15 and 0.65.',
          },
          orbDensity: {
            type: Type.NUMBER,
            description: 'Collectible cache orb frequency multiplier between 0.85 and 1.45.',
          },
          hazardGroundLabel: {
            type: Type.STRING,
            description: '2 to 4 uppercase characters for ground obstacles (e.g. NX, DROP, 502, SERV).',
          },
          hazardAirLabel: {
            type: Type.STRING,
            description: '2 to 4 uppercase characters for aerial obstacles (e.g. TTL, LAG, HOP, LOSS).',
          },
          targetScore: {
            type: Type.INTEGER,
            description: 'Target score goal between 200 and 1200.',
          },
        },
        required: [
          'missionTitle',
          'briefing',
          'speedScale',
          'gravityScale',
          'timeoutRatio',
          'orbDensity',
          'hazardGroundLabel',
          'hazardAirLabel',
          'targetScore',
        ],
      },
    }
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty mission response.');
  }

  const parsed = JSON.parse(rawText) as Partial<AiMissionConfig>;
  return {
    missionTitle:
      typeof parsed.missionTitle === 'string' && parsed.missionTitle.trim()
        ? parsed.missionTitle.trim().slice(0, 48)
        : 'Anycast Edge Blitz',
    briefing:
      typeof parsed.briefing === 'string' && parsed.briefing.trim()
        ? parsed.briefing.trim().slice(0, 140)
        : 'Dodge firewall spikes and chain cache orbs across regional resolvers.',
    speedScale: clamp(Number(parsed.speedScale), 0.85, 1.45),
    gravityScale: clamp(Number(parsed.gravityScale), 0.9, 1.15),
    timeoutRatio: clamp(Number(parsed.timeoutRatio), 0.15, 0.65),
    orbDensity: clamp(Number(parsed.orbDensity), 0.8, 1.5),
    hazardGroundLabel: sanitizeHazardTag(parsed.hazardGroundLabel, 'NX'),
    hazardAirLabel: sanitizeHazardTag(parsed.hazardAirLabel, 'TTL'),
    targetScore: Math.round(clamp(Number(parsed.targetScore), 200, 1200)),
  };
}

export async function generateAiGameDebrief(params: {
  score: number;
  bestScore: number;
  dodgedCount: number;
  orbsCollected: number;
  maxCombo: number;
  crashCause: 'nxdomain' | 'timeout' | 'none';
  speedMultiplier: number;
  activeDomain?: string;
  missionTitle?: string;
}): Promise<AiDebriefResult> {
  const ai = getGeminiClient();
  const domainContext = params.activeDomain?.trim()
    ? `Active domain being looked up: ${params.activeDomain.trim()}.`
    : 'No active domain selected.';

  const response = await callGeminiStructured(
    ai,
    `Analyze this DNS Packet Runner run:
- Mission: ${params.missionTitle || 'Classic Propagation'}
- Score: ${params.score} (Personal Best: ${params.bestScore})
- Obstacles dodged: ${params.dodgedCount}
- Orbs collected: ${params.orbsCollected}, Max combo: ${params.maxCombo}x
- Top speed: ${params.speedMultiplier}x
- Crash cause: ${params.crashCause === 'timeout' ? 'hit mid-air TTL barrier' : params.crashCause === 'nxdomain' ? 'hit ground NX firewall spike' : 'finished run'}
- ${domainContext}
Provide a punchy rankTitle (2-4 words), one concise actionable coachingTip (1-2 short sentences), and one crisp dnsFact (1 sentence).`,
    {
      systemInstruction:
        'You are an upbeat arcade coach and DNS network engineer. Keep responses concise, accurate, and directly tailored to the telemetry.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rankTitle: {
            type: Type.STRING,
            description: 'Short DNS-themed player rank title (2 to 4 words).',
          },
          coachingTip: {
            type: Type.STRING,
            description: 'Actionable gameplay tip referencing the crash cause or combo in 1-2 short sentences.',
          },
          dnsFact: {
            type: Type.STRING,
            description: 'One short, accurate DNS engineering takeaway.',
          },
        },
        required: ['rankTitle', 'coachingTip', 'dnsFact'],
      },
    }
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty debrief response.');
  }

  const parsed = JSON.parse(rawText) as Partial<AiDebriefResult>;
  return {
    rankTitle:
      typeof parsed.rankTitle === 'string' && parsed.rankTitle.trim()
        ? parsed.rankTitle.trim().slice(0, 48)
        : 'Resolver Scout',
    coachingTip:
      typeof parsed.coachingTip === 'string' && parsed.coachingTip.trim()
        ? parsed.coachingTip.trim().slice(0, 260)
        : 'Use Down/S to fast-fall beneath floating TTL barriers and chain orbs for combo multipliers.',
    dnsFact:
      typeof parsed.dnsFact === 'string' && parsed.dnsFact.trim()
        ? parsed.dnsFact.trim().slice(0, 240)
        : 'Lower TTL values accelerate DNS updates globally while Anycast resolvers route users to the closest node.',
  };
}

export interface DailyNewsArticleInput {
  id: string;
  title: string;
  publishedAt: string;
  summary: string;
  categories: string[];
  relevance: 'dns' | 'routing' | 'security' | 'infrastructure';
}

export interface RewrittenNewsItem {
  id: string;
  title: string;
  summary: string;
  details: string;
  categories: string[];
  suggestedDomain?: string;
}

export interface GeneratedDailyBlogPayload {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readTimeMinutes: number;
  keywords: string[];
  suggestedDomain: string;
  suggestedRecordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'CAA';
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    tip?: string;
  }>;
  isDailyBrief: true;
}

const VALID_SUGGESTED_RECORD_TYPES = new Set([
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'SOA',
  'CAA',
]);

const THIRD_PARTY_PATTERNS: Array<[RegExp, string]> = [
  [/\bat\s+cloudflare\b/gi, 'at global edge networks'],
  [/\bfrom\s+cloudflare(?:\s+blog)?\b/gi, 'across global edge infrastructure'],
  [/\bcloudflare(?:'s)?(?:\s+blog)?\b/gi, 'edge network'],
  [/\bapnic(?:'s)?(?:\s+blog)?\b/gi, 'regional internet registry'],
  [/\bripe(?:'s)?(?:\s+labs|\s+ncc)?\b/gi, 'internet measurement'],
  [/\bsans(?:\s+internet\s+storm\s+center|\s+isc)?\b/gi, 'threat intelligence'],
  [/\bbleeping\s*computer\b/gi, 'security advisory'],
  [/\btechcrunch\b/gi, 'industry reports'],
  [/\barstechnica\b/gi, 'industry reports'],
  [/\bzdnet\b/gi, 'industry reports'],
  [/\bai[- ]generated\b/gi, 'editorial'],
  [/\bgenerated\s+(?:by|with|via|from)\s+(?:ai|gemini|llm)\b/gi, 'compiled by DNS Locator'],
];

export function stripThirdPartyAndAiMentions(text: string): string {
  let cleaned = text;
  for (const [pattern, replacement] of THIRD_PARTY_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bThe post\b[\s\S]*?\bappeared first on\b[\s\S]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
}

export async function synthesizeDnsLocatorNewsDispatches(
  rawItems: DailyNewsArticleInput[]
): Promise<RewrittenNewsItem[]> {
  const ai = getGeminiClient();
  const compactInputs = rawItems.slice(0, 12).map((item) => ({
    id: item.id,
    headline: item.title,
    summary: item.summary,
    topics: item.categories,
    relevance: item.relevance,
  }));

  const response = await callGeminiStructured(
    ai,
    `Rewrite these ${compactInputs.length} current DNS, routing, and internet security news briefs as original DNS Locator Newsroom dispatches.

Input items:
${JSON.stringify(compactInputs)}

Strict Rules:
- Write exclusively as DNS Locator's technical news desk.
- NEVER mention Cloudflare, APNIC, RIPE, SANS, BleepingComputer, or any third-party blog, publisher, or news source name.
- NEVER include external URLs or links.
- NEVER mention AI or automated generation.
- Keep titles crisp (55-95 chars), summary concise (130-190 chars), and details rich (2-3 clear sentences explaining why it matters for DNS, latency, routing, or domain security).
- Provide 2-3 clean topic tags in categories and an optional safe public domain (such as dnslocator.online, google.com, github.com, icann.org, or quad9.net) for readers to test.`,
    {
      systemInstruction:
        'You are the managing editor at DNS Locator Newsroom. Produce neutral, authoritative, third-party-free DNS and internet infrastructure news briefs.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                details: { type: Type.STRING },
                categories: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                suggestedDomain: { type: Type.STRING },
              },
              required: ['id', 'title', 'summary', 'details', 'categories'],
            },
          },
        },
        required: ['items'],
      },
    }
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Empty newsroom synthesis response.');
  }
  const parsed = JSON.parse(rawText) as { items?: RewrittenNewsItem[] };
  return Array.isArray(parsed.items) ? parsed.items : [];
}

export async function generateDailyBlogPostFromNews(
  article: DailyNewsArticleInput,
  dateKey: string
): Promise<GeneratedDailyBlogPayload> {
  const ai = getGeminiClient();

  const prompt = `Write an original, deeply practical DNS & network engineering blog post for DNS Locator inspired by today's featured infrastructure update (${dateKey}):

Topic Focus: ${article.title}
Context: ${article.summary}
Category Hint: ${article.relevance}

Strict Requirements:
- Write in the authoritative editorial voice of DNS Locator.
- NEVER mention any third-party news website, blog, publisher, or vendor brand name (do NOT mention Cloudflare, APNIC, RIPE, SANS, BleepingComputer, or any external source).
- NEVER mention AI, Gemini, LLMs, or automated/generated writing anywhere in the title, excerpt, body, or keywords.
- Include 5 to 7 relevant SEO and technical DNS keywords (e.g., "dns check", "dns propagation", "ip address lookup", "dnssec", "ttl caching", "anycast routing", plus topic-specific terms).
- Produce 3 detailed, helpful sections with concrete paragraphs, actionable bullet checklists, and practical tips for DNS Locator users.
- Suggest a valid public domain (e.g., dnslocator.online, google.com, github.com, or quad9.net) and recordType for readers to inspect on DNS Locator.`;

  const response = await callGeminiStructured(
    ai,
    prompt,
    {
      systemInstruction:
        'You are a senior DNS & network reliability technical writer at DNS Locator. Never mention external news sources, third-party publishers, or AI.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Clear, authoritative technical blog headline (50-85 chars).',
          },
          metaDescription: {
            type: Type.STRING,
            description: 'SEO meta description under 160 characters.',
          },
          excerpt: {
            type: Type.STRING,
            description: 'Concise 2-sentence summary for the blog card (120-210 chars).',
          },
          category: {
            type: Type.STRING,
            description: 'Short category such as "DNS Propagation", "Routing & IPv6", "DNS Security", or "Network Diagnostics".',
          },
          readTimeMinutes: {
            type: Type.INTEGER,
            description: 'Estimated reading time in minutes (between 4 and 7).',
          },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '5 to 7 relevant lowercase technical & SEO keywords.',
          },
          suggestedDomain: {
            type: Type.STRING,
            description: 'Clean public domain hostname (no protocol/path) to inspect on DNS Locator.',
          },
          suggestedRecordType: {
            type: Type.STRING,
            description: 'One of: A, AAAA, CNAME, MX, TXT, NS, SOA, CAA.',
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                paragraphs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                bullets: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tip: { type: Type.STRING },
              },
              required: ['heading', 'paragraphs'],
            },
          },
        },
        required: [
          'title',
          'metaDescription',
          'excerpt',
          'category',
          'readTimeMinutes',
          'keywords',
          'suggestedDomain',
          'suggestedRecordType',
          'sections',
        ],
      },
    }
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Unable to compose today’s daily blog post.');
  }

  const parsed = JSON.parse(rawText) as Partial<GeneratedDailyBlogPayload>;
  const rawTitle =
    typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, 120)
      : `Daily DNS & Network Engineering Brief (${dateKey})`;
  const title = stripThirdPartyAndAiMentions(rawTitle);

  const cleanedDomain =
    typeof parsed.suggestedDomain === 'string' &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parsed.suggestedDomain.trim()) &&
    !/cloudflare|apnic|ripe|bleepingcomputer|sans\.edu/i.test(parsed.suggestedDomain)
      ? parsed.suggestedDomain.trim().toLowerCase()
      : 'www.dnslocator.online';

  const rawType = typeof parsed.suggestedRecordType === 'string' ? parsed.suggestedRecordType.toUpperCase().trim() : 'A';
  const suggestedRecordType = (
    VALID_SUGGESTED_RECORD_TYPES.has(rawType) ? rawType : 'A'
  ) as GeneratedDailyBlogPayload['suggestedRecordType'];

  const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const sections = rawSections
    .filter((s) => s && typeof s.heading === 'string' && Array.isArray(s.paragraphs) && s.paragraphs.length > 0)
    .slice(0, 4)
    .map((s) => ({
      heading: stripThirdPartyAndAiMentions(s.heading),
      paragraphs: s.paragraphs
        .filter((p) => typeof p === 'string' && p.trim().length > 0)
        .map((p) => stripThirdPartyAndAiMentions(p)),
      bullets: Array.isArray(s.bullets)
        ? s.bullets
            .filter((b) => typeof b === 'string' && b.trim().length > 0)
            .map((b) => stripThirdPartyAndAiMentions(b))
            .slice(0, 5)
        : undefined,
      tip: typeof s.tip === 'string' && s.tip.trim() ? stripThirdPartyAndAiMentions(s.tip) : undefined,
    }));

  if (sections.length === 0) {
    throw new Error('Daily blog post returned no readable sections.');
  }

  const slugBase = slugifyTitle(title) || 'dns-locator-daily-brief';
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .filter((k) => typeof k === 'string' && k.trim().length > 0)
        .map((k) => stripThirdPartyAndAiMentions(k).toLowerCase())
        .filter((k) => k.length > 1 && !/\b(ai|gemini)\b/.test(k))
        .slice(0, 7)
    : ['dns check', 'dns propagation', 'ip address lookup', 'ttl', 'routing'];

  return {
    slug: `daily-${dateKey}-${slugBase}`,
    title,
    metaDescription: stripThirdPartyAndAiMentions(
      typeof parsed.metaDescription === 'string' && parsed.metaDescription.trim()
        ? parsed.metaDescription.trim().slice(0, 165)
        : article.summary.slice(0, 155)
    ),
    excerpt: stripThirdPartyAndAiMentions(
      typeof parsed.excerpt === 'string' && parsed.excerpt.trim()
        ? parsed.excerpt.trim().slice(0, 260)
        : article.summary.slice(0, 220)
    ),
    category: stripThirdPartyAndAiMentions(
      typeof parsed.category === 'string' && parsed.category.trim()
        ? parsed.category.trim().slice(0, 40)
        : 'DNS Propagation'
    ),
    publishedAt: dateKey,
    readTimeMinutes: Math.round(clamp(Number(parsed.readTimeMinutes), 4, 7)),
    keywords: keywords.length >= 3 ? keywords : ['dns check', 'dns propagation', 'ip address lookup', 'network diagnostics'],
    suggestedDomain: cleanedDomain,
    suggestedRecordType,
    sections,
    isDailyBrief: true,
  };
}
