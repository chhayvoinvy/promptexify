import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";

/**
 * Cache configuration for different data types
 */
export const CACHE_TAGS = {
  POSTS: "posts",
  POST_BY_SLUG: "post-by-slug",
  POST_BY_ID: "post-by-id",
  CATEGORIES: "categories",
  TAGS: "tags",
  USER_POSTS: "user-posts",
  RELATED_POSTS: "related-posts",
  SEARCH_RESULTS: "search-results",
} as const;

export const CACHE_DURATIONS = {
  POSTS_LIST: 300, // 5 minutes for posts list
  POST_DETAIL: 600, // 10 minutes for individual posts
  STATIC_DATA: 3600, // 1 hour for categories/tags
  USER_DATA: 60, // 1 minute for user-specific data
  SEARCH: 180, // 3 minutes for search results
} as const;

/**
 * Create a cached version of a function
 */
export function createCachedFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string,
  revalidate: number,
  tags: string[] = []
) {
  return unstable_cache(fn, [keyPrefix], {
    revalidate,
    tags,
  });
}

/**
 * Generate cache key for pagination
 */
export function generatePaginationKey(
  baseKey: string,
  page: number,
  limit: number,
  additionalParams?: Record<string, string | number | boolean>
): string {
  const params = additionalParams
    ? Object.entries(additionalParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join("-")
    : "";

  return `${baseKey}-page:${page}-limit:${limit}${params ? `-${params}` : ""}`;
}

/**
 * Generate cache key for search queries
 */
export function generateSearchKey(
  query: string,
  filters: Record<string, string | number | boolean> = {}
): string {
  const filterString = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("-");

  return `search-${query.toLowerCase().replace(/\s+/g, "-")}-${filterString}`;
}

/**
 * Revalidate specific cache tags
 */
export function revalidateCache(tags: string | string[]) {
  const tagArray = Array.isArray(tags) ? tags : [tags];

  tagArray.forEach((tag) => {
    revalidateTag(tag);
  });
}
