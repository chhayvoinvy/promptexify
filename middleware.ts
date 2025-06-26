import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { csrfProtection } from "./lib/csrf";
import { SecurityEvents, getClientIP, sanitizeUserAgent } from "./lib/audit";
import {
  generateNonce,
  generateCSPHeader,
  generateReportingEndpoints,
} from "./lib/csp";

export async function middleware(request: NextRequest) {
  try {
    // Generate nonce for CSP
    const nonce = generateNonce();

    // Check environment
    const isDevelopment = process.env.NODE_ENV === "development";
    const disableCSP =
      (isDevelopment && process.env.DISABLE_CSP_DEV === "true") ||
      process.env.DISABLE_CSP_EMERGENCY === "true";

    // First, handle Supabase session
    const response = await updateSession(request);

    // Skip CSRF protection in development for easier development
    if (!isDevelopment) {
      // Apply CSRF protection for state-changing requests in production only
      const csrfValid = await csrfProtection(request);

      if (!csrfValid) {
        // Log CSRF violation
        await SecurityEvents.inputValidationFailure(
          undefined,
          "csrf_token",
          "invalid_or_missing",
          getClientIP(request)
        );

        return NextResponse.json(
          { error: "Invalid or missing CSRF token" },
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "X-Content-Type-Options": "nosniff",
              "X-Frame-Options": "DENY",
            },
          }
        );
      }
    }

    // Only set CSP if not disabled in development
    if (!disableCSP) {
      // Generate and set CSP header with nonce
      const cspHeader = generateCSPHeader(nonce);

      response.headers.set("Content-Security-Policy", cspHeader);

      // Set nonce in custom header for app to use
      response.headers.set("x-nonce", nonce);

      // Add reporting endpoints for CSP violations in production
      if (!isDevelopment) {
        const reportingEndpoints = generateReportingEndpoints();
        if (reportingEndpoints) {
          response.headers.set("Reporting-Endpoints", reportingEndpoints);
        }
      }
    }

    // Log successful request for monitoring (only state-changing requests)
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      console.log(
        `[SECURITY] ${request.method} ${
          request.nextUrl.pathname
        } - IP: ${getClientIP(request)} - User-Agent: ${sanitizeUserAgent(
          request.headers.get("user-agent")
        )}`
      );
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);

    // Log security incident
    await SecurityEvents.inputValidationFailure(
      undefined,
      "middleware",
      "middleware_error",
      getClientIP(request)
    );

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
