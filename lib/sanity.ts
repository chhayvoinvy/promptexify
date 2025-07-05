import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import type { Image } from "sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

// Environment-specific configurations
const isProd = process.env.NODE_ENV === "production";
const isDev = process.env.NODE_ENV === "development";

// Security: Only use token in server-side contexts
const token =
  typeof window === "undefined" ? process.env.SANITY_API_TOKEN : undefined;

// Create client for read operations (public)
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: isProd, // Use CDN in production for better performance
  perspective: "published", // Only return published documents
  stega: {
    enabled: isDev, // Enable Stega for development
    studioUrl: "/dashboard/pages/studio",
  },
});

// Create client for write operations (authenticated)
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Never use CDN for write operations
  token, // Include token for write operations
  perspective: "previewDrafts", // Include draft documents for editing
});

// Create client for preview mode (authenticated)
export const previewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Never use CDN for preview
  token,
  perspective: "previewDrafts",
  stega: {
    enabled: true,
    studioUrl: "/dashboard/pages/studio",
  },
});

// Image URL builder with security enhancements
const builder = imageUrlBuilder({ projectId, dataset });

export function urlFor(source: Image) {
  if (!source) {
    throw new Error("Image source is required");
  }
  return builder.image(source);
}

// Secure image URL with transformations
export function secureImageUrl(
  source: Image,
  options?: {
    width?: number;
    height?: number;
    format?: "webp" | "jpg" | "png";
    quality?: number;
    fit?: "clip" | "crop" | "fill" | "fillmax" | "max" | "scale" | "min";
  }
) {
  if (!source) {
    throw new Error("Image source is required");
  }

  let url = builder.image(source);

  if (options?.width) url = url.width(options.width);
  if (options?.height) url = url.height(options.height);
  if (options?.format) url = url.format(options.format);
  if (options?.quality) url = url.quality(options.quality);
  if (options?.fit) url = url.fit(options.fit);

  return url;
}

// Enhanced fetch function with error handling and caching
export async function sanityFetch<T = unknown>(
  query: string,
  params?: Record<string, unknown>,
  options?: {
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
    token?: string;
    preview?: boolean;
  }
): Promise<T> {
  const {
    cache = "force-cache",
    next,
    token: optToken,
    preview = false,
  } = options || {};

  try {
    const clientToUse = preview
      ? previewClient
      : optToken
        ? writeClient
        : client;

    const result = await clientToUse.fetch<T>(query, params || {}, {
      cache,
      next,
    });

    return result;
  } catch (error) {
    console.error("Sanity fetch error:", error);
    throw new Error(
      `Failed to fetch from Sanity: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Type-safe GROQ query builder helpers
export const groq = {
  // Get all documents of a specific type
  all: (type: string) => `*[_type == "${type}"]`,

  // Get document by slug
  bySlug: (type: string, slug: string) =>
    `*[_type == "${type}" && slug.current == "${slug}"][0]`,

  // Get published documents only
  published: (type: string) =>
    `*[_type == "${type}" && defined(publishedAt) && publishedAt < now() && !(_id in path("drafts.**"))]`,

  // Get documents with populated references
  withRefs: (type: string, refs: string[]) => {
    const refQueries = refs.map((ref) => `${ref}->`).join(", ");
    return `*[_type == "${type}"]{..., ${refQueries}}`;
  },

  // Search documents
  search: (type: string, searchTerm: string, fields: string[]) => {
    const searchQuery = fields
      .map((field) => `${field} match "${searchTerm}*"`)
      .join(" || ");
    return `*[_type == "${type}" && (${searchQuery})]`;
  },
};

// Validation helpers
export const validate = {
  slug: (slug: string): boolean => {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  },

  imageReference: (ref: unknown): boolean => {
    return (
      ref !== null &&
      typeof ref === "object" &&
      "_type" in ref &&
      (ref as Record<string, unknown>)._type === "image" &&
      "asset" in ref &&
      ref.asset !== null &&
      typeof ref.asset === "object" &&
      "_ref" in ref.asset
    );
  },

  richText: (blocks: unknown[]): boolean => {
    return (
      Array.isArray(blocks) &&
      blocks.every(
        (block) =>
          block &&
          typeof block === "object" &&
          block !== null &&
          "_type" in block &&
          block._type === "block"
      )
    );
  },
};

// Cache tags for ISR
export const cacheTags = {
  all: "sanity:all",
  type: (type: string) => `sanity:${type}`,
  document: (type: string, id: string) => `sanity:${type}:${id}`,
  slug: (type: string, slug: string) => `sanity:${type}:slug:${slug}`,
};

// Export types for external use
export type SanityClient = typeof client;
export type SanityWriteClient = typeof writeClient;
export type SanityPreviewClient = typeof previewClient;
