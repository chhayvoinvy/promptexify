import { getAllCategories, type SortOption } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { SearchClientWrapper } from "@/components/search-client-wrapper";
import { Queries } from "@/lib/query";
import { getSettingsAction } from "@/actions/settings";

export const dynamic = "force-dynamic"; // Required because we use getCurrentUser() which accesses cookies

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    premium?: string;
    page?: string;
    sort?: string;
  }>;
}

async function SearchResults({
  searchParams,
}: {
  searchParams: SearchPageProps["searchParams"];
}) {
  const [categories, params, currentUser, settingsResult] = await Promise.all([
    getAllCategories(),
    searchParams,
    getCurrentUser(),
    getSettingsAction(),
  ]);

  const postsPageSize =
    settingsResult?.success && settingsResult.data?.postsPageSize
      ? settingsResult.data.postsPageSize
      : 12;

  const {
    q: searchQuery,
    category: categoryFilter,
    subcategory: subcategoryFilter,
    premium: premiumFilter,
    page: pageParam = "1",
    sort: sortBy = "latest",
  } = params;

  const userId = currentUser?.userData?.id;
  const userType = currentUser?.userData?.type || null;

  // Parse page number
  const page = Math.max(1, parseInt(pageParam, 10) || 1);

  // Determine category ID for filtering
  let categoryId: string | undefined;
  if (
    subcategoryFilter &&
    subcategoryFilter !== "all" &&
    subcategoryFilter !== "none"
  ) {
    const subcategory = categories.find((c) => c.slug === subcategoryFilter);
    categoryId = subcategory?.id;
  } else if (categoryFilter && categoryFilter !== "all") {
    const category = categories.find((c) => c.slug === categoryFilter);
    categoryId = category?.id;
  }

  // Handle premium filter
  let isPremium: boolean | undefined;
  if (premiumFilter === "premium") {
    isPremium = true;
  } else if (premiumFilter === "free") {
    isPremium = false;
  }

  // Use search query if provided, otherwise show all posts
  let result;
  if (searchQuery && searchQuery.trim()) {
    result = await Queries.posts.search(searchQuery, {
      page,
      limit: postsPageSize,
      userId,
      categoryId,
      isPremium,
    });
  } else {
    result = await Queries.posts.getPaginated({
      page,
      limit: postsPageSize,
      userId,
      categoryId,
      isPremium,
      sortBy: sortBy as SortOption,
    });
  }

  const { data: posts, pagination } = result;

  return (
    <SearchClientWrapper
      categories={categories}
      posts={posts}
      userType={userType}
      searchQuery={searchQuery}
      categoryFilter={categoryFilter}
      subcategoryFilter={subcategoryFilter}
      pagination={pagination}
      searchParams={params}
    />
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <Suspense fallback={<PostMasonrySkeleton />}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
