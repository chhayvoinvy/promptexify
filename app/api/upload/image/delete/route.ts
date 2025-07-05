import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteImage, extractImageFilename } from "@/lib/storage";

/**
 * DELETE /api/upload/image/delete
 * Deletes an image from S3 storage
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

    // Role check - allow both ADMIN and USER (users can delete their own images)
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl } = body;

    // Input validation
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate that this is one of our uploaded images
    const filename = extractImageFilename(imageUrl);
    if (!filename) {
      return NextResponse.json(
        { error: "Invalid image URL - not an uploaded image" },
        { status: 400 }
      );
    }

    // For non-admin users, verify they own the image by checking the filename prefix
    if (user.userData?.role === "USER") {
      const userPrefix = user.id.substring(0, 8);
      if (!filename.startsWith(userPrefix)) {
        return NextResponse.json(
          { error: "You can only delete your own images" },
          { status: 403 }
        );
      }
    }

    // Delete from configured storage
    const deleted = await deleteImage(imageUrl);

    if (deleted) {
      return NextResponse.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in image delete API:", error);

    // Don't expose internal error details to client
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to delete image",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
