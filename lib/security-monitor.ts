import { headers } from "next/headers";

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
   * Log a security event with comprehensive details
   */
  static async logSecurityEvent(
    type: SecurityEventType,
    details: Record<string, unknown> = {},
    severity: SecurityEvent["severity"] = "medium",
    userId?: string
  ): Promise<void> {
    try {
      let ip: string | undefined;
      let userAgent: string | undefined;

      // Check if we're in a Next.js request context
      try {
        const headersList = await headers();
        ip = this.getClientIP(headersList);
        userAgent = headersList.get("user-agent") || undefined;
      } catch {
        // We're not in a request context (e.g., standalone script)
        // This is normal for automation scripts
        ip = "standalone-script";
        userAgent = "automation-script";
      }

      const event: SecurityEvent = {
        type,
        timestamp: new Date().toISOString(),
        ip,
        userAgent: this.sanitizeUserAgent(userAgent || null),
        userId,
        details,
        severity,
      };

      // Add to in-memory storage (for development/debugging)
      this.addToRecentEvents(event);

      // Log to console with structured format
      this.logToConsole(event);

      // In production, this would integrate with your monitoring service
      // Examples: Sentry, DataDog, New Relic, etc.
      if (process.env.NODE_ENV === "production") {
        await this.sendToMonitoringService(event);
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

    // Sentry
    // Sentry.addBreadcrumb({
    //   message: `Security event: ${event.type}`,
    //   level: event.severity,
    //   data: event.details,
    // });

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
        patterns.push(
          `High CSRF failure rate from IP: ${ip} (${count} failures)`
        );
        recommendations.push(`Consider rate limiting or blocking IP: ${ip}`);
      }
    });

    // Check for rapid succession of events from same IP
    const recentByIP: Record<string, SecurityEvent[]> = {};
    this.recentEvents.slice(0, 50).forEach((event) => {
      if (event.ip) {
        if (!recentByIP[event.ip]) recentByIP[event.ip] = [];
        recentByIP[event.ip].push(event);
      }
    });

    Object.entries(recentByIP).forEach(([ip, events]) => {
      if (events.length >= 10) {
        patterns.push(`High activity from IP: ${ip} (${events.length} events)`);
        recommendations.push(
          `Monitor IP: ${ip} for potential automated attacks`
        );
      }
    });

    return {
      isDetected: patterns.length > 0,
      patterns,
      recommendations,
    };
  }
}

// Utility functions for common security monitoring scenarios
export const SecurityAlert = {
  /**
   * Log CSRF token validation failure
   */
  csrfValidationFailed: async (
    userId?: string,
    details: Record<string, unknown> = {}
  ) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.CSRF_VALIDATION_FAILED,
      details,
      "high",
      userId
    );
  },

  /**
   * Log missing CSRF token
   */
  csrfTokenMissing: async (endpoint: string, userId?: string) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.CSRF_TOKEN_MISSING,
      { endpoint },
      "medium",
      userId
    );
  },

  /**
   * Log unauthorized access attempt
   */
  unauthorizedAccess: async (resource: string, userId?: string) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      { resource },
      "high",
      userId
    );
  },

  /**
   * Log suspicious request pattern
   */
  suspiciousRequest: async (
    reason: string,
    details: Record<string, unknown> = {},
    userId?: string
  ) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_REQUEST,
      { reason, ...details },
      "medium",
      userId
    );
  },

  /**
   * Log form tampering attempt
   */
  formTampering: async (
    formName: string,
    details: Record<string, unknown> = {},
    userId?: string
  ) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.FORM_TAMPERING,
      { formName, ...details },
      "high",
      userId
    );
  },

  /**
   * Log search abuse (excessive search requests)
   */
  searchAbuse: async (searchQuery: string, userId?: string, ip?: string) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.SEARCH_ABUSE,
      {
        searchQuery: searchQuery.substring(0, 100), // Truncate for logging
        ip,
      },
      "high",
      userId
    );
  },

  /**
   * Log suspicious search pattern
   */
  suspiciousSearchPattern: async (
    searchQuery: string,
    pattern: string,
    userId?: string,
    ip?: string
  ) => {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_SEARCH_PATTERN,
      {
        searchQuery: searchQuery.substring(0, 100), // Truncate for logging
        pattern,
        ip,
      },
      "high",
      userId
    );
  },
};
