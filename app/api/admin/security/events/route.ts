import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRecentSecurityEvents } from "@/lib/audit";
import { ENHANCED_SECURITY_HEADERS } from "@/lib/sanitize";

/**
 * GET /api/admin/security/events
 * Returns recent security events for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        {
          status: 403,
          headers: ENHANCED_SECURITY_HEADERS,
        }
      );
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Fetch recent security events
    const events = await getRecentSecurityEvents(limit);

    return NextResponse.json(
      {
        events,
        total: events.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: ENHANCED_SECURITY_HEADERS,
      }
    );
  } catch (error) {
    console.error("Failed to fetch security events:", error);

    return NextResponse.json(
      { error: "Failed to fetch security events" },
      {
        status: 500,
        headers: ENHANCED_SECURITY_HEADERS,
      }
    );
  }
}
