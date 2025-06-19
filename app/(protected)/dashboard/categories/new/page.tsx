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
import { redirect } from "next/navigation";
import { createCategoryAction } from "@/app/actions";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  const user = await getCurrentUser();

  // Check if user is authenticated and has admin role
  if (!user) {
    redirect("/signin");
  }

  // Temporarily disabled for testing - uncomment to re-enable admin protection
  if (user.userData?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const categories = await getAllCategories();

  // Get parent categories for selection (only categories without parents)
  const parentCategories = categories.filter((cat) => !cat.parent);

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
          <div className="flex items-center gap-4">
            <Link href="/dashboard/categories">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New Category</h1>
              <p className="text-muted-foreground">
                Add a new category to organize your content.
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <form action={createCategoryAction} className="space-y-6">
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
                        placeholder="Enter category name..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug *</Label>
                      <Input
                        id="slug"
                        name="slug"
                        placeholder="Auto-generated from name"
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
                      placeholder="Brief description of the category..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent Category (Optional)</Label>
                    <Select name="parentId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category (leave empty for top-level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No parent (top-level category)
                        </SelectItem>
                        {parentCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose a parent category to create a subcategory, or leave
                      empty for a top-level category
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Create Category
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
