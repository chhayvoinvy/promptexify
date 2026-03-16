import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// Cache the maxTagsPerPost value in memory for a short period so that we
// don't hit the database on every request. Five-minute cache is usually
// enough because administrators don't update this slider frequently.
let cachedMaxTagsPerPost: number | null = null;
let cacheExpiry = 0;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current "Max Tags Per Post" value from the Settings table.
 * Falls back to the default (20) when settings are missing.
 */
export async function getMaxTagsPerPost(): Promise<number> {
  const now = Date.now();

  if (cachedMaxTagsPerPost !== null && now < cacheExpiry) {
    return cachedMaxTagsPerPost;
  }

  const [row] = await db
    .select({ maxTagsPerPost: settings.maxTagsPerPost })
    .from(settings)
    .orderBy(desc(settings.updatedAt))
    .limit(1);

  cachedMaxTagsPerPost = row?.maxTagsPerPost ?? 20;
  cacheExpiry = now + CACHE_DURATION_MS;

  return cachedMaxTagsPerPost;
}
