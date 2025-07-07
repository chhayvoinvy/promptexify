import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteVideo } from "@/lib/storage";
import { z } from "zod";
import { CSRFProtection } from "@/lib/csp";

/**
 * Extracts video filename from URL for comparison
 * @param videoUrl - Full URL of the video
 * @returns string - filename or empty string if invalid
 */
function extractVideoFilename(videoUrl: string): string {
  try {
    if (!videoUrl) return "";

    const url = new URL(videoUrl);
    const pathname = url.pathname;
    const filename = pathname.split("/").pop() || "";

    // Only return if it's an MP4 file in the videos directory
    if (pathname.includes("/videos/") && filename.endsWith(".mp4")) {
      return filename;
    }

    return "";
  } catch (error) {
    console.error("Error extracting filename from URL:", error);
    return "";
  }
}

/**
 * DELETE /api/upload/video/delete
 * Deletes a video from S3 storage
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check - only authenticated users can delete
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const csrfToken = CSRFProtection.getTokenFromHeaders(request);
    const isValidCSRF = await CSRFProtection.validateToken(csrfToken);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    // Role check - allow both ADMIN and USER (users can delete their own videos)
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse & validate request body via Zod
    const bodySchema = z.object({
      videoUrl: z.string().url("Invalid video URL"),
    });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { videoUrl } = parsed.data;

    // Validate that this is one of our uploaded videos
    const filename = extractVideoFilename(videoUrl);
    if (!filename) {
      return NextResponse.json(
        { error: "Invalid video URL - not an uploaded video" },
        { status: 400 }
      );
    }

    // For non-admin users, verify they own the video by checking the filename prefix
    if (user.userData?.role === "USER") {
      const userPrefix = user.id.substring(0, 8);
      if (!filename.startsWith(userPrefix)) {
        return NextResponse.json(
          { error: "You can only delete your own videos" },
          { status: 403 }
        );
      }
    }

    // Delete from configured storage
    const deleted = await deleteVideo(videoUrl);

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: "Video deleted successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to delete video" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in video delete API:", error);

    // Don't expose internal error details to client
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to delete video",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Only allow DELETE method
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
