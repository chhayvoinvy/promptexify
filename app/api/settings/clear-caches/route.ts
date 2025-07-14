import { NextResponse } from "next/server";
import { clearMediaCachesAction } from "@/actions/settings";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";
import { withCSRFProtection } from "@/lib/security/csp";

/**
 * POST /api/settings/clear-caches
 * Clear all media-related caches manually
 */
export const POST = withCSRFProtection(async () => {
  try {
    const result = await clearMediaCachesAction();

    if (result.success) {
      return NextResponse.json(
        { success: true, message: result.message },
        { headers: SECURITY_HEADERS }
      );
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
  } catch (error) {
    console.error("Error clearing media caches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear media caches" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
});

// Explicitly deny other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "POST",
      },
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "POST",
      },
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "POST",
      },
    }
  );
} 