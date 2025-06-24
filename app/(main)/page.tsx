import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, Heart } from "lucide-react";
import Link from "next/link";
import { getPostsWithSorting, type SortOption } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { HeroSection } from "@/components/hero-section";
import { cn } from "@/lib/utils";

interface SearchProps {
  searchParams: Promise<{
    q?: string;
    sort?: SortOption;
  }>;
}

async function PostGrid({
  searchQuery,
  sortBy = "latest",
}: {
  searchQuery?: string;
  sortBy?: SortOption;
}) {
  // Get current user to determine bookmark status
  const currentUser = await getCurrentUser();
  const userId = currentUser?.userData?.id;
  const userType = currentUser?.userData?.type || null;

  const posts = await getPostsWithSorting(userId, sortBy);

  const filteredPosts = searchQuery
    ? posts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags.some((tag) =>
            tag.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : posts.slice(0, 12); // Show latest 12 posts on home

  return <PostMasonryGrid posts={filteredPosts} userType={userType} />;
}

function FilterButtons({ currentSort }: { currentSort: SortOption }) {
  const filters = [
    {
      key: "latest" as SortOption,
      label: "Latest",
      icon: Clock,
      description: "Newest prompts",
    },
    {
      key: "popular" as SortOption,
      label: "Most Popular",
      icon: Heart,
      description: "Most favorited",
    },
    {
      key: "trending" as SortOption,
      label: "Trending",
      icon: TrendingUp,
      description: "Most viewed",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-8">
      {filters.map((filter) => {
        const Icon = filter.icon;
        return (
          <Link
            key={filter.key}
            href={`/?sort=${filter.key}`}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
              "hover:bg-accent hover:text-accent-foreground",
              currentSort === filter.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium text-sm">{filter.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function HomePage({ searchParams }: SearchProps) {
  const { q: searchQuery, sort = "latest" } = await searchParams;

  return (
    <div className="min-h-screen bg-background py-0">
      {/* Hero Section */}
      <HeroSection searchQuery={searchQuery} sort={sort} />

      {/* Posts Section */}
      <section className="py-12">
        <div className="container mx-auto px-5 py-6 max-w-7xl">
          {searchQuery && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">
                Search Results for &ldquo;{searchQuery}&rdquo;
              </h2>
              <p className="text-muted-foreground">
                Showing all prompts matching your search criteria
              </p>
            </div>
          )}

          {/* Filter Buttons */}
          {!searchQuery && <FilterButtons currentSort={sort} />}

          <Suspense fallback={<PostMasonrySkeleton />}>
            <PostGrid searchQuery={searchQuery} sortBy={sort} />
          </Suspense>

          {!searchQuery && (
            <div className="text-center mt-12">
              <Link href="/directory">
                <Button size="lg" variant="outline">
                  View All Prompts
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
