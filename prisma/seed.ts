import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

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
  await prisma.category.upsert({
    where: { slug: "veo3" },
    update: {},
    create: {
      name: "Veo3",
      slug: "veo3",
      description: "Google's Veo3 video generation tool",
      parentId: geminiCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: "image-generator" },
    update: {},
    create: {
      name: "Image Generator",
      slug: "image-generator",
      description: "Gemini's image generation capabilities",
      parentId: geminiCategory.id,
    },
  });

  await prisma.category.upsert({
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
    { name: "cyberpunk", slug: "cyberpunk" },
    { name: "futuristic", slug: "futuristic" },
    { name: "neon", slug: "neon" },
    { name: "cityscape", slug: "cityscape" },
    { name: "landscape", slug: "landscape" },
    { name: "peaceful", slug: "peaceful" },
    { name: "mountains", slug: "mountains" },
    { name: "dragon", slug: "dragon" },
    { name: "fantasy", slug: "fantasy" },
    { name: "medieval", slug: "medieval" },
    { name: "castle", slug: "castle" },
    { name: "epic", slug: "epic" },
    { name: "underwater", slug: "underwater" },
    { name: "coral", slug: "coral" },
    { name: "marine", slug: "marine" },
    { name: "tropical", slug: "tropical" },
    { name: "ocean", slug: "ocean" },
    { name: "steampunk", slug: "steampunk" },
    { name: "victorian", slug: "victorian" },
    { name: "workshop", slug: "workshop" },
    { name: "brass", slug: "brass" },
    { name: "inventor", slug: "inventor" },
    { name: "space", slug: "space" },
    { name: "earth", slug: "earth" },
    { name: "sunrise", slug: "sunrise" },
    { name: "orbital", slug: "orbital" },
    { name: "cosmic", slug: "cosmic" },
    { name: "autumn", slug: "autumn" },
    { name: "cabin", slug: "cabin" },
    { name: "cozy", slug: "cozy" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  console.log("✅ Created tags");
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
