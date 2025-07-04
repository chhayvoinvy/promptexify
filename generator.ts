import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { seedConfig } from "./configuration";
import {
  ContentFileSchema,
  safeJsonParse,
  validateFileSize,
  validateFileExtension,
  sanitizeContent,
  type ContentFile,
  type PostData,
} from "./validation";
import { SecurityMonitor, SecurityEventType } from "../lib/security-monitor";
import {
  prisma,
  validateAuthorExists,
  processContentFile,
  type PrismaTransactionClient,
} from "./database";
import type { ProcessingStats } from "./types";

interface ProcessedFile {
  fileName: string;
  contentData: ContentFile;
  fileSize: number;
}

async function main() {
  const stats: ProcessingStats = {
    filesProcessed: 0,
    postsCreated: 0,
    tagsCreated: 0,
    categoriesCreated: 0,
    errors: [],
    warnings: [],
  };

  if (seedConfig.logging.enabled) {
    console.log("🌱 Starting secure automated content seed...");
  }

  const contentDir = join(process.cwd(), seedConfig.contentDirectory);
  const authorId = seedConfig.authorId;

  try {
    await validateAuthorExists(authorId);

    if (seedConfig.logging.enabled) {
      console.log(`📝 Using author: ${authorId} for generated content`);
    }

    const validatedFiles = await validateAndLoadFiles(contentDir);

    if (validatedFiles.length === 0) {
      console.log("⚠️  No valid JSON files found in automate/seeds directory");
      return stats;
    }

    if (seedConfig.logging.enabled) {
      console.log(`📁 Found ${validatedFiles.length} valid content files`);
    }

    await processFilesInBatches(validatedFiles, authorId, stats);

    if (seedConfig.logging.enabled) {
      console.log(
        "\n🎉 Secure automated content seeding completed successfully!"
      );
      console.log(`📊 Statistics:`, {
        filesProcessed: stats.filesProcessed,
        postsCreated: stats.postsCreated,
        tagsCreated: stats.tagsCreated,
        categoriesCreated: stats.categoriesCreated,
        errors: stats.errors.length,
        warnings: stats.warnings.length,
      });
    }

    if (stats.warnings.length > 0) {
      console.log("\n⚠️ Warnings:");
      stats.warnings.forEach((warning: string) => console.log(`- ${warning}`));
    }

    return stats;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(errorMessage);

    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.MALICIOUS_PAYLOAD,
      { error: errorMessage, context: "content_generation" },
      "high"
    );

    console.error("❌ Error during content seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function validateAndLoadFiles(
  contentDir: string
): Promise<ProcessedFile[]> {
  const validatedFiles: ProcessedFile[] = [];

  try {
    const files = await readdir(contentDir);
    const jsonFiles = files.filter((file) => validateFileExtension(file));

    for (const fileName of jsonFiles) {
      try {
        const filePath = join(contentDir, fileName);
        const fileStats = await stat(filePath);

        if (!validateFileSize(fileStats.size)) {
          console.warn(
            `⚠️  File ${fileName} exceeds size limit (${fileStats.size} bytes), skipping...`
          );
          continue;
        }

        const fileContent = await readFile(filePath, "utf-8");
        const rawData = safeJsonParse(fileContent);

        const contentData = ContentFileSchema.parse(rawData);

        contentData.posts = contentData.posts.map((post: PostData) => ({
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

        if (seedConfig.logging.verbose) {
          console.log(
            `✅ Validated ${fileName} (${contentData.posts.length} posts)`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Error validating ${fileName}: ${errorMessage}`);

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

async function processFilesInBatches(
  files: ProcessedFile[],
  authorId: string,
  stats: ProcessingStats
) {
  const { maxConcurrentFiles, transactionTimeout } = seedConfig.performance;

  for (let i = 0; i < files.length; i += maxConcurrentFiles) {
    const batch = files.slice(i, i + maxConcurrentFiles);

    await Promise.all(
      batch.map((file) =>
        processFile(file, authorId, stats, transactionTimeout)
      )
    );
  }
}

async function processFile(
  file: ProcessedFile,
  authorId: string,
  stats: ProcessingStats,
  timeout: number
): Promise<void> {
  const { fileName, contentData } = file;

  try {
    if (seedConfig.logging.enabled) {
      console.log(`\n📄 Processing ${fileName}...`);
    }

    await prisma.$transaction(
      (tx: PrismaTransactionClient) =>
        processContentFile(tx, contentData, authorId, stats),
      {
        timeout,
      }
    );

    stats.filesProcessed++;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : `Unknown error in ${fileName}`;
    stats.errors.push(errorMessage);
    console.error(`❌ Error processing ${fileName}:`, errorMessage);

    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.DATABASE_ERROR,
      { file: fileName, error: errorMessage },
      "high"
    );
  }
}

main().catch(() => process.exit(1));
