"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StorageType } from "@/lib/generated/prisma";
import { z } from "zod";
import { sanitizeInput } from "@/lib/sanitize";
import { clearStorageConfigCache } from "@/lib/storage";

// Settings validation schema
const settingsSchema = z.object({
  // Storage Configuration
  storageType: z.enum(["S3", "LOCAL"]),
  s3BucketName: z.string().optional(),
  s3Region: z.string().optional(),
  s3AccessKeyId: z.string().optional(),
  s3SecretKey: z.string().optional(),
  s3CloudfrontUrl: z.string().url().optional().or(z.literal("")),
  localBasePath: z.string().optional(),
  localBaseUrl: z.string().optional(),

  // Upload Limits
  maxImageSize: z
    .number()
    .min(1024)
    .max(50 * 1024 * 1024), // 1KB to 50MB
  maxVideoSize: z
    .number()
    .min(1024)
    .max(500 * 1024 * 1024), // 1KB to 500MB
  enableCompression: z.boolean(),
  compressionQuality: z.number().min(1).max(100),

  // Content Management
  maxTagsPerPost: z.number().min(1).max(100),
  enableCaptcha: z.boolean(),
  requireApproval: z.boolean(),

  // Security & Rate Limiting
  maxPostsPerDay: z.number().min(1).max(1000),
  maxUploadsPerHour: z.number().min(1).max(1000),
  enableAuditLogging: z.boolean(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

/**
 * Get current settings or create default settings if none exist
 */
export async function getSettingsAction() {
  try {
    const user = await getCurrentUser();

    if (!user || user.userData?.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    // Try to get existing settings
    let settings = await prisma.settings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          updatedBy: user.userData.id,
        },
      });
    }

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return {
      success: false,
      error: "Failed to fetch settings",
    };
  }
}

/**
 * Update settings
 */
export async function updateSettingsAction(data: SettingsFormData) {
  try {
    const user = await getCurrentUser();

    if (!user || user.userData?.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    // Validate input data
    const validationResult = settingsSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid input data",
        details: validationResult.error.errors,
      };
    }

    const validatedData = validationResult.data;

    // Sanitize string inputs
    const sanitizedData = {
      ...validatedData,
      s3BucketName: validatedData.s3BucketName
        ? sanitizeInput(validatedData.s3BucketName)
        : undefined,
      s3Region: validatedData.s3Region
        ? sanitizeInput(validatedData.s3Region)
        : undefined,
      s3AccessKeyId: validatedData.s3AccessKeyId
        ? sanitizeInput(validatedData.s3AccessKeyId)
        : undefined,
      s3SecretKey: validatedData.s3SecretKey
        ? sanitizeInput(validatedData.s3SecretKey)
        : undefined,
      s3CloudfrontUrl: validatedData.s3CloudfrontUrl
        ? sanitizeInput(validatedData.s3CloudfrontUrl)
        : undefined,
      localBasePath: validatedData.localBasePath
        ? sanitizeInput(validatedData.localBasePath)
        : undefined,
      localBaseUrl: validatedData.localBaseUrl
        ? sanitizeInput(validatedData.localBaseUrl)
        : undefined,
    };

    // Additional validation for S3 configuration
    if (sanitizedData.storageType === "S3") {
      if (
        !sanitizedData.s3BucketName ||
        !sanitizedData.s3Region ||
        !sanitizedData.s3AccessKeyId ||
        !sanitizedData.s3SecretKey
      ) {
        return {
          success: false,
          error:
            "S3 configuration requires bucket name, region, access key ID, and secret key",
        };
      }
    }

    // Additional validation for local storage
    if (sanitizedData.storageType === "LOCAL") {
      if (!sanitizedData.localBasePath || !sanitizedData.localBaseUrl) {
        return {
          success: false,
          error: "Local storage configuration requires base path and base URL",
        };
      }
    }

    // Get existing settings or create new one
    let settings = await prisma.settings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (settings) {
      // Update existing settings
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...sanitizedData,
          storageType: sanitizedData.storageType as StorageType,
          updatedBy: user.userData.id,
        },
      });
    } else {
      // Create new settings
      settings = await prisma.settings.create({
        data: {
          ...sanitizedData,
          storageType: sanitizedData.storageType as StorageType,
          updatedBy: user.userData.id,
        },
      });
    }

    // Clear storage config cache to ensure new settings are used
    clearStorageConfigCache();

    // Revalidate relevant pages
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: settings,
      message: "Settings updated successfully",
    };
  } catch (error) {
    console.error("Error updating settings:", error);
    return {
      success: false,
      error: "Failed to update settings",
    };
  }
}

/**
 * Get storage configuration for use in upload services
 */
export async function getStorageConfigAction() {
  try {
    const settings = await prisma.settings.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        storageType: true,
        s3BucketName: true,
        s3Region: true,
        s3AccessKeyId: true,
        s3SecretKey: true,
        s3CloudfrontUrl: true,
        localBasePath: true,
        localBaseUrl: true,
        maxImageSize: true,
        maxVideoSize: true,
        enableCompression: true,
        compressionQuality: true,
      },
    });

    // Return default S3 configuration if no settings exist
    if (!settings) {
      return {
        success: true,
        data: {
          storageType: "S3" as StorageType,
          s3BucketName: process.env.AWS_S3_BUCKET_NAME || null,
          s3Region: process.env.AWS_REGION || "us-east-1",
          s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
          s3SecretKey: process.env.AWS_SECRET_ACCESS_KEY || null,
          s3CloudfrontUrl: process.env.AWS_CLOUDFRONT_URL || null,
          localBasePath: "/uploads",
          localBaseUrl: "/uploads",
          maxImageSize: 2097152, // 2MB
          maxVideoSize: 10485760, // 10MB
          enableCompression: true,
          compressionQuality: 80,
        },
      };
    }

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("Error fetching storage config:", error);
    return {
      success: false,
      error: "Failed to fetch storage configuration",
    };
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettingsToDefaultAction() {
  try {
    const user = await getCurrentUser();

    if (!user || user.userData?.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    // Get existing settings or create new one
    let settings = await prisma.settings.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const defaultData = {
      storageType: "S3" as StorageType,
      s3BucketName: null,
      s3Region: null,
      s3AccessKeyId: null,
      s3SecretKey: null,
      s3CloudfrontUrl: null,
      localBasePath: "/uploads",
      localBaseUrl: "/uploads",
      maxImageSize: 2097152, // 2MB
      maxVideoSize: 10485760, // 10MB
      enableCompression: true,
      compressionQuality: 80,
      maxTagsPerPost: 20,
      enableCaptcha: false,
      requireApproval: true,
      maxPostsPerDay: 10,
      maxUploadsPerHour: 20,
      enableAuditLogging: true,
      updatedBy: user.userData.id,
    };

    if (settings) {
      // Update existing settings
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: defaultData,
      });
    } else {
      // Create new settings
      settings = await prisma.settings.create({
        data: defaultData,
      });
    }

    // Clear storage config cache to ensure new settings are used
    clearStorageConfigCache();

    // Revalidate relevant pages
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: settings,
      message: "Settings reset to defaults successfully",
    };
  } catch (error) {
    console.error("Error resetting settings:", error);
    return {
      success: false,
      error: "Failed to reset settings",
    };
  }
}
