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
