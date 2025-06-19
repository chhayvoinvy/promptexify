import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAllCategories } from "@/lib/content";
import { redirect, notFound } from "next/navigation";
import { updateCategoryAction } from "@/app/actions";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface EditCategoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Check if user is authenticated and has admin role
  if (!user) {
    redirect("/signin");
  }

  // Temporarily disabled for testing - uncomment to re-enable admin protection
  // if (user.userData?.role !== "ADMIN") {
  //   redirect("/dashboard");
  // }

  const [category, allCategories] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    }),
    getAllCategories(),
  ]);

  if (!category) {
    notFound();
  }

  // Get parent categories for selection (only categories without parents and not the current category)
  const parentCategories = allCategories.filter(
    (cat) => !cat.parent && cat.id !== category.id
  );

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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/categories">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Edit Category</h1>
              <p className="text-muted-foreground">
                Update your existing category.
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <form action={updateCategoryAction} className="space-y-6">
              <input type="hidden" name="id" value={category.id} />

              <Card>
                <CardHeader>
                  <CardTitle>Category Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={category.name}
                        placeholder="Enter category name..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        name="slug"
                        defaultValue={category.slug}
                        placeholder="Auto-generated from name"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        URL-friendly version of the name (lowercase, no spaces)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={category.description || ""}
                      placeholder="Brief description of the category..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Category (Optional)</Label>
                    <Select
                      name="parentId"
                      defaultValue={category.parentId || "none"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category (leave empty for top-level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No parent (top-level category)
                        </SelectItem>
                        {parentCategories.map((parentCategory) => (
                          <SelectItem
                            key={parentCategory.id}
                            value={parentCategory.id}
                          >
                            {parentCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose a parent category to create a subcategory, or leave
                      empty for a top-level category
                    </p>
                  </div>

                  {/* Category Statistics */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">
                      Category Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Posts:</span>
                        <span className="ml-2 font-medium">
                          {category._count.posts}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Subcategories:
                        </span>
                        <span className="ml-2 font-medium">
                          {category.children.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Update Category
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/categories">Cancel</Link>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
