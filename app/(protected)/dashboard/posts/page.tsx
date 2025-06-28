import React, { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Plus } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

import { getCurrentUser } from "@/lib/auth";
import { PostActionsDropdown } from "@/components/dashboard/(actions)/post-actions-dropdown";
import { getAllPosts, getUserPosts, getAllCategories } from "@/lib/content";
import { PostFilters } from "@/components/dashboard/post-filters";

import {
  IconCircleCheckFilled,
  IconCrown,
  IconLoader,
  IconX,
} from "@tabler/icons-react";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

// Dynamic metadata will be handled by the page component
// since we need to check user role for appropriate title

interface PostsManagementPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    category?: string;
    status?: string;
    type?: string;
    featured?: string;
    sortBy?: string;
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

// Filter option interface for the component
interface FilterOption {
  value: string;
  label: string;
}

interface UserData {
  id: string;
  role: string;
  email: string;
  name: string | null;
}

// Main content component
async function PostsManagementContent({
  searchParams,
  user,
}: PostsManagementPageProps & { user: UserData }) {
  try {
    // Parse search params
    const params = await searchParams;
    const currentPage = parseInt(params.page || "1", 10);
    const pageSize = parseInt(params.pageSize || "10", 10);

    // Parse filter parameters
    const filters = {
      category: params.category,
      status: params.status,
      type: params.type,
      featured: params.featured,
      sortBy: params.sortBy || "newest",
    };

    // Validate page size
    const validPageSize = Math.min(Math.max(pageSize, 5), 50);

    // Use passed user information
    const isAdmin = user.role === "ADMIN";
    const userId = user.id;

    // Get categories for filter dropdown
    const [allCategories, allPosts] = await Promise.all([
      getAllCategories(),
      isAdmin
        ? getAllPosts(true) // Admin sees all posts for statistics
        : getUserPosts(userId!), // Users see only their posts for statistics
    ]);

    // Transform categories to filter options
    const categoryOptions: FilterOption[] = allCategories.map((cat) => ({
      value: cat.slug,
      label: cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name,
    }));

    // Apply filters to posts
    let filteredPosts = [...allPosts];

    // Category filter
    if (filters.category && filters.category !== "all") {
      filteredPosts = filteredPosts.filter(
        (post) =>
          post.category.slug === filters.category ||
          post.category.parent?.slug === filters.category
      );
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
      switch (filters.status) {
        case "published":
          filteredPosts = filteredPosts.filter((post) => post.isPublished);
          break;
        case "pending":
          filteredPosts = filteredPosts.filter(
            (post) => post.status === "PENDING_APPROVAL"
          );
          break;
        case "draft":
          filteredPosts = filteredPosts.filter(
            (post) => post.status === "DRAFT"
          );
          break;
        case "rejected":
          filteredPosts = filteredPosts.filter(
            (post) => post.status === "REJECTED"
          );
          break;
      }
    }

    // Type filter
    if (filters.type && filters.type !== "all") {
      if (filters.type === "premium") {
        filteredPosts = filteredPosts.filter((post) => post.isPremium);
      } else if (filters.type === "free") {
        filteredPosts = filteredPosts.filter((post) => !post.isPremium);
      }
    }

    // Featured filter (admin only)
    if (isAdmin && filters.featured && filters.featured !== "all") {
      if (filters.featured === "featured") {
        filteredPosts = filteredPosts.filter((post) => post.isFeatured);
      } else if (filters.featured === "not-featured") {
        filteredPosts = filteredPosts.filter((post) => !post.isFeatured);
      }
    }

    // Apply sorting
    switch (filters.sortBy) {
      case "oldest":
        filteredPosts.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "views":
        filteredPosts.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case "title":
        filteredPosts.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
      default:
        filteredPosts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    // Apply pagination to filtered results
    const totalCount = filteredPosts.length;
    const totalPages = Math.ceil(totalCount / validPageSize);
    const startIndex = (currentPage - 1) * validPageSize;
    const endIndex = startIndex + validPageSize;
    const posts = filteredPosts.slice(startIndex, endIndex);

    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

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
          {isAdmin ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Featured Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allPosts.filter((p) => p.isFeatured).length}
                </div>
              </CardContent>
            </Card>
          ) : (
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
          )}
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
            <CardTitle>{isAdmin ? "All Posts" : "My Submissions"}</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Manage all content posts and organize your directory."
                : "Manage your content submissions and track their approval status."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PostFilters
              currentPageSize={validPageSize}
              currentPage={currentPage}
              totalCount={totalCount}
              filters={filters}
              categories={categoryOptions}
              isAdmin={isAdmin}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Featured</TableHead>
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
                        <div className="font-medium line-clamp-1">
                          {post.title}
                        </div>
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
                      <div className="flex flex-row gap-1">
                        {post.status === "APPROVED" ||
                        (post.isPublished &&
                          post.status !== "PENDING_APPROVAL") ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-green-500 text-green-700 dark:text-green-400"
                          >
                            <IconCircleCheckFilled className="mr-1 h-3 w-3 fill-green-500 dark:fill-green-400" />
                            Published
                          </Badge>
                        ) : post.status === "PENDING_APPROVAL" ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400"
                          >
                            <IconLoader className="mr-1 h-3 w-3 fill-yellow-500 dark:fill-yellow-400" />
                            Pending Review
                          </Badge>
                        ) : post.status === "REJECTED" ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-red-500/50 text-red-700/50 dark:border-red-400/50 dark:text-red-200"
                          >
                            <IconX className="mr-1 h-3 w-3" />
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Draft
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Badge
                          variant={post.isPremium ? "default" : "outline"}
                          className={
                            post.isPremium
                              ? "text-xs bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-300 dark:to-zinc-400"
                              : "text-xs"
                          }
                        >
                          {post.isPremium ? (
                            <IconCrown className="h-3 w-3" />
                          ) : (
                            "Free"
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.isFeatured ? (
                        <Badge variant="secondary" className="text-xs">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <IconX className="h-3 w-3" />
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{post.viewCount}</TableCell>
                    <TableCell>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <PostActionsDropdown
                        post={post}
                        currentUserId={user.id}
                        currentUserRole={user.role}
                      />
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
  // Get current user and check role
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Both ADMIN and USER can access posts management
  if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
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
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                {user.userData?.role === "ADMIN"
                  ? "Manage your content posts, create new prompts, and organize your directory."
                  : "Submit new prompts and manage your submissions."}
              </p>
            </div>
            <Link href="/dashboard/posts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {user.userData?.role === "ADMIN" ? "New Post" : "Submit Prompt"}
              </Button>
            </Link>
          </div>

          <Suspense fallback={<LoadingSkeleton />}>
            <PostsManagementContent
              searchParams={searchParams}
              user={user.userData!}
            />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
