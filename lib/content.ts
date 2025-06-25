import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { createCachedFunction, CACHE_TAGS, CACHE_DURATIONS } from "@/lib/cache";

export interface PostWithDetails {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  featuredImage: string | null;
  featuredVideo: string | null;
  isPremium: boolean;
  isPublished: boolean;
  status: string;
  viewCount: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
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
  tags: {
    id: string;
    name: string;
    slug: string;
  }[];
  _count: {
    views: number;
  };
}

export interface PostWithBookmark extends PostWithDetails {
  isBookmarked?: boolean;
}

export interface PostWithFavorite extends PostWithDetails {
  isFavorited?: boolean;
}

export interface PostWithInteractions extends PostWithDetails {
  isBookmarked?: boolean;
  isFavorited?: boolean;
}

export interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  _count: {
    posts: number;
  };
}

// Optimized base query for posts - only select necessary fields for listings
const optimizedPostSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
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
    },
  },
} as const;

// Full post select for detailed views (includes content)
const fullPostSelect = {
  ...optimizedPostSelect,
  content: true,
} as const;

// Internal uncached functions
async function _getAllPosts(
  includeUnpublished = false
): Promise<PostWithDetails[]> {
  const posts = await prisma.post.findMany({
    where: includeUnpublished ? {} : { isPublished: true },
    select: fullPostSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
}

async function _getPostById(id: string): Promise<PostWithDetails | null> {
  const post = await prisma.post.findUnique({
    where: { id },
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
      _count: {
        select: {
          views: true,
        },
      },
    },
  });

  return post;
}

// Cached versions of the functions
export const getAllPosts = createCachedFunction(
  _getAllPosts,
  "get-all-posts",
  CACHE_DURATIONS.POSTS_LIST,
  [CACHE_TAGS.POSTS]
);

export const getPostById = createCachedFunction(
  _getPostById,
  "get-post-by-id",
  CACHE_DURATIONS.POST_DETAIL,
  [CACHE_TAGS.POST_BY_ID]
);

// Internal uncached functions for categories and tags
async function _getAllCategories() {
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
      },
      _count: {
        select: {
          posts: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function _getAllTags(): Promise<TagWithCount[]> {
  return await prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

async function _getPostsByCategory(
  categorySlug: string,
  includeUnpublished = false
): Promise<PostWithDetails[]> {
  const posts = await prisma.post.findMany({
    where: {
      AND: [
        includeUnpublished ? {} : { isPublished: true },
        {
          OR: [
            { category: { slug: categorySlug } },
            { category: { parent: { slug: categorySlug } } },
          ],
        },
      ],
    },
    select: fullPostSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
}

async function _searchPosts(query: string): Promise<PostWithDetails[]> {
  const posts = await prisma.post.findMany({
    where: {
      AND: [
        { isPublished: true },
        {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            {
              tags: {
                some: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            },
          ],
        },
      ],
    },
    select: fullPostSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
}

// Cached versions for static data
export const getAllCategories = createCachedFunction(
  _getAllCategories,
  "get-all-categories",
  CACHE_DURATIONS.STATIC_DATA,
  [CACHE_TAGS.CATEGORIES]
);

export const getAllTags = createCachedFunction(
  _getAllTags,
  "get-all-tags",
  CACHE_DURATIONS.STATIC_DATA,
  [CACHE_TAGS.TAGS]
);

// Cached versions for posts by category
export const getPostsByCategory = createCachedFunction(
  _getPostsByCategory,
  "get-posts-by-category",
  CACHE_DURATIONS.POSTS_LIST,
  [CACHE_TAGS.POSTS]
);

// Search results cache (shorter duration due to dynamic nature)
export const searchPosts = createCachedFunction(
  _searchPosts,
  "search-posts",
  CACHE_DURATIONS.SEARCH,
  [CACHE_TAGS.SEARCH_RESULTS]
);

export async function incrementPostView(
  postId: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  // Check if this IP has already viewed this post
  const existingView = await prisma.view.findUnique({
    where: {
      postId_ipAddress: {
        postId,
        ipAddress,
      },
    },
  });

  if (!existingView) {
    await prisma.view.create({
      data: {
        postId,
        ipAddress,
        userAgent,
      },
    });

    // Update the post view count
    await prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }
}

export async function createMDXFile(
  post: PostWithDetails,
  content: string
): Promise<void> {
  const contentDir = path.join(process.cwd(), "content", "posts");
  const categoryDir = path.join(
    contentDir,
    post.category.parent?.slug || post.category.slug
  );

  // Create directory if it doesn't exist
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  const frontmatter = `---
title: "${post.title}"
description: "${post.description}"
category: "${post.category.slug}"
parentCategory: "${post.category.parent?.slug || post.category.slug}"
tags: [${post.tags.map((tag) => `"${tag.name}"`).join(", ")}]
featuredImage: "${post.featuredImage || ""}"
featuredVideo: "${post.featuredVideo || ""}"
isPremium: ${post.isPremium}
isPublished: ${post.isPublished}
publishedAt: "${post.createdAt.toISOString()}"
authorId: "${post.author.id}"
---

${content}`;

  const filePath = path.join(categoryDir, `${post.slug}.mdx`);
  fs.writeFileSync(filePath, frontmatter);
}

export async function deleteMDXFile(post: PostWithDetails): Promise<void> {
  const contentDir = path.join(process.cwd(), "content", "posts");
  const categoryDir = path.join(
    contentDir,
    post.category.parent?.slug || post.category.slug
  );
  const filePath = path.join(categoryDir, `${post.slug}.mdx`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function getTagById(id: string) {
  return await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });
}

export async function getPostsWithInteractions(
  userId?: string,
  includeUnpublished = false
): Promise<PostWithInteractions[]> {
  const posts = await prisma.post.findMany({
    where: includeUnpublished ? {} : { isPublished: true },
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts.map((post) => ({
    ...post,
    isBookmarked: userId ? post.bookmarks.length > 0 : false,
    isFavorited: userId ? post.favorites.length > 0 : false,
    bookmarks: undefined, // Remove bookmarks from the response
    favorites: undefined, // Remove favorites from the response
  })) as PostWithInteractions[];
}

export type SortOption = "latest" | "trending" | "popular";

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export async function getUserPosts(userId: string): Promise<PostWithDetails[]> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    select: {
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
}

export async function getUserPostsPaginated(
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult<PostWithDetails>> {
  const skip = (page - 1) * pageSize;

  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId },
      select: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.post.count({
      where: { authorId: userId },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    data: posts,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage,
    hasPreviousPage,
  };
}

export async function getPostsPaginated(
  page: number = 1,
  pageSize: number = 10,
  includeUnpublished = false
): Promise<PaginatedResult<PostWithDetails>> {
  // Ensure valid page and pageSize values
  const validPage = Math.max(1, page);
  const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 items per page
  const skip = (validPage - 1) * validPageSize;

  // Use Promise.all for parallel execution to improve performance
  const [totalCount, posts] = await Promise.all([
    // Get total count for pagination metadata
    prisma.post.count({
      where: includeUnpublished ? {} : { isPublished: true },
    }),
    // Get paginated posts
    prisma.post.findMany({
      where: includeUnpublished ? {} : { isPublished: true },
      select: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: validPageSize,
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / validPageSize);

  return {
    data: posts,
    totalCount,
    totalPages,
    currentPage: validPage,
    pageSize: validPageSize,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
  };
}

export async function getPostsWithSorting(
  userId?: string,
  sortBy: SortOption = "latest",
  includeUnpublished = false
): Promise<PostWithInteractions[]> {
  const posts = await prisma.post.findMany({
    where: includeUnpublished ? {} : { isPublished: true },
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
    orderBy:
      sortBy === "latest"
        ? { createdAt: "desc" }
        : sortBy === "trending"
        ? { viewCount: "desc" }
        : sortBy === "popular"
        ? { favorites: { _count: "desc" } }
        : { createdAt: "desc" }, // fallback
  });

  return posts.map((post) => ({
    ...post,
    isBookmarked: userId ? post.bookmarks.length > 0 : false,
    isFavorited: userId ? post.favorites.length > 0 : false,
    bookmarks: undefined, // Remove bookmarks from the response
    favorites: undefined, // Remove favorites from the response
  })) as PostWithInteractions[];
}

export async function getRelatedPosts(
  currentPostId: string,
  currentPost: PostWithDetails,
  userId?: string,
  limit: number = 6
): Promise<PostWithInteractions[]> {
  // Get the current post's tags and category for matching
  const tagIds = currentPost.tags.map((tag) => tag.id);
  const categoryId = currentPost.category.id;
  const parentCategoryId = currentPost.category.parent?.id;

  const posts = await prisma.post.findMany({
    where: {
      AND: [
        { isPublished: true },
        { id: { not: currentPostId } }, // Exclude current post
        {
          OR: [
            // Same category
            { categoryId: categoryId },
            // Same parent category
            ...(parentCategoryId ? [{ categoryId: parentCategoryId }] : []),
            // Shared tags
            ...(tagIds.length > 0
              ? [
                  {
                    tags: {
                      some: {
                        id: { in: tagIds },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    },
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
        },
      },
    },
    orderBy: [
      // Prioritize posts with more shared tags
      { viewCount: "desc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return posts.map((post) => ({
    ...post,
    isBookmarked: userId ? post.bookmarks.length > 0 : false,
    isFavorited: userId ? post.favorites.length > 0 : false,
    bookmarks: undefined,
    favorites: undefined,
  })) as PostWithInteractions[];
}
