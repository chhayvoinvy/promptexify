import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    // Check if post exists and is published
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, isPublished: true },
    });

    if (!post || !post.isPublished) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Get bookmark and favorite status
    const [bookmark, favorite] = await Promise.all([
      prisma.bookmark.findUnique({
        where: {
          userId_postId: {
            userId,
            postId: id,
          },
        },
      }),
      prisma.favorite.findUnique({
        where: {
          userId_postId: {
            userId,
            postId: id,
          },
        },
      }),
    ]);

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
