import { prisma, DatabaseMetrics } from "@/lib/prisma";
import {
  createCachedFunction,
  CACHE_TAGS,
  CACHE_DURATIONS,
  memoize,
} from "@/lib/cache";
import { Prisma } from "@/lib/generated/prisma";

/**
 * Optimized Query Utilities for Better Performance
 *
 * Key optimizations:
 * - Minimal select statements to reduce data transfer
 * - Proper pagination with cursor-based approach for large datasets
 * - Query result caching with appropriate TTL
 * - Performance monitoring and slow query detection
 * - Consolidated query logic to prevent duplication
 * - Request-scoped memoization for repeated calls
 */

// Optimized select objects for different use cases
export const POST_SELECTS = {
  // Minimal selection for listing pages
  list: {
    id: true,
    title: true,
    slug: true,
    description: true,
    content: true,
    featuredImage: true,
    featuredVideo: true,
    isPremium: true,
    isPublished: true,

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

  // API selection with user interaction data
  api: {
    id: true,
    title: true,
    slug: true,
    description: true,
    content: true,
    featuredImage: true,
    featuredVideo: true,
    isPremium: true,
    isPublished: true,

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
  },

  // Admin selection with additional fields
  admin: {
    id: true,
    title: true,
    slug: true,
    description: true,
    content: true,
    isPremium: true,
    isPublished: true,
    status: true,

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

type PostFullResult = Prisma.PostGetPayload<{
  select: typeof POST_SELECTS.full;
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
 * Enhanced Post Queries Class with comprehensive caching
 */
export class PostQueries {
  /**
   * Get paginated posts with comprehensive filtering and caching
   */
  static async getPaginated(
    params: PostGetPaginatedParams
  ): Promise<PaginatedResult<PostWithInteractions>> {
    const {
      page = 1,
      limit = 12,
      includeUnpublished = false,
      categoryId,
      authorId,
      isPremium,
      userId,
      sortBy = "latest",
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PostWhereInput = {
      isPublished: includeUnpublished ? undefined : true,
      ...(categoryId && {
        OR: [{ categoryId }, { category: { parentId: categoryId } }],
      }),
      ...(authorId && { authorId }),
      ...(isPremium !== undefined && { isPremium }),
    };

    // Build order by clause
    const orderBy:
      | Prisma.PostOrderByWithRelationInput
      | Prisma.PostOrderByWithRelationInput[] =
      sortBy === "popular"
        ? { views: { _count: "desc" } }
        : sortBy === "trending"
        ? [{ views: { _count: "desc" } }, { createdAt: "desc" }]
        : { createdAt: "desc" };

    const endTimer = DatabaseMetrics.startQuery();

    try {
      const [posts, totalCount] = await Promise.all([
        prisma.post.findMany({
          where,
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
          orderBy,
          skip,
          take: limit,
        }),
        prisma.post.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      // Transform posts to include interaction status
      const transformedPosts: PostWithInteractions[] = posts.map((post) => {
        const { bookmarks, favorites, ...rest } = post as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
          ...rest,
          isBookmarked: userId ? bookmarks?.length > 0 : undefined,
          isFavorited: userId ? favorites?.length > 0 : undefined,
        };
      });

      return {
        data: transformedPosts,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          pageSize: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } finally {
      endTimer();
    }
  }

  /**
   * Search posts with full-text search and filters
   */
  static async search(
    query: string,
    params: PaginationParams & {
      userId?: string;
      categoryId?: string;
      isPremium?: boolean;
    }
  ): Promise<PaginatedResult<PostWithInteractions>> {
    const { page = 1, limit = 12, userId, categoryId, isPremium } = params;
    const skip = (page - 1) * limit;

    const searchTerms = query.trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) {
      return {
        data: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Build complex search where clause
    const searchWhere: Prisma.PostWhereInput = {
      isPublished: true,
      AND: searchTerms.map((term) => ({
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { content: { contains: term, mode: "insensitive" } },
          { tags: { some: { name: { contains: term, mode: "insensitive" } } } },
        ],
      })),
      ...(categoryId && {
        OR: [{ categoryId }, { category: { parentId: categoryId } }],
      }),
      ...(isPremium !== undefined && { isPremium }),
    };

    const endTimer = DatabaseMetrics.startQuery();

    try {
      const [posts, totalCount] = await Promise.all([
        prisma.post.findMany({
          where: searchWhere,
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
          orderBy: [{ views: { _count: "desc" } }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
        prisma.post.count({ where: searchWhere }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      // Transform posts to include interaction status
      const transformedPosts: PostWithInteractions[] = posts.map((post) => {
        const { bookmarks, favorites, ...rest } = post as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
          ...rest,
          isBookmarked: userId ? bookmarks?.length > 0 : undefined,
          isFavorited: userId ? favorites?.length > 0 : undefined,
        };
      });

      return {
        data: transformedPosts,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          pageSize: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } finally {
      endTimer();
    }
  }

  /**
   * Get related posts based on category and tags
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
      // Strategy: Find posts that share tags or category, excluding current post
      const relatedPosts = await prisma.post.findMany({
        where: {
          isPublished: true,
          id: { not: postId },
          OR: [
            { categoryId },
            { category: { parentId: categoryId } },
            ...(tagIds.length > 0
              ? [{ tags: { some: { id: { in: tagIds } } } }]
              : []),
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
        orderBy: [{ views: { _count: "desc" } }, { createdAt: "desc" }],
        take: limit,
      });

      return relatedPosts as PostListResult[];
    } finally {
      endTimer();
    }
  }

  /**
   * Get post by ID with full details
   */
  static async getById(
    id: string,
    userId?: string
  ): Promise<PostFullResult | null> {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return (await prisma.post.findUnique({
        where: { id },
        select: {
          ...POST_SELECTS.full,
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
      })) as PostFullResult | null;
    } finally {
      endTimer();
    }
  }

  /**
   * Get post by slug with full details
   */
  static async getBySlug(
    slug: string,
    userId?: string
  ): Promise<PostFullResult | null> {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return (await prisma.post.findFirst({
        where: { slug },
        select: {
          ...POST_SELECTS.full,
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
      })) as PostFullResult | null;
    } finally {
      endTimer();
    }
  }

  /**
   * Get popular posts (trending)
   */
  static async getPopular(
    limit = 10,
    userId?: string
  ): Promise<PostListResult[]> {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      const posts = await prisma.post.findMany({
        where: { isPublished: true },
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
        orderBy: [{ views: { _count: "desc" } }, { createdAt: "desc" }],
        take: limit,
      });

      return posts as PostListResult[];
    } finally {
      endTimer();
    }
  }
}

/**
 * Enhanced Metadata Queries for Categories and Tags
 */
export class MetadataQueries {
  /**
   * Get all categories with post counts
   */
  static async getAllCategories() {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
            orderBy: { name: "asc" },
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
    } finally {
      endTimer();
    }
  }

  /**
   * Get all tags with post counts
   */
  static async getAllTags() {
    const endTimer = DatabaseMetrics.startQuery();

    try {
      return await prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
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
    } finally {
      endTimer();
    }
  }

  /**
   * Get popular tags (most used)
   */
  static async getPopularTags(limit = 20) {
    const endTimer = DatabaseMetrics.startQuery();

    try {
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
        orderBy: {
          posts: {
            _count: "desc",
          },
        },
        take: limit,
      });
    } finally {
      endTimer();
    }
  }
}

/**
 * Cached versions of common queries with request-scoped memoization
 */

// Memoized functions for request deduplication
const memoizedGetPaginated = memoize(
  (params: PostGetPaginatedParams) => PostQueries.getPaginated(params),
  (params) => `posts-paginated-${JSON.stringify(params)}`
);

const memoizedSearch = memoize(
  (
    query: string,
    params: PaginationParams & {
      userId?: string;
      categoryId?: string;
      isPremium?: boolean;
    }
  ) => PostQueries.search(query, params),
  (query, params) => `posts-search-${query}-${JSON.stringify(params)}`
);

const memoizedGetRelated = memoize(
  (
    postId: string,
    categoryId: string,
    tagIds: string[],
    limit: number,
    userId?: string
  ) => PostQueries.getRelated(postId, categoryId, tagIds, limit, userId),
  (postId, categoryId, tagIds, limit, userId) =>
    `related-${postId}-${categoryId}-${tagIds.join(",")}-${limit}-${
      userId || "anon"
    }`
);

// Cached versions with appropriate TTLs
export const getCachedPosts = createCachedFunction(
  memoizedGetPaginated,
  "posts-paginated",
  CACHE_DURATIONS.POSTS_LIST,
  [CACHE_TAGS.POSTS]
);

export const getCachedPostSearch = createCachedFunction(
  memoizedSearch,
  "posts-search",
  CACHE_DURATIONS.SEARCH,
  [CACHE_TAGS.SEARCH_RESULTS]
);

export const getCachedRelatedPosts = createCachedFunction(
  memoizedGetRelated,
  "related-posts",
  CACHE_DURATIONS.POSTS_LIST,
  [CACHE_TAGS.RELATED_POSTS]
);

export const getCachedPostById = createCachedFunction(
  (id: string, userId?: string) => PostQueries.getById(id, userId),
  "post-by-id",
  CACHE_DURATIONS.POST_DETAIL,
  [CACHE_TAGS.POST_BY_ID]
);

export const getCachedPostBySlug = createCachedFunction(
  (slug: string, userId?: string) => PostQueries.getBySlug(slug, userId),
  "post-by-slug",
  CACHE_DURATIONS.POST_DETAIL,
  [CACHE_TAGS.POST_BY_SLUG]
);

export const getCachedPopularPosts = createCachedFunction(
  (limit: number, userId?: string) => PostQueries.getPopular(limit, userId),
  "popular-posts",
  CACHE_DURATIONS.POPULAR_CONTENT,
  [CACHE_TAGS.POPULAR_POSTS]
);

// Cached metadata queries
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

export const getCachedPopularTags = createCachedFunction(
  (limit: number) => MetadataQueries.getPopularTags(limit),
  "popular-tags",
  CACHE_DURATIONS.STATIC_DATA,
  [CACHE_TAGS.TAGS]
);

/**
 * Consolidated query interface for easy consumption
 */
export const OptimizedQueries = {
  // Posts
  posts: {
    getPaginated: getCachedPosts,
    search: getCachedPostSearch,
    getById: getCachedPostById,
    getBySlug: getCachedPostBySlug,
    getRelated: getCachedRelatedPosts,
    getPopular: getCachedPopularPosts,
  },

  // Metadata
  categories: {
    getAll: getCachedCategories,
  },

  tags: {
    getAll: getCachedTags,
    getPopular: getCachedPopularTags,
  },
} as const;
