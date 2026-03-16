import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostById } from "@/lib/content";
import { getPublicUrl } from "@/lib/image/storage";
import { db } from "@/lib/db";
import { bookmarks, favorites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

async function handlePostRequest(request: NextRequest, { params }: RouteParams, isHeadRequest = false) {
  try {
    const { id } = await params;

    // For HEAD requests, use more permissive checks
    if (isHeadRequest) {
      // Basic validation - just check if post exists and is published
      const post = await getPostById(id);
      
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      
      // For HEAD requests, only check if post is published
      // This allows HEAD requests for all published content regardless of auth state
      if (!post.isPublished) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      // Return successful HEAD response for published posts
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5min cache, 10min stale
          'Content-Type': 'application/json',
        }
      });
    }

    // For GET requests, fetch user and post in parallel for performance
    const [currentUser, post] = await Promise.all([
      getCurrentUser().catch(() => null),
      getPostById(id),
    ]);

    const user = currentUser || undefined;

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if post is published - unpublished posts can only be viewed by author and admin
    if (!post.isPublished) {
      // Only check unpublished access if user is present (dashboard route)
      const canViewUnpublished = user && (post.authorId === user.userData?.id || user.userData?.role === "ADMIN");
      if (!canViewUnpublished) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }

    // Merge bookmark/favorite status into response if user is authenticated
    // This eliminates the need for a separate /status API call
    let interactionStatus = { isBookmarked: false, isFavorited: false };
    const userId = user?.userData?.id;

    if (userId) {
      const [bookmark] = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, id)))
        .limit(1);
      const [favorite] = await db
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.postId, id)))
        .limit(1);
      interactionStatus = {
        isBookmarked: !!bookmark,
        isFavorited: !!favorite,
      };
    }

    return NextResponse.json({
      ...post,
      ...interactionStatus,
      uploadPath: post.uploadPath && post.uploadFileType === "IMAGE"
        ? await getPublicUrl(post.uploadPath)
        : null,
      uploadVideo: post.uploadPath && post.uploadFileType === "VIDEO"
        ? await getPublicUrl(post.uploadPath)
        : null,
    });
  } catch (error) {
    console.error("Post API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return handlePostRequest(request, context, false);
}

export async function HEAD(request: NextRequest, context: RouteParams) {
  return handlePostRequest(request, context, true);
}
