import { NextRequest, NextResponse } from "next/server";
import { SecurityEvents, getClientIP, sanitizeUserAgent } from "@/lib/audit";

/**
 * CSP Violation Report Interface
 */
interface CSPViolationReport {
  "csp-report": {
    "document-uri": string;
    referrer: string;
    "violated-directive": string;
    "effective-directive": string;
    "original-policy": string;
    disposition: string;
    "blocked-uri": string;
    "line-number": number;
    "column-number": number;
    "source-file": string;
    "status-code": number;
    "script-sample": string;
  };
}

/**
 * Handle CSP violation reports
 * This endpoint receives CSP violation reports and logs them for security monitoring
 */
export async function POST(request: NextRequest) {
  try {
    // Only process CSP reports in production
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "CSP reporting not enabled in development" },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type");

    // CSP reports can be sent as JSON or form data
    let reportData: CSPViolationReport;

    if (contentType?.includes("application/json")) {
      reportData = await request.json();
    } else if (contentType?.includes("application/csp-report")) {
      // Handle application/csp-report content type
      const text = await request.text();
      reportData = JSON.parse(text);
    } else {
      return NextResponse.json(
        { error: "Invalid content type for CSP report" },
        { status: 400 }
      );
    }

    const violation = reportData["csp-report"];

    if (!violation) {
      return NextResponse.json(
        { error: "Invalid CSP report format" },
        { status: 400 }
      );
    }

    // Extract relevant information
    const violationInfo = {
      documentUri: violation["document-uri"],
      violatedDirective: violation["violated-directive"],
      effectiveDirective: violation["effective-directive"],
      blockedUri: violation["blocked-uri"],
      sourceFile: violation["source-file"],
      lineNumber: violation["line-number"],
      columnNumber: violation["column-number"],
      scriptSample: violation["script-sample"],
      disposition: violation.disposition,
    };

    // Log CSP violation for security monitoring
    console.warn("[CSP VIOLATION]", {
      timestamp: new Date().toISOString(),
      clientIP: getClientIP(request),
      userAgent: sanitizeUserAgent(request.headers.get("user-agent")),
      ...violationInfo,
    });

    // Log to security audit system
    await SecurityEvents.inputValidationFailure(
      undefined,
      "csp_violation",
      `CSP violation: ${violation["violated-directive"]} - ${violation["blocked-uri"]}`,
      getClientIP(request)
    );

    // Send to external monitoring service if configured
    if (process.env.SECURITY_MONITORING_WEBHOOK) {
      try {
        await fetch(process.env.SECURITY_MONITORING_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Promptexify-CSP-Reporter/1.0",
          },
          body: JSON.stringify({
            type: "csp_violation",
            timestamp: new Date().toISOString(),
            clientIP: getClientIP(request),
            ...violationInfo,
          }),
        });
      } catch (error) {
        console.error(
          "Failed to send CSP violation to monitoring service:",
          error
        );
      }
    }

    // Return 204 No Content as per CSP specification
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error processing CSP violation report:", error);

    // Don't expose error details for security
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
