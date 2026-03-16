/**
 * Shared API response helpers for consistent error handling and security.
 * Use these in API routes to avoid leaking internal details and to apply
 * standard security headers and rate limit headers.
 */

import { NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";

/** Result shape from rate limit check (edge or limits module) */
export interface RateLimitResultLike {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Build standard rate limit response (429) with Retry-After and optional rate limit headers.
 */
export function rateLimitExceededResponse(
  result: RateLimitResultLike,
  extraHeaders?: Record<string, string>
): NextResponse {
  const retryAfterSec = Math.ceil((result.resetTime - Date.now()) / 1000);
  return NextResponse.json(
    {
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        ...SECURITY_HEADERS,
        ...extraHeaders,
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

/**
 * Build 400 validation error response. Do not include raw input in details in production.
 */
export function validationErrorResponse(
  message: string,
  code = "VALIDATION_ERROR",
  details?: Record<string, unknown>
): NextResponse {
  const body: Record<string, unknown> = { error: message, code };
  if (details && Object.keys(details).length > 0) {
    body.details = details;
  }
  return NextResponse.json(body, {
    status: 400,
    headers: SECURITY_HEADERS,
  });
}

/**
 * Build 401 unauthorized response.
 */
export function unauthorizedResponse(
  message = "Authentication required"
): NextResponse {
  return NextResponse.json(
    { error: message, code: "UNAUTHORIZED" },
    { status: 401, headers: SECURITY_HEADERS }
  );
}

/**
 * Build 403 forbidden response.
 */
export function forbiddenResponse(
  message = "Insufficient permissions",
  code = "FORBIDDEN"
): NextResponse {
  return NextResponse.json(
    { error: message, code },
    { status: 403, headers: SECURITY_HEADERS }
  );
}

/**
 * Build 404 not found response.
 */
export function notFoundResponse(
  message = "Resource not found",
  code = "NOT_FOUND"
): NextResponse {
  return NextResponse.json(
    { error: message, code },
    { status: 404, headers: SECURITY_HEADERS }
  );
}

/**
 * Build 405 method not allowed response with Allow header.
 */
export function methodNotAllowedResponse(
  allow: string,
  message = "Method not allowed"
): NextResponse {
  return NextResponse.json(
    { error: message, code: "METHOD_NOT_ALLOWED" },
    {
      status: 405,
      headers: { ...SECURITY_HEADERS, Allow: allow },
    }
  );
}

/**
 * Build 500 internal error response. Exposes details only in development.
 */
export function serverErrorResponse(
  publicMessage = "An error occurred. Please try again.",
  internalError?: unknown
): NextResponse {
  if (internalError !== undefined && process.env.NODE_ENV === "development") {
    console.error("[API]", internalError);
  }
  const body: Record<string, unknown> = {
    error: publicMessage,
    code: "INTERNAL_ERROR",
  };
  if (
    process.env.NODE_ENV === "development" &&
    internalError instanceof Error
  ) {
    body.details = { message: internalError.message };
  }
  return NextResponse.json(body, {
    status: 500,
    headers: SECURITY_HEADERS,
  });
}
