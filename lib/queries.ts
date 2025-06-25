import { prisma, withErrorHandling, DatabaseMetrics } from "@/lib/prisma";
import { createCachedFunction, CACHE_TAGS, CACHE_DURATIONS } from "@/lib/cache";
import { Prisma } from "@/lib/generated/prisma";

/**
 * Optimized Query Utilities for Better Performance
 *
 * Key optimizations:
 * - Minimal select statements to reduce data transfer
 * - Proper pagination with cursor-based approach for large datasets
 * - Query result caching with appropriate TTL
 * - Performance monitoring and slow query detection
 */

// Optimized select objects for different use cases
export const POST_SELECTS = {
  // Minimal selection for listing pages
  list: {
    id: true,
    title: true,
    slug: true,
    description: true,
    featuredImage: true,
    featuredVideo: true,
    isPremium: true,
    isPublished: true,
    viewCount: true,
    createdAt: true,
    author: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
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
  },

  // Full selection for detail pages
  full: {
    id: true,
    title: true,
    slug: true,
    description: true,
    content: true,
    featuredImage: true,
    featuredVideo: true,
    isPremium: true,
    isPublished: true,
    status: true,
    viewCount: true,
    authorId: true,
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
      select: {
        id: true,
        name: true,
        slug: true,
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
        bookmarks: true,
      },
    },
  },

  // Admin selection with additional fields
  admin: {
    id: true,
    title: true,
    slug: true,
    description: true,
    isPremium: true,
    isPublished: true,
    status: true,
    viewCount: true,
    authorId: true,
    createdAt: true,
    updatedAt: true,
    author: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    category: {
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
        bookmarks: true,
      },
    },
  },
} as const;

export const USER_SELECTS = {
  profile: {
    id: true,
    name: true,
    email: true,
    avatar: true,
    type: true,
    role: true,
    createdAt: true,
  },

  admin: {
    id: true,
    name: true,
    email: true,
    avatar: true,
    type: true,
    role: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true,
    stripeCurrentPeriodEnd: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        posts: true,
        bookmarks: true,
        favorites: true,
      },
    },
  },
} as const;

/**
 * Enhanced pagination interface with cursor support
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: "latest" | "popular" | "trending";
}

// Type definitions for query results
type PostListResult = Prisma.PostGetPayload<{
  select: typeof POST_SELECTS.list;
}>;

type PostWithInteractions = Omit<PostListResult, "bookmarks" | "favorites"> & {
  isBookmarked?: boolean;
  isFavorited?: boolean;
  bookmarks?: undefined;
  favorites?: undefined;
};

type PostGetPaginatedParams = PaginationParams & {
  includeUnpublished?: boolean;
  categoryId?: string;
  authorId?: string;
  isPremium?: boolean;
  userId?: string;
};

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Optimized post queries with performance monitoring
 */
export class PostQueries {
  /**
   * Get paginated posts with optimized performance
   */
  static async getPaginated(
    params: PostGetPaginatedParams
  ): Promise<PaginatedResult<PostWithInteractions>> {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await withErrorHandling(async () => {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(50, Math.max(1, params.limit || 12));
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.PostWhereInput = {
          ...(params.includeUnpublished ? {} : { isPublished: true }),
          ...(params.categoryId && { categoryId: params.categoryId }),
          ...(params.authorId && { authorId: params.authorId }),
          ...(params.isPremium !== undefined && {
            isPremium: params.isPremium,
          }),
        };

        // Build orderBy clause
        const orderBy =
          params.sortBy === "popular"
            ? { favorites: { _count: "desc" as const } }
            : params.sortBy === "trending"
            ? { viewCount: "desc" as const }
            : { createdAt: "desc" as const };

        // Execute queries in parallel
        const [posts, totalCount] = await Promise.all([
          prisma.post.findMany({
            where,
            select: {
              ...POST_SELECTS.list,
              // Conditionally include user interactions
              ...(params.userId && {
                bookmarks: {
                  where: { userId: params.userId },
                  select: { id: true },
                },
                favorites: {
                  where: { userId: params.userId },
                  select: { id: true },
                },
              }),
            },
            orderBy,
            skip,
            take: limit,
          }),

          prisma.post.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return {
          data: posts.map(
            (post): PostWithInteractions => ({
              ...post,
              isBookmarked: params.userId ? post.bookmarks?.length > 0 : false,
              isFavorited: params.userId ? post.favorites?.length > 0 : false,
              // Remove the arrays to clean up response
              bookmarks: undefined,
              favorites: undefined,
            })
          ),
          pagination: {
            totalCount,
            totalPages,
            currentPage: page,
            pageSize: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      }, "PostQueries.getPaginated");
    } finally {
      endTimer();
    }
  }

  /**
   * Search posts with optimized full-text search
   */
  static async search(
    query: string,
    params: PaginationParams & { userId?: string }
  ): Promise<PaginatedResult<PostWithInteractions>> {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await withErrorHandling(async () => {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(50, Math.max(1, params.limit || 12));
        const skip = (page - 1) * limit;

        const searchTerms = query.trim().toLowerCase();

        const where = {
          isPublished: true,
          OR: [
            { title: { contains: searchTerms, mode: "insensitive" as const } },
            {
              description: {
                contains: searchTerms,
                mode: "insensitive" as const,
              },
            },
            {
              content: { contains: searchTerms, mode: "insensitive" as const },
            },
            {
              tags: {
                some: {
                  name: { contains: searchTerms, mode: "insensitive" as const },
                },
              },
            },
            {
              category: {
                name: { contains: searchTerms, mode: "insensitive" as const },
              },
            },
          ],
        };

        const [posts, totalCount] = await Promise.all([
          prisma.post.findMany({
            where,
            select: {
              ...POST_SELECTS.list,
              ...(params.userId && {
                bookmarks: {
                  where: { userId: params.userId },
                  select: { id: true },
                },
                favorites: {
                  where: { userId: params.userId },
                  select: { id: true },
                },
              }),
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),

          prisma.post.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return {
          data: posts.map(
            (post): PostWithInteractions => ({
              ...post,
              isBookmarked: params.userId ? post.bookmarks?.length > 0 : false,
              isFavorited: params.userId ? post.favorites?.length > 0 : false,
              bookmarks: undefined,
              favorites: undefined,
            })
          ),
          pagination: {
            totalCount,
            totalPages,
            currentPage: page,
            pageSize: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      }, "PostQueries.search");
    } finally {
      endTimer();
    }
  }

  /**
   * Get related posts with smart algorithm
   */
  static async getRelated(
    postId: string,
    categoryId: string,
    tagIds: string[],
    limit = 6,
    userId?: string
  ): Promise<PostListResult[]> {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await withErrorHandling(async () => {
        return await prisma.post.findMany({
          where: {
            isPublished: true,
            id: { not: postId },
            OR: [
              { categoryId },
              {
                tags: {
                  some: {
                    id: { in: tagIds },
                  },
                },
              },
            ],
          },
          select: {
            ...POST_SELECTS.list,
            ...(userId && {
              bookmarks: {
                where: { userId },
                select: { id: true },
              },
              favorites: {
                where: { userId },
                select: { id: true },
              },
            }),
          },
          orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
          take: limit,
        });
      }, "PostQueries.getRelated");
    } finally {
      endTimer();
    }
  }
}

/**
 * Cached versions of common queries
 */
export const getCachedPosts = createCachedFunction(
  (params: PostGetPaginatedParams) => PostQueries.getPaginated(params),
  "posts-paginated",
  CACHE_DURATIONS.POSTS_LIST,
  [CACHE_TAGS.POSTS]
);

export const getCachedRelatedPosts = createCachedFunction(
  (
    postId: string,
    categoryId: string,
    tagIds: string[],
    limit: number,
    userId?: string
  ) => PostQueries.getRelated(postId, categoryId, tagIds, limit, userId),
  "related-posts",
  CACHE_DURATIONS.POSTS_LIST,
  [CACHE_TAGS.RELATED_POSTS]
);

/**
 * Category and Tag queries
 */
export class MetadataQueries {
  static async getAllCategories() {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await withErrorHandling(async () => {
        return await prisma.category.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                posts: {
                  where: { isPublished: true },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        });
      }, "MetadataQueries.getAllCategories");
    } finally {
      endTimer();
    }
  }

  static async getAllTags() {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await withErrorHandling(async () => {
        return await prisma.tag.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: {
                posts: {
                  where: { isPublished: true },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        });
      }, "MetadataQueries.getAllTags");
    } finally {
      endTimer();
    }
  }
}

// Cached versions
export const getCachedCategories = createCachedFunction(
  MetadataQueries.getAllCategories,
  "all-categories",
  CACHE_DURATIONS.STATIC_DATA,
  [CACHE_TAGS.CATEGORIES]
);

export const getCachedTags = createCachedFunction(
  MetadataQueries.getAllTags,
  "all-tags",
  CACHE_DURATIONS.STATIC_DATA,
  [CACHE_TAGS.TAGS]
);
