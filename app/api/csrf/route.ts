import { NextResponse } from "next/server";
import { CSRFProtection, SecurityHeaders } from "@/lib/csp";

/**
 * GET /api/csrf
 * Returns a CSRF token for client-side forms
 */
export async function GET() {
  try {
    // Generate or retrieve existing CSRF token
    const token = await CSRFProtection.getOrCreateToken();

    const securityHeaders = SecurityHeaders.getSecurityHeaders();

    return NextResponse.json(
      { token },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          ...securityHeaders,
        },
      }
    );
  } catch (error) {
    console.error("CSRF token generation error:", error);

    const securityHeaders = SecurityHeaders.getSecurityHeaders();

    return NextResponse.json(
      {
        error: "Failed to generate CSRF token",
        code: "CSRF_GENERATION_ERROR",
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
