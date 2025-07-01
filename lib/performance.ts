import { prisma } from "@/lib/prisma";
import { CacheMetrics, warmCache } from "@/lib/cache";
import { DatabaseMetrics } from "@/lib/prisma";

export interface PerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  itemCount: number;
  timestamp: Date;
  operation: string;
}

/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetrics {
  cache: {
    hits: number;
    misses: number;
    errors: number;
    hitRate: number;
    total: number;
  };
  database: {
    averageQueryTime: number;
    slowQueries: number;
    totalQueries: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
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

/**
 * Get comprehensive performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const cacheStats = CacheMetrics.getStats();

  return {
    cache: cacheStats,
    database: {
      averageQueryTime: DatabaseMetrics.getAverageQueryTime(),
      slowQueries: DatabaseMetrics.getSlowQueries(),
      totalQueries: cacheStats.total, // Proxy for total queries
    },
    system: {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    },
  };
}

/**
 * Performance monitoring middleware for API routes
 */
export function withPerformanceMonitoring<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      // Log slow operations
      if (duration > 1000) {
        console.warn(
          `Slow operation detected: ${operationName} took ${duration}ms`
        );
      }

      // Track performance in development
      if (process.env.NODE_ENV === "development") {
        console.log(`${operationName}: ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `Operation failed: ${operationName} after ${duration}ms`,
        error
      );
      throw error;
    }
  };
}

/**
 * Cache warming scheduler for production
 */
export class CacheWarmer {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isWarming = false;

  /**
   * Start automatic cache warming
   */
  static start(intervalMinutes = 30) {
    if (this.intervalId || process.env.NODE_ENV === "development") {
      return;
    }

    console.log(
      `Starting cache warmer with ${intervalMinutes} minute interval`
    );

    // Initial warming
    this.warmCaches();

    // Schedule periodic warming
    this.intervalId = setInterval(() => {
      this.warmCaches();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic cache warming
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Cache warmer stopped");
    }
  }

  /**
   * Manually trigger cache warming
   */
  static async warmCaches() {
    if (this.isWarming) {
      console.log("Cache warming already in progress, skipping...");
      return;
    }

    this.isWarming = true;

    try {
      console.log("Starting cache warming...");
      await warmCache();
      console.log("Cache warming completed successfully");
    } catch (error) {
      console.error("Cache warming failed:", error);
    } finally {
      this.isWarming = false;
    }
  }
}

/**
 * Database connection health check
 */
export async function checkSystemHealth(): Promise<{
  database: boolean;
  cache: boolean;
  memory: { used: number; free: number; percentUsed: number };
  uptime: number;
}> {
  // Check database health
  let databaseHealthy = false;
  try {
    const { checkDatabaseHealth } = await import("@/lib/prisma");
    databaseHealthy = await checkDatabaseHealth();
  } catch (error) {
    console.error("Database health check failed:", error);
  }

  // Check cache health (simple test)
  let cacheHealthy = false;
  try {
    const { createCachedFunction, CACHE_DURATIONS } = await import(
      "@/lib/cache"
    );
    const testFn = createCachedFunction(
      async () => "test",
      "health-check",
      CACHE_DURATIONS.USER_DATA
    );
    await testFn();
    cacheHealthy = true;
  } catch (error) {
    console.error("Cache health check failed:", error);
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const freeMemory = totalMemory - usedMemory;

  return {
    database: databaseHealthy,
    cache: cacheHealthy,
    memory: {
      used: usedMemory,
      free: freeMemory,
      percentUsed: (usedMemory / totalMemory) * 100,
    },
    uptime: process.uptime(),
  };
}

/**
 * Memory usage monitoring
 */
export function monitorMemoryUsage() {
  const usage = process.memoryUsage();
  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  console.log("Memory Usage:");
  console.log(`  RSS: ${formatBytes(usage.rss)}`);
  console.log(`  Heap Total: ${formatBytes(usage.heapTotal)}`);
  console.log(`  Heap Used: ${formatBytes(usage.heapUsed)}`);
  console.log(`  External: ${formatBytes(usage.external)}`);
  console.log(`  Array Buffers: ${formatBytes(usage.arrayBuffers)}`);

  // Warn if memory usage is high
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
  if (heapUsedPercent > 80) {
    console.warn(`High memory usage detected: ${heapUsedPercent.toFixed(2)}%`);
  }
}

/**
 * Performance optimization recommendations
 */
export function getOptimizationRecommendations(): string[] {
  const metrics = getPerformanceMetrics();
  const recommendations: string[] = [];

  // Cache recommendations
  if (metrics.cache.hitRate < 70) {
    recommendations.push(
      "Cache hit rate is low. Consider increasing cache durations or warming critical paths."
    );
  }

  // Database recommendations
  if (metrics.database.averageQueryTime > 500) {
    recommendations.push(
      "Database queries are slow. Consider adding indexes or optimizing queries."
    );
  }

  if (metrics.database.slowQueries > 10) {
    recommendations.push(
      "Multiple slow queries detected. Review query performance and database schema."
    );
  }

  // Memory recommendations
  const memoryPercent =
    (metrics.system.memoryUsage.heapUsed /
      metrics.system.memoryUsage.heapTotal) *
    100;
  if (memoryPercent > 80) {
    recommendations.push(
      "High memory usage detected. Consider implementing memory cleanup or increasing server resources."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("System performance is optimal!");
  }

  return recommendations;
}

/**
 * Initialize performance monitoring in production
 */
export function initializePerformanceMonitoring() {
  if (process.env.NODE_ENV === "production") {
    // Start cache warming
    CacheWarmer.start(30); // Every 30 minutes

    // Monitor memory usage periodically
    setInterval(monitorMemoryUsage, 5 * 60 * 1000); // Every 5 minutes

    console.log("Performance monitoring initialized");
  }
}

/**
 * Graceful shutdown cleanup
 */
export function shutdownPerformanceMonitoring() {
  CacheWarmer.stop();
  console.log("Performance monitoring shutdown complete");
}

// Auto-initialize in production
if (process.env.NODE_ENV === "production" && typeof window === "undefined") {
  initializePerformanceMonitoring();

  // Graceful shutdown
  process.on("SIGTERM", shutdownPerformanceMonitoring);
  process.on("SIGINT", shutdownPerformanceMonitoring);
}
