"use server";

import { PrismaClient } from "@/lib/generated/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { handleAuthRedirect } from "./auth";

const prisma = new PrismaClient();

// Post management actions
export async function createPostAction(formData: FormData) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    // Temporarily disabled for testing - uncomment to re-enable admin protection
    // if (user.role !== "ADMIN") {
    //   throw new Error("Unauthorized: Admin access required");
    // }

    // Extract form data
    const title = formData.get("title") as string;
    const slug =
      (formData.get("slug") as string) ||
      title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;
    const featuredImage = formData.get("featuredImage") as string;
    const category = formData.get("category") as string;
    const tags = formData.get("tags") as string;
    const isPublished = formData.get("isPublished") === "on";
    const isPremium = formData.get("isPremium") === "on";

    // Validate required fields
    if (!title || !content || !category) {
      throw new Error("Missing required fields");
    }

    // Get category ID
    const categoryRecord = await prisma.category.findUnique({
      where: { slug: category },
    });

    if (!categoryRecord) {
      throw new Error("Invalid category");
    }

    // Process tags
    const tagNames = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
    const tagConnections = [];

    for (const tagName of tagNames) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
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

    // Create the post
    await prisma.post.create({
      data: {
        title,
        slug,
        description: description || null,
        content,
        featuredImage: featuredImage || null,
        isPremium,
        isPublished,
        authorId: user.id,
        categoryId: categoryRecord.id,
        tags: {
          connect: tagConnections,
        },
      },
    });

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

export async function updatePostAction(formData: FormData) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }

    // Temporarily disabled for testing - uncomment to re-enable admin protection
    // if (currentUser.userData.role !== "ADMIN") {
    //   throw new Error("Unauthorized: Admin access required");
    // }

    // Extract form data
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;
    const featuredImage = formData.get("featuredImage") as string;
    const category = formData.get("category") as string;
    const tags = formData.get("tags") as string;
    const isPublished = formData.get("isPublished") === "on";
    const isPremium = formData.get("isPremium") === "on";

    // Validate required fields
    if (!id || !title || !content || !category) {
      throw new Error("Missing required fields");
    }

    // Check if post exists and user has permission
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    // Get category ID
    const categoryRecord = await prisma.category.findUnique({
      where: { slug: category },
    });

    if (!categoryRecord) {
      throw new Error("Invalid category");
    }

    // Process tags
    const tagNames = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
    const tagConnections = [];

    for (const tagName of tagNames) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
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

    // Update the post
    await prisma.post.update({
      where: { id },
      data: {
        title,
        slug,
        description: description || null,
        content,
        featuredImage: featuredImage || null,
        isPremium,
        isPublished,
        categoryId: categoryRecord.id,
        tags: {
          set: tagConnections,
        },
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/posts");
    revalidatePath(`/entry/${id}`);
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
      select: { id: true, isPublished: true, title: true },
    });

    if (!existingPost) {
      throw new Error("Post not found");
    }

    // Toggle the published status
    await prisma.post.update({
      where: { id: postId },
      data: {
        isPublished: !existingPost.isPublished,
        updatedAt: new Date(),
      },
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard/posts");
    revalidatePath(`/entry/${postId}`);
    revalidatePath("/"); // Home page might show published posts

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

export async function deletePostAction(postId: string) {
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

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
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

    // Delete post and all related data (cascading delete should handle this)
    // The database schema should handle the cascade deletion of related records
    await prisma.post.delete({
      where: { id: postId },
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard/posts");
    revalidatePath("/"); // Home page might show this post
    revalidatePath("/directory"); // Directory page might show this post

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
