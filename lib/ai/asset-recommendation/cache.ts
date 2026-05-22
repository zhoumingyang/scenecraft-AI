const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 120;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightCache = new Map<string, Promise<unknown>>();

function trimCache() {
  const now = Date.now();

  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }

  while (memoryCache.size > MAX_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) return;
    memoryCache.delete(oldestKey);
  }
}

export function buildAssetRecommendationCacheKey(scope: string, parts: unknown[]) {
  return JSON.stringify([scope, ...parts]);
}

export function getAssetRecommendationCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

export function setAssetRecommendationCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  trimCache();
  memoryCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value
  });
}

export async function getOrLoadAssetRecommendationCache<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
) {
  const cached = getAssetRecommendationCache<T>(key);
  if (cached) {
    return {
      value: cached,
      cacheHit: true
    };
  }

  const inFlight = inFlightCache.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return {
      value: await inFlight,
      cacheHit: true
    };
  }

  const request = load()
    .then((value) => {
      setAssetRecommendationCache(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inFlightCache.delete(key);
    });

  inFlightCache.set(key, request);

  return {
    value: await request,
    cacheHit: false
  };
}
