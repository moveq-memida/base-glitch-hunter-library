/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier (e.g., IP address, wallet address)
 * @param config Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, newEntry);
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit key from request
 * Uses X-Forwarded-For header or falls back to a default
 */
export function getRateLimitKey(request: Request, prefix: string = ''): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return prefix ? `${prefix}:${ip}` : ip;
}

// Preset configurations
export const RATE_LIMITS = {
  // Glitch submission: 10 per hour
  glitchSubmit: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  },
  // Profile update: 20 per hour
  profileUpdate: {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  },
  // General API: 100 per minute
  general: {
    limit: 100,
    windowMs: 60 * 1000,
  },
  // Auth callback: 30 per minute
  auth: {
    limit: 30,
    windowMs: 60 * 1000,
  },
} as const;
