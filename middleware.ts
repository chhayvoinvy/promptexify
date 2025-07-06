import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { getClientIP, sanitizeUserAgent } from "./lib/audit";
import { CSPNonce, SecurityHeaders, CSRFProtection } from "./lib/csp";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/limits";
import { SecurityEvents } from "@/lib/audit";

export async function middleware(request: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    // Generate nonce for CSP only in production (dev mode uses 'unsafe-inline')
    const nonce = isProduction ? CSPNonce.generate() : null;

    // Handle Supabase session
    const response = await updateSession(request);

    // If updateSession returns a redirect, follow it immediately.
    if (response.headers.has("Location")) {
      return response;
    }

    // Prepare request headers for modification
    const requestHeaders = new Headers(request.headers);

    // Set nonce in headers and cookies if in production mode
    if (nonce) {
      // Set nonce in request headers for Server Components to access
      requestHeaders.set("x-nonce", nonce);

      // Set nonce in cookie for client components (httpOnly: false so client can read)
      response.cookies.set("csp-nonce", nonce, {
        httpOnly: false,
        secure: true, // Always secure in production
        sameSite: "strict",
        maxAge: 60 * 60, // 1 hour
      });
    }

    // Apply security headers with CSP
    const securityHeaders = SecurityHeaders.getSecurityHeaders(
      nonce || undefined
    );
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // For non-GET requests, validate CSRF token (except for auth endpoints and webhooks)
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      const pathname = request.nextUrl.pathname;

      // Skip CSRF for certain endpoints
      const skipCSRF = [
        "/api/webhooks/",
        "/api/upload/",
        "/auth/callback",
        "/api/auth/",
        // NEW: Allow CSP violation reports (no CSRF token sent by browsers)
        "/api/security/csp-report",
      ];

      const shouldValidateCSRF = !skipCSRF.some((path) =>
        pathname.startsWith(path)
      );

      if (shouldValidateCSRF) {
        // Check for CSRF token in headers or form data
        const csrfTokenFromHeader = CSRFProtection.getTokenFromHeaders(request);

        // For API routes, expect CSRF token in headers
        if (pathname.startsWith("/api/") && !csrfTokenFromHeader) {
          return NextResponse.json(
            {
              error: "CSRF token required",
              code: "CSRF_TOKEN_MISSING",
            },
            {
              status: 403,
              headers: securityHeaders,
            }
          );
        }
      }

      // Log successful state-changing requests for monitoring
      const skipLogging = ["/api/webhooks/", "/api/upload/"];

      if (!skipLogging.some((path) => pathname.startsWith(path))) {
        console.log(
          `[SECURITY] ${request.method} ${pathname} - IP: ${getClientIP(
            request
          )} - User-Agent: ${sanitizeUserAgent(
            request.headers.get("user-agent")
          )}`
        );
      }
    }

    // ------------------
    // GLOBAL API RATE LIMIT
    // ------------------
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const clientId = getClientIdentifier(request as unknown as Request);
      const rateLimitResult = await rateLimits.api(clientId);
      // Attach rate-limit headers so clients can introspect remaining quota
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(
        ([key, value]) => response.headers.set(key, value)
      );

      if (!rateLimitResult.allowed) {
        // Audit log
        SecurityEvents.rateLimitExceeded(
          clientId,
          request.nextUrl.pathname,
          getClientIP(request as unknown as Request)
        );

        return NextResponse.json(
          {
            error: "Too many requests. Please slow down.",
            retryAfter: Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ),
          },
          {
            status: 429,
            headers: {
              ...securityHeaders,
              ...getRateLimitHeaders(rateLimitResult),
              "Retry-After": String(
                Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
              ),
            },
          }
        );
      }
    }

    // Update response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
      headers: response.headers,
    });
  } catch (error) {
    console.error("Middleware error:", error);

    // Log security incident (Edge Runtime compatible - no database calls)
    const timestamp = new Date().toISOString();
    const ip = getClientIP(request);
    const userAgent = sanitizeUserAgent(request.headers.get("user-agent"));

    console.error(
      `[SECURITY] ${timestamp} - MIDDLEWARE_ERROR: ${
        error instanceof Error ? error.message : "Unknown error"
      } - IP: ${ip} - User-Agent: ${userAgent}`
    );

    const securityHeaders = SecurityHeaders.getSecurityHeaders();

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "MIDDLEWARE_ERROR",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...securityHeaders,
        },
      }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (images, etc.)
     * Also exclude prefetch requests
     */
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
