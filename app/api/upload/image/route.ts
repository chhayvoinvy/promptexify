import { NextRequest, NextResponse } from "next/server";
import { processAndUploadImageWithConfig } from "@/lib/image/storage";
import { getCurrentUser } from "@/lib/auth";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/security/limits";
import {
  validateFileExtension,
  SECURITY_HEADERS,
} from "@/lib/security/sanitize";
import {
  unauthorizedResponse,
  forbiddenResponse,
  rateLimitExceededResponse,
  validationErrorResponse,
  serverErrorResponse,
  methodNotAllowedResponse,
} from "@/lib/api-response";
import { CSRFProtection } from "@/lib/security/csp";
import { SecurityEvents, getClientIP } from "@/lib/security/audit";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { getStorageConfig } from "@/lib/image/storage";

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
      return unauthorizedResponse("Authentication required");
    }

    // Role check - allow both ADMIN and USER
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return forbiddenResponse("Insufficient permissions");
    }

    // Rate limiting for file uploads (in addition to middleware bucket)
    const clientId = getClientIdentifier(request, user.userData?.id);
    const rateLimitResult = await rateLimits.upload(clientId);

    if (!rateLimitResult.allowed) {
      return rateLimitExceededResponse(
        rateLimitResult,
        getRateLimitHeaders(rateLimitResult)
      );
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return validationErrorResponse("Invalid form data");
    }

    const csrfToken = CSRFProtection.getTokenFromFormData(formData);
    const isValidCSRF = await CSRFProtection.validateToken(csrfToken);
    if (!isValidCSRF) {
      return forbiddenResponse("Invalid CSRF token", "CSRF_INVALID");
    }

    const file = formData.get("image") as File;

    // Input validation
    if (!file) {
      return validationErrorResponse("No image file provided", "MISSING_FILE");
    }

    // Get storage configuration from database
    const uploadConfig = await getStorageConfig();
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/webp",
      "image/avif",
    ];

    // File size validation
    if (file.size > uploadConfig.maxImageSize) {
      return validationErrorResponse(
        `File size too large. Maximum size is ${uploadConfig.maxImageSize / (1024 * 1024)}MB`,
        "FILE_TOO_LARGE"
      );
    }

    // Empty file check
    if (file.size === 0) {
      return validationErrorResponse("Empty file provided", "EMPTY_FILE");
    }

    // File type validation
    if (!allowedImageTypes.includes(file.type)) {
      return validationErrorResponse(
        "Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed",
        "INVALID_FILE_TYPE",
        { allowedTypes: allowedImageTypes }
      );
    }

    // Filename validation
    if (!validateFileExtension(file.name)) {
      return validationErrorResponse("Invalid file extension", "INVALID_EXTENSION");
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
        return validationErrorResponse(
          "File signature doesn't match declared type",
          "INVALID_SIGNATURE"
        );
      }
    } catch {
      return validationErrorResponse("Unable to validate file content", "VALIDATION_ERROR");
    }

    // No title sanitization needed - using actual filename from uploaded file

    // Process and upload the image with the new config-aware function
    const uploadResult = await processAndUploadImageWithConfig(
      file,
      user.userData?.id
    );

    const [newMedia] = await db
      .insert(media)
      .values({
        filename: uploadResult.filename,
        relativePath: uploadResult.relativePath,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        width: uploadResult.width,
        height: uploadResult.height,
        uploadedBy: user.userData!.id,
        blurDataUrl: uploadResult.blurDataUrl,
      })
      .returning();

    return NextResponse.json(
      {
        ...uploadResult,
        id: newMedia!.id,
        previewPath: uploadResult.previewPath,
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
    return serverErrorResponse("Failed to upload image", error);
  }
}

// Explicitly deny other HTTP methods
export async function GET() {
  return methodNotAllowedResponse("POST");
}

export async function PUT() {
  return methodNotAllowedResponse("POST");
}

export async function DELETE() {
  return methodNotAllowedResponse("POST");
}

export async function PATCH() {
  return methodNotAllowedResponse("POST");
}
