import { prisma } from "@/lib/prisma";

export interface PerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  itemCount: number;
  timestamp: Date;
  operation: string;
}

/**
 * Measure the performance of a database operation
 */
export async function measurePerformance<T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const endTime = performance.now();

    const metrics: PerformanceMetrics = {
      queryTime: endTime - startTime,
      cacheHit: false, // Will be set by cache layer
      itemCount: Array.isArray(result) ? result.length : 1,
      timestamp: new Date(),
      operation,
    };

    // Log slow queries (> 100ms) in development
    if (process.env.NODE_ENV === "development" && metrics.queryTime > 100) {
      console.warn(
        `⚠️ Slow query detected: ${operation} took ${metrics.queryTime.toFixed(
          2
        )}ms`
      );
    }

    return { result, metrics };
  } catch (error) {
    const endTime = performance.now();

    console.error(
      `❌ Query failed: ${operation} after ${(endTime - startTime).toFixed(
        2
      )}ms`,
      error
    );

    throw error;
  }
}

/**
 * Log cache hit/miss for monitoring
 */
export function logCacheEvent(
  operation: string,
  hit: boolean,
  duration: number
) {
  if (process.env.NODE_ENV === "development") {
    const status = hit ? "HIT" : "MISS";
    const emoji = hit ? "✅" : "❌";

    console.log(
      `${emoji} Cache ${status}: ${operation} (${duration.toFixed(2)}ms)`
    );
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  connectionCount?: number;
}> {
  const startTime = performance.now();

  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    return {
      healthy: true,
      responseTime,
    };
  } catch (error) {
    const endTime = performance.now();

    console.error("Database health check failed:", error);

    return {
      healthy: false,
      responseTime: endTime - startTime,
    };
  }
}

/**
 * Get query statistics (for admin dashboard)
 */
export async function getQueryStats() {
  try {
    const [postCount, userCount, categoryCount, tagCount] = await Promise.all([
      prisma.post.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.tag.count(),
    ]);

    return {
      posts: postCount,
      users: userCount,
      categories: categoryCount,
      tags: tagCount,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Failed to get query stats:", error);
    return null;
  }
}
