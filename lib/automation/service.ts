/**
 * Automation Service
 *
 * Main automation service for content generation
 * Consolidates all automation functionality following Next.js best practices
 */

import { readdir, readFile, stat, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { SecurityMonitor, SecurityEventType } from "@/lib/security-monitor";
import { automationConfig } from "./config";
import {
  ContentFileSchema,
  safeJsonParse,
  validateFileSize,
  validateFileExtension,
  sanitizeContent,
} from "./validation";
import {
  validateAuthorExists,
  processContentFile,
  saveGenerationLog,
  getGenerationLogs,
  type PrismaTransactionClient,
} from "./database";
import type {
  ContentFile,
  GenerationResult,
  ProcessingStats,
  GenerationLog,
} from "./types";

/**
 * Processed file interface for internal use
 */
interface ProcessedFile {
  fileName: string;
  contentData: ContentFile;
  fileSize: number;
}

/**
 * Main automation service class
 */
export class AutomationService {
  /**
   * Executes the content generation process
   */
  static async executeContentGeneration(
    userId?: string
  ): Promise<GenerationResult> {
    const stats: ProcessingStats = {
      filesProcessed: 0,
      postsCreated: 0,
      tagsCreated: 0,
      categoriesCreated: 0,
      errors: [],
      warnings: [],
    };

    const startTime = Date.now();
    const statusMessages: string[] = [];

    try {
      if (automationConfig.logging.enabled) {
        console.log("🌱 Starting secure automated content generation...");
        statusMessages.push(
          "🌱 Starting secure automated content generation..."
        );
      }

      // Validate author exists
      await validateAuthorExists(automationConfig.authorId);

      if (automationConfig.logging.enabled) {
        console.log(
          `📝 Using author: ${automationConfig.authorId} for generated content`
        );
        statusMessages.push(
          `📝 Using author: ${automationConfig.authorId} for generated content`
        );
      }

      // Process content files
      const validatedFiles = await this.validateAndLoadFiles(statusMessages);

      if (validatedFiles.length === 0) {
        const message = "⚠️  No valid JSON files found in content/ directory";
        console.log(message);
        statusMessages.push(message);

        const duration = Math.round((Date.now() - startTime) / 1000);
        return {
          output: statusMessages.join("\n"),
          duration,
          filesProcessed: 0,
          postsCreated: 0,
          statusMessages,
        };
      }

      if (automationConfig.logging.enabled) {
        console.log(`📁 Found ${validatedFiles.length} valid content files`);
        statusMessages.push(
          `📁 Found ${validatedFiles.length} valid content files`
        );
      }

      // Process files with concurrency control
      await this.processFilesInBatches(validatedFiles, stats, statusMessages);

      const duration = Math.round((Date.now() - startTime) / 1000);

      if (automationConfig.logging.enabled) {
        console.log(
          "\n🎉 Secure automated content generation completed successfully!"
        );
        console.log(`📊 Statistics:`, {
          filesProcessed: stats.filesProcessed,
          postsCreated: stats.postsCreated,
          tagsCreated: stats.tagsCreated,
          categoriesCreated: stats.categoriesCreated,
          errors: stats.errors.length,
          warnings: stats.warnings.length,
          duration: `${duration}s`,
        });
        statusMessages.push(
          "🎉 Secure automated content generation completed successfully!"
        );
      }

      // Save success log
      await saveGenerationLog({
        status: "success",
        message: `Content generation completed in ${duration}s`,
        filesProcessed: stats.filesProcessed,
        postsCreated: stats.postsCreated,
        statusMessages,
        userId,
        duration,
      });

      return {
        output: statusMessages.join("\n"),
        duration,
        filesProcessed: stats.filesProcessed,
        postsCreated: stats.postsCreated,
        statusMessages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const duration = Math.round((Date.now() - startTime) / 1000);

      stats.errors.push(errorMessage);
      statusMessages.push(`❌ Error: ${errorMessage}`);

      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.MALICIOUS_PAYLOAD,
        { error: errorMessage, context: "content_generation" },
        "high"
      );

      // Save error log
      await saveGenerationLog({
        status: "error",
        message: "Content generation failed",
        error: errorMessage,
        userId,
        duration,
      });

      console.error("❌ Error during content generation:", error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Validates and loads all content files from the automation directory
   */
  private static async validateAndLoadFiles(
    statusMessages: string[]
  ): Promise<ProcessedFile[]> {
    const validatedFiles: ProcessedFile[] = [];
    const contentDir = join(process.cwd(), automationConfig.contentDirectory);

    try {
      // Ensure content directory exists
      await mkdir(contentDir, { recursive: true });

      const files = await readdir(contentDir);
      const jsonFiles = files.filter((file) => validateFileExtension(file));

      for (const fileName of jsonFiles) {
        try {
          const filePath = join(contentDir, fileName);
          const fileStats = await stat(filePath);

          // Validate file size
          if (!validateFileSize(fileStats.size)) {
            const message = `⚠️  File ${fileName} exceeds size limit (${fileStats.size} bytes), skipping...`;
            console.warn(message);
            statusMessages.push(message);
            continue;
          }

          // Read and parse file safely
          const fileContent = await readFile(filePath, "utf-8");
          const rawData = safeJsonParse(fileContent);

          // Validate against schema
          const contentData = ContentFileSchema.parse(rawData);

          // Additional security sanitization
          contentData.posts = contentData.posts.map((post) => ({
            ...post,
            title: sanitizeContent(post.title),
            description: sanitizeContent(post.description),
            content: sanitizeContent(post.content),
          }));

          validatedFiles.push({
            fileName,
            contentData,
            fileSize: fileStats.size,
          });

          if (automationConfig.logging.verbose) {
            console.log(
              `✅ Validated ${fileName} (${contentData.posts.length} posts)`
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const message = `❌ Error validating ${fileName}: ${errorMessage}`;
          console.error(message);
          statusMessages.push(message);

          await SecurityMonitor.logSecurityEvent(
            SecurityEventType.MALICIOUS_PAYLOAD,
            { fileName, error: errorMessage },
            "medium"
          );
        }
      }
    } catch (error) {
      console.error("❌ Error reading content directory:", error);
      throw error;
    }

    return validatedFiles;
  }

  /**
   * Processes files in controlled batches to prevent overwhelming the database
   */
  private static async processFilesInBatches(
    files: ProcessedFile[],
    stats: ProcessingStats,
    statusMessages: string[]
  ) {
    const { maxConcurrentFiles } = automationConfig.performance;

    // Process files in controlled batches
    for (let i = 0; i < files.length; i += maxConcurrentFiles) {
      const batch = files.slice(i, i + maxConcurrentFiles);

      await Promise.all(
        batch.map((file) => this.processFile(file, stats, statusMessages))
      );
    }
  }

  /**
   * Processes a single file within a database transaction
   */
  private static async processFile(
    file: ProcessedFile,
    stats: ProcessingStats,
    statusMessages: string[]
  ): Promise<void> {
    const { fileName, contentData } = file;

    try {
      if (automationConfig.logging.enabled) {
        console.log(`\n📄 Processing ${fileName}...`);
        statusMessages.push(`📄 Processing ${fileName}...`);
      }

      // Use transaction for data consistency
      await prisma.$transaction(
        (tx: PrismaTransactionClient) =>
          processContentFile(tx, contentData, automationConfig.authorId, stats),
        {
          timeout: automationConfig.performance.transactionTimeout,
        }
      );

      if (automationConfig.logging.enabled) {
        console.log(`✅ Completed processing ${fileName}`);
        statusMessages.push(`✅ Completed processing ${fileName}`);
      }

      stats.filesProcessed++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const message = `❌ Error processing ${fileName}: ${errorMessage}`;
      stats.errors.push(message);
      statusMessages.push(message);
      console.error(message);
    }
  }

  /**
   * Retrieves generation logs
   */
  static async getGenerationLogs(): Promise<GenerationLog[]> {
    return getGenerationLogs();
  }

  /**
   * Clears generation logs (admin only)
   */
  static async clearGenerationLogs(): Promise<void> {
    await prisma.log.deleteMany({
      where: {
        action: "automation",
        entityType: "content_generation",
      },
    });
  }
}
