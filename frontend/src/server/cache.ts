/**
 * Simple TTL cache for API responses.
 * Reduces API usage to stay within free tiers.
 * Fear & Greed: daily | Macro: daily | Protocol: hourly | Prices: 2 min
 */
const cache = new Map<string, { value: unknown; expires: number }>();

const TTL_MS: Record<string, number> = {
  fearGreed: 24 * 60 * 60 * 1000,   // 24h
  macro: 24 * 60 * 60 * 1000,       // 24h
  protocol: 60 * 60 * 1000,        // 1h
  prices: 2 * 60 * 1000,            // 2 min
  fred: 24 * 60 * 60 * 1000,        // 24h
};

function cacheKey(prefix: string, key: string): string {
  return `aegis:${prefix}:${key}`;
}

export function get<T>(prefix: string, key: string): T | null {
  const k = cacheKey(prefix, key);
  const entry = cache.get(k);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.value as T;
}

export function set(prefix: string, key: string, value: unknown): void {
  const ttl = TTL_MS[prefix] ?? 60 * 1000;
  cache.set(cacheKey(prefix, key), {
    value,
    expires: Date.now() + ttl,
  });
}

export async function getOrFetch<T>(
  prefix: string,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = get<T>(prefix, key);
  if (cached != null) return cached;
  const value = await fetcher();
  set(prefix, key, value);
  return value;
}
