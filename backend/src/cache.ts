/**
 * Lightweight in-memory TTL cache for Lambda.
 * Survives warm invocations (same container), auto-evicts on cold start.
 *
 * Usage:
 *   const val = await cached('dashboard:30d', 60, () => heavyDbQuery());
 *
 * Max ~200 entries to stay within Lambda memory headroom.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // epoch ms
}

const store = new Map<string, CacheEntry<any>>();
const MAX_ENTRIES = 200;

/** Get or set a cached value. `ttlSec` = seconds to keep. */
export async function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();

  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.data;

  const data = await fn();

  // Evict oldest entries if at capacity
  if (store.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestExp = Infinity;
    for (const [k, v] of store) {
      if (v.expiresAt < oldestExp) { oldestExp = v.expiresAt; oldestKey = k; }
    }
    if (oldestKey) store.delete(oldestKey);
  }

  store.set(key, { data, expiresAt: now + ttlSec * 1000 });
  return data;
}

/** Invalidate a specific key or all keys matching a prefix */
export function invalidateCache(keyOrPrefix: string) {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix);
  } else {
    for (const k of store.keys()) {
      if (k.startsWith(keyOrPrefix)) store.delete(k);
    }
  }
}

/** Clear entire cache (useful for test / reset) */
export function clearCache() {
  store.clear();
}
