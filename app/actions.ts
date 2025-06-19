"use server";

import {
  signInWithPassword,
  signUpWithPassword,
  signInWithMagicLink,
  signInWithOAuth,
  signOut,
} from "@/lib/auth";
import {
  type SignInData,
  type SignUpData,
  type MagicLinkData,
  type BookmarkData,
  type FavoriteData,
  bookmarkSchema,
  favoriteSchema,
} from "@/lib/schemas";
import { PrismaClient } from "@/lib/generated/prisma";
import { getCurrentUser } from "@/lib/auth";

const prisma = new PrismaClient();
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Re-export auth functions as server actions
export async function signInAction(data: SignInData) {
  return await signInWithPassword(data);
}

export async function signUpAction(data: SignUpData) {
  return await signUpWithPassword(data);
}

export async function magicLinkAction(data: MagicLinkData) {
  return await signInWithMagicLink(data);
}

export async function oauthAction(provider: "google") {
  return await signInWithOAuth(provider);
}

export async function signOutAction() {
  return await signOut();
}

// Bookmark actions
export async function toggleBookmarkAction(data: BookmarkData) {
  try {
    // Validate the input
    const validatedData = bookmarkSchema.parse(data);

    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }
    const user = currentUser.userData;

    // Check if bookmark already exists
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: validatedData.postId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId: user.id,
            postId: validatedData.postId,
          },
        },
      });

      revalidatePath("/");
      return { success: true, bookmarked: false };
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: {
          userId: user.id,
          postId: validatedData.postId,
        },
      });

      revalidatePath("/");
      return { success: true, bookmarked: true };
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return { success: false, error: "Failed to toggle bookmark" };
  }
}

export async function getUserBookmarksAction() {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }
    const user = currentUser.userData;

    // Get user's bookmarks with post details
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            category: {
              include: {
                parent: true,
              },
            },
            tags: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, bookmarks };
  } catch (error) {
    console.error("Error fetching user bookmarks:", error);
    return { success: false, error: "Failed to fetch bookmarks" };
  }
}

export async function checkBookmarkStatusAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }
    const user = currentUser.userData;

    // Check if post is bookmarked
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId,
        },
      },
    });

    return { success: true, bookmarked: !!bookmark };
  } catch (error) {
    console.error("Error checking bookmark status:", error);
    return { success: false, error: "Failed to check bookmark status" };
  }
}

// Favorite actions
export async function toggleFavoriteAction(data: FavoriteData) {
  try {
    // Validate the input
    const validatedData = favoriteSchema.parse(data);

    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }
    const user = currentUser.userData;

    // Check if favorite already exists
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: validatedData.postId,
        },
      },
    });

    if (existingFavorite) {
      // Remove favorite
      await prisma.favorite.delete({
        where: {
          userId_postId: {
            userId: user.id,
            postId: validatedData.postId,
          },
        },
      });

      revalidatePath("/");
      return { success: true, favorited: false };
    } else {
      // Add favorite
      await prisma.favorite.create({
        data: {
          userId: user.id,
          postId: validatedData.postId,
        },
      });

      revalidatePath("/");
      return { success: true, favorited: true };
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
}

export async function getUserFavoritesAction() {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }
    const user = currentUser.userData;

    // Get user's favorites with post details
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: user.id,
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            category: {
              include: {
                parent: true,
              },
            },
            tags: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, favorites };
  } catch (error) {
    console.error("Error fetching user favorites:", error);
    return { success: false, error: "Failed to fetch favorites" };
  }
}

export async function checkFavoriteStatusAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }
    const user = currentUser.userData;

    // Check if post is favorited
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId,
        },
      },
    });

    return { success: true, favorited: !!favorite };
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return { success: false, error: "Failed to check favorite status" };
  }
}

// Post management actions
export async function createPostAction(formData: FormData) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
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
    console.error("Error creating post:", error);
    throw new Error("Failed to create post");
  }
}

export async function updatePostAction(formData: FormData) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
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
    console.error("Error updating post:", error);
    throw new Error("Failed to update post");
  }
}

// Category management actions
export async function createCategoryAction(formData: FormData) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      redirect("/signin");
    }

    // Temporarily disabled for testing - uncomment to re-enable admin protection
    // if (currentUser.userData.role !== "ADMIN") {
    //   throw new Error("Unauthorized: Admin access required");
    // }

    // Extract form data
    const name = formData.get("name") as string;
    const slug =
      (formData.get("slug") as string) ||
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");
    const description = formData.get("description") as string;
    const parentId = formData.get("parentId") as string;

    // Validate required fields
    if (!name) {
      throw new Error("Category name is required");
    }

    // Check if slug is unique
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new Error("A category with this slug already exists");
    }

    // Create the category
    await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        parentId: parentId && parentId !== "none" ? parentId : null,
      },
    });

    revalidatePath("/dashboard/categories");
    redirect("/dashboard/categories");
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
}

export async function updateCategoryAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Temporarily disabled for testing - uncomment to re-enable admin protection
    // if (user.userData?.role !== "ADMIN") {
    //   throw new Error("Admin access required");
    // }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    let parentId = formData.get("parentId") as string;

    // Input validation
    if (!id || !name || !slug) {
      throw new Error("ID, name, and slug are required");
    }

    // Handle "none" parent selection
    if (parentId === "none") {
      parentId = "";
    }

    // Prevent circular references
    if (parentId === id) {
      throw new Error("A category cannot be its own parent");
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Check for slug conflicts (excluding current category)
    const slugConflict = await prisma.category.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (slugConflict) {
      throw new Error("A category with this slug already exists");
    }

    // If setting a parent, validate it exists and doesn't create circular reference
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
        include: {
          parent: true,
        },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }

      // Check if the parent is a child of this category (would create circular reference)
      if (parentCategory.parent?.id === id) {
        throw new Error(
          "Cannot create circular reference in category hierarchy"
        );
      }
    }

    // Update the category
    await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        parentId: parentId || null,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/categories");
    redirect("/dashboard/categories");
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error("Failed to update category");
  }
}

// Tag Management Actions
export async function createTagAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Temporarily disabled for testing - uncomment to re-enable admin protection
    // if (user.userData?.role !== "ADMIN") {
    //   throw new Error("Admin access required");
    // }

    const name = formData.get("name") as string;
    let slug = formData.get("slug") as string;

    // Input validation
    if (!name) {
      throw new Error("Tag name is required");
    }

    // Auto-generate slug if not provided
    if (!slug) {
      slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    // Check for slug conflicts
    const existingTag = await prisma.tag.findUnique({
      where: { slug },
    });

    if (existingTag) {
      throw new Error("A tag with this slug already exists");
    }

    // Create the tag
    await prisma.tag.create({
      data: {
        name,
        slug,
      },
    });

    revalidatePath("/dashboard/tags");
    redirect("/dashboard/tags");
  } catch (error) {
    console.error("Error creating tag:", error);
    throw new Error("Failed to create tag");
  }
}

export async function updateTagAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Temporarily disabled for testing - uncomment to re-enable admin protection
    // if (user.userData?.role !== "ADMIN") {
    //   throw new Error("Admin access required");
    // }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    // Input validation
    if (!id || !name || !slug) {
      throw new Error("ID, name, and slug are required");
    }

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new Error("Tag not found");
    }

    // Check for slug conflicts (excluding current tag)
    const slugConflict = await prisma.tag.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (slugConflict) {
      throw new Error("A tag with this slug already exists");
    }

    // Update the tag
    await prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/tags");
    redirect("/dashboard/tags");
  } catch (error) {
    console.error("Error updating tag:", error);
    throw new Error("Failed to update tag");
  }
}
