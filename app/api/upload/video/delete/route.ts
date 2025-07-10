import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteVideo, getStorageConfig } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CSRFProtection } from "@/lib/csp";

/**
 * Enhanced filename extraction that handles different URL formats and storage types
 * @param videoUrl - Full URL of the video
 * @returns string - filename or empty string if invalid
 */
function extractVideoFilename(videoUrl: string): string {
  try {
    if (!videoUrl) return "";

    // Handle relative paths (local storage)
    if (!videoUrl.startsWith("http")) {
      const parts = videoUrl.split("/");
      const filename = parts[parts.length - 1];
      // Accept various video formats
      if (filename && /\.(mp4|webm|mov|avi)$/i.test(filename)) {
        return filename;
      }
      return "";
    }

    const url = new URL(videoUrl);
    const pathname = url.pathname;
    const filename = pathname.split("/").pop() || "";

    // Accept videos from videos/ directory with various formats
    if (
      pathname.includes("/videos/") &&
      filename &&
      /\.(mp4|webm|mov|avi)$/i.test(filename)
    ) {
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
 * Deletes a video from storage and removes the corresponding Media record
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
      videoUrl: z.string().min(1, "Video URL is required"),
    });

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const parsed = bodySchema.safeParse(requestBody);
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

    // Get storage configuration to understand URL format
    const storageConfig = await getStorageConfig();
    
    // Validate that this looks like a valid video URL
    const filename = extractVideoFilename(videoUrl);
    if (!filename) {
      console.error("Failed to extract filename from URL:", videoUrl);
      return NextResponse.json(
        { 
          error: "Invalid video URL format", 
          details: `Could not extract filename from: ${videoUrl}` 
        },
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

    // Find the Media record in the database before deletion
    // Use filename to find the record since it's unique
    const mediaRecord = await prisma.media.findFirst({
      where: {
        filename: filename,
        ...(user.userData?.role === "USER" && {
          uploadedBy: user.userData.id, // Additional security check for regular users
        }),
      },
    });

    // Convert relative URL to full URL if needed for deletion
    let urlToDelete = videoUrl;
    if (!videoUrl.startsWith("http")) {
      // For relative URLs, construct the full URL based on storage type
      switch (storageConfig.storageType) {
        case "LOCAL":
          // For local storage, keep the relative path as is
          urlToDelete = videoUrl;
          break;
        case "S3":
          if (storageConfig.s3CloudfrontUrl) {
            urlToDelete = `${storageConfig.s3CloudfrontUrl.replace(/\/$/, "")}/${videoUrl.replace(/^\//, "")}`;
          } else {
            urlToDelete = `https://${storageConfig.s3BucketName}.s3.${storageConfig.s3Region || "us-east-1"}.amazonaws.com/${videoUrl.replace(/^\//, "")}`;
          }
          break;
        case "DOSPACE":
          if (storageConfig.doCdnUrl) {
            urlToDelete = `${storageConfig.doCdnUrl.replace(/\/$/, "")}/${videoUrl.replace(/^\//, "")}`;
          } else {
            urlToDelete = `https://${storageConfig.doSpaceName}.${storageConfig.doRegion}.digitaloceanspaces.com/${videoUrl.replace(/^\//, "")}`;
          }
          break;
      }
    }

    console.log(`Attempting to delete video: ${urlToDelete} (filename: ${filename})`);

    // Delete from configured storage
    const deleted = await deleteVideo(urlToDelete);

    if (deleted) {
      // File deletion succeeded, now clean up the database record
      let databaseCleanupResult = { success: false, recordFound: false };
      
      if (mediaRecord) {
        try {
          await prisma.media.delete({
            where: { id: mediaRecord.id },
          });
          
          databaseCleanupResult = { success: true, recordFound: true };
          console.log(`Successfully deleted Media record for filename: ${filename}`);
        } catch (dbError) {
          console.error("Failed to delete Media record:", dbError);
          // Log the error but don't fail the request since file deletion succeeded
          databaseCleanupResult = { success: false, recordFound: true };
        }
      } else {
        console.log(`No Media record found for filename: ${filename} (file may have been uploaded before database tracking)`);
        databaseCleanupResult = { success: true, recordFound: false };
      }

      return NextResponse.json({
        success: true,
        message: "Video deleted successfully",
        database: databaseCleanupResult,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to delete video from storage" },
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
