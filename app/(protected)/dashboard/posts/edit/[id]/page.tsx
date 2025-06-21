"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { TagSelector } from "@/components/tag-selector";
import { ImageUpload } from "@/components/image-upload";
import { useAuth } from "@/hooks/use-auth";
import { updatePostAction } from "@/actions";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent?: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  featuredImage?: string;
  isPublished: boolean;
  isPremium: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    parent?: {
      id: string;
      name: string;
      slug: string;
    };
  };
  tags: Tag[];
}

export default function EditPostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params?.id as string;

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/signin");
        return;
      }
      if (user.userData?.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, loading, router]);

  // Fetch post data, categories, and tags
  useEffect(() => {
    async function fetchData() {
      if (!postId || user?.userData?.role !== "ADMIN") return;

      try {
        setIsLoading(true);
        setError(null);

        const [postRes, categoriesRes, tagsRes] = await Promise.all([
          fetch(`/api/posts/${postId}`),
          fetch("/api/categories"),
          fetch("/api/tags"),
        ]);

        if (!postRes.ok) {
          if (postRes.status === 404) {
            router.push("/dashboard/posts");
            return;
          }
          throw new Error("Failed to fetch post");
        }

        const [postData, categoriesData, tagsData] = await Promise.all([
          postRes.json(),
          categoriesRes.json(),
          tagsRes.json(),
        ]);

        setPost(postData);
        setCategories(categoriesData);
        setTags(tagsData);
        setSelectedTags(postData.tags.map((tag: Tag) => tag.name));
        setFeaturedImageUrl(postData.featuredImage || "");
        setOriginalImageUrl(postData.featuredImage || "");
        setPostTitle(postData.title || "");
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load post data");
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.userData?.role === "ADMIN") {
      fetchData();
    }
  }, [postId, user, router]);

  // Handle form submission
  async function handleSubmit(formData: FormData) {
    if (isSubmitting || !post) return;

    setIsSubmitting(true);

    try {
      // Add the selected tags to form data
      formData.set("tags", selectedTags.join(", "));
      formData.set("id", post.id);

      // The featured image is already handled by the ImageUpload component's hidden input

      // Update the post first
      await updatePostAction(formData);

      // Get the current featured image from form data
      const currentFeaturedImage = formData.get("featuredImage") as string;

      // Clean up old image if it was changed and is one of our uploaded images
      if (
        originalImageUrl &&
        currentFeaturedImage &&
        originalImageUrl !== currentFeaturedImage &&
        originalImageUrl.includes("/images/") && // Only delete if it's our uploaded image
        originalImageUrl.endsWith(".avif")
      ) {
        try {
          const deleteResponse = await fetch("/api/upload/image/delete", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageUrl: originalImageUrl }),
          });

          if (deleteResponse.ok) {
            console.log("Successfully deleted old image:", originalImageUrl);
          } else {
            console.error(
              "Failed to delete old image:",
              await deleteResponse.text()
            );
          }
        } catch (deleteError) {
          // Log error but don't fail the whole operation
          console.error("Failed to delete old image:", deleteError);
        }
      }

      // Redirect to posts list on success
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Error updating post:", error);
      setError("Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle tag changes
  function handleTagsChange(newTags: string[]) {
    setSelectedTags(newTags);
  }

  // Handle image upload
  function handleImageUploaded(imageUrl: string) {
    setFeaturedImageUrl(imageUrl);
  }

  // Handle title change for image filename
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setPostTitle(title);
  }

  // Show loading state
  if (loading || isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized if not admin
  if (user.userData?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Unauthorized</p>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2 text-destructive">Error</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Show not found if no post
  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Post Not Found</p>
          <p className="text-muted-foreground mb-4">
            The post you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/dashboard/posts">
            <Button>Back to Posts</Button>
          </Link>
        </div>
      </div>
    );
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
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-6">
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

          <form action={handleSubmit} className="space-y-6">
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
                      onChange={handleTitleChange}
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

                {/* Replace the old URL input with the new ImageUpload component */}
                <ImageUpload
                  onImageUploaded={handleImageUploaded}
                  currentImageUrl={featuredImageUrl}
                  title={postTitle || post.title}
                  disabled={isSubmitting}
                />
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

                <TagSelector
                  availableTags={tags}
                  selectedTags={selectedTags}
                  onTagsChange={handleTagsChange}
                  maxTags={15}
                  disabled={isSubmitting}
                />
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
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Post"}
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
