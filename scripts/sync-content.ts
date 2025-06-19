import { PrismaClient } from "../lib/generated/prisma";
import { allPosts } from "../.contentlayer/generated/index.mjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Starting content synchronization...");
  console.log(`📝 Found ${allPosts.length} posts in contentlayer`);

  // Create admin user if doesn't exist
  const adminUser = await prisma.user.upsert({
    where: { email: "temp-author@promptexify.com" },
    update: {},
    create: {
      email: "temp-author@promptexify.com",
      name: "Content Admin",
      role: "ADMIN",
      type: "PREMIUM",
      oauth: "EMAIL",
    },
  });

  console.log("✅ Ensured admin user exists");

  // Track created categories and tags
  const categoryMap = new Map<string, string>(); // slug -> id
  const tagMap = new Map<string, string>(); // slug -> id

  // Process each post from contentlayer
  for (const post of allPosts) {
    console.log(`Processing: ${post.title}`);

    // Create parent category if needed
    let parentCategoryId: string | null = null;
    if (post.parentCategory) {
      if (!categoryMap.has(post.parentCategory)) {
        const parentCategory = await prisma.category.upsert({
          where: { slug: post.parentCategory },
          update: {},
          create: {
            name:
              post.parentCategory.charAt(0).toUpperCase() +
              post.parentCategory.slice(1),
            slug: post.parentCategory,
            description: `${
              post.parentCategory.charAt(0).toUpperCase() +
              post.parentCategory.slice(1)
            } AI tools and prompts`,
          },
        });
        categoryMap.set(post.parentCategory, parentCategory.id);
        console.log(`  ✅ Created parent category: ${post.parentCategory}`);
      }
      parentCategoryId = categoryMap.get(post.parentCategory)!;
    }

    // Create category if needed
    if (!categoryMap.has(post.category)) {
      const category = await prisma.category.upsert({
        where: { slug: post.category },
        update: {},
        create: {
          name: post.category.charAt(0).toUpperCase() + post.category.slice(1),
          slug: post.category,
          description: `${
            post.category.charAt(0).toUpperCase() + post.category.slice(1)
          } related content`,
          parentId: parentCategoryId,
        },
      });
      categoryMap.set(post.category, category.id);
      console.log(`  ✅ Created category: ${post.category}`);
    }

    // Create tags if needed
    const tagIds: string[] = [];
    for (const tagName of post.tags) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
      if (!tagMap.has(tagSlug)) {
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: {
            name: tagName,
            slug: tagSlug,
          },
        });
        tagMap.set(tagSlug, tag.id);
        console.log(`  ✅ Created tag: ${tagName}`);
      }
      tagIds.push(tagMap.get(tagSlug)!);
    }

    // Create or update post
    await prisma.post.upsert({
      where: { slug: post._raw.sourceFileName.replace(/\.mdx$/, "") },
      update: {
        title: post.title,
        description: post.description,
        content: post.body.raw,
        featuredImage: post.featuredImage,
        isPremium: post.isPremium,
        isPublished: post.isPublished,
        updatedAt: new Date(),
        tags: {
          set: tagIds.map((id) => ({ id })),
        },
      },
      create: {
        title: post.title,
        slug: post._raw.sourceFileName.replace(/\.mdx$/, ""),
        description: post.description,
        content: post.body.raw,
        featuredImage: post.featuredImage,
        isPremium: post.isPremium,
        isPublished: post.isPublished,
        authorId: adminUser.id,
        categoryId: categoryMap.get(post.category)!,
        tags: {
          connect: tagIds.map((id) => ({ id })),
        },
      },
    });

    console.log(`  ✅ Synced post: ${post.title}`);
  }

  console.log("🎉 Content synchronization completed!");
  console.log(`📊 Summary:`);
  console.log(`  - Categories: ${categoryMap.size}`);
  console.log(`  - Tags: ${tagMap.size}`);
  console.log(`  - Posts: ${allPosts.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Sync failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
