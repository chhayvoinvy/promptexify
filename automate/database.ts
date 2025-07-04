import { PrismaClient } from "../lib/generated/prisma";
import type { ContentFile, PostData, TagData } from "./validation";
import type { ProcessingStats } from "./types";
import { seedConfig } from "./configuration";

// Re-export Prisma so other modules don't need to import it directly
export const prisma = new PrismaClient();

// Type for the Prisma Transaction Client
export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Validates that an author with the given ID exists in the database.
 * Throws an error if the author is not found.
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
    seedConfig.requiredAuthorRole &&
    author.role !== seedConfig.requiredAuthorRole
  ) {
    throw new Error(
      `Author ${authorId} does not have the required role: ${seedConfig.requiredAuthorRole}`
    );
  }
}

/**
 * Processes a single content file within a database transaction.
 *
 * @param tx - The Prisma transaction client.
 * @param contentData - The validated content data from the JSON file.
 * @param authorId - The ID of the author for the new posts.
 * @param stats - The processing statistics object to update.
 */
export async function processContentFile(
  tx: PrismaTransactionClient,
  contentData: ContentFile,
  authorId: string,
  stats: ProcessingStats
): Promise<void> {
  const category = await upsertCategory(tx, contentData.category, stats);
  const tags = await upsertTags(tx, contentData.tags, stats);

  const postSlugs = contentData.posts.map((p) => p.slug);
  const existingPosts = await tx.post.findMany({
    where: { slug: { in: postSlugs } },
    select: { slug: true },
  });
  const existingPostSlugs = new Set(existingPosts.map((p) => p.slug));

  const newPostsData = contentData.posts.filter(
    (p) => !existingPostSlugs.has(p.slug)
  );

  for (const postData of newPostsData) {
    await createPost(tx, postData, category.id, tags, authorId, stats);
  }

  const skippedCount = contentData.posts.length - newPostsData.length;
  if (skippedCount > 0) {
    stats.warnings.push(
      `${skippedCount} posts already existed and were skipped.`
    );
  }
}

/**
 * Creates or updates a category.
 *
 * @param tx - The Prisma transaction client.
 * @param categorySlug - The slug of the category.
 * @param stats - The processing statistics object to update.
 * @returns The created or existing category.
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
 *
 * @param tx - The Prisma transaction client.
 * @param tagsData - An array of tag data.
 * @param stats - The processing statistics object to update.
 * @returns A list of created or existing tags.
 */
async function upsertTags(
  tx: PrismaTransactionClient,
  tagsData: TagData[],
  stats: ProcessingStats
) {
  const tagSlugs = tagsData.map((t) => t.slug);

  const existingTags = await tx.tag.findMany({
    where: { slug: { in: tagSlugs } },
  });

  const existingTagSlugs = new Set(existingTags.map((t) => t.slug));
  const newTagsData = tagsData.filter((t) => !existingTagSlugs.has(t.slug));

  if (newTagsData.length > 0) {
    await tx.tag.createMany({
      data: newTagsData,
      skipDuplicates: true, // Should not be needed if logic is correct, but good for safety
    });
    stats.tagsCreated += newTagsData.length;
  }

  const allTags = await tx.tag.findMany({
    where: { slug: { in: tagSlugs } },
  });

  return allTags;
}

/**
 * Creates a new post and associates it with a category and tags.
 * Skips creation if a post with the same slug already exists.
 *
 * @param tx - The Prisma transaction client.
 * @param postData - The data for the new post.
 * @param categoryId - The ID of the category.
 * @param tags - An array of tags to associate with the post.
 * @param authorId - The ID of the author.
 * @param stats - The processing statistics object to update.
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
