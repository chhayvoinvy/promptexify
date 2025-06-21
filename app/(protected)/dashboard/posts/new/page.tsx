"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { TagSelector } from "@/components/tag-selector";
import { createPostAction } from "@/actions";
import { useAuth } from "@/hooks/use-auth";

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

export default function NewPostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch categories and tags
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch categories
        const categoriesRes = await fetch("/api/categories");
        const categoriesData = await categoriesRes.json();

        // Fetch tags
        const tagsRes = await fetch("/api/tags");
        const tagsData = await tagsRes.json();

        setCategories(categoriesData);
        setTags(tagsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    if (user?.userData?.role === "ADMIN") {
      fetchData();
    }
  }, [user]);

  // Handle form submission
  async function handleSubmit(formData: FormData) {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Add the featured image URL to form data
      if (featuredImageUrl) {
        formData.set("featuredImage", featuredImageUrl);
      }

      // Add the selected tags to form data
      formData.set("tags", selectedTags.join(", "));

      await createPostAction(formData);

      // Redirect to posts list on success
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Error creating post:", error);
      // Handle error (could add toast notification here)
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle image upload
  function handleImageUploaded(imageUrl: string) {
    setFeaturedImageUrl(imageUrl);
  }

  // Handle tag changes
  function handleTagsChange(newTags: string[]) {
    setSelectedTags(newTags);
  }

  // Auto-generate slug from title
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setPostTitle(title);

    // Auto-generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const slugInput = document.getElementById("slug") as HTMLInputElement;
    if (slugInput) {
      slugInput.value = slug;
    }
  }

  // Show loading state
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  // Show unauthorized if not admin
  if (user.userData?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Unauthorized
      </div>
    );
  }

  // Get parent categories for main category selection
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
                Add a new prompt to your directory.
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
                      placeholder="Enter post title..."
                      value={postTitle}
                      onChange={handleTitleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      name="slug"
                      placeholder="Auto-generated from title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of the prompt..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    placeholder="Enter the prompt content here..."
                    rows={8}
                    required
                  />
                </div>

                <ImageUpload
                  onImageUploaded={handleImageUploaded}
                  currentImageUrl={featuredImageUrl}
                  title={postTitle || "untitled"}
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
                    <Select name="parentCategory" required>
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
                    <Select name="category" required>
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

                {/* Replace the old tags input with the new TagSelector */}
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
                  <Switch id="isPublished" name="isPublished" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPremium">Premium</Label>
                    <p className="text-sm text-muted-foreground">
                      Require premium subscription to access
                    </p>
                  </div>
                  <Switch id="isPremium" name="isPremium" />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Post"}
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
