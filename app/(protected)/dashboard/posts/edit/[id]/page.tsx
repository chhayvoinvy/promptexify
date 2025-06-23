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
import { MediaUpload } from "@/components/media-upload";
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
  featuredVideo?: string;
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
  const [pendingTags, setPendingTags] = useState<string[]>([]); // New state for pending tags
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [originalVideoUrl, setOriginalVideoUrl] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params?.id as string;

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

  // Fetch post data, categories, and tags
  useEffect(() => {
    async function fetchData() {
      if (
        !postId ||
        !user?.userData?.role ||
        (user.userData.role !== "ADMIN" && user.userData.role !== "USER")
      )
        return;

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

        const postData = await postRes.json();

        // Handle categories response
        let categoriesData = [];
        if (categoriesRes.ok) {
          const categoryResponse = await categoriesRes.json();
          categoriesData = Array.isArray(categoryResponse)
            ? categoryResponse
            : [];
        } else {
          console.error("Failed to fetch categories:", categoriesRes.status);
        }

        // Handle tags response
        let tagsData = [];
        if (tagsRes.ok) {
          const tagResponse = await tagsRes.json();
          tagsData = Array.isArray(tagResponse) ? tagResponse : [];
        } else {
          console.error("Failed to fetch tags:", tagsRes.status);
        }

        setPost(postData);
        setCategories(categoriesData);
        setTags(tagsData);
        setSelectedTags(postData.tags.map((tag: Tag) => tag.name));
        setFeaturedImageUrl(postData.featuredImage || "");
        setFeaturedVideoUrl(postData.featuredVideo || "");
        setOriginalImageUrl(postData.featuredImage || "");
        setOriginalVideoUrl(postData.featuredVideo || "");
        setPostTitle(postData.title || "");
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load post data");
        // Ensure states remain as arrays even on error
        setCategories([]);
        setTags([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.userData?.role === "ADMIN" || user?.userData?.role === "USER") {
      fetchData();
    }
  }, [postId, user, router]);

  // Handle form submission
  async function handleSubmit(formData: FormData) {
    if (isSubmitting || !post) return;

    setIsSubmitting(true);

    try {
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

        // If there were failed tags, we could show a warning but still continue
        if (failedTags.length > 0) {
          console.warn(
            `Some tags could not be created: ${failedTags.join(", ")}`
          );
          // You could add a toast notification here if you have one
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
      formData.set("id", post.id);

      // Update the post first
      await updatePostAction(formData);

      // Get the current featured media from form data
      const currentFeaturedImage = formData.get("featuredImage") as string;
      const currentFeaturedVideo = formData.get("featuredVideo") as string;

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

      // Clean up old video if it was changed and is one of our uploaded videos
      if (
        originalVideoUrl &&
        currentFeaturedVideo &&
        originalVideoUrl !== currentFeaturedVideo &&
        originalVideoUrl.includes("/videos/") // Only delete if it's our uploaded video
      ) {
        try {
          const deleteResponse = await fetch("/api/upload/video/delete", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ videoUrl: originalVideoUrl }),
          });

          if (deleteResponse.ok) {
            console.log("Successfully deleted old video:", originalVideoUrl);
          } else {
            console.error(
              "Failed to delete old video:",
              await deleteResponse.text()
            );
          }
        } catch (deleteError) {
          // Log error but don't fail the whole operation
          console.error("Failed to delete old video:", deleteError);
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

  // Handle pending tags changes
  function handlePendingTagsChange(newPendingTags: string[]) {
    setPendingTags(newPendingTags);
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

  // Show unauthorized if not admin or user
  if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
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
            <Button>
              {user.userData?.role === "ADMIN"
                ? "Back to Posts"
                : "Back to Submissions"}
            </Button>
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
                {user.userData?.role === "ADMIN"
                  ? "Back to Posts"
                  : "Back to Submissions"}
              </Button>
            </Link>
            <div>
              <p className="text-muted-foreground">
                {user.userData?.role === "ADMIN"
                  ? "Edit your existing prompt."
                  : "Edit your submission."}
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
                  {/* Temporarily hide description */}
                  <div className="hidden">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={post.description || ""}
                      placeholder="Brief description of the prompt..."
                    />
                  </div>
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

                {/* Replace the old URL input with the new MediaUpload component */}
                <MediaUpload
                  onMediaUploaded={handleMediaUploaded}
                  currentImageUrl={featuredImageUrl}
                  currentVideoUrl={featuredVideoUrl}
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
                  </>
                ) : (
                  <div className="space-y-4">
                    {post.isPublished ? (
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start space-x-3">
                          <div className="text-green-600 dark:text-green-400">
                            ✅
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900 dark:text-green-100">
                              Post Published
                            </h4>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              This post has been approved and is now live. You
                              cannot edit published posts.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-3">
                          <div className="text-blue-600 dark:text-blue-400">
                            ℹ️
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">
                              Pending Approval
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Your changes will be submitted for admin approval.
                              The post will remain unpublished until approved.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between opacity-50">
                      <div className="space-y-0.5">
                        <Label htmlFor="isPremium">Premium</Label>
                        <p className="text-sm text-muted-foreground">
                          Only admins can set premium status
                        </p>
                      </div>
                      <Switch
                        id="isPremium"
                        name="isPremium"
                        disabled
                        defaultChecked={post.isPremium}
                      />
                    </div>
                  </div>
                )}
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
