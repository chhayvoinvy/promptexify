import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PrismaClient } from "@/lib/generated/prisma";
import { searchSchema } from "@/lib/schemas";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limit";
import { sanitizeSearchQuery, SECURITY_HEADERS } from "@/lib/sanitize";

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

// Optimized select for API responses - include content for full post data
const optimizedApiSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  content: true, // Include content field
  featuredImage: true,
  featuredVideo: true,
  isPremium: true,
  isPublished: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
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
  _count: {
    select: {
      views: true,
      favorites: true,
    },
  },
} as const;

// Internal function for getting paginated posts
async function _getPaginatedPosts(
  whereClause: WhereClause,
  skip: number,
  limit: number,
  userId?: string
): Promise<{
  posts: PostWithBookmarksAndFavorites[];
  totalCount: number;
}> {
  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where: whereClause,
      select: {
        ...optimizedApiSelect,
        bookmarks: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
        favorites: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.post.count({
      where: whereClause,
    }),
  ]);

  return { posts, totalCount };
}

export async function GET(request: NextRequest) {
  try {
    // Get current user for bookmark/favorite status
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userData?.id;

    // Rate limiting
    const clientId = getClientIdentifier(request, userId);
    const rateLimitResult = rateLimits.search(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            ...getRateLimitHeaders(rateLimitResult),
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "12",
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      subcategory: searchParams.get("subcategory") || "",
      premium: searchParams.get("premium") || "",
    };

    // Validate parameters using schema
    const validationResult = searchSchema.safeParse(rawParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        {
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    const {
      page,
      limit,
      q: search,
      category,
      subcategory,
      premium,
    } = validationResult.data;

    // Sanitize search query
    const sanitizedSearch = search ? sanitizeSearchQuery(search) : "";

    // Calculate pagination with validated values
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: WhereClause = {
      isPublished: true,
    };

    // Search filter - only if search term provided and not empty after sanitization
    if (sanitizedSearch && sanitizedSearch.length > 0) {
      whereClause.OR = [
        { title: { contains: sanitizedSearch, mode: "insensitive" } },
        { description: { contains: sanitizedSearch, mode: "insensitive" } },
        { content: { contains: sanitizedSearch, mode: "insensitive" } },
        {
          tags: {
            some: {
              name: { contains: sanitizedSearch, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Category and subcategory filter with validation
    if (category && category !== "all") {
      // Validate category slug format
      if (!/^[a-z0-9-]+$/.test(category)) {
        return NextResponse.json(
          { error: "Invalid category format" },
          {
            status: 400,
            headers: SECURITY_HEADERS,
          }
        );
      }

      whereClause.OR = whereClause.OR || [];

      if (subcategory && subcategory !== "all") {
        // Validate subcategory slug format
        if (!/^[a-z0-9-]+$/.test(subcategory)) {
          return NextResponse.json(
            { error: "Invalid subcategory format" },
            {
              status: 400,
              headers: SECURITY_HEADERS,
            }
          );
        }

        // Filter by specific subcategory
        whereClause.OR.push({ category: { slug: subcategory } });
      } else {
        // Filter by parent category (includes all its subcategories)
        whereClause.OR.push(
          { category: { slug: category } },
          { category: { parent: { slug: category } } }
        );
      }
    }

    // Premium filter
    if (premium) {
      if (premium === "free") {
        whereClause.isPremium = false;
      } else if (premium === "premium") {
        whereClause.isPremium = true;
      }
      // "all" or invalid values are ignored
    }

    // Get posts and total count using optimized function
    const { posts, totalCount } = await _getPaginatedPosts(
      whereClause,
      skip,
      limit,
      userId
    );

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

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;

    return NextResponse.json(
      {
        posts: transformedPosts,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPreviousPage: page > 1,
        },
      },
      {
        headers: {
          ...SECURITY_HEADERS,
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}

// Explicitly deny other HTTP methods for security
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed. Use dashboard to create posts." },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "GET",
      },
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "GET",
      },
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "GET",
      },
    }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        ...SECURITY_HEADERS,
        Allow: "GET",
      },
    }
  );
}
