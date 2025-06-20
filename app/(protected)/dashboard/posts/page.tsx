import React, { Suspense } from "react";
import { Metadata } from "next";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPostsPaginated, getAllPosts } from "@/lib/content";
import { redirect } from "next/navigation";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

// Metadata for the page
export const metadata: Metadata = {
  title: "Posts Management | Dashboard",
  description:
    "Manage your content posts, create new prompts, and organize your directory.",
  robots: {
    index: false,
    follow: false,
  },
};

interface PostsManagementPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}

// Stats cards skeleton
function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Table skeleton
function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Combined loading skeleton
function LoadingSkeleton() {
  return (
    <>
      <StatsCardsSkeleton />
      <TableSkeleton />
    </>
  );
}

// Page size selector component
function PageSizeSelector({
  currentPageSize,
  currentPage,
  totalCount,
}: {
  currentPageSize: number;
  currentPage: number;
  totalCount: number;
}) {
  const pageSizeOptions = [5, 10, 20, 50];

  const generatePageSizeLink = (newPageSize: number) => {
    const url = new URL("/dashboard/posts", "http://localhost");
    if (newPageSize !== 10) {
      // 10 is default
      url.searchParams.set("pageSize", newPageSize.toString());
    }
    // Reset to page 1 when changing page size
    return url.pathname + url.search;
  };

  const startIndex = (currentPage - 1) * currentPageSize + 1;
  const endIndex = Math.min(currentPage * currentPageSize, totalCount);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} of {totalCount} posts
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">Posts per page:</p>
        <Select value={currentPageSize.toString()}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                <Link
                  href={generatePageSizeLink(size)}
                  className="block w-full"
                >
                  {size}
                </Link>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Main content component
async function PostsManagementContent({
  searchParams,
}: PostsManagementPageProps) {
  try {
    // Parse search params
    const params = await searchParams;
    const currentPage = parseInt(params.page || "1", 10);
    const pageSize = parseInt(params.pageSize || "10", 10);

    // Validate page size
    const validPageSize = Math.min(Math.max(pageSize, 5), 50);

    // Get paginated posts and total count for stats
    const [paginatedResult, allPosts] = await Promise.all([
      getPostsPaginated(currentPage, validPageSize, true), // Include unpublished posts
      getAllPosts(true), // For statistics
    ]);

    const {
      data: posts,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    } = paginatedResult;

    // Generate pagination links
    const generatePageLink = (page: number) => {
      const url = new URL("/dashboard/posts", "http://localhost");
      if (page > 1) {
        url.searchParams.set("page", page.toString());
      }
      if (validPageSize !== 10) {
        // Only add if not default
        url.searchParams.set("pageSize", validPageSize.toString());
      }
      return url.pathname + url.search;
    };

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allPosts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allPosts.filter((p) => p.isPublished).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allPosts.filter((p) => p.isPremium).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allPosts.reduce((sum, p) => sum + p.viewCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
            <CardDescription>
              Manage your content posts and organize your directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PageSizeSelector
              currentPageSize={validPageSize}
              currentPage={currentPage}
              totalCount={totalCount}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{post.title}</div>
                        {post.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {post.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {post.category.parent?.name || post.category.name}
                        </Badge>
                        {post.category.parent && (
                          <Badge variant="outline" className="text-xs">
                            {post.category.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={post.isPublished ? "default" : "secondary"}
                      >
                        {post.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={post.isPremium ? "default" : "outline"}
                        className={
                          post.isPremium
                            ? "bg-gradient-to-r from-purple-500 to-pink-500"
                            : ""
                        }
                      >
                        {post.isPremium ? "Premium" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell>{post.viewCount}</TableCell>
                    <TableCell>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/entry/${post.id}`} target="_blank">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/posts/edit/${post.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {post.isPublished ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {hasPreviousPage && (
                      <PaginationItem>
                        <PaginationPrevious
                          href={generatePageLink(currentPage - 1)}
                        />
                      </PaginationItem>
                    )}

                    {/* Show page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show current page, first page, last page, and 2 pages around current
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 2
                        );
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const showEllipsisBefore =
                          index > 0 && array[index - 1] < page - 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <span className="px-3 py-2">...</span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                href={generatePageLink(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      })}

                    {hasNextPage && (
                      <PaginationItem>
                        <PaginationNext
                          href={generatePageLink(currentPage + 1)}
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  } catch (error) {
    console.error("Error loading posts:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Posts</CardTitle>
          <CardDescription>
            There was an error loading the posts. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}

export default async function PostsManagementPage({
  searchParams,
}: PostsManagementPageProps) {
  const user = await getCurrentUser();

  if (!user || user.userData?.role !== "ADMIN") {
    redirect("/dashboard");
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Posts Management</h1>
              <p className="text-muted-foreground">
                Manage your content posts, create new prompts, and organize your
                directory.
              </p>
            </div>
            <Link href="/dashboard/posts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
          </div>

          <Suspense fallback={<LoadingSkeleton />}>
            <PostsManagementContent searchParams={searchParams} />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
