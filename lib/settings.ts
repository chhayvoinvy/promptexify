import { prisma } from "./prisma";

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

  const settings = await prisma.settings.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { maxTagsPerPost: true },
  });

  cachedMaxTagsPerPost = settings?.maxTagsPerPost ?? 20;
  cacheExpiry = now + CACHE_DURATION_MS;

  return cachedMaxTagsPerPost;
}
