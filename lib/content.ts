import { PrismaClient } from "@/lib/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export interface PostWithDetails {
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

export async function getAllPosts(
  includeUnpublished = false
): Promise<PostWithDetails[]> {
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

export async function getPostBySlug(
  slug: string
): Promise<PostWithDetails | null> {
  const post = await prisma.post.findUnique({
    where: { slug },
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

export async function getPostById(id: string): Promise<PostWithDetails | null> {
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

export async function getPostsByCategory(
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
}

export async function searchPosts(query: string): Promise<PostWithDetails[]> {
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
}

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

export async function getAllCategories() {
  return await prisma.category.findMany({
    include: {
      parent: true,
      children: true,
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

export async function getAllTags() {
  return await prisma.tag.findMany({
    include: {
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
