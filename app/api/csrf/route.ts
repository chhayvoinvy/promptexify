import { NextResponse } from "next/server";
import { createCSRFToken, getCSRFToken } from "@/lib/csrf";
import { ENHANCED_SECURITY_HEADERS } from "@/lib/sanitize";

/**
 * GET /api/csrf-token
 * Returns a CSRF token for client-side requests
 */
export async function GET() {
  try {
    // Try to get existing token first
    let token = await getCSRFToken();

    // If no token exists or it's expired, create a new one
    if (!token) {
      token = await createCSRFToken();
    }

    return NextResponse.json(
      {
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      },
      {
        headers: ENHANCED_SECURITY_HEADERS,
      }
    );
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);

    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      {
        status: 500,
        headers: ENHANCED_SECURITY_HEADERS,
      }
    );
  }
}
