import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create sample user (admin)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@promptexify.com" },
    update: {},
    create: {
      email: "admin@promptexify.com",
      name: "Admin User",
      role: "ADMIN",
      type: "PREMIUM",
      oauth: "EMAIL",
    },
  });

  console.log("✅ Created admin user");

  // Create parent categories
  const geminiCategory = await prisma.category.upsert({
    where: { slug: "gemini" },
    update: {},
    create: {
      name: "Gemini",
      slug: "gemini",
      description: "Google's Gemini AI prompts and tools",
    },
  });

  await prisma.category.upsert({
    where: { slug: "chatgpt" },
    update: {},
    create: {
      name: "ChatGPT",
      slug: "chatgpt",
      description: "OpenAI ChatGPT prompts and examples",
    },
  });

  await prisma.category.upsert({
    where: { slug: "text-to-image" },
    update: {},
    create: {
      name: "Text-to-Image",
      slug: "text-to-image",
      description: "AI image generation prompts",
    },
  });

  await prisma.category.upsert({
    where: { slug: "text-to-video" },
    update: {},
    create: {
      name: "Text-to-Video",
      slug: "text-to-video",
      description: "AI video generation prompts",
    },
  });

  console.log("✅ Created parent categories");

  // Create child categories
  const veo3Category = await prisma.category.upsert({
    where: { slug: "veo3" },
    update: {},
    create: {
      name: "Veo3",
      slug: "veo3",
      description: "Google's Veo3 video generation tool",
      parentId: geminiCategory.id,
    },
  });

  const imageGeneratorCategory = await prisma.category.upsert({
    where: { slug: "image-generator" },
    update: {},
    create: {
      name: "Image Generator",
      slug: "image-generator",
      description: "Gemini's image generation capabilities",
      parentId: geminiCategory.id,
    },
  });

  const whiskCategory = await prisma.category.upsert({
    where: { slug: "whisk" },
    update: {},
    create: {
      name: "Whisk",
      slug: "whisk",
      description: "Google's Whisk creative tool",
      parentId: geminiCategory.id,
    },
  });

  console.log("✅ Created child categories");

  // Create tags
  const tags = [
    { name: "owl", slug: "owl" },
    { name: "moonlit", slug: "moonlit" },
    { name: "cinematic", slug: "cinematic" },
    { name: "nature", slug: "nature" },
    { name: "forest", slug: "forest" },
    { name: "creative", slug: "creative" },
    { name: "artistic", slug: "artistic" },
    { name: "professional", slug: "professional" },
  ];

  const createdTags: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];
  for (const tag of tags) {
    const createdTag = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdTags.push(createdTag);
  }

  console.log("✅ Created tags");

  // Create sample posts
  const samplePosts = [
    {
      title: "Epic Owl Flying Through Moonlit Clouds",
      slug: "epic-owl-moonlit-clouds",
      description:
        "A cinematic prompt for creating stunning owl flight scenes with Veo3 AI video generation",
      content:
        "A follow shot of a wise old owl high in the air, peeking through the clouds in a moonlit sky above a forest. The wise old owl carefully circles a clearing looking around to the forest floor. After a few moments, it dives down to a moonlit path and sits next to a badger. Audio: wings flapping, birdsong, loud and pleasant wind rustling and the sound of intermittent pleasant sounds buzzing, twigs snapping underfoot, croaking. A light orchestral score with woodwinds throughout with a cheerful, optimistic rhythm, full of innocent curiosity.",
      isPremium: false,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: veo3Category.id,
      tags: ["owl", "moonlit", "cinematic", "nature", "forest"],
    },
    {
      title: "Abstract Digital Art Generator",
      slug: "abstract-digital-art-generator",
      description:
        "Create stunning abstract digital artwork using AI image generation",
      content:
        "Generate a vibrant abstract digital artwork featuring flowing geometric shapes, neon colors, and dynamic lighting effects. Use a mix of blues, purples, and pinks with holographic textures and particle effects.",
      isPremium: true,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: imageGeneratorCategory.id,
      tags: ["creative", "artistic", "professional"],
    },
    {
      title: "Creative Photo Remix with Whisk",
      slug: "creative-photo-remix-whisk",
      description:
        "Transform ordinary photos into creative masterpieces using Whisk",
      content:
        "Take an ordinary landscape photo and transform it into a surreal artistic interpretation. Add fantasy elements, change the color palette to dreamy pastels, and incorporate floating objects or magical elements.",
      isPremium: false,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: whiskCategory.id,
      tags: ["creative", "artistic"],
    },
  ];

  for (const postData of samplePosts) {
    const { tags: postTags, ...postInfo } = postData;

    // Get tag IDs for the tags we want to connect
    const tagIds = postTags
      .map((tagSlug) => createdTags.find((t) => t.slug === tagSlug)?.id)
      .filter(Boolean) as string[];

    await prisma.post.upsert({
      where: { slug: postInfo.slug },
      update: {},
      create: {
        ...postInfo,
        tags: {
          connect: tagIds.map((id) => ({ id })),
        },
      },
    });
  }

  console.log("✅ Created sample posts");

  // Create a regular user for testing bookmarks
  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "Regular User",
      role: "USER",
      type: "FREE",
      oauth: "EMAIL",
    },
  });

  console.log("✅ Created regular user");

  // Get the created posts to create bookmarks
  const posts = await prisma.post.findMany({
    take: 2, // Just bookmark the first 2 posts
  });

  // Create sample bookmarks
  for (const post of posts) {
    await prisma.bookmark.upsert({
      where: {
        userId_postId: {
          userId: regularUser.id,
          postId: post.id,
        },
      },
      update: {},
      create: {
        userId: regularUser.id,
        postId: post.id,
      },
    });
  }

  console.log("✅ Created sample bookmarks");

  // Get all posts to create favorites
  const allPosts = await prisma.post.findMany();

  // Create sample favorites (different posts than bookmarks)
  const favoritePosts = allPosts.slice(0, 2); // Favorite first 2 posts
  for (const post of favoritePosts) {
    await prisma.favorite.upsert({
      where: {
        userId_postId: {
          userId: regularUser.id,
          postId: post.id,
        },
      },
      update: {},
      create: {
        userId: regularUser.id,
        postId: post.id,
      },
    });
  }

  console.log("✅ Created sample favorites");

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
