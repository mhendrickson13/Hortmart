/**
 * Lightweight in-memory TTL cache for Lambda.
 * Survives warm invocations (same container), auto-evicts on cold start.
 *
 * Usage:
 *   const val = await cached('dashboard:30d', 60, () => heavyDbQuery());
 *
 * Max ~200 entries to stay within Lambda memory headroom.
 */
/** Get or set a cached value. `ttlSec` = seconds to keep. */
export declare function cached<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T>;
/** Invalidate a specific key or all keys matching a prefix */
export declare function invalidateCache(keyOrPrefix: string): void;
/** Clear entire cache (useful for test / reset) */
export declare function clearCache(): void;
//# sourceMappingURL=cache.d.ts.map