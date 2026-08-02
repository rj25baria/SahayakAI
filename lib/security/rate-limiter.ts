/**
 * Enterprise Rate Limiter for API Endpoints and Sensitive Operations
 * Implements a sliding-window rate limiting algorithm in memory.
 */

interface RateLimitStore {
  tokens: number;
  lastReset: number;
}

const storage = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum allowed requests per window
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 20 }
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const entry = storage.get(identifier) || { tokens: options.maxRequests, lastReset: now };

  // Reset window if elapsed
  if (now - entry.lastReset > options.windowMs) {
    entry.tokens = options.maxRequests;
    entry.lastReset = now;
  }

  if (entry.tokens > 0) {
    entry.tokens -= 1;
    storage.set(identifier, entry);
    return {
      allowed: true,
      remaining: entry.tokens,
      resetMs: options.windowMs - (now - entry.lastReset),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetMs: options.windowMs - (now - entry.lastReset),
  };
}
