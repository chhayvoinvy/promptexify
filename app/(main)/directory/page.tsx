import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";
import { getAllPosts, getAllCategories } from "@/lib/content";
import { Suspense } from "react";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { DirectoryFilters } from "@/components/directory-filters";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [posts, categories, params] = await Promise.all([
    getAllPosts(),
    getAllCategories(),
    searchParams,
  ]);

  const {
    q: searchQuery,
    category: categoryFilter,
    premium: premiumFilter,
  } = params;

  const filteredPosts = posts.filter((post) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesQuery =
        post.title.toLowerCase().includes(query) ||
        post.description?.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.name.toLowerCase().includes(query));

      if (!matchesQuery) return false;
    }

    // Category filter
    if (categoryFilter && categoryFilter !== "all") {
      const matchesCategory =
        post.category.slug === categoryFilter ||
        post.category.parent?.slug === categoryFilter;

      if (!matchesCategory) return false;
    }

    // Premium filter
    if (premiumFilter) {
      if (premiumFilter === "free" && post.isPremium) return false;
      if (premiumFilter === "premium" && !post.isPremium) return false;
    }

    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Prompt Directory
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore our complete collection of AI prompts. Find the perfect prompt
          for your creative projects.
        </p>
      </div>

      {/* Search and Filters */}
      <DirectoryFilters categories={categories} />

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-muted-foreground">
          Showing {filteredPosts.length} of {posts.length} prompts
          {searchQuery && <span> for &ldquo;{searchQuery}&rdquo;</span>}
        </p>
      </div>

      {/* Posts Grid */}
      <PostMasonryGrid posts={filteredPosts} />

      {/* No Results */}
      {filteredPosts.length === 0 && (
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
