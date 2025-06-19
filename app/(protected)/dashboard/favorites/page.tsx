import { Suspense } from "react";
import { Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserFavoritesAction } from "@/actions";
import { FavoriteButton } from "@/components/favorite-button";
import { BookmarkButton } from "@/components/bookmark-button";
import Image from "next/image";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

async function FavoritesList() {
  const result = await getUserFavoritesAction();

  if (!result.success) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load favorites</p>
      </div>
    );
  }

  const favorites = result.favorites || [];

  if (favorites.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <Heart className="h-16 w-16 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-medium">No favorites yet</h3>
        <p className="text-muted-foreground">
          Start favoriting posts to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.map((favorite) => {
        const post = favorite.post;
        return (
          <Card
            key={favorite.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            {post.featuredImage && (
              <div className="relative aspect-video">
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
                {post.isPremium && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500">
                    Premium
                  </Badge>
                )}
              </div>
            )}
            <CardHeader className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {post.category.parent?.name || post.category.name}
                </Badge>
                {post.category.parent && (
                  <Badge variant="outline" className="text-xs">
                    {post.category.name}
                  </Badge>
                )}
              </div>
              <CardTitle className="line-clamp-2 text-lg">
                {post.title}
              </CardTitle>
              {post.description && (
                <CardDescription className="line-clamp-3 text-sm">
                  {post.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-1 mb-3">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {post.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{post.tags.length - 3}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
              <div className="text-xs">
                Favorited on {new Date(favorite.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <FavoriteButton
                  postId={post.id}
                  initialFavorited={true}
                  variant="ghost"
                  size="sm"
                />
                <BookmarkButton
                  postId={post.id}
                  initialBookmarked={false} // We don't have bookmark status here
                  variant="ghost"
                  size="sm"
                />
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

function FavoritesLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          className="overflow-hidden hover:shadow-lg transition-shadow"
        >
          <div className="relative aspect-video">
            <Skeleton className="h-full w-full" />
            {/* Premium badge skeleton - randomly show for some cards */}
            {i % 3 === 0 && (
              <Skeleton className="absolute top-2 right-2 h-5 w-16" />
            )}
          </div>
          <CardHeader className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          {/* Hidden tags section - no skeleton needed since it's hidden */}
          <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-12" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Favorites</h1>
        <p className="text-muted-foreground">
          Posts you&apos;ve marked as favorites
        </p>
      </div>

      <Suspense fallback={<FavoritesLoading />}>
        <FavoritesList />
      </Suspense>
    </div>
  );
}
