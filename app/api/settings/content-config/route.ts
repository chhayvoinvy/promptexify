import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

/**
 * GET /api/settings/content-config
 * Returns frontend-safe content configuration values.
 */
export async function GET() {
  try {
    const [row] = await db
      .select({ maxTagsPerPost: settings.maxTagsPerPost })
      .from(settings)
      .orderBy(desc(settings.updatedAt))
      .limit(1);

    return NextResponse.json({
      success: true,
      maxTagsPerPost: row?.maxTagsPerPost ?? 20,
    });
  } catch (error) {
    console.error("Error fetching content config:", error);
    return NextResponse.json({ success: true, maxTagsPerPost: 20 });
  }
}
