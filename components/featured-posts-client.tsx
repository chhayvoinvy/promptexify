"use client";

import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostWithInteractions } from "@/lib/content";

interface FeaturedPostsClientProps {
  posts: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
}

/**
 * Client component wrapper for featured posts
 * This establishes a proper server/client boundary
 */
export function FeaturedPostsClient({ posts, userType }: FeaturedPostsClientProps) {
  return <PostMasonryGrid posts={posts} userType={userType} />;
} 