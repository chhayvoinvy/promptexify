import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanupOrphanedMedia, cleanupOrphanedPreviewFiles } from "@/lib/image/storage";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";
import { CSRFProtection } from "@/lib/security/csp";

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

    const { dryRun = true, includePreviewFiles = true } = requestBody;

    console.log(
      `Starting orphaned media cleanup ${dryRun ? "(dry run)" : "(actual deletion)"} by admin ${user.userData.id}`
    );

    // Run main orphaned media cleanup
    const mediaResult = await cleanupOrphanedMedia(dryRun);
    
    // Run orphaned preview files cleanup if requested
    let previewResult = null;
    if (includePreviewFiles) {
      previewResult = await cleanupOrphanedPreviewFiles(dryRun);
    }

    // Combine results
    const totalOrphaned = mediaResult.orphanedCount + (previewResult?.orphanedCount || 0);
    const totalDeleted = mediaResult.deletedCount + (previewResult?.deletedCount || 0);
    const allErrors = [...mediaResult.errors, ...(previewResult?.errors || [])];

    const message = dryRun
      ? `Found ${totalOrphaned} orphaned files that can be cleaned up (${mediaResult.orphanedCount} media + ${previewResult?.orphanedCount || 0} preview files)`
      : `Successfully cleaned up ${totalDeleted} out of ${totalOrphaned} orphaned files`;

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          media: mediaResult,
          previewFiles: previewResult,
          summary: {
            totalOrphaned,
            totalDeleted,
            totalErrors: allErrors.length,
          },
          dryRun,
          includePreviewFiles,
        },
      },
      {
        status: 200,
        headers: SECURITY_HEADERS,
      }
    );
  } catch (error) {
    console.error("Error in orphaned media cleanup API:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to cleanup orphaned media",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
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
export async function GET() {
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