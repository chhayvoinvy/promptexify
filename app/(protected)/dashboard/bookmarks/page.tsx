import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { getUserBookmarksAction } from "@/actions";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkX } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

async function BookmarksContent() {
  // Get current user info
  const user = await requireAuth();
  const userType = user?.userData?.type || null;

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

      <PostMasonryGrid posts={postsWithBookmarks} userType={userType} />
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

      <PostMasonrySkeleton count={8} />
    </div>
  );
}

export default async function BookmarksPage() {
  // Require authentication - both USER and ADMIN can access bookmarks
  const user = await requireAuth();

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
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Suspense fallback={<BookmarksLoading />}>
            <BookmarksContent />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
