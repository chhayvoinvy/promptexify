import { NextRequest, NextResponse } from "next/server";
import { processAndUploadVideoWithConfig } from "@/lib/image/storage";
import { getCurrentUser } from "@/lib/auth";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/security/limits";
import {
  validateFileExtension,
  SECURITY_HEADERS,
  getFileUploadConfig,
} from "@/lib/security/sanitize";
import { prisma } from "@/lib/prisma";
import { CSRFProtection } from "@/lib/security/csp";
import { SecurityEvents, getClientIP } from "@/lib/security/audit";

// Get environment-aware upload configurations
const uploadConfig = getFileUploadConfig();

// Video file magic number validation for additional security
const VIDEO_SIGNATURES: Record<string, number[]> = {
  "video/mp4": [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp box
  "video/webm": [0x1a, 0x45, 0xdf, 0xa3], // EBML header
  "video/quicktime": [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // QuickTime
};

function validateVideoSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const signature = VIDEO_SIGNATURES[mimeType];
  if (!signature) return false;

  const bytes = new Uint8Array(buffer);

  // Special handling for MP4/QuickTime - look for ftyp box
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
    // Check for ftyp box which should be near the beginning
    for (let i = 0; i <= Math.min(bytes.length - 8, 64); i += 4) {
      if (
        bytes[i + 4] === 0x66 && // f
        bytes[i + 5] === 0x74 && // t
        bytes[i + 6] === 0x79 && // y
        bytes[i + 7] === 0x70    // p
      ) {
        return true;
      }
    }
    return false;
  }

  // For other formats, check first few bytes
  return signature.every(
    (byte, index) => index < bytes.length && bytes[index] === byte
  );
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check - only authenticated users can upload
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

    // Role check - allow both ADMIN and USER
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        {
          status: 403,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Rate limiting for file uploads
    const clientId = getClientIdentifier(request, user.userData?.id);
    const rateLimitResult = await rateLimits.upload(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many upload requests. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            ...getRateLimitHeaders(rateLimitResult),
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
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

    // Input validation
    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // File size validation
    if (file.size > uploadConfig.maxVideoSize) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum size is ${
            uploadConfig.maxVideoSize / (1024 * 1024)
          }MB`,
        },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Empty file check
    if (file.size === 0) {
      return NextResponse.json(
        { error: "Empty file provided" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // File type validation
    if (!uploadConfig.allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only MP4, WebM, and MOV videos are allowed",
          allowedTypes: uploadConfig.allowedVideoTypes,
        },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Filename validation
    if (!validateFileExtension(file.name)) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Enhanced file signature validation for additional security
    let videoBuffer: Buffer;
    let detectedType: {ext: string; mime: string} | undefined;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);

      // Custom signature validation
      if (!validateVideoSignature(arrayBuffer, file.type)) {
        await SecurityEvents.suspiciousFileUpload(
          user.userData!.id,
          file.name,
          file.type,
          getClientIP(request)
        );
        return NextResponse.json(
          { error: "File signature doesn't match declared video type" },
          {
            status: 400,
            headers: SECURITY_HEADERS,
          }
        );
      }

      // Additional validation using file-type library
      const { fileTypeFromBuffer } = await import("file-type");
      detectedType = await fileTypeFromBuffer(videoBuffer);

      if (!detectedType) {
        await SecurityEvents.suspiciousFileUpload(
          user.userData!.id,
          file.name,
          file.type,
          getClientIP(request)
        );
        return NextResponse.json(
          { error: "Unable to determine file type" },
          {
            status: 400,
            headers: SECURITY_HEADERS,
          }
        );
      }

      // Validate detected MIME against allowed list and browser-provided type
      if (
        !uploadConfig.allowedVideoTypes.includes(detectedType.mime) ||
        detectedType.mime !== file.type
      ) {
        await SecurityEvents.suspiciousFileUpload(
          user.userData!.id,
          file.name,
          file.type,
          getClientIP(request)
        );
        return NextResponse.json(
          { error: "File signature does not match declared video type" },
          {
            status: 400,
            headers: SECURITY_HEADERS,
          }
        );
      }
    } catch (validationError) {
      console.error("Video file validation error:", validationError);
      return NextResponse.json(
        { error: "Unable to validate file content" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // No title sanitization needed - using actual filename from uploaded file

    // Process and upload video using original File object with the new config-aware function
    const uploadResult = await processAndUploadVideoWithConfig(
      file,
      user.userData!.id
    );

    // Create a Media record in the database with video dimensions
    const newMedia = await prisma.media.create({
      data: {
        filename: uploadResult.filename,
        relativePath: uploadResult.relativePath,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
        storageType: uploadResult.storageType,
        uploadedBy: user.userData!.id,
        blurDataUrl: uploadResult.blurDataUrl,
      },
    });

    // Return the upload result along with the new media ID
    return NextResponse.json(
      {
        ...uploadResult,
        id: newMedia.id,
        previewPath: uploadResult.previewPath, // Explicitly include previewPath for frontend
        previewVideoPath: uploadResult.previewVideoPath, // Explicitly include previewVideoPath for frontend
      },
      {
        status: 200,
        headers: {
          ...SECURITY_HEADERS,
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    console.error("Video upload error:", error);

    // Don't expose internal error details to client in production
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const isDevMode = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Failed to upload video",
        ...(isDevMode && { details: errorMessage }),
      },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}

// Explicitly deny other HTTP methods with proper Allow headers
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

export async function PATCH() {
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
