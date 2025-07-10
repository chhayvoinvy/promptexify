import { NextRequest, NextResponse } from "next/server";
import { getStorageConfig } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";
import { rateLimits, getClientIdentifier, getRateLimitHeaders } from "@/lib/limits";
import { SECURITY_HEADERS } from "@/lib/sanitize";
import { SecurityEvents, getClientIP } from "@/lib/audit";

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimits.mediaResolve(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many media requests. Please try again later.",
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

    // Await params since they're now a Promise in Next.js 15
    const { path } = await params;
    
    // Validate path parameter
    if (!path || path.length === 0) {
      return NextResponse.json(
        { error: "Preview path is required" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Construct the preview path
    const previewPath = path.join("/");
    
    // Security: Validate the path doesn't contain directory traversal attempts
    if (previewPath.includes("..") || previewPath.includes("//")) {
      await SecurityEvents.inputValidationFailure(
        undefined,
        "previewPath",
        previewPath,
        getClientIP(request)
      );
      return NextResponse.json(
        { error: "Invalid preview path" },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    // Get storage configuration
    const config = await getStorageConfig();
    const { storageType } = config;

    let previewUrl: string;

    // Handle different storage types
    switch (storageType) {
      case "S3":
        // For S3, construct the CloudFront URL
        if (!config.s3CloudfrontUrl) {
          return NextResponse.json(
            { error: "S3 CloudFront URL not configured" },
            {
              status: 500,
              headers: SECURITY_HEADERS,
            }
          );
        }
        previewUrl = `${config.s3CloudfrontUrl}/${previewPath}`;
        break;

      case "DOSPACE":
        // For DigitalOcean Spaces, use CDN URL if available
        if (config.doCdnUrl) {
          previewUrl = `${config.doCdnUrl}/${previewPath}`;
        } else {
          previewUrl = `https://${config.doSpaceName}.${config.doRegion}.digitaloceanspaces.com/${previewPath}`;
        }
        break;

      case "LOCAL":
        // For local storage, serve from public directory
        const basePath = config.localBasePath || "/uploads/preview";
        previewUrl = `${basePath}/${previewPath}`;
        break;

      default:
        return NextResponse.json(
          { error: "Unsupported storage type" },
          {
            status: 500,
            headers: SECURITY_HEADERS,
          }
        );
    }

    // For local storage, we need to serve the file directly
    if (storageType === "LOCAL") {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      const { existsSync } = await import("fs");

      // Construct the correct file path for local storage
      const basePath = config.localBasePath || "/uploads";
      // Ensure preview path includes the preview/ subdirectory
      const normalizedPreviewPath = previewPath.startsWith("preview/")
        ? previewPath
        : `preview/${previewPath}`;
      const filePath = join(process.cwd(), "public", basePath.replace(/^\//, ""), normalizedPreviewPath);
      
      if (!existsSync(filePath)) {
        console.error("Preview file not found at:", filePath);
        return NextResponse.json(
          { error: "Preview image not found" },
          {
            status: 404,
            headers: SECURITY_HEADERS,
          }
        );
      }

      try {
        const fileBuffer = await readFile(filePath);
        
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "image/avif",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": fileBuffer.length.toString(),
            ...SECURITY_HEADERS,
          },
        });
      } catch (error) {
        console.error("Error reading preview file:", error);
        return NextResponse.json(
          { error: "Failed to read preview file" },
          {
            status: 500,
            headers: SECURITY_HEADERS,
          }
        );
      }
    }

    // For cloud storage, redirect to the URL
    return NextResponse.redirect(previewUrl, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        ...SECURITY_HEADERS,
      },
    });

  } catch (error) {
    console.error("Preview serving error:", error);
    return NextResponse.json(
      { error: "Failed to serve preview" },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}

// Explicitly deny other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "GET",
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
        Allow: "GET",
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
        Allow: "GET",
      },
    }
  );
} 