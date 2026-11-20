const CACHE_PREFIX = 'dnslocator_cache_v1:';
const HISTORY_KEY = 'dnslocator_history_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

interface CacheEnvelope<T> {
  storedAt: number;
  expiresAt: number;
  data: T;
}

export interface RecentLookupEntry {
  domain: string;
  mode: 'propagation' | 'all';
  recordType?: string;
  timestamp: number;
}

export function getCachedResult<T>(key: string): { data: T; expiresAt: number } | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return { data: parsed.data, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function setCachedResult<T>(key: string, data: T): number {
  const now = Date.now();
  const expiresAt = now + CACHE_TTL_MS;
  try {
    // Evict oldest cache entries if above cap
    const cacheKeys: { k: string; storedAt: number }[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        try {
          const parsed = JSON.parse(window.localStorage.getItem(k) || '{}');
          cacheKeys.push({ k, storedAt: Number(parsed.storedAt || 0) });
        } catch {
          cacheKeys.push({ k, storedAt: 0 });
        }
      }
    }
    if (cacheKeys.length >= MAX_CACHE_ENTRIES) {
      cacheKeys.sort((a, b) => a.storedAt - b.storedAt);
      const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES + 1);
      for (const item of toRemove) {
        window.localStorage.removeItem(item.k);
      }
    }

    const payload: CacheEnvelope<T> = {
      storedAt: now,
      expiresAt,
      data,
    };
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return expiresAt;
}

export function clearAllDnsCache(): number {
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keys.push(k);
      }
    }
    for (const k of keys) {
      window.localStorage.removeItem(k);
      removed++;
    }
  } catch {
    // Ignore
  }
  return removed;
}

export function getRecentLookups(): RecentLookupEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function addRecentLookup(entry: Omit<RecentLookupEntry, 'timestamp'>): RecentLookupEntry[] {
  const next: RecentLookupEntry = { ...entry, timestamp: Date.now() };
  try {
    const existing = getRecentLookups().filter(
      (item) =>
        !(
          item.domain === next.domain &&
          item.mode === next.mode &&
          item.recordType === next.recordType
        )
    );
    const updated = [next, ...existing].slice(0, 8);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [next];
  }
}
