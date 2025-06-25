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
    {
      title: "Cyberpunk City Neon Dreams",
      slug: "cyberpunk-city-neon-dreams",
      description:
        "Generate futuristic cyberpunk cityscapes with vibrant neon lighting",
      content:
        "Create a sprawling cyberpunk metropolis at night, filled with towering skyscrapers adorned with holographic advertisements and neon signs. Include flying vehicles, rain-slicked streets reflecting the colorful lights, and crowds of people with futuristic fashion. The atmosphere should be moody and atmospheric with a dark purple and electric blue color palette.",
      isPremium: true,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: imageGeneratorCategory.id,
      tags: ["cyberpunk", "futuristic", "neon", "cityscape"],
    },
    {
      title: "Peaceful Mountain Lake Reflection",
      slug: "peaceful-mountain-lake-reflection",
      description:
        "Serene landscape prompt for creating tranquil nature scenes",
      content:
        "A pristine alpine lake perfectly reflecting snow-capped mountain peaks during golden hour. Crystal clear water shows the mountain reflection with small ripples. Pine trees line the shoreline, and wispy clouds drift across the orange and pink sunset sky. The scene should evoke peace, tranquility, and the majesty of untouched nature.",
      isPremium: false,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: imageGeneratorCategory.id,
      tags: ["nature", "landscape", "peaceful", "mountains"],
    },
    {
      title: "Dragon Flying Over Medieval Castle",
      slug: "dragon-flying-over-medieval-castle",
      description: "Epic fantasy video prompt featuring a majestic dragon",
      content:
        "A massive, ancient dragon with scales that shimmer between emerald and gold soars majestically over a towering medieval castle. The dragon's wings cast shadows over the stone battlements as it circles the fortress. Medieval banners flutter in the wind, and the setting sun creates dramatic lighting across the scene. Include the sound of powerful wingbeats and distant medieval music.",
      isPremium: false,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: veo3Category.id,
      tags: ["dragon", "fantasy", "medieval", "castle", "epic"],
    },
    {
      title: "Underwater Coral Garden Paradise",
      slug: "underwater-coral-garden-paradise",
      description: "Vibrant underwater scene with tropical marine life",
      content:
        "A thriving coral reef teeming with colorful tropical fish, sea turtles, and marine life. Sunlight filters down through crystal-clear blue water, creating dancing patterns of light on the coral formations. Include schools of yellow tang, clownfish among anemones, and a gentle sea turtle gliding through the scene. The water should be pristine with excellent visibility showcasing the biodiversity of the reef.",
      isPremium: true,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: veo3Category.id,
      tags: ["underwater", "coral", "marine", "tropical", "ocean"],
    },
    {
      title: "Steampunk Inventor's Workshop",
      slug: "steampunk-inventors-workshop",
      description:
        "Detailed steampunk workshop scene with Victorian-era inventions",
      content:
        "A cluttered Victorian-era inventor's workshop filled with brass gears, copper pipes, steam-powered contraptions, and intricate clockwork mechanisms. Warm Edison bulb lighting illuminates workbenches covered with blueprints, brass instruments, and half-finished inventions. Steam occasionally hisses from various contraptions, and the atmosphere is rich with the patina of aged metal and polished wood.",
      isPremium: false,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: imageGeneratorCategory.id,
      tags: ["steampunk", "victorian", "workshop", "brass", "inventor"],
    },
    {
      title: "Space Station Orbital Sunrise",
      slug: "space-station-orbital-sunrise",
      description:
        "Breathtaking view of Earth from a space station during sunrise",
      content:
        "A detailed view from a space station as Earth rotates below, with the sun rising over the planet's curved horizon. The terminator line divides day and night, showing city lights on the dark side and the brilliant blue and white of Earth's atmosphere. Solar panels and space station modules are visible in the foreground, with stars and the infinite blackness of space in the background. The scene should capture the awe-inspiring beauty and isolation of space.",
      isPremium: true,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: veo3Category.id,
      tags: ["space", "earth", "sunrise", "orbital", "cosmic"],
    },
    {
      title: "Cozy Forest Cabin in Autumn",
      slug: "cozy-forest-cabin-autumn",
      description:
        "Warm and inviting autumn cabin scene perfect for seasonal content",
      content:
        "A rustic log cabin nestled among vibrant autumn trees with golden, orange, and red foliage. Smoke gently rises from the stone chimney, and warm yellow light glows from the windows. A wooden porch with rocking chairs overlooks a small clearing where fallen leaves carpet the ground. The scene should evoke feelings of warmth, comfort, and the peaceful solitude of autumn in the wilderness.",
      isPremium: false,
      isPublished: true,
      authorId: adminUser.id,
      categoryId: imageGeneratorCategory.id,
      tags: ["autumn", "cabin", "cozy", "forest", "peaceful"],
    },
  ];

  for (const postData of samplePosts) {
    const { tags: postTags, ...postInfo } = postData;

    // Get tag IDs for the tags we want to connect
    const tagIds = postTags
      .map((tagSlug) => createdTags.find((t) => t.slug === tagSlug)?.id)
      .filter(Boolean) as string[];

    // Check if post with this title already exists (for seeding purposes)
    const existingPost = await prisma.post.findFirst({
      where: { title: postInfo.title },
    });

    if (!existingPost) {
      await prisma.post.create({
        data: {
          ...postInfo,
          tags: {
            connect: tagIds.map((id) => ({ id })),
          },
        },
      });
    }
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
