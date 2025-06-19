import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import Link from "next/link";
import { getAllPosts, getAllCategories } from "@/lib/content";
import { Suspense } from "react";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";

interface DirectoryPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    premium?: string;
  }>;
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

  const parentCategories = categories.filter((cat) => !cat.parent);

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
      <div className="mb-8">
        <form method="GET" className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              name="q"
              placeholder="Search prompts..."
              defaultValue={searchQuery}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select name="category" defaultValue={categoryFilter || "all"}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {parentCategories.map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name} ({category._count.posts})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Premium Filter */}
          <Select name="premium" defaultValue={premiumFilter || "all"}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </form>
      </div>

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
    <Suspense fallback={<PostMasonrySkeleton count={16} />}>
      <DirectoryContent searchParams={searchParams} />
    </Suspense>
  );
}
