import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/settings/content-config
 * Returns frontend-safe content configuration values.
 */
export async function GET() {
  try {
    const settings = await prisma.settings.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { maxTagsPerPost: true },
    });

    return NextResponse.json({
      success: true,
      maxTagsPerPost: settings?.maxTagsPerPost ?? 20,
    });
  } catch (error) {
    console.error("Error fetching content config:", error);
    return NextResponse.json({ success: true, maxTagsPerPost: 20 });
  }
}
