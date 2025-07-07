"use server";

import { PostStatus } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { handleAuthRedirect } from "./auth";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";
import { withCSRFProtection } from "@/lib/csp";

import {
  sanitizeInput,
  sanitizeContent,
  sanitizeTagSlug,
} from "@/lib/sanitize";

// Post management actions
export const createPostAction = withCSRFProtection(
  async (formData: FormData) => {
    try {
      // Get the current user
      const currentUser = await getCurrentUser();
      if (!currentUser?.userData) {
        handleAuthRedirect();
      }
      const user = currentUser.userData;

      // Check if user has permission to create posts (both USER and ADMIN can create)
      if (user.role !== "ADMIN" && user.role !== "USER") {
        throw new Error("Unauthorized: Only registered users can create posts");
      }

      // Extract and validate form data
      const rawTitle = formData.get("title") as string;
      const rawSlug = formData.get("slug") as string;
      const rawDescription = formData.get("description") as string;
      const rawContent = formData.get("content") as string;
      const featuredImage = formData.get("featuredImageRelativePath") as string;
      const featuredVideo = formData.get("featuredVideoRelativePath") as string;
      const featuredImageId = formData.get("featuredImageId") as string;
      const featuredVideoId = formData.get("featuredVideoId") as string;
      const category = formData.get("category") as string;
      const subcategory = formData.get("subcategory") as string;
      const tags = formData.get("tags") as string;

      // Sanitize inputs for enhanced security
      const title = sanitizeInput(rawTitle);
      const description = rawDescription ? sanitizeInput(rawDescription) : null;
      const content = sanitizeContent(rawContent);

      // Generate slug if not provided
      const slug =
        rawSlug ||
        title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "");

      // Handle publish/status logic based on user role
      let isPublished = false;
      let status: PostStatus = PostStatus.DRAFT;

      if (user.role === "ADMIN") {
        // Admin can publish directly and control status
        isPublished = formData.get("isPublished") === "on";
        status = isPublished ? PostStatus.APPROVED : PostStatus.DRAFT;
      } else {
        // Regular users create posts with PENDING_APPROVAL status
        isPublished = false;
        status = PostStatus.PENDING_APPROVAL;
      }

      const isPremium = formData.get("isPremium") === "on";

      // Validate required fields
      if (!title || !content || !category) {
        throw new Error("Missing required fields");
      }

      // Get category ID - prefer subcategory if provided, otherwise use main category
      const selectedCategorySlug =
        subcategory && subcategory !== "" && subcategory !== "none"
          ? subcategory
          : category;
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: selectedCategorySlug },
      });

      if (!categoryRecord) {
        throw new Error("Invalid category");
      }

      // Process and sanitize tags
      const tagNames = tags
        ? tags
            .split(",")
            .map((tag) => sanitizeInput(tag.trim()))
            .filter(Boolean)
        : [];
      const tagConnections = [];

      for (const tagName of tagNames) {
        // Use enhanced tag slug sanitization
        const tagSlug = sanitizeTagSlug(tagName);
        if (tagSlug) {
          const tag = await prisma.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: {
              name: tagName,
              slug: tagSlug,
            },
          });
          tagConnections.push({ id: tag.id });
        }
      }

      // Create the post
      const newPost = await prisma.post.create({
        data: {
          title,
          slug,
          description: description || null,
          content,
          featuredImage: featuredImage || null,
          featuredVideo: featuredVideo || null,
          isPremium,
          isPublished,
          status: status,
          authorId: user.id,
          categoryId: categoryRecord.id,
          tags: {
            connect: tagConnections,
          },
        },
      });

      // Link media to the post
      const mediaIds = [featuredImageId, featuredVideoId].filter(Boolean);
      if (mediaIds.length > 0) {
        await prisma.media.updateMany({
          where: {
            id: {
              in: mediaIds,
            },
            // Ensure we don't overwrite another post's media
            postId: null,
          },
          data: {
            postId: newPost.id,
          },
        });
      }

      // Revalidate cache tags for new post and tags (since tags may have been created)
      revalidateCache([
        CACHE_TAGS.POSTS,
        CACHE_TAGS.POST_BY_SLUG,
        CACHE_TAGS.POST_BY_ID,
        CACHE_TAGS.CATEGORIES,
        CACHE_TAGS.TAGS, // Important: Invalidate tags cache when new tags are created
        CACHE_TAGS.SEARCH_RESULTS,
        CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
        CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
      ]);

      revalidatePath("/dashboard/posts");
      redirect("/dashboard/posts");
    } catch (error) {
      // Check if this is a Next.js redirect
      if (error && typeof error === "object" && "digest" in error) {
        const errorDigest = (error as { digest?: string }).digest;
        if (
          typeof errorDigest === "string" &&
          errorDigest.includes("NEXT_REDIRECT")
        ) {
          // This is a redirect - re-throw it to allow the redirect to proceed
          throw error;
        }
      }

      console.error("Error creating post:", error);
      throw new Error("Failed to create post");
    }
  }
);

export const updatePostAction = withCSRFProtection(
  async (formData: FormData) => {
    try {
      // Get the current user
      const currentUser = await getCurrentUser();
      if (!currentUser?.userData) {
        handleAuthRedirect();
      }
      const user = currentUser.userData;

      // Extract form data
      const id = formData.get("id") as string;
      const title = formData.get("title") as string;
      const slug = formData.get("slug") as string;
      const description = formData.get("description") as string;
      const content = formData.get("content") as string;
      const featuredImage = formData.get("featuredImageRelativePath") as string;
      const featuredVideo = formData.get("featuredVideoRelativePath") as string;
      const featuredImageId = formData.get("featuredImageId") as string;
      const featuredVideoId = formData.get("featuredVideoId") as string;
      const category = formData.get("category") as string;
      const subcategory = formData.get("subcategory") as string;
      const tags = formData.get("tags") as string;
      const isPremium = formData.get("isPremium") === "on";

      // Validate required fields
      if (!id || !title || !content || !category) {
        throw new Error("Missing required fields");
      }

      // Check if post exists and user has permission
      const existingPost = await prisma.post.findUnique({
        where: { id },
        include: {
          author: true,
          media: true,
        },
      });

      if (!existingPost) {
        throw new Error("Post not found");
      }

      // Check user permissions
      if (user.role === "ADMIN") {
        // Admin can edit any post
      } else if (user.role === "USER") {
        // Users can only edit their own posts that haven't been approved yet
        if (existingPost.authorId !== user.id) {
          throw new Error("Unauthorized: You can only edit your own posts");
        }
        // Disable editing once post has been approved or rejected by admin
        if (existingPost.status === "APPROVED") {
          throw new Error(
            "Cannot edit approved posts. Please contact support for further assistance."
          );
        }
        if (existingPost.status === "REJECTED") {
          throw new Error(
            "Cannot edit rejected posts. Please contact support or create a new post."
          );
        }
      } else {
        throw new Error("Unauthorized: Invalid user role");
      }

      // Handle publish/status logic based on user role
      let isPublished = existingPost.isPublished;
      let status: PostStatus = existingPost.status as PostStatus;

      if (user.role === "ADMIN") {
        // Admin can control publish status and status
        const requestedPublish = formData.get("isPublished") === "on";
        isPublished = requestedPublish;
        status = requestedPublish ? PostStatus.APPROVED : PostStatus.DRAFT;
      } else {
        // Regular users cannot change publish status - stays pending approval
        isPublished = false;
        status = PostStatus.PENDING_APPROVAL;
      }

      // Get category ID - prefer subcategory if provided, otherwise use main category
      const selectedCategorySlug =
        subcategory && subcategory !== "" && subcategory !== "none"
          ? subcategory
          : category;
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: selectedCategorySlug },
      });

      if (!categoryRecord) {
        throw new Error("Invalid category");
      }

      // Prepare media updates
      const newMediaIds = [featuredImageId, featuredVideoId].filter(
        (id) => id && typeof id === "string"
      );
      const oldMediaIds = existingPost.media.map((m) => m.id);

      // IDs of media to be disassociated from the post
      const mediaToUnlink = oldMediaIds.filter(
        (id) => !newMediaIds.includes(id)
      );

      // IDs of media to be newly associated with the post
      const mediaToLink = newMediaIds.filter((id) => !oldMediaIds.includes(id));

      // Disassociate old media that is no longer used
      if (mediaToUnlink.length > 0) {
        await prisma.media.updateMany({
          where: {
            id: {
              in: mediaToUnlink,
            },
            postId: existingPost.id,
          },
          data: {
            postId: null,
          },
        });
      }

      // Process and sanitize tags, and disconnect old tags
      const newTagNames = tags
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      const newTagConnections = [];

      for (const tagName of newTagNames) {
        const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: {
            name: tagName,
            slug: tagSlug,
          },
        });
        newTagConnections.push({ id: tag.id });
      }

      // Update the post
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title,
          slug,
          description: description || null,
          content,
          featuredImage: featuredImage || null,
          featuredVideo: featuredVideo || null,
          isPremium,
          isPublished,
          status: status,
          categoryId: categoryRecord.id,
          tags: {
            set: newTagConnections,
          },
          updatedAt: new Date(),
        },
      });

      // Associate new media with the post
      if (mediaToLink.length > 0) {
        await prisma.media.updateMany({
          where: {
            id: {
              in: mediaToLink,
            },
            postId: null, // Only link unassociated media
          },
          data: {
            postId: updatedPost.id,
          },
        });
      }

      // Associate new media with the post
      if (mediaToLink.length > 0) {
        await prisma.media.updateMany({
          where: {
            id: {
              in: mediaToLink,
            },
            postId: null, // Only link unassociated media
          },
          data: {
            postId: updatedPost.id,
          },
        });
      }

      revalidatePath("/dashboard/posts");
      revalidatePath(`/entry/${id}`);
      // Revalidate cache tags for updated post and tags (since tags may have been created during updates)
      revalidateCache([
        CACHE_TAGS.POSTS,
        CACHE_TAGS.POST_BY_SLUG,
        CACHE_TAGS.POST_BY_ID,
        CACHE_TAGS.TAGS, // Important: Invalidate tags cache when new tags are created during updates
        CACHE_TAGS.CATEGORIES, // Important: Invalidate categories cache when post category changes
        CACHE_TAGS.SEARCH_RESULTS,
        CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
        CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
      ]);

      redirect("/dashboard/posts");
    } catch (error) {
      // Check if this is a Next.js redirect
      if (error && typeof error === "object" && "digest" in error) {
        const errorDigest = (error as { digest?: string }).digest;
        if (
          typeof errorDigest === "string" &&
          errorDigest.includes("NEXT_REDIRECT")
        ) {
          // This is a redirect - re-throw it to allow the redirect to proceed
          throw error;
        }
      }

      console.error("Error updating post:", error);
      throw new Error("Failed to update post");
    }
  }
);

export async function approvePostAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }

    // Check admin permission
    if (currentUser.userData.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Validate post ID
    if (!postId || typeof postId !== "string") {
      throw new Error("Invalid post ID");
    }

    // Get current post status
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, title: true },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    if (existingPost.status !== "PENDING_APPROVAL") {
      throw new Error("Post is not pending approval");
    }

    // Approve and publish the post
    await prisma.post.update({
      where: { id: postId },
      data: {
        isPublished: true,
        status: PostStatus.APPROVED,
        updatedAt: new Date(),
      },
    });

    // Revalidate relevant paths and caches
    revalidatePath("/dashboard/posts");
    revalidatePath(`/entry/${postId}`);
    revalidatePath(`/dashboard/posts/edit/${postId}`); // Important: Revalidate edit page
    revalidatePath("/"); // Home page might show published posts

    // Invalidate cache for this specific post so edit page shows updated status
    revalidateCache([
      CACHE_TAGS.POSTS,
      CACHE_TAGS.POST_BY_ID,
      CACHE_TAGS.POST_BY_SLUG,
      CACHE_TAGS.CATEGORIES, // Important: Invalidate categories cache when post deleted affects counts
      CACHE_TAGS.SEARCH_RESULTS,
      CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
      CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
    ]);

    return {
      success: true,
      message: `Post "${existingPost.title}" approved and published successfully`,
    };
  } catch (error) {
    console.error("Error approving post:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to approve post"
    );
  }
}

export async function rejectPostAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }

    // Check admin permission
    if (currentUser.userData.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Validate post ID
    if (!postId || typeof postId !== "string") {
      throw new Error("Invalid post ID");
    }

    // Get current post status
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, title: true },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    if (existingPost.status !== "PENDING_APPROVAL") {
      throw new Error("Post is not pending approval");
    }

    // Reject the post
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.REJECTED,
        updatedAt: new Date(),
      },
    });

    // Revalidate relevant paths and caches
    revalidatePath("/dashboard/posts");
    revalidatePath(`/dashboard/posts/edit/${postId}`); // Important: Revalidate edit page

    // Invalidate cache for this specific post so edit page shows updated status
    revalidateCache([
      CACHE_TAGS.POSTS,
      CACHE_TAGS.POST_BY_ID,
      CACHE_TAGS.POST_BY_SLUG,
      CACHE_TAGS.CATEGORIES, // Important: Invalidate categories cache when post deleted affects counts
      CACHE_TAGS.SEARCH_RESULTS,
      CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
      CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
    ]);

    return {
      success: true,
      message: `Post "${existingPost.title}" rejected`,
    };
  } catch (error) {
    console.error("Error rejecting post:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to reject post"
    );
  }
}

export async function togglePostPublishAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }

    // Check admin permission
    if (currentUser.userData.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Validate post ID
    if (!postId || typeof postId !== "string") {
      throw new Error("Invalid post ID");
    }

    // Get current post status
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isPublished: true, status: true, title: true },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    // Toggle the published status and update status accordingly
    const newPublishedState = !existingPost.isPublished;
    const newStatus = newPublishedState
      ? PostStatus.APPROVED
      : PostStatus.DRAFT;

    await prisma.post.update({
      where: { id: postId },
      data: {
        isPublished: newPublishedState,
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Revalidate relevant paths and caches
    revalidatePath("/dashboard/posts");
    revalidatePath(`/entry/${postId}`);
    revalidatePath(`/dashboard/posts/edit/${postId}`); // Important: Revalidate edit page
    revalidatePath("/"); // Home page might show published posts

    // Invalidate cache for this specific post so edit page shows updated status
    revalidateCache([
      CACHE_TAGS.POSTS,
      CACHE_TAGS.POST_BY_ID,
      CACHE_TAGS.POST_BY_SLUG,
      CACHE_TAGS.CATEGORIES, // Important: Invalidate categories cache when post deleted affects counts
      CACHE_TAGS.SEARCH_RESULTS,
      CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
      CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
    ]);

    return {
      success: true,
      message: `Post ${
        existingPost.isPublished ? "unpublished" : "published"
      } successfully`,
    };
  } catch (error) {
    console.error("Error toggling post publish status:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update post status"
    );
  }
}

export async function togglePostFeaturedAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }

    // Check admin permission
    if (currentUser.userData.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Validate post ID
    if (!postId || typeof postId !== "string") {
      throw new Error("Invalid post ID");
    }

    // Get current post featured status
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isFeatured: true, title: true },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    // Toggle the featured status
    const newFeaturedState = !existingPost.isFeatured;

    await prisma.post.update({
      where: { id: postId },
      data: {
        isFeatured: newFeaturedState,
        updatedAt: new Date(),
      },
    });

    // Revalidate relevant paths and caches
    revalidatePath("/dashboard/posts");
    revalidatePath(`/entry/${postId}`);
    revalidatePath(`/dashboard/posts/edit/${postId}`); // Important: Revalidate edit page
    revalidatePath("/"); // Home page might show featured posts

    // Invalidate cache for this specific post so edit page shows updated status
    revalidateCache([
      CACHE_TAGS.POSTS,
      CACHE_TAGS.POST_BY_ID,
      CACHE_TAGS.POST_BY_SLUG,
      CACHE_TAGS.CATEGORIES, // Important: Invalidate categories cache when post deleted affects counts
      CACHE_TAGS.SEARCH_RESULTS,
      CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
      CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
    ]);

    return {
      success: true,
      message: `Post ${
        existingPost.isFeatured ? "unfeatured" : "featured"
      } successfully`,
    };
  } catch (error) {
    console.error("Error toggling post featured status:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to update post featured status"
    );
  }
}

export async function deletePostAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    // Validate post ID
    if (!postId || typeof postId !== "string") {
      throw new Error("Invalid post ID");
    }

    // Check if post exists and get author info
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        authorId: true,
        isPublished: true,
        status: true,
        _count: {
          select: {
            bookmarks: true,
            favorites: true,
            views: true,
          },
        },
      },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    // Check user permissions
    if (user.role === "ADMIN") {
      // Admin can delete any post
    } else if (user.role === "USER") {
      // Users can only delete their own posts that haven't been approved yet
      if (existingPost.authorId !== user.id) {
        throw new Error("Unauthorized: You can only delete your own posts");
      }
      // Disable deletion once post has been approved or rejected by admin
      if (existingPost.status === "APPROVED") {
        throw new Error(
          "Cannot delete approved posts. Once your content has been approved by an admin, it cannot be deleted."
        );
      }
      if (existingPost.status === "REJECTED") {
        throw new Error(
          "Cannot delete rejected posts. Once your content has been rejected by an admin, it cannot be deleted."
        );
      }
    } else {
      throw new Error("Unauthorized: Invalid user role");
    }

    // Delete post and all related data (cascading delete should handle this)
    // The database schema should handle the cascade deletion of related records
    await prisma.post.delete({
      where: { id: postId },
    });

    // Revalidate relevant paths and caches
    revalidatePath("/dashboard/posts");
    revalidatePath("/"); // Home page might show this post
    revalidatePath("/directory"); // Directory page might show this post

    // Invalidate cache since post has been deleted
    revalidateCache([
      CACHE_TAGS.POSTS,
      CACHE_TAGS.POST_BY_ID,
      CACHE_TAGS.POST_BY_SLUG,
      CACHE_TAGS.CATEGORIES, // Important: Invalidate categories cache when post deleted affects counts
      CACHE_TAGS.SEARCH_RESULTS,
      CACHE_TAGS.USER_POSTS, // Important: Invalidate user posts cache
      CACHE_TAGS.ANALYTICS, // Important: Invalidate analytics for dashboard stats
    ]);

    return {
      success: true,
      message: `Post "${existingPost.title}" deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete post"
    );
  }
}
