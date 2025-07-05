// Enhanced live content configuration with better error handling and caching
// Before using sanityFetch, import and render "<SanityLive />" in your layout
// https://github.com/sanity-io/next-sanity#live-content-api

import { defineLive } from "next-sanity";
import { client } from "@/lib/sanity";
import { config } from "../env";

// Configure live content with enhanced settings
export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({
    // Live content API configuration
    apiVersion: "vX", // Use experimental API for live content
    useCdn: false, // Never use CDN for live content

    // Security: Only enable in development or when explicitly configured
    perspective: config.security.enablePreview ? "previewDrafts" : "published",

    // Performance: Configure caching
    requestTagPrefix: "sanity:",

    // Error handling
    ignoreBrowserTokenWarning: true,
  }),

  // Live content configuration
  serverToken: config.token,
});

// Enhanced fetch function with ISR support
export async function sanityFetchLive<T = unknown>(
  query: string,
  params?: Record<string, unknown>
): Promise<T> {
  try {
    // Use sanityFetch for live content
    const result = await sanityFetch({ query, params });
    return result.data as T;
  } catch (error) {
    console.error("Sanity live fetch error:", error);

    // Fallback to regular client in case of live fetch failure
    const result = await client.fetch<T>(query, params || {});
    return result;
  }
}

// Type-safe live query helpers
export const liveQueries = {
  // Get document by ID with live updates
  byId: (type: string, id: string) => ({
    query: `*[_type == "${type}" && _id == "${id}"][0]`,
    params: { type, id },
  }),

  // Get document by slug with live updates
  bySlug: (type: string, slug: string) => ({
    query: `*[_type == "${type}" && slug.current == "${slug}"][0]`,
    params: { type, slug },
  }),

  // Get published documents with live updates
  published: (type: string) => ({
    query: `*[_type == "${type}" && isPublished == true && publishedAt < now()]`,
    params: { type },
  }),

  // Get documents with live updates and pagination
  paginated: (type: string, start = 0, end = 10) => ({
    query: `*[_type == "${type}"] | order(_createdAt desc) [${start}...${end}]`,
    params: { type, start, end },
  }),
};

// Cache revalidation helpers
export const revalidateHelpers = {
  // Revalidate specific document type
  type: (type: string) => [`sanity:${type}`],

  // Revalidate specific document
  document: (type: string, id: string) => [`sanity:${type}:${id}`],

  // Revalidate by slug
  slug: (type: string, slug: string) => [`sanity:${type}:slug:${slug}`],

  // Revalidate all content
  all: () => ["sanity:all"],
};
