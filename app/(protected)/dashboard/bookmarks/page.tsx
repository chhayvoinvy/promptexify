import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getUserBookmarksAction } from "@/app/actions";
import { PostGridWithModal } from "@/components/post-grid-with-modal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkX } from "lucide-react";
import { redirect } from "next/navigation";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

async function BookmarksContent() {
  // Get current user
  const currentUser = await getCurrentUser();
  if (!currentUser?.userData) {
    redirect("/signin");
  }

  // Get user's bookmarks
  const result = await getUserBookmarksAction();

  if (!result.success) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BookmarkX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Unable to Load Bookmarks
          </h3>
          <p className="text-muted-foreground text-center">
            {result.error ||
              "There was an error loading your bookmarks. Please try again."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const bookmarks = result.bookmarks || [];

  if (bookmarks.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bookmarks Yet</h3>
          <p className="text-muted-foreground text-center">
            You haven&apos;t bookmarked any posts yet. Start exploring prompts
            and bookmark your favorites!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Transform bookmarks to posts with bookmark status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postsWithBookmarks = bookmarks.map((bookmark: any) => ({
    ...bookmark.post,
    isBookmarked: true,
    _count: {
      views: bookmark.post.viewCount || 0,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Bookmarks</h1>
          <p className="text-muted-foreground">
            {bookmarks.length}{" "}
            {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Bookmark className="h-3 w-3" />
          {bookmarks.length}
        </Badge>
      </div>

      <PostGridWithModal posts={postsWithBookmarks} />
    </div>
  );
}

function BookmarksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="h-6 w-16 bg-muted rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-video bg-muted animate-pulse" />
            <CardHeader className="p-4">
              <div className="h-4 w-16 bg-muted rounded animate-pulse mb-2" />
              <div className="h-5 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse mt-2" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex gap-1 mb-3">
                <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<BookmarksLoading />}>
        <BookmarksContent />
      </Suspense>
    </div>
  );
}
