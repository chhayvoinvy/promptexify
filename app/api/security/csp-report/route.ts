import { NextRequest, NextResponse } from "next/server";
import { SecurityHeaders } from "@/lib/security/csp";

/**
 * POST - CSP Violation Report Endpoint
 * 
 * This endpoint receives CSP violation reports from browsers when the
 * Content Security Policy is violated. Following csp.md recommendations
 * for monitoring and debugging CSP issues.
 */
export async function POST(request: NextRequest) {
  try {
    const securityHeaders = SecurityHeaders.getSecurityHeaders();

    // Parse the CSP violation report
    const violation = await request.json();
    
    // Log the violation for monitoring
    const logData = {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 'unknown',
      violation: violation['csp-report'] || violation,
      url: request.headers.get('referer') || 'unknown',
    };

    // Log to console for development/debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[CSP-VIOLATION]', JSON.stringify(logData, null, 2));
    } else {
      // In production, log more concisely
      console.warn('[CSP-VIOLATION]', {
        directive: violation['csp-report']?.['violated-directive'],
        blockedUri: violation['csp-report']?.['blocked-uri'],
        documentUri: violation['csp-report']?.['document-uri'],
        timestamp: logData.timestamp,
      });
    }

    // TODO: In production, you might want to send this to an external monitoring service
    // Examples: DataDog, New Relic, Sentry, etc.
    // await sendToMonitoringService(logData);

    return NextResponse.json(
      { received: true },
      { 
        status: 204, // No Content
        headers: securityHeaders 
      }
    );
  } catch (error) {
    console.error('CSP report processing error:', error);
    
    const securityHeaders = SecurityHeaders.getSecurityHeaders();
    return NextResponse.json(
      { error: 'Failed to process CSP report' },
      { 
        status: 500,
        headers: securityHeaders 
      }
    );
  }
}
