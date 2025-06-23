import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";
import { getAllCategories } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { DirectoryFilters } from "@/components/directory-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { InfinitePostGrid } from "@/components/infinite-post-grid";
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
  featuredVideo: string | null;
  isPremium: boolean;
  isPublished: boolean;
  status: string;
  viewCount: number;
  authorId: string;
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

interface DirectoryPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    premium?: string;
  }>;
}

// Directory page skeleton that matches the full layout
function DirectoryPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-80 mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>

      {/* Filters Skeleton */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search skeleton */}
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Category filter skeleton */}
          <Skeleton className="h-10 w-full md:w-48" />

          {/* Premium filter skeleton */}
          <Skeleton className="h-10 w-full md:w-32" />

          {/* Buttons skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      </div>

      {/* Results summary skeleton */}
      <div className="mb-6">
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Posts grid skeleton */}
      <PostMasonrySkeleton count={16} />
    </div>
  );
}

async function DirectoryContent({
  searchParams,
}: {
  searchParams: DirectoryPageProps["searchParams"];
}) {
  const [categories, params, currentUser] = await Promise.all([
    getAllCategories(),
    searchParams,
    getCurrentUser(),
  ]);

  const {
    q: searchQuery,
    category: categoryFilter,
    premium: premiumFilter,
  } = params;

  const userId = currentUser?.userData?.id;
  const userType = currentUser?.userData?.type || null;

  // Build where clause for filtering (same as API)
  const whereClause: WhereClause = {
    isPublished: true,
  };

  // Search filter
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      { content: { contains: searchQuery, mode: "insensitive" } },
      {
        tags: {
          some: {
            name: { contains: searchQuery, mode: "insensitive" },
          },
        },
      },
    ];
  }

  // Category filter
  if (categoryFilter && categoryFilter !== "all") {
    whereClause.OR = whereClause.OR || [];
    whereClause.OR.push(
      { category: { slug: categoryFilter } },
      { category: { parent: { slug: categoryFilter } } }
    );
  }

  // Premium filter
  if (premiumFilter) {
    if (premiumFilter === "free") {
      whereClause.isPremium = false;
    } else if (premiumFilter === "premium") {
      whereClause.isPremium = true;
    }
  }

  // Get initial posts (first page) and total count
  const [initialPosts, totalCount] = await Promise.all([
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
      take: 12, // Initial page size
    }),
    prisma.post.count({
      where: whereClause,
    }),
  ]);

  // Transform posts to include interaction status
  const transformedPosts = initialPosts.map(
    (post: PostWithBookmarksAndFavorites) => ({
      ...post,
      isBookmarked: userId ? post.bookmarks.length > 0 : false,
      isFavorited: userId ? post.favorites.length > 0 : false,
      viewCount: post._count.views,
      bookmarks: undefined, // Remove from response
      favorites: undefined, // Remove from response
    })
  );

  const hasNextPage = totalCount > 12;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Prompt Directory
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Explore our complete collection of AI prompts. Find the perfect prompt
          for your creative projects.
        </p>
      </div>

      {/* Search and Filters */}
      <DirectoryFilters categories={categories} />

      {/* Posts Grid with Infinite Scroll */}
      {transformedPosts.length > 0 ? (
        <InfinitePostGrid
          initialPosts={transformedPosts}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          userType={userType}
        />
      ) : (
        <div className="text-center py-12">
          <div className="mb-4">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No prompts found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or browse all categories.
            </p>
          </div>
          <Link href="/directory">
            <Button variant="outline">Clear Filters</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage({ searchParams }: DirectoryPageProps) {
  return (
    <Suspense fallback={<DirectoryPageSkeleton />}>
      <DirectoryContent searchParams={searchParams} />
    </Suspense>
  );
}
