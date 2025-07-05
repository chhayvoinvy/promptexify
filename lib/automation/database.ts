/**
 * Automation Database Operations
 *
 * Database interaction functions for the automation system
 * following secure coding practices and OWASP guidelines
 */

import { prisma } from "@/lib/prisma";
import { automationConfig } from "./config";
import type { ContentFile, PostData, TagData, ProcessingStats } from "./types";

// Type for the Prisma Transaction Client
export type PrismaTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Validates that an author with the given ID exists in the database.
 * Throws an error if the author is not found or doesn't have required permissions.
 */
export async function validateAuthorExists(authorId: string): Promise<void> {
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { id: true, role: true },
  });

  if (!author) {
    throw new Error(`Author with ID ${authorId} not found`);
  }

  if (
    automationConfig.requiredAuthorRole &&
    author.role !== automationConfig.requiredAuthorRole
  ) {
    throw new Error(
      `Author ${authorId} does not have the required role: ${automationConfig.requiredAuthorRole}`
    );
  }
}

/**
 * Processes a single content file within a database transaction.
 * Ensures data consistency and proper error handling.
 */
export async function processContentFile(
  tx: PrismaTransactionClient,
  contentData: ContentFile,
  authorId: string,
  stats: ProcessingStats
): Promise<void> {
  // Create or get category
  const category = await upsertCategory(tx, contentData.category, stats);

  // Create or get tags
  const tags = await upsertTags(tx, contentData.tags, stats);

  // Check for existing posts to avoid duplicates
  const postSlugs = contentData.posts.map((p) => p.slug);
  const existingPosts = await tx.post.findMany({
    where: { slug: { in: postSlugs } },
    select: { slug: true },
  });
  const existingPostSlugs = new Set(existingPosts.map((p) => p.slug));

  // Filter out existing posts
  const newPostsData = contentData.posts.filter(
    (p) => !existingPostSlugs.has(p.slug)
  );

  // Create new posts
  for (const postData of newPostsData) {
    await createPost(tx, postData, category.id, tags, authorId, stats);
  }

  // Track skipped posts
  const skippedCount = contentData.posts.length - newPostsData.length;
  if (skippedCount > 0) {
    stats.warnings.push(
      `${skippedCount} posts already existed and were skipped.`
    );
  }
}

/**
 * Creates or updates a category.
 * Returns the existing category if it already exists.
 */
async function upsertCategory(
  tx: PrismaTransactionClient,
  categorySlug: string,
  stats: ProcessingStats
) {
  const existingCategory = await tx.category.findUnique({
    where: { slug: categorySlug },
  });

  if (existingCategory) {
    return existingCategory;
  }

  stats.categoriesCreated++;
  const categoryName =
    categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);

  return tx.category.create({
    data: {
      name: categoryName,
      slug: categorySlug,
      description: `${categoryName} prompts and tools`,
    },
  });
}

/**
 * Creates or updates tags.
 * Returns all requested tags, creating new ones as needed.
 */
async function upsertTags(
  tx: PrismaTransactionClient,
  tagsData: TagData[],
  stats: ProcessingStats
) {
  const tagSlugs = tagsData.map((t) => t.slug);

  // Find existing tags
  const existingTags = await tx.tag.findMany({
    where: { slug: { in: tagSlugs } },
  });

  const existingTagSlugs = new Set(existingTags.map((t) => t.slug));
  const newTagsData = tagsData.filter((t) => !existingTagSlugs.has(t.slug));

  // Create new tags in bulk
  if (newTagsData.length > 0) {
    await tx.tag.createMany({
      data: newTagsData,
      skipDuplicates: true,
    });
    stats.tagsCreated += newTagsData.length;
  }

  // Return all requested tags
  return tx.tag.findMany({
    where: { slug: { in: tagSlugs } },
  });
}

/**
 * Creates a new post with proper associations.
 * Handles category and tag relationships securely.
 */
async function createPost(
  tx: PrismaTransactionClient,
  postData: PostData,
  categoryId: string,
  tags: { id: string }[],
  authorId: string,
  stats: ProcessingStats
) {
  await tx.post.create({
    data: {
      ...postData,
      authorId,
      categoryId,
      tags: {
        connect: tags.map((tag) => ({ id: tag.id })),
      },
    },
  });

  stats.postsCreated++;
}

/**
 * Saves a generation log to the database for audit purposes.
 */
export async function saveGenerationLog(log: {
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
          error: log.error,
          duration: log.duration || 0,
        },
        severity: log.status === "error" ? "ERROR" : "INFO",
      },
    });
  } catch (error) {
    console.error("Error saving generation log:", error);
  }
}

/**
 * Retrieves generation logs from the database.
 */
export async function getGenerationLogs() {
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

  return dbLogs.map((log) => {
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
        typeof metadata.status === "string" &&
        (metadata.status === "success" || metadata.status === "error")
          ? (metadata.status as "success" | "error")
          : "error",
      message:
        typeof metadata.message === "string" ? metadata.message : "No message",
      filesProcessed:
        typeof metadata.filesProcessed === "number"
          ? metadata.filesProcessed
          : 0,
      postsCreated:
        typeof metadata.postsCreated === "number" ? metadata.postsCreated : 0,
      statusMessages: Array.isArray(metadata.statusMessages)
        ? metadata.statusMessages
        : [],
      error: typeof metadata.error === "string" ? metadata.error : undefined,
      userId: log.userId || undefined,
      severity: log.severity,
      duration: typeof metadata.duration === "number" ? metadata.duration : 0,
    };
  });
}
