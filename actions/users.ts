"use server";

import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema for updating user profile
const updateUserProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters")
    .trim(),
});

export async function updateUserProfileAction(formData: FormData) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Extract and validate form data
    const name = formData.get("name") as string;

    const validatedData = updateUserProfileSchema.safeParse({ name });

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.errors[0]?.message || "Invalid input",
      };
    }

    // Update user profile in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: validatedData.data.name,
        updatedAt: new Date(),
      },
    });

    // Revalidate the account page to show updated data
    revalidatePath("/dashboard/account");

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Update user profile error:", error);
    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function getUserProfileAction() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Get user profile data
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        type: true,
        role: true,
        oauth: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userProfile) {
      return {
        success: false,
        error: "User profile not found",
      };
    }

    return {
      success: true,
      user: userProfile,
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    return {
      success: false,
      error: "Failed to load profile. Please try again.",
    };
  } finally {
    await prisma.$disconnect();
  }
}
