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
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MediaUpload } from "@/components/media-upload";
import { TagSelector } from "@/components/tag-selector";
import { createPostAction } from "@/actions";
import { useAuth } from "@/hooks/use-auth";
import { useCSRFForm } from "@/hooks/use-csrf";

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
  const { createFormDataWithCSRF, isReady } = useCSRFForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/signin");
        return;
      }
      if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
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
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          // Ensure categoriesData is an array
          if (Array.isArray(categoriesData)) {
            setCategories(categoriesData);
          } else {
            console.error("Categories data is not an array:", categoriesData);
            setCategories([]);
          }
        } else {
          console.error("Failed to fetch categories:", categoriesRes.status);
          setCategories([]);
        }

        // Fetch tags
        const tagsRes = await fetch("/api/tags");
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          // Ensure tagsData is an array
          if (Array.isArray(tagsData)) {
            setTags(tagsData);
          } else {
            console.error("Tags data is not an array:", tagsData);
            setTags([]);
          }
        } else {
          console.error("Failed to fetch tags:", tagsRes.status);
          setTags([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // Ensure states remain as arrays even on error
        setCategories([]);
        setTags([]);
      }
    }

    if (user?.userData?.role === "ADMIN" || user?.userData?.role === "USER") {
      fetchData();
    }
  }, [user]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isSubmitting) return;

    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      // First, create any pending tags
      const createdTags: Tag[] = [];
      const failedTags: string[] = [];

      if (pendingTags.length > 0) {
        // Remove duplicates from pending tags
        const uniquePendingTags = [...new Set(pendingTags)];

        for (const tagName of uniquePendingTags) {
          try {
            const response = await fetch("/api/tags", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: tagName,
                slug: tagName
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              }),
            });

            if (response.ok) {
              const newTag = await response.json();
              createdTags.push(newTag);
            } else {
              const errorData = await response.json().catch(() => ({}));

              // If tag already exists (409 conflict), that's okay - just log it
              if (response.status === 409) {
                console.log(
                  `Tag "${tagName}" already exists, skipping creation`
                );

                // Try to find the existing tag in our available tags
                const existingTag = tags.find(
                  (t) => t.name.toLowerCase() === tagName.toLowerCase()
                );
                if (existingTag) {
                  createdTags.push(existingTag);
                }
              } else {
                console.error(`Failed to create tag "${tagName}":`, errorData);
                failedTags.push(tagName);
              }
            }
          } catch (error) {
            console.error(`Error creating tag "${tagName}":`, error);
            failedTags.push(tagName);
          }
        }

        // Update the tags list with newly created tags
        if (createdTags.length > 0) {
          setTags((prevTags) => {
            const existingTagNames = prevTags.map((t) => t.name.toLowerCase());
            const newTags = createdTags.filter(
              (tag) => !existingTagNames.includes(tag.name.toLowerCase())
            );
            return [...prevTags, ...newTags];
          });
        }

        // If there were failed tags, show a warning but still continue
        if (failedTags.length > 0) {
          console.warn(
            `Some tags could not be created: ${failedTags.join(", ")}`
          );
          toast.warning(
            `Some tags could not be created: ${failedTags.join(", ")}`
          );
        }
      }

      // Add the featured media URLs to form data
      if (featuredImageUrl) {
        formData.set("featuredImage", featuredImageUrl);
      }
      if (featuredVideoUrl) {
        formData.set("featuredVideo", featuredVideoUrl);
      }

      // Add the selected tags to form data
      formData.set("tags", selectedTags.join(", "));

      // Convert FormData to plain object for CSRF protection
      const formObject: Record<string, FormDataEntryValue> = {};
      for (const [key, value] of formData.entries()) {
        formObject[key] = value;
      }

      // Create form data with CSRF protection
      const secureFormData = createFormDataWithCSRF(formObject);
      await createPostAction(secureFormData);

      // Show success message - redirect is handled by server action
      toast.success("Post submitted successfully!");
    } catch (error) {
      console.error("Error creating post:", error);

      // Check if this is a Next.js redirect (expected behavior)
      if (error && typeof error === "object" && "digest" in error) {
        const errorDigest = (error as { digest?: string }).digest;
        if (
          typeof errorDigest === "string" &&
          errorDigest.includes("NEXT_REDIRECT")
        ) {
          // This is a redirect - don't show error, redirect is working as expected
          return;
        }
      }

      // Show user-friendly error message for actual errors
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create post. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle media upload
  function handleMediaUploaded(mediaUrl: string, mediaType: "image" | "video") {
    if (mediaType === "image") {
      setFeaturedImageUrl(mediaUrl);
      setFeaturedVideoUrl(""); // Clear video when image is uploaded
    } else {
      setFeaturedVideoUrl(mediaUrl);
      setFeaturedImageUrl(""); // Clear image when video is uploaded
    }
  }

  // Handle tag changes
  function handleTagsChange(newTags: string[]) {
    setSelectedTags(newTags);
  }

  // Handle pending tags changes
  function handlePendingTagsChange(newPendingTags: string[]) {
    setPendingTags(newPendingTags);
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
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        <p className="text-sm text-muted-foreground">
          This may take a few seconds.
        </p>
      </div>
    );
  }

  // Show unauthorized if not admin or user
  if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
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
                {user.userData?.role === "ADMIN"
                  ? "Back to Posts"
                  : "Back to Submissions"}
              </Button>
            </Link>
            <div>
              <p className="text-muted-foreground">
                {user.userData?.role === "ADMIN"
                  ? "Add a new prompt to your directory."
                  : "Submit a new prompt."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      name="slug"
                      placeholder="Auto-generated from title"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Temporarily hide description */}
                  <div className="hidden">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Brief description of the prompt..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    placeholder="Enter the prompt content here..."
                    rows={8}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <MediaUpload
                  onMediaUploaded={handleMediaUploaded}
                  currentImageUrl={featuredImageUrl}
                  currentVideoUrl={featuredVideoUrl}
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
                    <Select
                      name="parentCategory"
                      required
                      disabled={isSubmitting}
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
                    <Select name="category" required disabled={isSubmitting}>
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
                  onPendingTagsChange={handlePendingTagsChange}
                  pendingTags={pendingTags}
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
                {user.userData?.role === "ADMIN" ? (
                  <>
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start space-x-3">
                        <div className="text-blue-600 dark:text-blue-400">
                          <Info className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100">
                            Approval Required
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Your post will be submitted for admin approval
                            before being published. You&apos;ll be able to track
                            its status in your posts dashboard. This may take up
                            up to 48 hours.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Temporarily hide premium switch */}
                    {/* TODO: Add premium that approve by admin */}
                    {/* <div className="flex items-center justify-between opacity-50">
                      <div className="space-y-0.5">
                        <Label htmlFor="isPremium">Premium</Label>
                        <p className="text-sm text-muted-foreground">
                          Only admins can set premium status
                        </p>
                      </div>
                      <Switch id="isPremium" name="isPremium" disabled />
                    </div> */}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !isReady}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isReady
                  ? "Submit Prompt"
                  : "Initializing..."}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isSubmitting}
              >
                <Link href="/dashboard/posts">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
