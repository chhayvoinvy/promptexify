import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, bookmarks, favorites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get current user for bookmark/favorite status
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userData?.id;

    if (!userId) {
      // Return default state for anonymous users
      return NextResponse.json(
        {
          isBookmarked: false,
          isFavorited: false,
        },
        {
          status: 200,
          headers: SECURITY_HEADERS,
        }
      );
    }

    const [post] = await db
      .select({ id: posts.id, isPublished: posts.isPublished })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post || !post.isPublished) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, id)))
      .limit(1);
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.postId, id)))
      .limit(1);

    return NextResponse.json(
      {
        isBookmarked: !!bookmark,
        isFavorited: !!favorite,
      },
      {
        status: 200,
        headers: {
          ...SECURITY_HEADERS,
          // Short cache for fresh data
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching post status:", error);
    return NextResponse.json(
      { error: "Failed to fetch post status" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

// Disable other HTTP methods for security
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}
