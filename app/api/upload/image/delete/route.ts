import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteImageFromS3, extractImageFilename } from "@/lib/s3";

/**
 * DELETE /api/upload/image/delete
 * Deletes an image from S3 storage
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get Supabase client and check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl } = body;

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

    // Delete from S3
    const deleted = await deleteImageFromS3(imageUrl);

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
