import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanupOrphanedMedia } from "@/lib/image/storage";
import { SECURITY_HEADERS } from "@/lib/sanitize";
import { CSRFProtection } from "@/lib/csp";

/**
 * POST /api/admin/cleanup-orphaned-media
 * Clean up orphaned media files that are not associated with any post
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check - only admins can run cleanup
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        {
          status: 401,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Role check - only admins
    if (user.userData?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        {
          status: 403,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // CSRF protection
    const csrfToken = CSRFProtection.getTokenFromHeaders(request);
    const isValidCSRF = await CSRFProtection.validateToken(csrfToken);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        {
          status: 403,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    const { dryRun = true } = requestBody;

    console.log(
      `Starting orphaned media cleanup ${dryRun ? "(dry run)" : "(actual deletion)"} by admin ${user.userData.id}`
    );

    // Run cleanup
    const result = await cleanupOrphanedMedia(dryRun);

    const responseMessage = dryRun
      ? `Found ${result.orphanedCount} orphaned media files that can be cleaned up`
      : `Successfully cleaned up ${result.deletedCount} out of ${result.orphanedCount} orphaned media files`;

    return NextResponse.json(
      {
        success: true,
        message: responseMessage,
        data: {
          orphanedCount: result.orphanedCount,
          deletedCount: result.deletedCount,
          errors: result.errors,
          dryRun,
          ...(dryRun && { orphanedFiles: result.orphanedFiles }),
        },
      },
      {
        status: 200,
        headers: SECURITY_HEADERS,
      }
    );
  } catch (error) {
    console.error("Error in orphaned media cleanup:", error);

    return NextResponse.json(
      {
        error: "Failed to clean up orphaned media",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}

/**
 * GET /api/admin/cleanup-orphaned-media
 * Get information about orphaned media files (dry run only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check - only admins can view cleanup info
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        {
          status: 401,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Role check - only admins
    if (user.userData?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        {
          status: 403,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Always dry run for GET requests
    const result = await cleanupOrphanedMedia(true);

    return NextResponse.json(
      {
        success: true,
        message: `Found ${result.orphanedCount} orphaned media files`,
        data: {
          orphanedCount: result.orphanedCount,
          orphanedFiles: result.orphanedFiles,
          dryRun: true,
        },
      },
      {
        status: 200,
        headers: SECURITY_HEADERS,
      }
    );
  } catch (error) {
    console.error("Error getting orphaned media info:", error);

    return NextResponse.json(
      {
        error: "Failed to get orphaned media information",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
} 