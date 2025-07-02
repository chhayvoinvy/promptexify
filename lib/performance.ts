import { CacheMetrics, warmCache } from "@/lib/cache";

/**
 * Performance monitoring and optimization utilities
 * Enhanced with webpack optimization and bundle analysis
 */

interface PerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  itemCount: number;
  timestamp: Date;
  operation: string;
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
 * Memoized function creator for expensive computations
 * Prevents re-computation and reduces CPU usage
 */
export function createMemoized<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Return,
  keyGenerator?: (...args: Args) => string
): (...args: Args) => Return {
  const cache = new Map<string, Return>();

  return (...args: Args): Return => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);

    return result;
  };
}

/**
 * Bundle optimization suggestions
 * Provides recommendations for reducing bundle size
 */
export function getBundleOptimizationTips() {
  return {
    suggestions: [
      "Consider lazy loading heavy components",
      "Use dynamic imports for rarely used features",
      "Check for duplicate dependencies",
      "Optimize image formats and sizes",
      "Use Next.js built-in optimizations",
      "Minimize client-side JavaScript",
    ],
  };
}

/**
 * Preload critical resources
 * Improves perceived performance
 */
export function preloadCriticalResources() {
  if (typeof window === "undefined") return;

  const criticalResources = [
    // Fonts
    "/fonts/inter-var.woff2",
    // Critical images
    "/static/logo/logo.svg",
    // Critical scripts - only if actually needed
  ];

  criticalResources.forEach((resource) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = resource;

    if (resource.includes(".woff2")) {
      link.as = "font";
      link.type = "font/woff2";
      link.crossOrigin = "anonymous";
    } else if (resource.includes(".svg") || resource.includes(".png")) {
      link.as = "image";
    }

    document.head.appendChild(link);
  });
}

/**
 * Web Vitals measurement utilities
 * Measures performance using built-in Performance API
 */
export function measureWebVitals() {
  if (typeof window === "undefined") return;

  // Use PerformanceObserver for measuring Core Web Vitals
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`${entry.name}: ${entry.duration}ms`);
      }
    });

    // Observe navigation and paint metrics
    observer.observe({ entryTypes: ["navigation", "paint"] });
  } catch (error) {
    console.warn("Performance observation not supported:", error);
  }
}

/**
 * Monitor memory usage and performance
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();

  static startMeasurement(name: string) {
    this.measurements.set(name, performance.now());
  }

  static endMeasurement(name: string): number {
    const start = this.measurements.get(name);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.measurements.delete(name);

    if (process.env.NODE_ENV === "development") {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => this.endMeasurement(name));
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
 * Enhanced database performance monitoring
 */
export class DatabasePerformanceMonitor {
  private static slowQueryThreshold = 500; // ms
  private static queryTimes: number[] = [];

  static logQuery(operation: string, duration: number, query?: string) {
    this.queryTimes.push(duration);

    // Keep only last 100 queries
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }

    if (duration > this.slowQueryThreshold) {
      console.warn(
        `🐌 Slow query detected: ${operation} (${duration.toFixed(2)}ms)`
      );

      if (process.env.NODE_ENV === "development" && query) {
        console.warn("Query:", query);
      }
    }
  }

  static getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    return this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  static getSlowQueryCount(): number {
    return this.queryTimes.filter((time) => time > this.slowQueryThreshold)
      .length;
  }
}

/**
 * Get comprehensive performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const cacheStats = CacheMetrics.getStats();

  return {
    queryTime: 0,
    cacheHit: false,
    itemCount: 0,
    timestamp: new Date(),
    operation: "",
    cache: cacheStats,
    database: {
      averageQueryTime: DatabasePerformanceMonitor.getAverageQueryTime(),
      slowQueries: DatabasePerformanceMonitor.getSlowQueryCount(),
      totalQueries: cacheStats.total, // Proxy for total queries
    },
    system: {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    },
  };
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

  // Bundle size recommendations
  recommendations.push(
    "Use dynamic imports for large components",
    "Optimize images with WebP/AVIF formats",
    "Consider code splitting for route-level chunks"
  );

  if (recommendations.length === 0) {
    recommendations.push("System performance is optimal!");
  }

  return recommendations;
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
  if (typeof window !== "undefined") {
    // Client-side monitoring
    preloadCriticalResources();
    measureWebVitals();

    // Monitor long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn("Long task detected:", entry);
        }
      }
    });

    if ("PerformanceObserver" in window) {
      try {
        observer.observe({ entryTypes: ["longtask"] });
      } catch {
        // longtask not supported
      }
    }
  }

  // Server-side cache warming
  if (process.env.NODE_ENV === "production") {
    warmCache().catch(console.error);
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === "development") {
  if (typeof window !== "undefined") {
    // Client-side
    setTimeout(initializePerformanceMonitoring, 1000);
  } else {
    // Server-side
    initializePerformanceMonitoring();
  }
}
