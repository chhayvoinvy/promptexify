import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight public endpoint returning non-sensitive content configuration
 * that client components might need (currently only maxTagsPerPost).
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
