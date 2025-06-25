/**
 * Security Audit Trail System
 * Tracks sensitive operations and security events
 */

import { prisma } from "@/lib/prisma";

export interface AuditEvent {
  action: string;
  userId?: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean>;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface SecurityEvent extends AuditEvent {
  threatType:
    | "AUTHENTICATION"
    | "AUTHORIZATION"
    | "INPUT_VALIDATION"
    | "RATE_LIMIT"
    | "FILE_UPLOAD"
    | "DATA_ACCESS";
  blocked: boolean;
}

/**
 * Log security events to database and console
 */
export async function logSecurityEvent(event: SecurityEvent) {
  try {
    // Log to console for immediate monitoring
    const timestamp = new Date().toISOString();
    console.warn(
      `[SECURITY] ${timestamp} - ${event.threatType}: ${event.action}`,
      {
        userId: event.userId,
        ipAddress: event.ipAddress,
        blocked: event.blocked,
        severity: event.severity,
        metadata: event.metadata,
      }
    );

    // In production, send to external security monitoring service
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with security monitoring service (e.g., Sentry, DataDog)
      await sendToSecurityMonitoring(event);
    }

    // Store in database for audit trail
    if (process.env.ENABLE_AUDIT_LOGGING === "true") {
      await storeAuditEvent(event);
    }
  } catch (error) {
    console.error("Failed to log security event:", error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Log general audit events
 */
export async function logAuditEvent(event: AuditEvent) {
  try {
    if (event.severity === "HIGH" || event.severity === "CRITICAL") {
      console.warn(
        `[AUDIT] ${event.action} - Severity: ${event.severity}`,
        event
      );
    } else {
      console.log(`[AUDIT] ${event.action}`, event);
    }

    if (process.env.ENABLE_AUDIT_LOGGING === "true") {
      await storeAuditEvent(event);
    }
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Store audit event in database using the Log model
 */
async function storeAuditEvent(event: AuditEvent | SecurityEvent) {
  try {
    // Prepare metadata with security event specific fields
    const metadata: Record<string, any> = {
      ...event.metadata,
    };

    // Add security-specific fields to metadata if it's a security event
    if ("threatType" in event) {
      metadata.threatType = event.threatType;
      metadata.blocked = event.blocked;
    }

    // Create log entry in database
    await prisma.log.create({
      data: {
        action: event.action,
        userId: event.userId || null,
        entityType: event.entityType,
        entityId: event.entityId || null,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null,
        metadata: metadata,
        severity: event.severity,
      },
    });
  } catch (error) {
    console.error("Failed to store audit event in database:", error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Send security events to external monitoring
 */
async function sendToSecurityMonitoring(event: SecurityEvent) {
  // TODO: Integrate with your security monitoring service
  // Examples: Sentry, DataDog, CloudWatch, etc.

  if (process.env.SECURITY_MONITORING_WEBHOOK) {
    try {
      await fetch(process.env.SECURITY_MONITORING_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_type: "security_event",
          severity: event.severity,
          threat_type: event.threatType,
          action: event.action,
          user_id: event.userId,
          ip_address: event.ipAddress,
          blocked: event.blocked,
          timestamp: new Date().toISOString(),
          metadata: event.metadata,
        }),
      });
    } catch (error) {
      console.error("Failed to send to security monitoring:", error);
    }
  }
}

/**
 * Helper functions for common security events
 */
export const SecurityEvents = {
  authenticationFailure: (
    userId?: string,
    ipAddress?: string,
    reason?: string
  ) =>
    logSecurityEvent({
      action: "Authentication Failure",
      userId,
      entityType: "user",
      ipAddress,
      threatType: "AUTHENTICATION",
      blocked: true,
      severity: "MEDIUM",
      metadata: { reason: reason || "unknown" },
    }),

  authorizationFailure: (
    userId: string,
    resource: string,
    ipAddress?: string
  ) =>
    logSecurityEvent({
      action: "Authorization Failure",
      userId,
      entityType: resource,
      ipAddress,
      threatType: "AUTHORIZATION",
      blocked: true,
      severity: "HIGH",
      metadata: { attemptedResource: resource },
    }),

  rateLimitExceeded: (
    identifier: string,
    endpoint: string,
    ipAddress?: string
  ) =>
    logSecurityEvent({
      action: "Rate Limit Exceeded",
      entityType: "rate_limit",
      ipAddress,
      threatType: "RATE_LIMIT",
      blocked: true,
      severity: "MEDIUM",
      metadata: { identifier, endpoint },
    }),

  suspiciousFileUpload: (
    userId: string,
    filename: string,
    fileType: string,
    ipAddress?: string
  ) =>
    logSecurityEvent({
      action: "Suspicious File Upload Blocked",
      userId,
      entityType: "file",
      ipAddress,
      threatType: "FILE_UPLOAD",
      blocked: true,
      severity: "HIGH",
      metadata: { filename, fileType },
    }),

  inputValidationFailure: (
    userId: string | undefined,
    field: string,
    value: string,
    ipAddress?: string
  ) =>
    logSecurityEvent({
      action: "Input Validation Failure",
      userId,
      entityType: "input",
      ipAddress,
      threatType: "INPUT_VALIDATION",
      blocked: true,
      severity: "MEDIUM",
      metadata: { field, value: value.substring(0, 100) }, // Truncate for logging
    }),

  dataAccessAttempt: (
    userId: string,
    resource: string,
    authorized: boolean,
    ipAddress?: string
  ) =>
    logSecurityEvent({
      action: authorized
        ? "Authorized Data Access"
        : "Unauthorized Data Access Attempt",
      userId,
      entityType: resource,
      ipAddress,
      threatType: "DATA_ACCESS",
      blocked: !authorized,
      severity: authorized ? "LOW" : "HIGH",
      metadata: { resource },
    }),
};

/**
 * Helper function to get client IP from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIp || "unknown";
}

/**
 * Helper function to sanitize user agent
 */
export function sanitizeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  return userAgent.substring(0, 200); // Limit length
}

/**
 * Get recent security events for monitoring dashboard
 */
export async function getRecentSecurityEvents(limit = 50) {
  try {
    return await prisma.log.findMany({
      where: {
        severity: {
          in: ["HIGH", "CRITICAL"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  } catch (error) {
    console.error("Failed to fetch recent security events:", error);
    return [];
  }
}

/**
 * Get security statistics for dashboard
 */
export async function getSecurityStats(hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await prisma.log.groupBy({
      by: ["severity"],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        id: true,
      },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.severity] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.error("Failed to fetch security stats:", error);
    return {};
  }
}
