"use server";

import { getCurrentUser } from "@/lib/auth";
import { handleAuthRedirect } from "./auth";
import { revalidatePath } from "next/cache";
import { withCSRFProtection } from "@/lib/security";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";
import { SecurityMonitor, SecurityEventType } from "@/lib/security-monitor";
import { rateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import {
  ContentFileSchema,
  validateFileSize,
  validateFileExtension,
  safeJsonParse,
  type ContentFile,
} from "@/lib/automation/validation";
import { automationConfig } from "@/lib/automation/config";

// Define types for automation actions
interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

// Helper function to require admin access with security logging
async function requireAdminAccess(action: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.userData) {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      { action, reason: "no_user_data" },
      "medium"
    );
    handleAuthRedirect();
  }

  if (currentUser.userData.role !== "ADMIN") {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      {
        action,
        userId: currentUser.userData.id,
        role: currentUser.userData.role,
      },
      "high"
    );
    throw new Error("Admin access required");
  }

  return currentUser.userData;
}

// Enhanced rate limiting for automation actions
async function checkAutomationRateLimit(userId: string, action: string) {
  const identifier = `automation:${userId}:${action}`;
  const result = rateLimits.api(identifier);

  if (!result.allowed) {
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      {
        action,
        userId,
        count: result.count,
        resetTime: new Date(result.resetTime).toISOString(),
      },
      "medium"
    );
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  return result;
}

// Old functions removed - now using AutomationService from lib/automation/service.ts

// Save generation log to database with enhanced metadata
async function saveLog(log: {
  status: "success" | "error";
  message: string;
  filesProcessed?: number;
  postsCreated?: number;
  statusMessages?: string[];
  error?: string;
  userId?: string;
  duration?: number;
}) {
  try {
    await prisma.log.create({
      data: {
        action: "automation",
        userId: log.userId,
        entityType: "content_generation",
        entityId: null,
        ipAddress: null,
        userAgent: null,
        metadata: {
          status: log.status,
          message: log.message,
          filesProcessed: log.filesProcessed || 0,
          postsCreated: log.postsCreated || 0,
          statusMessages: log.statusMessages || [],
          error: log.error || null,
          duration: log.duration || 0,
          timestamp: new Date().toISOString(),
        },
        severity: log.status === "error" ? "ERROR" : "INFO",
      },
    });
  } catch (error) {
    console.error("Failed to save log:", error);
  }
}

// Get all content files with enhanced security
export async function getContentFilesAction(): Promise<ActionResult> {
  try {
    const user = await requireAdminAccess("get_content_files");
    await checkAutomationRateLimit(user.id, "get_files");

    // Ensure content directory exists
    const contentDir = path.join(
      process.cwd(),
      automationConfig.contentDirectory
    );
    await fs.mkdir(contentDir, { recursive: true });

    const files = await fs.readdir(contentDir);
    const jsonFiles = files.filter((file) => validateFileExtension(file));

    const contentFiles = await Promise.all(
      jsonFiles.map(async (fileName) => {
        try {
          const filePath = path.join(contentDir, fileName);
          const stats = await fs.stat(filePath);

          // Security: Check file size before reading
          if (!validateFileSize(stats.size)) {
            console.warn(`File ${fileName} exceeds size limit, skipping`);
            return null;
          }

          const content = await fs.readFile(filePath, "utf-8");
          const rawData = safeJsonParse(content);
          const validatedData = ContentFileSchema.parse(rawData);

          return {
            name: fileName,
            ...validatedData,
            fileSize: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        } catch (error) {
          console.error(`Error reading file ${fileName}:`, error);
          await SecurityMonitor.logSecurityEvent(
            SecurityEventType.MALICIOUS_PAYLOAD,
            {
              fileName,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            "medium"
          );
          return null;
        }
      })
    );

    const validFiles = contentFiles.filter(Boolean) as ContentFile[];

    return {
      success: true,
      data: { files: validFiles },
    };
  } catch (error) {
    console.error("Error getting content files:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get content files",
    };
  }
}

// Create new content file with enhanced validation
export const createContentFileAction = withCSRFProtection(
  async (formData: FormData): Promise<ActionResult> => {
    try {
      const user = await requireAdminAccess("create_content_file");
      await checkAutomationRateLimit(user.id, "create_file");

      const fileName = formData.get("fileName") as string;
      const category = formData.get("category") as string;
      const tagsData = formData.get("tags") as string;
      const postsData = formData.get("posts") as string;

      if (!fileName || !category || !tagsData || !postsData) {
        throw new Error("Missing required fields");
      }

      // Security: Validate file name
      if (!validateFileExtension(fileName)) {
        throw new Error("Invalid file extension");
      }

      if (!/^[a-zA-Z0-9\-_]+\.json$/.test(fileName)) {
        throw new Error("Invalid file name format");
      }

      let tags, posts;
      try {
        tags = JSON.parse(tagsData);
        posts = JSON.parse(postsData);
      } catch {
        await SecurityMonitor.logSecurityEvent(
          SecurityEventType.MALICIOUS_PAYLOAD,
          { fileName, error: "Invalid JSON in form data" },
          "medium"
        );
        throw new Error("Invalid JSON format for tags or posts");
      }

      const fileData = { category, tags, posts };

      // Validate against schema
      const validatedData = ContentFileSchema.parse(fileData);

      // Security: Check total content size
      const jsonString = JSON.stringify(validatedData, null, 2);
      if (!validateFileSize(Buffer.byteLength(jsonString, "utf8"))) {
        throw new Error("File content too large");
      }

      const contentDir = path.join(
        process.cwd(),
        automationConfig.contentDirectory
      );
      const filePath = path.join(contentDir, fileName);

      // Check if file already exists
      try {
        await fs.access(filePath);
        throw new Error("File already exists");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        // File doesn't exist, which is what we want
      }

      // Ensure directory exists
      await fs.mkdir(contentDir, { recursive: true });

      // Write the file
      await fs.writeFile(filePath, jsonString);

      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_REQUEST,
        {
          action: "file_created",
          fileName,
          userId: user.id,
          fileSize: Buffer.byteLength(jsonString, "utf8"),
          postsCount: validatedData.posts.length,
        },
        "low"
      );

      revalidatePath("/dashboard/automation");

      return {
        success: true,
        message: "Content file created successfully",
      };
    } catch (error) {
      console.error("Error creating content file:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create content file",
      };
    }
  }
);

// Update content file with enhanced validation
export const updateContentFileAction = withCSRFProtection(
  async (formData: FormData): Promise<ActionResult> => {
    try {
      const user = await requireAdminAccess("update_content_file");
      await checkAutomationRateLimit(user.id, "update_file");

      const fileName = formData.get("fileName") as string;
      const category = formData.get("category") as string;
      const tagsData = formData.get("tags") as string;
      const postsData = formData.get("posts") as string;

      if (!fileName || !category || !tagsData || !postsData) {
        throw new Error("Missing required fields");
      }

      // Security validations
      if (!validateFileExtension(fileName)) {
        throw new Error("Invalid file extension");
      }

      let tags, posts;
      try {
        tags = JSON.parse(tagsData);
        posts = JSON.parse(postsData);
      } catch {
        await SecurityMonitor.logSecurityEvent(
          SecurityEventType.MALICIOUS_PAYLOAD,
          { fileName, error: "Invalid JSON in update data" },
          "medium"
        );
        throw new Error("Invalid JSON format for tags or posts");
      }

      const fileData = { category, tags, posts };
      const validatedData = ContentFileSchema.parse(fileData);

      const jsonString = JSON.stringify(validatedData, null, 2);
      if (!validateFileSize(Buffer.byteLength(jsonString, "utf8"))) {
        throw new Error("File content too large");
      }

      const contentDir = path.join(
        process.cwd(),
        automationConfig.contentDirectory
      );
      const filePath = path.join(contentDir, fileName);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error("File not found");
      }

      // Update the file
      await fs.writeFile(filePath, jsonString);

      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_REQUEST,
        {
          action: "file_updated",
          fileName,
          userId: user.id,
          fileSize: Buffer.byteLength(jsonString, "utf8"),
          postsCount: validatedData.posts.length,
        },
        "low"
      );

      revalidatePath("/dashboard/automation");

      return {
        success: true,
        message: "Content file updated successfully",
      };
    } catch (error) {
      console.error("Error updating content file:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update content file",
      };
    }
  }
);

// Delete content file with security logging
export const deleteContentFileAction = withCSRFProtection(
  async (formData: FormData): Promise<ActionResult> => {
    try {
      const user = await requireAdminAccess("delete_content_file");
      await checkAutomationRateLimit(user.id, "delete_file");

      const fileName = formData.get("fileName") as string;

      if (!fileName) {
        throw new Error("File name is required");
      }

      // Security: Validate file name
      if (!validateFileExtension(fileName)) {
        throw new Error("Invalid file extension");
      }

      const contentDir = path.join(
        process.cwd(),
        automationConfig.contentDirectory
      );
      const filePath = path.join(contentDir, fileName);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error("File not found");
      }

      // Delete the file
      await fs.unlink(filePath);

      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_REQUEST,
        { action: "file_deleted", fileName, userId: user.id },
        "medium"
      );

      revalidatePath("/dashboard/automation");

      return {
        success: true,
        message: "Content file deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting content file:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete content file",
      };
    }
  }
);

// Run content generation with enhanced security
export const runContentGenerationAction = withCSRFProtection(
  async (): Promise<ActionResult> => {
    try {
      const user = await requireAdminAccess("run_content_generation");

      // Special rate limiting for generation (more restrictive)
      const generationIdentifier = `generation:${user.id}`;
      const generationLimit = rateLimits.createPost(generationIdentifier);

      if (!generationLimit.allowed) {
        await SecurityMonitor.logSecurityEvent(
          SecurityEventType.RATE_LIMIT_EXCEEDED,
          {
            action: "content_generation",
            userId: user.id,
            rateLimitType: "generation_hourly",
          },
          "high"
        );
        throw new Error(
          "Generation rate limit exceeded. Please wait before running again."
        );
      }

      // Execute content generation securely using the new service
      const { AutomationService } = await import("../lib/automation/service");
      const result = await AutomationService.executeContentGeneration(user.id);

      // Extract data from the service result
      const filesProcessed = result.filesProcessed;
      const postsCreated = result.postsCreated;
      const statusMessages = result.statusMessages;

      const logData = {
        status: result.error ? ("error" as const) : ("success" as const),
        message: result.error
          ? `Content generation failed: ${result.error}`
          : `Content generation completed in ${result.duration}s`,
        filesProcessed,
        postsCreated,
        statusMessages,
        userId: user.id,
        duration: result.duration,
        error: result.error,
      };

      // Save log to database
      await saveLog(logData);

      if (result.error) {
        await SecurityMonitor.logSecurityEvent(
          SecurityEventType.MALICIOUS_PAYLOAD,
          {
            action: "content_generation_failed",
            error: result.error,
            userId: user.id,
            duration: result.duration,
          },
          "high"
        );

        return {
          success: false,
          error: result.error,
          data: { duration: result.duration, output: result.output },
        };
      }

      // Invalidate post-related caches after content generation
      await revalidateCache([
        CACHE_TAGS.POSTS,
        CACHE_TAGS.USER_POSTS,
        CACHE_TAGS.CATEGORIES,
        CACHE_TAGS.TAGS,
        CACHE_TAGS.SEARCH_RESULTS,
      ]);

      // Revalidate new post content cache
      const { revalidateAllPostsContent } = await import("../lib/content");
      await revalidateAllPostsContent();

      revalidatePath("/dashboard/automation");
      revalidatePath("/dashboard/posts");

      return {
        success: true,
        message: "Content generation completed successfully",
        data: {
          duration: result.duration,
          filesProcessed,
          postsCreated,
          statusMessages,
          output: result.output,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Content generation failed";

      // Save error log to database
      const user = await getCurrentUser();
      await saveLog({
        status: "error",
        message: errorMessage,
        error: errorMessage,
        userId: user?.userData?.id,
      });

      console.error("Error running content generation:", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

// Get generation logs (unchanged but with better typing)
export async function getGenerationLogsAction(): Promise<ActionResult> {
  try {
    await requireAdminAccess("get_generation_logs");

    // Fetch automation logs from database
    const dbLogs = await prisma.log.findMany({
      where: {
        action: "automation",
        entityType: "content_generation",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to last 50 logs
    });

    const logs = dbLogs.map((log) => {
      // Safely extract metadata with proper type checking
      const metadata =
        log.metadata &&
        typeof log.metadata === "object" &&
        !Array.isArray(log.metadata)
          ? (log.metadata as Record<string, unknown>)
          : {};

      return {
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        status:
          typeof metadata.status === "string" ? metadata.status : "unknown",
        message:
          typeof metadata.message === "string"
            ? metadata.message
            : "No message",
        filesProcessed:
          typeof metadata.filesProcessed === "number"
            ? metadata.filesProcessed
            : undefined,
        postsCreated:
          typeof metadata.postsCreated === "number"
            ? metadata.postsCreated
            : undefined,
        statusMessages: Array.isArray(metadata.statusMessages)
          ? metadata.statusMessages
          : undefined,
        error: typeof metadata.error === "string" ? metadata.error : undefined,
        duration:
          typeof metadata.duration === "number" ? metadata.duration : undefined,
        userId: log.userId,
        severity: log.severity,
      };
    });

    return {
      success: true,
      data: { logs },
    };
  } catch (error) {
    console.error("Error getting generation logs:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get generation logs",
    };
  }
}

// Clear generation logs with security logging
export const clearGenerationLogsAction = withCSRFProtection(
  async (): Promise<ActionResult> => {
    try {
      const user = await requireAdminAccess("clear_generation_logs");

      // Delete all automation logs from database
      const deleteResult = await prisma.log.deleteMany({
        where: {
          action: "automation",
          entityType: "content_generation",
        },
      });

      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_REQUEST,
        {
          action: "logs_cleared",
          userId: user.id,
          deletedCount: deleteResult.count,
        },
        "medium"
      );

      revalidatePath("/dashboard/automation");

      return {
        success: true,
        message: `Successfully cleared ${deleteResult.count} generation logs`,
      };
    } catch (error) {
      console.error("Error clearing generation logs:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to clear generation logs",
      };
    }
  }
);
