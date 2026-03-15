/**
 * Simple in-memory rate limiter.
 * For single-replica deployment. Replace with Redis when scaling.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  consecutiveFailures: number;
  lockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now && entry.lockedUntil < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitConfig {
  windowMs: number;    // Time window in ms
  maxRequests: number; // Max requests per window
  lockoutThreshold: number; // Consecutive failures before lockout
  lockoutMs: number;   // Lockout duration in ms
}

export const JOIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 10,
  lockoutThreshold: 10,
  lockoutMs: 5 * 60 * 1000, // 5 minutes
};

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry) {
    entry = { count: 0, resetAt: now + config.windowMs, consecutiveFailures: 0, lockedUntil: 0 };
    store.set(ip, entry);
  }

  // Check lockout
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }

  // Reset window if expired
  if (entry.resetAt < now) {
    entry.count = 0;
    entry.resetAt = now + config.windowMs;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true };
}

export function recordFailure(ip: string, config: RateLimitConfig): void {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry) return;

  entry.consecutiveFailures++;
  if (entry.consecutiveFailures >= config.lockoutThreshold) {
    entry.lockedUntil = now + config.lockoutMs;
    entry.consecutiveFailures = 0;
  }
}

export function resetFailures(ip: string): void {
  const entry = store.get(ip);
  if (entry) {
    entry.consecutiveFailures = 0;
  }
}
