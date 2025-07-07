import { NextRequest, NextResponse } from "next/server";
import { processAndUploadVideoWithConfig } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { fileUploadSchema } from "@/lib/schemas";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/limits";
import {
  sanitizeFilename,
  validateFileExtension,
  SECURITY_HEADERS,
  getFileUploadConfig,
} from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { CSRFProtection } from "@/lib/csp";

const uploadConfig = getFileUploadConfig();

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    // Role check
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // Rate limiting
    const clientId = getClientIdentifier(request, user.userData?.id);
    const rateLimitResult = await rateLimits.upload(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const csrfToken = CSRFProtection.getTokenFromFormData(formData);
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

    const file = formData.get("video") as File;
    const title = formData.get("title") as string;

    // Input validation
    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const validationResult = fileUploadSchema.safeParse({ title });
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid title format",
          details: validationResult.error.errors,
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // File size and type validation
    if (file.size > uploadConfig.maxVideoSize) {
      return NextResponse.json(
        {
          error: `File size too large. Max size: ${uploadConfig.maxVideoSize / (1024 * 1024)}MB`,
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    if (!uploadConfig.allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only MP4, WebM, and MOV are allowed." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    if (!validateFileExtension(file.name)) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Perform server-side MIME sniffing to ensure file content matches declared type
    try {
      const arrayBuffer = await file.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);

      const { fileTypeFromBuffer } = await import("file-type");
      const detectedType = await fileTypeFromBuffer(videoBuffer);

      if (!detectedType) {
        return NextResponse.json(
          { error: "Unable to determine file type" },
          { status: 400, headers: SECURITY_HEADERS }
        );
      }

      // Validate detected MIME against allowed list and browser-provided type
      if (
        !uploadConfig.allowedVideoTypes.includes(detectedType.mime) ||
        detectedType.mime !== file.type
      ) {
        return NextResponse.json(
          { error: "File signature does not match declared video type" },
          { status: 400, headers: SECURITY_HEADERS }
        );
      }

      // Sanitize title
      const sanitizedTitle = sanitizeFilename(validationResult.data.title);

      // Process and upload video using original File object
      const uploadResult = await processAndUploadVideoWithConfig(
        file,
        sanitizedTitle,
        user.userData.id
      );

      // Create Media record
      const newMedia = await prisma.media.create({
        data: {
          filename: uploadResult.filename,
          relativePath: uploadResult.relativePath,
          originalName: uploadResult.originalName,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          storageType: uploadResult.storageType,
          uploadedBy: user.userData.id,
        },
      });

      return NextResponse.json(
        {
          ...uploadResult,
          id: newMedia.id,
        },
        {
          status: 200,
          headers: {
            ...SECURITY_HEADERS,
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    } catch (err) {
      console.error("Video MIME validation error:", err);
      return NextResponse.json(
        { error: "Failed to validate video file" },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
  } catch (error) {
    console.error("Video upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: "Failed to upload video", details: errorMessage },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}
