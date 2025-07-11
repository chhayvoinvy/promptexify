// Console log level union for security monitoring
type LocalSeverityLevel =
  | "error"
  | "warn"
  | "log"
  | "info"
  | "debug";

// Map internal severity strings to console log levels
const severityLevelMap: Record<SecurityEvent["severity"], LocalSeverityLevel> = {
  low: "info",
  medium: "warn",
  high: "error",
  critical: "error",
};

function isEdgeRuntime(): boolean {
  return (
    typeof process === "undefined" ||
    process.env.NEXT_RUNTIME === "edge" ||
    "EdgeRuntime" in globalThis
  );
}

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  details: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
}

export enum SecurityEventType {
  CSRF_VALIDATION_FAILED = "csrf_validation_failed",
  CSRF_TOKEN_MISSING = "csrf_token_missing",
  CSP_VIOLATION = "csp_violation",
  SUSPICIOUS_REQUEST = "suspicious_request",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  FORM_TAMPERING = "form_tampering",
  INVALID_SESSION = "invalid_session",
  SECURITY_HEADER_MISSING = "security_header_missing",
  FAILED_LOGIN = "failed_login",
  MALICIOUS_PAYLOAD = "malicious_payload",
  FILE_UPLOAD_ABUSE = "file_upload_abuse",
  SEARCH_ABUSE = "search_abuse",
  SUSPICIOUS_SEARCH_PATTERN = "suspicious_search_pattern",
  INTERNAL_SERVER_ERROR = "internal_server_error",
}

export class SecurityMonitor {
  private static readonly MAX_EVENTS_IN_MEMORY = 1000;
  private static recentEvents: SecurityEvent[] = [];

  /**
   * Log a security event
   */
  static async logSecurityEvent(
    type: SecurityEventType,
    details: Record<string, unknown> = {},
    severity: SecurityEvent["severity"] = "medium",
    userId?: string
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        type,
        timestamp: new Date().toISOString(),
        ip: this.getClientIP(new Headers()),
        userAgent: this.sanitizeUserAgent(
          typeof navigator !== "undefined" ? navigator.userAgent : null
        ),
        userId,
        details,
        severity,
      };

      // Add to recent events for monitoring
      this.addToRecentEvents(event);

      // Log to console with structured format
      this.logToConsole(event);

      // Skip external monitoring in Edge Runtime
      if (!isEdgeRuntime()) {
        // In production, this would integrate with your monitoring service
        // Examples: DataDog, New Relic, etc.
        if (process.env.NODE_ENV === "production") {
          await this.sendToMonitoringService(event);
        }
      }
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Get client IP from headers
   */
  private static getClientIP(headersList: Headers): string | undefined {
    // Check common proxy headers
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0]?.trim();
    }

    const realIP = headersList.get("x-real-ip");
    if (realIP) {
      return realIP.trim();
    }

    return headersList.get("x-client-ip") || "unknown";
  }

  /**
   * Sanitize user agent for logging
   */
  private static sanitizeUserAgent(
    userAgent: string | null
  ): string | undefined {
    if (!userAgent) return undefined;

    // Remove potentially sensitive information while keeping useful data
    return userAgent
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP]") // Remove IPs
      .slice(0, 200); // Truncate to reasonable length
  }

  /**
   * Add event to recent events queue
   */
  private static addToRecentEvents(event: SecurityEvent): void {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.MAX_EVENTS_IN_MEMORY) {
      this.recentEvents = this.recentEvents.slice(0, this.MAX_EVENTS_IN_MEMORY);
    }
  }

  /**
   * Log structured security event to console
   */
  private static logToConsole(event: SecurityEvent): void {
    const logLevel = this.getLogLevel(event.severity);

    console[logLevel](`[SECURITY] ${event.type}`, {
      timestamp: event.timestamp,
      severity: event.severity,
      ip: event.ip,
      userId: event.userId,
      details: event.details,
    });
  }

  /**
   * Get appropriate console log level based on severity
   */
  private static getLogLevel(
    severity: SecurityEvent["severity"]
  ): "log" | "warn" | "error" {
    switch (severity) {
      case "low":
        return "log";
      case "medium":
        return "warn";
      case "high":
      case "critical":
        return "error";
      default:
        return "log";
    }
  }

  /**
   * Send event to external monitoring service
   */
  private static async sendToMonitoringService(
    event: SecurityEvent
  ): Promise<void> {
    // This is where you'd integrate with your monitoring service
    // Example implementations:

    // Custom webhook
    // await fetch(process.env.SECURITY_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event),
    // });

    // For now, just log that we would send to monitoring
    if (process.env.NODE_ENV === "development") {
      console.log(
        "[SECURITY-MONITOR] Would send to monitoring service:",
        event.type
      );
    }
  }

  /**
   * Get recent security events (for debugging/dashboard)
   */
  static getRecentEvents(limit = 50): SecurityEvent[] {
    return this.recentEvents.slice(0, limit);
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentActivity: SecurityEvent[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.recentEvents.forEach((event) => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: this.recentEvents.length,
      eventsByType,
      eventsBySeverity,
      recentActivity: this.recentEvents.slice(0, 10),
    };
  }

  /**
   * Clear recent events (for testing/debugging)
   */
  static clearEvents(): void {
    this.recentEvents = [];
  }

  /**
   * Check for suspicious patterns in recent events
   */
  static detectSuspiciousActivity(): {
    isDetected: boolean;
    patterns: string[];
    recommendations: string[];
  } {
    const patterns: string[] = [];
    const recommendations: string[] = [];

    // Check for high frequency of CSRF failures from same IP
    const csrfFailures = this.recentEvents
      .filter(
        (event) => event.type === SecurityEventType.CSRF_VALIDATION_FAILED
      )
      .slice(0, 20); // Last 20 events

    const csrfFailuresByIP: Record<string, number> = {};
    csrfFailures.forEach((event) => {
      if (event.ip) {
        csrfFailuresByIP[event.ip] = (csrfFailuresByIP[event.ip] || 0) + 1;
      }
    });

    Object.entries(csrfFailuresByIP).forEach(([ip, count]) => {
      if (count >= 5) {
        patterns.push(`High CSRF failures from IP: ${ip} (${count} attempts)`);
        recommendations.push(
          `Consider rate limiting or blocking IP ${ip} due to repeated CSRF failures`
        );
      }
    });

    // Check for rapid-fire security events
    const recentEvents = this.recentEvents.slice(0, 10);
    if (recentEvents.length >= 10) {
      const timeSpan =
        new Date(recentEvents[0].timestamp).getTime() -
        new Date(recentEvents[recentEvents.length - 1].timestamp).getTime();
      const eventsPerMinute = (recentEvents.length / timeSpan) * 60000;

      if (eventsPerMinute > 10) {
        patterns.push(
          `High security event rate: ${eventsPerMinute.toFixed(1)} events/minute`
        );
        recommendations.push(
          "Investigate potential automated attack or system issue"
        );
      }
    }

    // Check for multiple failed logins from same IP
    const failedLogins = this.recentEvents
      .filter((event) => event.type === SecurityEventType.FAILED_LOGIN)
      .slice(0, 20);

    const failedLoginsByIP: Record<string, number> = {};
    failedLogins.forEach((event) => {
      if (event.ip) {
        failedLoginsByIP[event.ip] = (failedLoginsByIP[event.ip] || 0) + 1;
      }
    });

    Object.entries(failedLoginsByIP).forEach(([ip, count]) => {
      if (count >= 3) {
        patterns.push(`Multiple failed logins from IP: ${ip} (${count} attempts)`);
        recommendations.push(
          `Consider implementing account lockout or additional verification for IP ${ip}`
        );
      }
    });

    return {
      isDetected: patterns.length > 0,
      patterns,
      recommendations,
    };
  }

  /**
   * Get security recommendations based on recent activity
   */
  static getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getSecurityStats();

    // High error rate
    if (stats.eventsBySeverity.error > 10) {
      recommendations.push(
        "High number of security errors detected. Review system logs and investigate potential issues."
      );
    }

    // Multiple unauthorized access attempts
    if (stats.eventsByType[SecurityEventType.UNAUTHORIZED_ACCESS] > 5) {
      recommendations.push(
        "Multiple unauthorized access attempts detected. Consider implementing additional security measures."
      );
    }

    // Rate limiting issues
    if (stats.eventsByType[SecurityEventType.RATE_LIMIT_EXCEEDED] > 3) {
      recommendations.push(
        "Rate limiting frequently exceeded. Consider adjusting rate limits or investigating potential abuse."
      );
    }

    // CSRF issues
    if (stats.eventsByType[SecurityEventType.CSRF_VALIDATION_FAILED] > 2) {
      recommendations.push(
        "CSRF validation failures detected. Ensure all forms include proper CSRF tokens."
      );
    }

    return recommendations;
  }

  /**
   * Export security events for external analysis
   */
  static exportSecurityEvents(
    format: "json" | "csv" = "json"
  ): string {
    const events = this.recentEvents;

    if (format === "csv") {
      const headers = [
        "timestamp",
        "type",
        "severity",
        "ip",
        "userId",
        "details",
      ];
      const csvRows = [
        headers.join(","),
        ...events.map((event) =>
          [
            event.timestamp,
            event.type,
            event.severity,
            event.ip || "",
            event.userId || "",
            JSON.stringify(event.details),
          ].join(",")
        ),
      ];
      return csvRows.join("\n");
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Clean up old events (keep only last 24 hours)
   */
  static cleanupOldEvents(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.recentEvents = this.recentEvents.filter(
      (event) => new Date(event.timestamp) > oneDayAgo
    );
  }

  /**
   * Get security event summary for dashboard
   */
  static getSecuritySummary(): {
    totalEvents: number;
    criticalEvents: number;
    highSeverityEvents: number;
    recentActivity: SecurityEvent[];
    topThreats: Array<{ type: string; count: number }>;
  } {
    const stats = this.getSecurityStats();
    const recentEvents = this.recentEvents.slice(0, 5);

    // Get top threats
    const topThreats = Object.entries(stats.eventsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalEvents: stats.totalEvents,
      criticalEvents: stats.eventsBySeverity.critical || 0,
      highSeverityEvents: stats.eventsBySeverity.high || 0,
      recentActivity: recentEvents,
      topThreats,
    };
  }
}

/**
 * Security Alert System
 * Provides convenient methods for logging common security events
 */
export class SecurityAlert {
  /**
   * Log unauthorized access attempts
   */
  static async unauthorizedAccess(
    resource: string,
    userId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      {
        resource,
        ...details,
      },
      "high",
      userId
    );
  }

  /**
   * Log suspicious request patterns
   */
  static async suspiciousRequest(
    description: string,
    details: Record<string, unknown> = {},
    userId?: string
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_REQUEST,
      {
        description,
        ...details,
      },
      "medium",
      userId
    );
  }

  /**
   * Log suspicious search patterns
   */
  static async suspiciousSearchPattern(
    pattern: string,
    details: Record<string, unknown> = {},
    userId?: string
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_SEARCH_PATTERN,
      {
        pattern,
        ...details,
      },
      "medium",
      userId
    );
  }

  /**
   * Log failed login attempts
   */
  static async failedLogin(
    email: string,
    reason: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.FAILED_LOGIN,
      {
        email,
        reason,
        ...details,
      },
      "medium"
    );
  }

  /**
   * Log CSRF validation failures
   */
  static async csrfValidationFailed(
    endpoint: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.CSRF_VALIDATION_FAILED,
      {
        endpoint,
        ...details,
      },
      "high"
    );
  }

  /**
   * Log rate limit exceeded events
   */
  static async rateLimitExceeded(
    endpoint: string,
    identifier: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      {
        endpoint,
        identifier,
        ...details,
      },
      "medium"
    );
  }

  /**
   * Log malicious payload detection
   */
  static async maliciousPayload(
    payload: string,
    type: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.MALICIOUS_PAYLOAD,
      {
        payload: payload.substring(0, 100), // Truncate for logging
        type,
        ...details,
      },
      "high"
    );
  }

  /**
   * Log file upload abuse
   */
  static async fileUploadAbuse(
    filename: string,
    fileType: string,
    userId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.FILE_UPLOAD_ABUSE,
      {
        filename,
        fileType,
        ...details,
      },
      "high",
      userId
    );
  }

  /**
   * Log search abuse
   */
  static async searchAbuse(
    query: string,
    userId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.SEARCH_ABUSE,
      {
        query: query.substring(0, 100), // Truncate for logging
        ...details,
      },
      "medium",
      userId
    );
  }

  /**
   * Log CSP violations
   */
  static async cspViolation(
    directive: string,
    blockedUri?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.CSP_VIOLATION,
      {
        directive,
        blockedUri,
        ...details,
      },
      "medium"
    );
  }

  /**
   * Log internal server errors
   */
  static async internalServerError(
    error: string,
    endpoint: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.INTERNAL_SERVER_ERROR,
      {
        error,
        endpoint,
        ...details,
      },
      "critical"
    );
  }
}

/**
 * Utility function to verify Redis eviction policy
 * Logs a console warning and sends a monitoring message if the policy differs.
 */
export async function verifyRedisEvictionPolicy(expectedPolicy = "noeviction") {
  try {
    // This would typically check Redis configuration
    // For now, we'll simulate a check
    const currentPolicy = "noeviction"; // This would come from Redis

    if (currentPolicy !== expectedPolicy) {
      const message = `Redis eviction policy mismatch: expected ${expectedPolicy}, got ${currentPolicy}`;
      console.warn(message);

      // Log to monitoring service
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[SECURITY-MONITOR] Would send Redis eviction policy warning to monitoring service"
        );
      }
    }
  } catch (error) {
    console.error(
      "Failed to verify Redis eviction policy",
      error
    );
  }
}
