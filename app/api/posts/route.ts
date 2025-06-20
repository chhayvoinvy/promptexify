import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

interface WhereClause {
  isPublished: boolean;
  OR?: Array<{
    title?: { contains: string; mode: "insensitive" };
    description?: { contains: string; mode: "insensitive" };
    content?: { contains: string; mode: "insensitive" };
    tags?: {
      some: {
        name: { contains: string; mode: "insensitive" };
      };
    };
    category?: {
      slug?: string;
      parent?: { slug: string };
    };
  }>;
  isPremium?: boolean;
}

interface PostWithBookmarksAndFavorites {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  featuredImage: string | null;
  isPremium: boolean;
  isPublished: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  bookmarks: Array<{ id: string }>;
  favorites: Array<{ id: string }>;
  _count: {
    views: number;
    favorites: number;
  };
  author: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    parent: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const search = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const premium = searchParams.get("premium") || "";

    // Validate parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(50, limit)); // Max 50 items per page
    const skip = (validPage - 1) * validLimit;

    // Get current user for bookmark/favorite status
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userData?.id;

    // Build where clause for filtering
    const whereClause: WhereClause = {
      isPublished: true,
    };

    // Search filter
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        {
          tags: {
            some: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Category filter
    if (category && category !== "all") {
      whereClause.OR = whereClause.OR || [];
      whereClause.OR.push(
        { category: { slug: category } },
        { category: { parent: { slug: category } } }
      );
    }

    // Premium filter
    if (premium) {
      if (premium === "free") {
        whereClause.isPremium = false;
      } else if (premium === "premium") {
        whereClause.isPremium = true;
      }
    }

    // Get posts and total count in parallel
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
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
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          bookmarks: userId
            ? {
                where: {
                  userId: userId,
                },
                select: {
                  id: true,
                },
              }
            : false,
          favorites: userId
            ? {
                where: {
                  userId: userId,
                },
                select: {
                  id: true,
                },
              }
            : false,
          _count: {
            select: {
              views: true,
              favorites: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: validLimit,
      }),
      prisma.post.count({
        where: whereClause,
      }),
    ]);

    // Transform posts to include interaction status
    const transformedPosts = posts.map(
      (post: PostWithBookmarksAndFavorites) => ({
        ...post,
        isBookmarked: userId ? post.bookmarks.length > 0 : false,
        isFavorited: userId ? post.favorites.length > 0 : false,
        viewCount: post._count.views,
        bookmarks: undefined, // Remove from response
        favorites: undefined, // Remove from response
      })
    );

    const totalPages = Math.ceil(totalCount / validLimit);
    const hasNextPage = validPage < totalPages;

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage: validPage > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
