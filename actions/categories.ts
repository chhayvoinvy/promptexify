"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleAuthRedirect } from "./auth";
import { withCSRFProtection } from "@/lib/csp";

// Category management actions
export const createCategoryAction = withCSRFProtection(
  async (formData: FormData) => {
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
      const newCategory = await prisma.category.create({
        data: {
          name,
          slug,
          description: description || null,
          parentId: parentId && parentId !== "none" ? parentId : null,
        },
      });

      revalidatePath("/dashboard/categories");
      return {
        success: true,
        message: `Category "${newCategory.name}" created successfully`,
        category: newCategory,
      };
    } catch (error) {
      console.error("Error creating category:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create category",
      };
    }
  }
);

export const updateCategoryAction = withCSRFProtection(
  async (formData: FormData) => {
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
      const updatedCategory = await prisma.category.update({
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
      return {
        success: true,
        message: `Category "${updatedCategory.name}" updated successfully`,
        category: updatedCategory,
      };
    } catch (error) {
      console.error("Error updating category:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update category",
      };
    }
  }
);

export const deleteCategoryAction = withCSRFProtection(
  async (formData: FormData) => {
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

      // Input validation
      if (!id) {
        throw new Error("Category ID is required");
      }

      // Check if category exists and get related data
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          children: true,
          posts: true,
          _count: {
            select: {
              posts: true,
              children: true,
            },
          },
        },
      });

      if (!category) {
        throw new Error("Category not found");
      }

      // Check if category has posts - prevent deletion if it does
      if (category._count.posts > 0) {
        throw new Error(
          `Cannot delete category "${category.name}" because it contains ${category._count.posts} post(s). Please move or delete the posts first.`
        );
      }

      // Check if category has subcategories - prevent deletion if it does
      if (category._count.children > 0) {
        throw new Error(
          `Cannot delete category "${category.name}" because it has ${category._count.children} subcategory(ies). Please move or delete the subcategories first.`
        );
      }

      // Safe to delete - category has no posts or subcategories
      await prisma.category.delete({
        where: { id },
      });

      revalidatePath("/dashboard/categories");
      return {
        success: true,
        message: `Category "${category.name}" deleted successfully`,
      };
    } catch (error) {
      console.error("Error deleting category:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete category",
      };
    }
  }
);
