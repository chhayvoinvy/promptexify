import { Suspense } from "react";
import {
  Heart,
  LockIcon,
  UnlockIcon,
  Calendar,
  ExternalLink,
} from "@/components/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getUserFavoritesAction, getUserBookmarksAction } from "@/actions";
import { FavoriteButton } from "@/components/favorite-button";
import { BookmarkButton } from "@/components/bookmark-button";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAuth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

// Helper function to group favorites by date
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupFavoritesByDate(favorites: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: Record<string, any[]> = {};

  favorites.forEach((favorite) => {
    const date = new Date(favorite.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(favorite);
  });

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groups).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return sortedDates.map((date) => ({
    date,
    favorites: groups[date],
  }));
}

// Helper function to format date for display
function formatDateHeader(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

async function FavoritesList({
  userType,
}: {
  userType?: "FREE" | "PREMIUM" | null;
}) {
  const [favoritesResult, bookmarksResult] = await Promise.all([
    getUserFavoritesAction(),
    getUserBookmarksAction(),
  ]);

  if (!favoritesResult.success) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground">Failed to load favorites</p>
        </CardContent>
      </Card>
    );
  }

  const favorites = favoritesResult.favorites || [];
  const bookmarks = bookmarksResult.success
    ? bookmarksResult.bookmarks || []
    : [];

  // Create a set of bookmarked post IDs for quick lookup
  const bookmarkedPostIds = new Set(
    bookmarks.map((bookmark) => bookmark.postId)
  );

  if (favorites.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">No favorites yet</h3>
          <p className="text-muted-foreground">
            Start favoriting posts to see them here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group favorites by date
  const groupedFavorites = groupFavoritesByDate(favorites);

  return (
    <div className="space-y-6">
      {groupedFavorites.map(({ date, favorites: dayFavorites }) => (
        <div key={date} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              {formatDateHeader(date)}
            </h3>
            <Separator className="flex-1" />
            <Badge variant="outline" className="text-xs">
              {dayFavorites.length}{" "}
              {dayFavorites.length === 1 ? "favorite" : "favorites"}
            </Badge>
          </div>

          {/* Favorites List for this date */}
          <div className="space-y-3">
            {dayFavorites.map((favorite) => {
              const post = favorite.post;
              const isBookmarked = bookmarkedPostIds.has(post.id);

              return (
                <Card
                  key={favorite.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-0">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail Image */}
                      {post.featuredImage && (
                        <div className="relative w-20 h-16 flex-shrink-0 rounded-md overflow-hidden">
                          <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                          {post.isPremium && (
                            <div className="absolute top-1 right-1">
                              <Badge className="text-xs px-1 py-0.5 bg-gradient-to-r from-teal-500 to-sky-500 text-foreground">
                                {userType === "PREMIUM" ? (
                                  <UnlockIcon className="w-3 h-3" />
                                ) : (
                                  <LockIcon className="w-3 h-3" />
                                )}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base line-clamp-2 mb-2">
                              <Link
                                href={`/entry/${post.id}`}
                                className="hover:underline flex items-center"
                                target="_blank"
                              >
                                {post.title}
                                <ExternalLink className="w-3 h-3 ml-3" />
                              </Link>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {post.category.parent?.name ||
                                  post.category.name}
                              </Badge>
                              {post.category.parent && (
                                <Badge variant="outline" className="text-xs">
                                  {post.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <FavoriteButton
                              postId={post.id}
                              initialFavorited={true}
                              variant="outline"
                              size="sm"
                            />
                            <BookmarkButton
                              postId={post.id}
                              initialBookmarked={isBookmarked}
                              variant="outline"
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        {/* {post.description && (
                          <CardDescription className="line-clamp-2 text-sm mb-3">
                            {post.description}
                          </CardDescription>
                        )} */}

                        {/* Tags and metadata */}
                        {/* <div className="flex items-center justify-between"> */}
                        {/* <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 4).map((tag: any) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                            {post.tags.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{post.tags.length - 4}
                              </Badge>
                            )}
                          </div> */}

                        {/* <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {new Date(favorite.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div> */}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FavoritesLoading() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, dateIndex) => (
        <div key={dateIndex} className="space-y-4">
          {/* Date Header Skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="flex-1 h-px" />
            <Skeleton className="h-5 w-16" />
          </div>

          {/* List Items Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 2 + dateIndex }).map((_, itemIndex) => (
              <Card key={itemIndex}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-20 h-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <div className="flex gap-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <div className="flex justify-between">
                        <div className="flex gap-1">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-10" />
                        </div>
                        <div className="flex gap-3">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function FavoritesPage() {
  // Require authentication - both USER and ADMIN can access favorites
  const user = await requireAuth();
  const userType = user?.userData?.type || null;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-6">
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Posts you&apos;ve marked as favorites, organized by date
            </p>

            <Suspense fallback={<FavoritesLoading />}>
              <FavoritesList userType={userType} />
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
