import { PrismaClient, type Prisma } from "../lib/generated/prisma";
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
  type TagData,
} from "./validation";
import { SecurityMonitor, SecurityEventType } from "../lib/security-monitor";

const prisma = new PrismaClient();

interface ProcessingStats {
  filesProcessed: number;
  postsCreated: number;
  tagsCreated: number;
  categoriesCreated: number;
  errors: string[];
  warnings: string[];
}

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
    // Validate author exists
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true },
    });

    if (!author) {
      throw new Error(`Author with ID ${authorId} not found`);
    }

    if (author.role !== "ADMIN") {
      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        { authorId, attemptedAction: "content_generation" },
        "high"
      );
      throw new Error("Author must have ADMIN role for content generation");
    }

    // Read and validate all files first
    const validatedFiles = await validateAndLoadFiles(contentDir);

    if (validatedFiles.length === 0) {
      console.log("⚠️  No valid JSON files found in automate/seeds directory");
      return stats;
    }

    if (seedConfig.logging.enabled) {
      console.log(`📁 Found ${validatedFiles.length} valid content files`);
    }

    // Process files with concurrency control
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

        // Validate file size
        if (!validateFileSize(fileStats.size)) {
          console.warn(
            `⚠️  File ${fileName} exceeds size limit (${fileStats.size} bytes), skipping...`
          );
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
  const { maxConcurrentFiles } = seedConfig.performance;

  // Process files in controlled batches
  for (let i = 0; i < files.length; i += maxConcurrentFiles) {
    const batch = files.slice(i, i + maxConcurrentFiles);

    await Promise.all(batch.map((file) => processFile(file, authorId, stats)));
  }
}

async function processFile(
  file: ProcessedFile,
  authorId: string,
  stats: ProcessingStats
): Promise<void> {
  const { fileName, contentData } = file;

  try {
    if (seedConfig.logging.enabled) {
      console.log(`\n📄 Processing ${fileName}...`);
    }

    // Use transaction for data consistency
    await prisma.$transaction(
      async (tx) => {
        // Create or get category
        const category = await tx.category.upsert({
          where: { slug: contentData.category },
          update: {},
          create: {
            name:
              contentData.category.charAt(0).toUpperCase() +
              contentData.category.slice(1),
            slug: contentData.category,
            description: `${
              contentData.category.charAt(0).toUpperCase() +
              contentData.category.slice(1)
            } prompts and tools`,
          },
        });

        let categoryCreated = false;
        if (
          !(await tx.category.findUnique({
            where: { slug: contentData.category },
          }))
        ) {
          categoryCreated = true;
          stats.categoriesCreated++;
        }

        // Process tags in batch
        const createdTags = await processTags(tx, contentData.tags, stats);

        // Process posts in batches
        await processPostsInBatches(
          tx,
          contentData.posts,
          category.id,
          createdTags,
          authorId,
          stats
        );

        if (seedConfig.logging.enabled) {
          console.log(`✅ Completed processing ${fileName}`);
        }
      },
      {
        timeout: seedConfig.performance.transactionTimeout,
      }
    );

    stats.filesProcessed++;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`${fileName}: ${errorMessage}`);
    console.error(`❌ Error processing ${fileName}:`, error);
  }
}

async function processTags(
  tx: any,
  tagsData: TagData[],
  stats: ProcessingStats
): Promise<any[]> {
  const createdTags = [];

  for (const tagData of tagsData) {
    const existingTag = await tx.tag.findUnique({
      where: { slug: tagData.slug },
    });

    if (existingTag) {
      createdTags.push(existingTag);
    } else {
      const newTag = await tx.tag.create({
        data: {
          name: tagData.name,
          slug: tagData.slug,
        },
      });
      createdTags.push(newTag);
      stats.tagsCreated++;
    }
  }

  return createdTags;
}

async function processPostsInBatches(
  tx: any,
  postsData: PostData[],
  categoryId: string,
  tags: any[],
  authorId: string,
  stats: ProcessingStats
): Promise<void> {
  const { batchSize } = seedConfig.performance;

  // Process posts in smaller batches for better performance
  for (let i = 0; i < postsData.length; i += batchSize) {
    const batch = postsData.slice(i, i + batchSize);

    await Promise.all(
      batch.map((postData) =>
        createPost(tx, postData, categoryId, tags, authorId, stats)
      )
    );
  }
}

async function createPost(
  tx: any,
  postData: PostData,
  categoryId: string,
  tags: any[],
  authorId: string,
  stats: ProcessingStats
): Promise<void> {
  try {
    // Check if post already exists
    const existingPost = await tx.post.findFirst({
      where: { slug: postData.slug },
    });

    if (existingPost) {
      if (seedConfig.logging.enabled) {
        console.log(
          `⚠️  Post with slug "${postData.slug}" already exists, skipping...`
        );
      }
      stats.warnings.push(`Duplicate slug: ${postData.slug}`);
      return;
    }



    // Create the post
    const post = await tx.post.create({
      data: {
        title: postData.title,
        slug: postData.slug,
        description: postData.description,
        content: postData.content,
        categoryId,
        authorId,
        isPremium: postData.isPremium,
        isPublished: postData.isPublished,
        status: postData.status,
        isFeatured: postData.isFeatured,
        featuredImage: postData.featuredImage,

      },
    });

    // Connect tags to the post efficiently
    if (tags.length > 0) {
      await tx.post.update({
        where: { id: post.id },
        data: {
          tags: {
            connect: tags.map((tag) => ({ id: tag.id })),
          },
        },
      });
    }

    stats.postsCreated++;

    if (seedConfig.logging.enabled) {
      console.log(`✅ Created post: "${postData.title}"`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    stats.errors.push(`Post ${postData.slug}: ${errorMessage}`);
    console.error(`❌ Error creating post "${postData.title}":`, error);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
