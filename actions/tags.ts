"use server";

import { PrismaClient } from "@/lib/generated/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

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

    // Validate name length
    if (name.trim().length > 50) {
      throw new Error("Tag name must be 50 characters or less");
    }

    // Sanitize name
    const sanitizedName = name.trim();

    // Auto-generate slug if not provided
    if (!slug) {
      slug = sanitizedName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    } else {
      slug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");
    }

    // Validate slug
    if (slug.length === 0) {
      throw new Error("Unable to generate a valid slug from the tag name");
    }

    if (slug.length > 50) {
      throw new Error("Generated slug is too long");
    }

    // Check for slug conflicts (case-insensitive for name, exact for slug)
    const existingTag = await prisma.tag.findFirst({
      where: {
        OR: [
          { name: { equals: sanitizedName, mode: "insensitive" } },
          { slug: slug },
        ],
      },
    });

    if (existingTag) {
      const isNameMatch =
        existingTag.name.toLowerCase() === sanitizedName.toLowerCase();
      const isSlugMatch = existingTag.slug === slug;

      if (isNameMatch && isSlugMatch) {
        throw new Error("A tag with this name and slug already exists");
      } else if (isNameMatch) {
        throw new Error("A tag with this name already exists");
      } else {
        throw new Error("A tag with this slug already exists");
      }
    }

    // Create the tag
    await prisma.tag.create({
      data: {
        name: sanitizedName,
        slug,
      },
    });

    revalidatePath("/dashboard/tags");
    redirect("/dashboard/tags");
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

    // Handle database-specific errors
    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as { code: string; meta?: unknown };

      if (dbError.code === "P2002") {
        // Unique constraint violation
        console.error("Tag creation failed - duplicate constraint:", error);
        throw new Error("A tag with this name or slug already exists");
      }
    }

    console.error("Error creating tag:", error);

    // Throw a user-friendly error message
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create tag";
    throw new Error(errorMessage);
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

    console.error("Error updating tag:", error);
    throw new Error("Failed to update tag");
  }
}

export async function deleteTagAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Authentication required");
    }

    // Admin access required for deleting tags
    if (user.userData?.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    const id = formData.get("id") as string;

    // Input validation
    if (!id) {
      throw new Error("Tag ID is required");
    }

    // Check if tag exists and get post count
    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    if (!existingTag) {
      throw new Error("Tag not found");
    }

    // Prevent deletion if tag has associated posts
    if (existingTag._count.posts > 0) {
      throw new Error(
        `Cannot delete tag "${existingTag.name}" because it is used by ${existingTag._count.posts} post(s). Please remove the tag from all posts first.`
      );
    }

    // Delete the tag
    await prisma.tag.delete({
      where: { id },
    });

    revalidatePath("/dashboard/tags");
    return {
      success: true,
      message: `Tag "${existingTag.name}" deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting tag:", error);

    // Handle database-specific errors
    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as { code: string };

      if (dbError.code === "P2003") {
        // Foreign key constraint violation
        throw new Error(
          "Cannot delete tag because it is referenced by other records"
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete tag";
    throw new Error(errorMessage);
  }
}
