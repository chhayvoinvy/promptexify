import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Folder } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getAllCategories } from "@/lib/content";
import { redirect } from "next/navigation";
import { CategoryActionsDropdown } from "@/components/dashboard/(actions)/category-actions-dropdown";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default async function CategoriesManagementPage() {
  // Get current user and check role
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Only ADMIN can access categories management
  if (user.userData?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const categories = await getAllCategories();

  // Separate parent and child categories for better organization
  const parentCategories = categories.filter((cat) => !cat.parent);
  const childCategories = categories.filter((cat) => cat.parent);

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
                Organize your content with categories and subcategories.
              </p>
            </div>
            <Link href="/dashboard/categories/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Category
              </Button>
            </Link>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Categories
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Parent Categories
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {parentCategories.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sub Categories
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {childCategories.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Posts
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {categories.reduce((sum, cat) => sum + cat._count.posts, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parent Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Parent Categories</CardTitle>
              <CardDescription>
                Main category groups that contain subcategories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Subcategories</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {category.slug}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md truncate text-sm text-muted-foreground">
                          {category.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {category.children.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category._count.posts}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(category.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <CategoryActionsDropdown
                          category={category}
                          isSubcategory={false}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Child Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Subcategories</CardTitle>
              <CardDescription>
                Specific categories that belong to parent categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Parent Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {category.slug}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {category.parent?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md truncate text-sm text-muted-foreground">
                          {category.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category._count.posts}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(category.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <CategoryActionsDropdown
                          category={category}
                          isSubcategory={true}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
