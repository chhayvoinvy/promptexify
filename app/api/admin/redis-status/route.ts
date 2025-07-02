import { NextResponse } from "next/server";
import { CacheMetrics, cacheStore } from "@/lib/cache";

/**
 * Redis Status and Cache Performance API
 * GET /api/admin/redis-status
 */
export async function GET() {
  try {
    // Get cache metrics
    const cacheStats = CacheMetrics.getStats();

    // Test Redis connectivity
    let redisStatus: {
      connected: boolean;
      error: string | null;
      info: {
        ping: string;
        memory: Record<string, string>;
        url: string;
      } | null;
    } = { connected: false, error: null, info: null };

    try {
      // Dynamic import to handle optional ioredis dependency
      if (process.env.REDIS_URL) {
        const { Redis } = await import("ioredis");
        const redis = new Redis(process.env.REDIS_URL, {
          connectTimeout: 5000,
          commandTimeout: 3000,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });

        // Test connection with a simple ping
        await redis.connect();
        const pong = await redis.ping();

        // Get basic Redis info
        const info = await redis.info("memory");
        const memoryLines = info
          .split("\r\n")
          .filter(
            (line) =>
              line.includes("used_memory_human") ||
              line.includes("used_memory_peak_human") ||
              line.includes("total_system_memory_human")
          );

        redisStatus = {
          connected: pong === "PONG",
          error: null,
          info: {
            ping: pong,
            memory: memoryLines.reduce((acc, line) => {
              const [key, value] = line.split(":");
              if (key && value) acc[key] = value;
              return acc;
            }, {} as Record<string, string>),
            url:
              process.env.REDIS_URL?.replace(/:([^@]+)@/, ":****@") ||
              "Not configured",
          },
        };

        await redis.quit();
      } else {
        redisStatus = {
          connected: false,
          error: "REDIS_URL not configured - using memory cache",
          info: null,
        };
      }
    } catch (error) {
      redisStatus = {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown Redis error",
        info: null,
      };
    }

    // Test cache operations
    const cacheTest = await testCacheOperations();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      redis: redisStatus,
      cache: {
        metrics: cacheStats,
        test: cacheTest,
        recommendation: getCacheRecommendation(cacheStats),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        redisConfigured: !!process.env.REDIS_URL,
        fallback: !process.env.REDIS_URL ? "Memory cache" : "Redis cache",
      },
    });
  } catch (error) {
    console.error("Redis status check failed:", error);

    return NextResponse.json(
      {
        error: "Failed to check Redis status",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Test basic cache operations
 */
async function testCacheOperations() {
  try {
    const testKey = `test:${Date.now()}`;
    const testValue = "cache-test-value";

    // Test set operation
    const setStart = Date.now();
    await cacheStore.set(testKey, testValue, 60);
    const setTime = Date.now() - setStart;

    // Test get operation
    const getStart = Date.now();
    const retrievedValue = await cacheStore.get(testKey);
    const getTime = Date.now() - getStart;

    // Test delete operation
    const delStart = Date.now();
    await cacheStore.del(testKey);
    const delTime = Date.now() - delStart;

    // Verify deletion
    const deletedValue = await cacheStore.get(testKey);

    return {
      success: true,
      operations: {
        set: { success: true, time: `${setTime}ms` },
        get: {
          success: retrievedValue === testValue,
          time: `${getTime}ms`,
          valueMatch: retrievedValue === testValue,
        },
        delete: {
          success: deletedValue === null,
          time: `${delTime}ms`,
          verified: deletedValue === null,
        },
      },
      totalTime: `${setTime + getTime + delTime}ms`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Cache test failed",
      operations: null,
    };
  }
}

/**
 * Get cache performance recommendations
 */
function getCacheRecommendation(
  stats: ReturnType<typeof CacheMetrics.getStats>
) {
  const recommendations = [];

  if (stats.hitRate < 70) {
    recommendations.push(
      "Low hit rate - consider increasing cache TTL or improving cache warming"
    );
  }

  if (stats.hitRate > 95) {
    recommendations.push("Excellent hit rate - cache is performing optimally");
  }

  if (stats.errors > stats.hits * 0.05) {
    recommendations.push(
      "High error rate - check Redis connectivity and error logs"
    );
  }

  if (stats.total === 0) {
    recommendations.push(
      "No cache activity detected - verify cache is being used"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Cache performance is good");
  }

  return recommendations;
}
