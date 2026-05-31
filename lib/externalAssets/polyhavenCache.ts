type CachedResponse<T> = {
  expiresAt: number;
  value: T;
};

const RESPONSE_CACHE_TTL_MS = 60_000;
const RESPONSE_CACHE_MAX_ENTRIES = 80;

const responseCache = new Map<string, CachedResponse<unknown>>();
const inFlightResponseCache = new Map<string, Promise<unknown>>();

export function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key) as CachedResponse<T> | undefined;
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }

  return cached.value;
}

function trimResponseCache() {
  if (responseCache.size < RESPONSE_CACHE_MAX_ENTRIES) {
    return;
  }

  const now = Date.now();
  for (const [key, cached] of responseCache) {
    if (cached.expiresAt <= now) {
      responseCache.delete(key);
    }
  }

  while (responseCache.size >= RESPONSE_CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) {
      return;
    }

    responseCache.delete(oldestKey);
  }
}

export function setCachedResponse<T>(key: string, value: T) {
  trimResponseCache();
  responseCache.set(key, {
    expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
    value
  });
}

export async function getOrLoadCachedResponse<T>(key: string, load: () => Promise<T>) {
  const cached = getCachedResponse<T>(key);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightResponseCache.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const request = load()
    .then((value) => {
      setCachedResponse(key, value);
      return value;
    })
    .finally(() => {
      inFlightResponseCache.delete(key);
    });

  inFlightResponseCache.set(key, request);
  return request;
}
