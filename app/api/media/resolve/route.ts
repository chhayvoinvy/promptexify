import { NextRequest, NextResponse } from "next/server";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json(
        { error: "Invalid request. Expected 'paths' array." },
        { status: 400 }
      );
    }

    // Handle single path
    if (paths.length === 1) {
      const resolvedUrl = await resolveMediaUrl(paths[0]);
      return NextResponse.json({ url: resolvedUrl });
    }

    // Handle multiple paths
    const resolvedUrls = await resolveMediaUrls(paths);
    return NextResponse.json({ urls: resolvedUrls });
  } catch (error) {
    console.error("Error resolving media URLs:", error);
    return NextResponse.json(
      { error: "Failed to resolve media URLs" },
      { status: 500 }
    );
  }
}
