import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { getAllCategories, getAllTags, getPostById } from "@/lib/content";
import { redirect, notFound } from "next/navigation";
import { updatePostAction } from "@/actions";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface EditPostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
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

  const [post, categories, tags] = await Promise.all([
    getPostById(id),
    getAllCategories(),
    getAllTags(),
  ]);

  if (!post) {
    notFound();
  }

  // Get parent categories for main category selection
  const parentCategories = categories.filter((cat) => !cat.parent);
  const currentParentCategory =
    post.category.parent?.slug || post.category.slug;

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
            <Link href="/dashboard/posts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Posts
              </Button>
            </Link>
            <div>
              <p className="text-muted-foreground">
                Edit your existing prompt.
              </p>
            </div>
          </div>

          <form action={updatePostAction} className="space-y-6">
            <input type="hidden" name="id" value={post.id} />

            <Card>
              <CardHeader>
                <CardTitle>Post Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={post.title}
                      placeholder="Enter post title..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      name="slug"
                      defaultValue={post.slug}
                      placeholder="Auto-generated from title"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={post.description || ""}
                    placeholder="Brief description of the prompt..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    defaultValue={post.content}
                    placeholder="Enter the prompt content here..."
                    rows={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featuredImage">Featured Image URL</Label>
                  <Input
                    id="featuredImage"
                    name="featuredImage"
                    type="url"
                    defaultValue={post.featuredImage || ""}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentCategory">Parent Category *</Label>
                    <Select
                      name="parentCategory"
                      defaultValue={currentParentCategory}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentCategories.map((category) => (
                          <SelectItem key={category.id} value={category.slug}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Sub Category *</Label>
                    <Select
                      name="category"
                      defaultValue={post.category.slug}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((cat) => cat.parent)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.slug}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    name="tags"
                    defaultValue={post.tags.map((tag) => tag.name).join(", ")}
                    placeholder="Enter tags separated by commas"
                  />
                  <p className="text-sm text-muted-foreground">
                    Available tags: {tags.map((tag) => tag.name).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publishing Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublished">Published</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this post visible to users
                    </p>
                  </div>
                  <Switch
                    id="isPublished"
                    name="isPublished"
                    defaultChecked={post.isPublished}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPremium">Premium</Label>
                    <p className="text-sm text-muted-foreground">
                      Require premium subscription to access
                    </p>
                  </div>
                  <Switch
                    id="isPremium"
                    name="isPremium"
                    defaultChecked={post.isPremium}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Update Post
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/posts">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
