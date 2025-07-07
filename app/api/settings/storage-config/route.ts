import { NextResponse } from "next/server";
import { getStorageConfigAction } from "@/actions/settings";

/**
 * GET /api/settings/storage-config
 * Returns storage configuration for client components.
 */
export async function GET() {
  try {
    const result = await getStorageConfigAction();

    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        config: {
          storageType: result.data.storageType,
          maxImageSize: result.data.maxImageSize,
          maxVideoSize: result.data.maxVideoSize,
          enableCompression: result.data.enableCompression,
          compressionQuality: result.data.compressionQuality,
        },
      });
    }

    // Defaults if no settings
    return NextResponse.json({
      success: true,
      config: {
        storageType: "S3",
        maxImageSize: 2097152,
        maxVideoSize: 10485760,
        enableCompression: true,
        compressionQuality: 80,
      },
    });
  } catch (error) {
    console.error("Error fetching storage config:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch storage configuration",
      config: {
        storageType: "S3",
        maxImageSize: 2097152,
        maxVideoSize: 10485760,
        enableCompression: true,
        compressionQuality: 80,
      },
    });
  }
}

// Only allow GET
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
