import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";

/**
 * Cache configuration for different data types
 */
export const CACHE_TAGS = {
  POSTS: "posts",
  POST_BY_SLUG: "post-by-slug",
  POST_BY_ID: "post-by-id",
  CATEGORIES: "categories",
  TAGS: "tags",
  USER_POSTS: "user-posts",
  RELATED_POSTS: "related-posts",
  SEARCH_RESULTS: "search-results",
  USER_BOOKMARKS: "user-bookmarks",
  USER_FAVORITES: "user-favorites",
  POPULAR_POSTS: "popular-posts",
  ANALYTICS: "analytics",
} as const;

export const CACHE_DURATIONS = {
  POSTS_LIST: 300, // 5 minutes for posts list
  POST_DETAIL: 600, // 10 minutes for individual posts
  STATIC_DATA: 3600, // 1 hour for categories/tags
  USER_DATA: 60, // 1 minute for user-specific data
  SEARCH: 180, // 3 minutes for search results
  POPULAR_CONTENT: 900, // 15 minutes for popular content
  ANALYTICS: 1800, // 30 minutes for analytics
} as const;

/**
 * Enhanced cache storage interface for Redis integration
 */
interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

/**
 * In-memory cache implementation (fallback)
 */
class MemoryCache implements CacheStore {
  private cache = new Map<string, { value: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttl = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Redis cache implementation for production
 */
class RedisCache implements CacheStore {
  private redis: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  private isInitializing = false;

  private async getRedis() {
    if (this.redis) return this.redis;

    // Prevent multiple initialization attempts
    if (this.isInitializing) {
      // Wait for the initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.redis;
    }

    if (typeof window === "undefined") {
      this.isInitializing = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Redis } = require("ioredis");
        const redisConfig = this.getRedisConfig();

        if (redisConfig) {
          this.redis = new Redis(redisConfig);
          console.log("✅ Redis client configured.");

          this.redis.on("error", (err: Error) => {
            console.error("Redis Client Error", err);
          });

          this.redis.on("connect", () => {
            console.log("Redis client connected successfully.");
          });
        } else {
          console.warn(
            "Redis configuration not found. Falling back to memory cache."
          );
        }
      } catch (error) {
        console.warn(
          "Redis not available, falling back to memory cache",
          error
        );
        this.redis = null;
      } finally {
        this.isInitializing = false;
      }
    }
    return this.redis;
  }

  /**
   * Get Redis configuration with proper authentication handling
   */
  private getRedisConfig() {
    const redisUrl = process.env.REDIS_URL;
    console.log(
      `[Cache] Attempting to configure Redis. REDIS_URL found: ${!!redisUrl}`
    );

    // Option 1: Use REDIS_URL if provided and not empty
    if (redisUrl && redisUrl.trim() !== "") {
      return {
        url: redisUrl,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true,
        maxLoadingTimeout: 2000,
      };
    }

    // Option 2: Use individual environment variables
    const redisHost = process.env.REDIS_HOST;
    console.log(
      `[Cache] REDIS_URL not provided or empty. REDIS_HOST found: ${!!redisHost}`
    );

    if (!redisHost) {
      console.warn("[Cache] REDIS_HOST not set. Cannot configure Redis.");
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      host: redisHost,
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableReadyCheck: true,
      maxLoadingTimeout: 2000,
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }
    if (process.env.REDIS_USERNAME) {
      config.username = process.env.REDIS_USERNAME;
    }
    if (process.env.REDIS_DB) {
      config.db = parseInt(process.env.REDIS_DB, 10);
    }
    if (process.env.REDIS_TLS === "true") {
      config.tls = {
        rejectUnauthorized:
          process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
      };
    }
    return config;
  }

  async get(key: string): Promise<string | null> {
    const redis = await this.getRedis();
    if (!redis) return null;

    try {
      const result = await redis.get(key);
      if (process.env.NODE_ENV === "development") {
        console.log(`🔄 Redis GET: ${key} ${result ? "✅ HIT" : "❌ MISS"}`);
      }
      return result;
    } catch (error) {
      console.warn("Redis get error:", error);
      return null;
    }
  }

  async set(key: string, value: string, ttl = 300): Promise<void> {
    const redis = await this.getRedis();
    if (!redis) return;

    try {
      await redis.setex(key, ttl, value);
      if (process.env.NODE_ENV === "development") {
        console.log(`🔄 Redis SET: ${key} (TTL: ${ttl}s) ✅`);
      }
    } catch (error) {
      console.warn("Redis set error:", error);
    }
  }

  async del(key: string): Promise<void> {
    const redis = await this.getRedis();
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.warn("Redis del error:", error);
    }
  }

  async clear(pattern = "*"): Promise<void> {
    const redis = await this.getRedis();
    if (!redis) return;

    try {
      const stream = redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];
      stream.on("data", (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
      });

      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.warn("Redis clear error:", error);
    }
  }
}

// Cache store singleton
const cacheStore: CacheStore =
  process.env.NODE_ENV === "production" && process.env.REDIS_URL
    ? new RedisCache()
    : new MemoryCache();

// Log cache configuration
if (process.env.REDIS_URL) {
  console.log("🔄 Cache: Using Redis for caching");
} else {
  console.log("🔄 Cache: Using in-memory cache (development)");
}

// Export cache store for testing
export { cacheStore };

/**
 * Enhanced cache function with Redis support and result transformation
 */
export function createCachedFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string,
  revalidate: number,
  tags: string[] = [],
  transform?: (result: R) => R
) {
  return unstable_cache(
    async (...args: T): Promise<R> => {
      const cacheKey = `${keyPrefix}-${JSON.stringify(args)}`;

      try {
        // Try external cache first
        const cached = await cacheStore.get(cacheKey);
        if (cached) {
          const result = JSON.parse(cached) as R;
          return transform ? transform(result) : result;
        }
      } catch (error) {
        console.warn("Cache retrieval error:", error);
      }

      // Execute function and cache result
      const result = await fn(...args);

      try {
        await cacheStore.set(cacheKey, JSON.stringify(result), revalidate);
      } catch (error) {
        console.warn("Cache storage error:", error);
      }

      return transform ? transform(result) : result;
    },
    [keyPrefix],
    {
      revalidate,
      tags,
    }
  );
}

/**
 * Enhanced pagination key generation with sorting and filtering
 */
export function generatePaginationKey(
  baseKey: string,
  page: number,
  limit: number,
  additionalParams?: Record<string, string | number | boolean>
): string {
  const params = additionalParams
    ? Object.entries(additionalParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join("-")
    : "";

  return `${baseKey}-page:${page}-limit:${limit}${params ? `-${params}` : ""}`;
}

/**
 * Enhanced search key generation with better normalization
 */
export function generateSearchKey(
  query: string,
  filters: Record<string, string | number | boolean> = {}
): string {
  // Normalize query for better cache hits
  const normalizedQuery = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

  const filterString = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("-");

  return `search-${normalizedQuery}${filterString ? `-${filterString}` : ""}`;
}

/**
 * Cache warming function for critical data
 */
export async function warmCache() {
  if (process.env.NODE_ENV === "development") {
    return; // Skip in development
  }

  try {
    console.log("Starting cache warming...");

    // Import functions dynamically to avoid circular dependencies
    const { getCachedCategories, getCachedTags } = await import(
      "@/lib/queries"
    );
    const { getAllPosts } = await import("@/lib/content");

    // Warm critical caches
    await Promise.allSettled([
      getCachedCategories(),
      getCachedTags(),
      getAllPosts(false), // Published posts only
    ]);

    console.log("Cache warming completed");
  } catch (error) {
    console.warn("Cache warming failed:", error);
  }
}

/**
 * Enhanced cache invalidation with pattern support
 */
export async function revalidateCache(tags: string | string[]) {
  const tagArray = Array.isArray(tags) ? tags : [tags];

  // Next.js cache invalidation
  tagArray.forEach((tag) => {
    revalidateTag(tag);
  });

  // External cache invalidation
  try {
    await Promise.all(tagArray.map((tag) => cacheStore.clear(`*${tag}*`)));
  } catch (error) {
    console.warn("External cache invalidation error:", error);
  }
}

/**
 * Clear all caches (admin function)
 */
export async function clearAllCaches() {
  try {
    await cacheStore.clear();
    // Revalidate all Next.js cache tags
    Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));
  } catch (error) {
    console.warn("Cache clearing error:", error);
  }
}

/**
 * Cache performance monitoring
 */
export class CacheMetrics {
  private static hits = 0;
  private static misses = 0;
  private static errors = 0;

  static recordHit() {
    this.hits++;
  }

  static recordMiss() {
    this.misses++;
  }

  static recordError() {
    this.errors++;
  }

  static getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      total,
    };
  }

  static reset() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }
}

/**
 * Memoization wrapper for request-scoped caching
 */
export function memoize<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  getKey?: (...args: T) => string
): (...args: T) => Promise<R> {
  const cache = new Map<string, Promise<R>>();

  return (...args: T): Promise<R> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      CacheMetrics.recordHit();
      return cache.get(key)!;
    }

    CacheMetrics.recordMiss();
    const promise = fn(...args).catch((error) => {
      CacheMetrics.recordError();
      cache.delete(key); // Remove failed promise from cache
      throw error;
    });

    cache.set(key, promise);
    return promise;
  };
}
