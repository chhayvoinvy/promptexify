"use server";

import { type BookmarkData, bookmarkSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { bookmarks as bookmarksTable } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";
import { Queries } from "@/lib/query";

// Bookmark actions
export async function toggleBookmarkAction(data: BookmarkData) {
  try {
    // Validate the input
    const validatedData = bookmarkSchema.parse(data);

    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      // Return authentication error instead of redirecting to prevent modal navigation issues
      return {
        success: false,
        error: "Authentication required. Please sign in.",
      };
    }
    const user = currentUser.userData;

    const [existingBookmark] = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, user.id), eq(bookmarksTable.postId, validatedData.postId)))
      .limit(1);

    if (existingBookmark) {
      await db
        .delete(bookmarksTable)
        .where(and(eq(bookmarksTable.userId, user.id), eq(bookmarksTable.postId, validatedData.postId)));

      // Targeted cache invalidation — only bookmark-relevant caches
      await revalidateCache([
        CACHE_TAGS.USER_BOOKMARKS,
        CACHE_TAGS.POST_BY_ID,
      ]);
      return { success: true, bookmarked: false };
    } else {
      await db.insert(bookmarksTable).values({
        userId: user.id,
        postId: validatedData.postId,
      });

      // Targeted cache invalidation — only bookmark-relevant caches
      await revalidateCache([
        CACHE_TAGS.USER_BOOKMARKS,
        CACHE_TAGS.POST_BY_ID,
      ]);
      return { success: true, bookmarked: true };
    }
  } catch (error) {
    // Check if this is a Next.js redirect (authentication redirect)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an authentication redirect - re-throw it
        throw error;
      }
    }

    console.error("Error toggling bookmark:", error);
    return { success: false, error: "Failed to toggle bookmark" };
  }
}

export async function getUserBookmarksAction() {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      // Return authentication error instead of redirecting
      return {
        success: false,
        error: "Authentication required. Please sign in.",
      };
    }
    const user = currentUser.userData;

    const bookmarkRows = await db
      .select({ postId: bookmarksTable.postId, id: bookmarksTable.id, createdAt: bookmarksTable.createdAt })
      .from(bookmarksTable)
      .where(eq(bookmarksTable.userId, user.id))
      .orderBy(desc(bookmarksTable.createdAt));
    const bookmarksWithPosts = await Promise.all(
      bookmarkRows.map(async (b) => {
        const post = await Queries.posts.getById(b.postId, user.id);
        return { id: b.id, createdAt: b.createdAt, post };
      })
    );
    return { success: true, bookmarks: bookmarksWithPosts };
  } catch (error) {
    // Check if this is a Next.js redirect (authentication redirect)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an authentication redirect - re-throw it
        throw error;
      }
    }

    console.error("Error fetching user bookmarks:", error);
    return { success: false, error: "Failed to fetch bookmarks" };
  }
}

export async function checkBookmarkStatusAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      // Return authentication error instead of redirecting
      return {
        success: false,
        error: "Authentication required. Please sign in.",
      };
    }
    const user = currentUser.userData;

    const [bookmark] = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, user.id), eq(bookmarksTable.postId, postId)))
      .limit(1);
    return { success: true, bookmarked: !!bookmark };
  } catch (error) {
    // Check if this is a Next.js redirect (authentication redirect)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an authentication redirect - re-throw it
        throw error;
      }
    }

    console.error("Error checking bookmark status:", error);
    return { success: false, error: "Failed to check bookmark status" };
  }
}
