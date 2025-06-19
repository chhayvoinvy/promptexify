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
