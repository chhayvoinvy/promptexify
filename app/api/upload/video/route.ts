import { NextRequest, NextResponse } from "next/server";
import { processAndUploadVideo } from "@/lib/s3";
import { getCurrentUser } from "@/lib/auth";

// Maximum file size: 100MB for videos
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Authentication check - only authenticated users can upload
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Admin role check for additional security
    if (user.userData?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("video") as File;
    const title = formData.get("title") as string;

    // Input validation
    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required for filename generation" },
        { status: 400 }
      );
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 100MB" },
        { status: 400 }
      );
    }

    // File type validation
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only MP4, WebM, QuickTime, and AVI videos are allowed",
        },
        { status: 400 }
      );
    }

    // Sanitize title input to prevent injection attacks
    const sanitizedTitle = title.trim().substring(0, 100);
    if (!sanitizedTitle) {
      return NextResponse.json(
        { error: "Valid title is required" },
        { status: 400 }
      );
    }

    // Process and upload video
    const videoUrl = await processAndUploadVideo(file, sanitizedTitle);

    return NextResponse.json({
      success: true,
      videoUrl,
      message: "Video uploaded successfully",
    });
  } catch (error) {
    console.error("Video upload error:", error);

    // Don't expose internal error details to client
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to upload video",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
