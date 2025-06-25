"use server";

import { type BookmarkData, bookmarkSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleAuthRedirect } from "./auth";

// Bookmark actions
export async function toggleBookmarkAction(data: BookmarkData) {
  try {
    // Validate the input
    const validatedData = bookmarkSchema.parse(data);

    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    // Check if bookmark already exists
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: validatedData.postId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId: user.id,
            postId: validatedData.postId,
          },
        },
      });

      revalidatePath("/");
      return { success: true, bookmarked: false };
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: {
          userId: user.id,
          postId: validatedData.postId,
        },
      });

      revalidatePath("/");
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
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    // Get user's bookmarks with post details
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            category: {
              include: {
                parent: true,
              },
            },
            tags: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, bookmarks };
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
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    // Check if post is bookmarked
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId,
        },
      },
    });

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
