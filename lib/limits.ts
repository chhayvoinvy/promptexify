import { type RateLimitData } from "@/lib/schemas";
import { getRateLimitConfig } from "@/lib/sanitize";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blocked?: boolean;
  };
}

// In-memory store for rate limiting
// In production, consider using Redis or similar
const rateLimitStore: RateLimitStore = {};

// Cleanup interval to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of Object.entries(rateLimitStore)) {
      if (now > data.resetTime) {
        delete rateLimitStore[key];
      }
    }
  }, CLEANUP_INTERVAL);
}

// Start cleanup on module load
startCleanup();

/**
 * Redis support has been disabled for compatibility with the Edge Runtime. The
 * function below is a stub that always returns `null`, ensuring the library
 * gracefully falls back to the in-memory rate-limit store across all
 * environments.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRedisClient(): Promise<any> {
  return null;
}

interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Rate limiting function that tracks requests per identifier
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining count
 */
export async function checkRateLimit(
  config: RateLimitData & { identifier: string }
): Promise<RateLimitResult> {
  const { identifier, limit, window } = config;
  // Prefer Redis for distributed rate limiting
  const redis = await getRedisClient();

  if (redis) {
    const key = `rl:${identifier}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, window);
    }
    const ttl = await redis.pttl(key);
    const resetTime = Date.now() + (ttl >= 0 ? ttl : window);
    const blocked = count > limit;
    return {
      allowed: !blocked,
      count,
      remaining: blocked ? 0 : Math.max(0, limit - count),
      resetTime,
      blocked,
    };
  }

  // Fallback to in-memory store
  const now = Date.now();
  if (!rateLimitStore[identifier]) {
    rateLimitStore[identifier] = {
      count: 0,
      resetTime: now + window,
    };
  }
  const entry = rateLimitStore[identifier];
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + window;
    entry.blocked = false;
  }
  if (entry.blocked && now < entry.resetTime) {
    return {
      allowed: false,
      count: entry.count,
      remaining: 0,
      resetTime: entry.resetTime,
      blocked: true,
    };
  }
  if (entry.count >= limit) {
    entry.blocked = true;
    return {
      allowed: false,
      count: entry.count,
      remaining: 0,
      resetTime: entry.resetTime,
      blocked: true,
    };
  }
  entry.count += 1;
  return {
    allowed: true,
    count: entry.count,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
    blocked: false,
  };
}

/**
 * Create rate limit middleware for specific endpoints
 */
export function createRateLimit(limit: number, windowMs: number) {
  return async (identifier: string) => {
    return await checkRateLimit({
      identifier,
      limit,
      window: windowMs,
    });
  };
}

/**
 * Environment-aware rate limit configurations
 * Uses stricter limits in production, more lenient in development
 */
function createRateLimits() {
  const config = getRateLimitConfig();

  return {
    // Authentication endpoints
    auth: createRateLimit(config.auth.limit, config.auth.window),

    // File upload endpoints
    upload: createRateLimit(config.upload.limit, config.upload.window),

    // Post creation
    createPost: createRateLimit(
      config.createPost.limit,
      config.createPost.window
    ),

    // Tag creation
    createTag: createRateLimit(config.createTag.limit, config.createTag.window),

    // General API endpoints
    api: createRateLimit(config.api.limit, config.api.window),

    // Search endpoints
    search: createRateLimit(config.search.limit, config.search.window),

    // Bookmark/favorite actions
    interactions: createRateLimit(
      config.interactions.limit,
      config.interactions.window
    ),
  };
}

/**
 * Rate limit configurations that adapt to environment
 */
export const rateLimits = createRateLimits();

/**
 * Get rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.count + result.remaining),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
    "X-RateLimit-Blocked": result.blocked ? "true" : "false",
  };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  // Use user ID if available (more specific)
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const remoteAddress = forwarded?.split(",")[0] || realIp;

  return `ip:${remoteAddress || "unknown"}`;
}

/**
 * Clear rate limit for specific identifier (useful for testing)
 */
export function clearRateLimit(identifier: string) {
  delete rateLimitStore[identifier];
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  limit: number,
  window: number
) {
  const now = Date.now();
  const entry = rateLimitStore[identifier];

  if (!entry || now > entry.resetTime) {
    return {
      count: 0,
      remaining: limit,
      resetTime: now + window,
      blocked: false,
    };
  }

  return {
    count: entry.count,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
    blocked: entry.blocked || false,
  };
}

/**
 * Log rate limit violations for monitoring
 */
export function logRateLimitViolation(
  identifier: string,
  endpoint: string,
  userAgent?: string
) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    identifier,
    endpoint,
    userAgent,
    type: "RATE_LIMIT_VIOLATION",
  };

  // In production, this should be sent to a proper logging service
  if (process.env.NODE_ENV === "production") {
    console.warn("Rate limit violation:", JSON.stringify(logData));
  } else {
    console.log("Rate limit violation (dev):", logData);
  }
}

/**
 * Get rate limit statistics for monitoring
 */
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    totalEntries: Object.keys(rateLimitStore).length,
    activeEntries: 0,
    blockedEntries: 0,
    expiredEntries: 0,
  };

  for (const entry of Object.values(rateLimitStore)) {
    if (now > entry.resetTime) {
      stats.expiredEntries++;
    } else {
      stats.activeEntries++;
      if (entry.blocked) {
        stats.blockedEntries++;
      }
    }
  }

  return stats;
}
