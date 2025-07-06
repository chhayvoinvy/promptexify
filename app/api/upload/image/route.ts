import { NextRequest, NextResponse } from "next/server";
import { processAndUploadImageWithConfig } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { fileUploadSchema } from "@/lib/schemas";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limit";
import {
  sanitizeFilename,
  validateFileExtension,
  SECURITY_HEADERS,
  getFileUploadConfig,
  ENHANCED_SECURITY_HEADERS,
} from "@/lib/sanitize";
import { SecurityEvents, getClientIP } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// Get environment-aware upload configurations
const uploadConfig = getFileUploadConfig();

// File magic number validation for additional security
const FILE_SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // First 4 bytes of RIFF
  "image/avif": [
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
  ], // Simplified AVIF signature
};

function validateFileSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const signature = FILE_SIGNATURES[mimeType];
  if (!signature) return false;

  const bytes = new Uint8Array(buffer);

  // Special handling for WebP
  if (mimeType === "image/webp") {
    // Check for RIFF header and WebP format
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
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
    const rateLimitResult = rateLimits.upload(clientId);

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

    const file = formData.get("image") as File;
    const title = formData.get("title") as string;

    // Input validation
    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required for filename generation" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Validate file using schema
    const validationResult = fileUploadSchema.safeParse({ title });
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid title format",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // File size validation
    if (file.size > uploadConfig.maxImageSize) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum size is ${
            uploadConfig.maxImageSize / (1024 * 1024)
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
    if (!uploadConfig.allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed",
          allowedTypes: uploadConfig.allowedImageTypes,
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

    // File signature validation for additional security
    try {
      const buffer = await file.arrayBuffer();
      if (!validateFileSignature(buffer, file.type)) {
        await SecurityEvents.suspiciousFileUpload(
          user.userData!.id,
          file.name,
          file.type,
          getClientIP(request)
        );
        return NextResponse.json(
          { error: "File signature doesn't match declared type" },
          {
            status: 400,
            headers: ENHANCED_SECURITY_HEADERS,
          }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Unable to validate file content" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Sanitize title input to prevent injection attacks
    const sanitizedTitle = sanitizeFilename(validationResult.data.title);
    if (!sanitizedTitle || sanitizedTitle === "file") {
      return NextResponse.json(
        { error: "Invalid title provided" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Process and upload the image with the new config-aware function
    const uploadResult = await processAndUploadImageWithConfig(
      file,
      sanitizedTitle,
      user.userData?.id
    );

    // Create a Media record in the database
    const newMedia = await prisma.media.create({
      data: {
        filename: uploadResult.filename,
        relativePath: uploadResult.relativePath,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        width: uploadResult.width,
        height: uploadResult.height,
        storageType: uploadResult.storageType,
        uploadedBy: user.userData!.id,
      },
    });

    // Return the upload result along with the new media ID
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
  } catch (error) {
    console.error("Image upload error:", error);

    // Don't expose internal error details to client
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const isDevMode = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Failed to upload image",
        ...(isDevMode && { details: errorMessage }),
      },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}

// Explicitly deny other HTTP methods
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
