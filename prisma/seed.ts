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

  const aiCodeEditorCategory = await prisma.category.upsert({
    where: { slug: "ai-code-editor" },
    update: {},
    create: {
      name: "Ai Code Editor",
      slug: "ai-code-editor",
      description: "AI-powered code editor tools and prompts",
    },
  });

  await prisma.category.upsert({
    where: { slug: "claude" },
    update: {},
    create: {
      name: "Claude",
      slug: "claude",
      description: "Anthropic Claude prompts and tools",
    },
  });

  await prisma.category.upsert({
    where: { slug: "text-to-audio" },
    update: {},
    create: {
      name: "Text to Audio",
      slug: "text-to-audio",
      description: "AI audio generation prompts",
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

  await prisma.category.upsert({
    where: { slug: "cursor-rules" },
    update: {},
    create: {
      name: "Cursor Rules",
      slug: "cursor-rules",
      description: "Cursor code editor rules and automations",
      parentId: aiCodeEditorCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: "windsurf-rules" },
    update: {},
    create: {
      name: "Windsurf Rules",
      slug: "windsurf-rules",
      description: "Windsurf code editor rules and automations",
      parentId: aiCodeEditorCategory.id,
    },
  });

  await prisma.category.upsert({
    where: { slug: "chatgpt-rules" },
    update: {},
    create: {
      name: "ChatGPT Rules",
      slug: "chatgpt-rules",
      description: "ChatGPT code editor rules and automations",
      parentId: aiCodeEditorCategory.id,
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
    { name: "night", slug: "night" },
    { name: "day", slug: "day" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }

  console.log("✅ Created tags");

  // Create 20 posts with author ID b8cb0435-491a-47c4-9d6e-3364a19e8264
  const authorId = "b8cb0435-491a-47c4-9d6e-3364a19e8264";

  // Fetch all existing categories from database
  const allCategories = await prisma.category.findMany({
    select: { id: true },
  });

  // Function to get random category ID from existing categories
  const getRandomCategoryId = () => {
    const randomIndex = Math.floor(Math.random() * allCategories.length);
    return allCategories[randomIndex].id;
  };

  const posts = [
    {
      title: "Advanced Gemini Prompts for Creative Writing",
      slug: "advanced-gemini-prompts-creative-writing",
      description:
        "Discover powerful Gemini prompts that enhance your creative writing process with AI assistance.",
      content:
        "This comprehensive guide explores advanced prompting techniques for Google's Gemini AI to boost your creative writing. Learn how to craft compelling narratives, develop characters, and generate unique story ideas using structured prompts.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "Claude AI for Code Review and Optimization",
      slug: "claude-ai-code-review-optimization",
      description:
        "Master Claude AI for comprehensive code reviews and performance optimization strategies.",
      content:
        "Learn how to leverage Claude AI's analytical capabilities for thorough code reviews, identifying bottlenecks, and implementing optimization strategies that improve application performance.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "ChatGPT Prompt Engineering Best Practices",
      slug: "chatgpt-prompt-engineering-best-practices",
      description:
        "Essential techniques for crafting effective ChatGPT prompts that deliver consistent results.",
      content:
        "Explore proven methodologies for prompt engineering with ChatGPT, including context setting, role definition, and output formatting techniques that maximize AI response quality.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "Text-to-Image Generation with Midjourney Prompts",
      slug: "text-to-image-midjourney-prompts",
      description:
        "Create stunning visuals using advanced Midjourney prompting techniques and parameters.",
      content:
        "Master the art of text-to-image generation with detailed Midjourney prompts, parameter optimization, and style control techniques for professional-quality AI artwork.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI Video Creation with Runway ML Prompts",
      slug: "ai-video-creation-runway-ml-prompts",
      description:
        "Generate professional videos using AI with optimized Runway ML prompting strategies.",
      content:
        "Discover how to create compelling video content using Runway ML's AI capabilities, including motion control, scene composition, and narrative structure through effective prompting.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Voice Synthesis and Audio Generation Prompts",
      slug: "voice-synthesis-audio-generation-prompts",
      description:
        "Create natural-sounding audio content with AI using specialized prompting techniques.",
      content:
        "Learn to generate high-quality voice synthesis and audio content using AI tools, with focus on tone control, emotion expression, and natural speech patterns.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Cursor IDE Automation Rules for Developers",
      slug: "cursor-ide-automation-rules-developers",
      description:
        "Boost productivity with custom Cursor IDE rules and automation workflows.",
      content:
        "Comprehensive guide to setting up Cursor IDE automation rules that streamline development workflows, reduce repetitive tasks, and improve code quality through intelligent assistance.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "Advanced Gemini Image Generation Techniques",
      slug: "advanced-gemini-image-generation-techniques",
      description:
        "Unlock the full potential of Gemini's image generation with advanced prompting methods.",
      content:
        "Explore sophisticated techniques for generating high-quality images with Gemini AI, including style transfer, composition control, and artistic direction through strategic prompting.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Claude for Technical Documentation Writing",
      slug: "claude-technical-documentation-writing",
      description:
        "Create comprehensive technical documentation efficiently using Claude AI assistance.",
      content:
        "Master the art of technical writing with Claude AI, covering API documentation, user guides, and system architecture documentation with clear, concise, and accurate content.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "ChatGPT for Data Analysis and Insights",
      slug: "chatgpt-data-analysis-insights",
      description:
        "Transform raw data into actionable insights using ChatGPT's analytical capabilities.",
      content:
        "Learn to leverage ChatGPT for data analysis, pattern recognition, and generating meaningful insights from complex datasets through structured prompting approaches.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Cinematic Video Prompts for AI Generation",
      slug: "cinematic-video-prompts-ai-generation",
      description:
        "Create movie-quality videos using AI with professional cinematic prompting techniques.",
      content:
        "Master cinematic video creation with AI tools using advanced prompting for camera angles, lighting, composition, and storytelling elements that rival professional productions.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "Nature Photography Prompts for AI Art",
      slug: "nature-photography-prompts-ai-art",
      description:
        "Generate breathtaking nature imagery using specialized AI prompting for outdoor scenes.",
      content:
        "Discover techniques for creating stunning nature photography through AI, including landscape composition, wildlife portraiture, and environmental storytelling through detailed prompts.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Podcast Script Generation with AI Assistance",
      slug: "podcast-script-generation-ai-assistance",
      description:
        "Create engaging podcast content using AI-powered script writing and audio generation.",
      content:
        "Learn to develop compelling podcast scripts and audio content using AI tools, covering topic research, narrative structure, and natural dialogue creation for professional podcasting.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Windsurf Editor Productivity Hacks",
      slug: "windsurf-editor-productivity-hacks",
      description:
        "Maximize coding efficiency with advanced Windsurf editor configurations and rules.",
      content:
        "Comprehensive guide to optimizing Windsurf editor for maximum productivity, including custom rules, shortcuts, and automation features that accelerate development workflows.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Moonlit Scene Creation with AI Imagery",
      slug: "moonlit-scene-creation-ai-imagery",
      description:
        "Master the art of creating atmospheric moonlit scenes using AI image generation.",
      content:
        "Explore techniques for generating captivating moonlit scenes with AI, focusing on lighting effects, atmospheric mood, and nocturnal beauty through strategic prompt engineering.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Forest Environment Design for Games",
      slug: "forest-environment-design-games",
      description:
        "Create immersive forest environments for games using AI-assisted design prompts.",
      content:
        "Learn to design rich, detailed forest environments for gaming applications using AI tools, covering terrain generation, vegetation placement, and atmospheric effects.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Night Photography AI Enhancement Techniques",
      slug: "night-photography-ai-enhancement-techniques",
      description:
        "Enhance night photography using AI tools and specialized prompting for low-light scenes.",
      content:
        "Master night photography enhancement with AI, including noise reduction, detail preservation, and creative lighting effects through advanced prompting and post-processing techniques.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Daytime Portrait Generation with AI",
      slug: "daytime-portrait-generation-ai",
      description:
        "Create stunning daytime portraits using AI with natural lighting and composition techniques.",
      content:
        "Discover methods for generating beautiful daytime portraits with AI, focusing on natural lighting, facial features, and environmental integration for realistic results.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Owl Character Design for Animation",
      slug: "owl-character-design-animation",
      description:
        "Design expressive owl characters for animation using AI-powered creative prompts.",
      content:
        "Learn to create compelling owl characters for animation projects using AI tools, covering personality design, expression mapping, and character development through detailed prompting.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Complete Guide to AI Code Editor Integration",
      slug: "complete-guide-ai-code-editor-integration",
      description:
        "Integrate AI capabilities seamlessly into your development workflow across different editors.",
      content:
        "Comprehensive guide to integrating AI tools across various code editors, including setup, configuration, and optimization strategies for enhanced development productivity.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "AI-Powered Logo Design Techniques",
      slug: "ai-powered-logo-design-techniques",
      description:
        "Create professional logos using AI with strategic prompting for brand identity.",
      content:
        "Master logo design with AI tools, covering brand analysis, visual identity creation, and iterative refinement through effective prompting strategies.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Machine Learning Model Optimization with AI Assistants",
      slug: "machine-learning-model-optimization-ai-assistants",
      description:
        "Optimize ML models using AI-powered analysis and hyperparameter tuning.",
      content:
        "Learn to enhance machine learning model performance using AI assistants for hyperparameter optimization, feature selection, and architecture improvements.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "Architectural Visualization with AI Rendering",
      slug: "architectural-visualization-ai-rendering",
      description:
        "Generate photorealistic architectural renders using AI-powered visualization tools.",
      content:
        "Explore architectural visualization techniques with AI, including interior design, exterior rendering, and lighting simulation for professional presentations.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Social Media Content Creation with AI",
      slug: "social-media-content-creation-ai",
      description:
        "Automate social media content generation using AI for consistent brand presence.",
      content:
        "Discover how to create engaging social media content with AI, including post generation, hashtag optimization, and visual content creation for multiple platforms.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI Music Composition and Sound Design",
      slug: "ai-music-composition-sound-design",
      description:
        "Compose original music and create sound effects using AI-powered audio tools.",
      content:
        "Learn music composition with AI, covering melody generation, harmony creation, and sound effect design for multimedia projects and creative applications.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "E-commerce Product Photography with AI",
      slug: "ecommerce-product-photography-ai",
      description:
        "Generate professional product images for e-commerce using AI photography techniques.",
      content:
        "Master e-commerce product photography with AI, including background removal, lighting optimization, and multiple angle generation for online stores.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Assisted Game Development Workflows",
      slug: "ai-assisted-game-development-workflows",
      description:
        "Streamline game development using AI for asset creation and code generation.",
      content:
        "Explore AI integration in game development, covering asset generation, procedural content creation, and automated testing for efficient game production.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Scientific Visualization with AI Graphics",
      slug: "scientific-visualization-ai-graphics",
      description:
        "Create compelling scientific visualizations using AI-powered graphic generation.",
      content:
        "Learn to visualize complex scientific data with AI, including molecular structures, data plots, and educational diagrams for research and presentation.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI Copywriting for Marketing Campaigns",
      slug: "ai-copywriting-marketing-campaigns",
      description:
        "Generate persuasive marketing copy using AI for effective advertising campaigns.",
      content:
        "Master AI copywriting techniques for marketing, including ad copy creation, email campaigns, and sales page optimization for improved conversion rates.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "3D Model Generation with AI Tools",
      slug: "3d-model-generation-ai-tools",
      description:
        "Create detailed 3D models using AI-powered modeling and sculpting techniques.",
      content:
        "Discover 3D modeling with AI, covering mesh generation, texture creation, and model optimization for games, animation, and architectural visualization.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Enhanced Video Editing Workflows",
      slug: "ai-enhanced-video-editing-workflows",
      description:
        "Accelerate video editing using AI for automated cuts, effects, and color grading.",
      content:
        "Learn AI-powered video editing techniques, including automated scene detection, smart cuts, and intelligent color correction for professional video production.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Character Animation with AI Motion Capture",
      slug: "character-animation-ai-motion-capture",
      description:
        "Animate characters using AI-powered motion capture and procedural animation.",
      content:
        "Explore character animation with AI, covering motion synthesis, facial animation, and realistic movement generation for film and game production.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Powered Data Visualization Dashboards",
      slug: "ai-powered-data-visualization-dashboards",
      description:
        "Build intelligent dashboards using AI for automated data analysis and visualization.",
      content:
        "Create dynamic data visualizations with AI, including automated chart generation, trend analysis, and interactive dashboard design for business intelligence.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Fashion Design Innovation with AI",
      slug: "fashion-design-innovation-ai",
      description:
        "Revolutionize fashion design using AI for pattern creation and trend prediction.",
      content:
        "Discover AI applications in fashion design, including pattern generation, color palette creation, and trend forecasting for innovative clothing design.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Generated Textures for 3D Environments",
      slug: "ai-generated-textures-3d-environments",
      description:
        "Create realistic textures for 3D environments using AI texture generation tools.",
      content:
        "Master texture creation with AI, covering material generation, seamless tiling, and PBR texture creation for realistic 3D environments and game assets.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Automated Testing with AI Code Analysis",
      slug: "automated-testing-ai-code-analysis",
      description:
        "Implement intelligent testing strategies using AI for code analysis and bug detection.",
      content:
        "Learn AI-powered testing methodologies, including automated test generation, code quality analysis, and intelligent bug detection for robust software development.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Assisted UX/UI Design Optimization",
      slug: "ai-assisted-ux-ui-design-optimization",
      description:
        "Optimize user interfaces using AI for better user experience and conversion rates.",
      content:
        "Explore AI applications in UX/UI design, including layout optimization, user behavior analysis, and automated A/B testing for improved user experiences.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Procedural World Generation with AI",
      slug: "procedural-world-generation-ai",
      description:
        "Generate vast game worlds using AI-powered procedural generation techniques.",
      content:
        "Master procedural world generation with AI, covering terrain creation, biome distribution, and ecosystem simulation for immersive game environments.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "AI-Enhanced Photo Restoration Techniques",
      slug: "ai-enhanced-photo-restoration-techniques",
      description:
        "Restore and enhance old photographs using advanced AI restoration algorithms.",
      content:
        "Learn photo restoration with AI, including damage repair, color restoration, and detail enhancement for preserving historical and personal photographs.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Smart Contract Development with AI Assistance",
      slug: "smart-contract-development-ai-assistance",
      description:
        "Develop secure smart contracts using AI for code generation and vulnerability detection.",
      content:
        "Explore AI-assisted smart contract development, covering automated code generation, security analysis, and gas optimization for blockchain applications.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Powered Language Translation Tools",
      slug: "ai-powered-language-translation-tools",
      description:
        "Build advanced translation systems using AI for accurate multilingual communication.",
      content:
        "Master AI translation techniques, including context-aware translation, cultural adaptation, and real-time language processing for global applications.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Virtual Reality Content Creation with AI",
      slug: "virtual-reality-content-creation-ai",
      description:
        "Create immersive VR experiences using AI for environment and interaction generation.",
      content:
        "Discover VR content creation with AI, including environment generation, interactive object creation, and user experience optimization for virtual reality applications.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Driven Market Research and Analysis",
      slug: "ai-driven-market-research-analysis",
      description:
        "Conduct comprehensive market research using AI for data collection and trend analysis.",
      content:
        "Learn AI-powered market research techniques, including sentiment analysis, competitor monitoring, and consumer behavior prediction for strategic business decisions.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Automated Code Refactoring with AI",
      slug: "automated-code-refactoring-ai",
      description:
        "Improve code quality using AI-powered refactoring and optimization techniques.",
      content:
        "Master code refactoring with AI, including automated cleanup, performance optimization, and design pattern implementation for maintainable software.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Enhanced Creative Writing Workshops",
      slug: "ai-enhanced-creative-writing-workshops",
      description:
        "Boost creative writing skills using AI for inspiration and narrative development.",
      content:
        "Explore creative writing with AI assistance, including plot generation, character development, and style enhancement for compelling storytelling.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "Personalized Learning Systems with AI",
      slug: "personalized-learning-systems-ai",
      description:
        "Design adaptive learning platforms using AI for personalized educational experiences.",
      content:
        "Learn to create AI-powered educational systems, including adaptive content delivery, progress tracking, and personalized learning path optimization.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
    },
    {
      title: "AI-Powered Cybersecurity Threat Detection",
      slug: "ai-powered-cybersecurity-threat-detection",
      description:
        "Implement intelligent security systems using AI for threat detection and prevention.",
      content:
        "Master cybersecurity with AI, including anomaly detection, threat prediction, and automated response systems for comprehensive security protection.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
    },
    {
      title: "Sustainable Technology Design with AI",
      slug: "sustainable-technology-design-ai",
      description:
        "Develop eco-friendly solutions using AI for sustainable technology innovation.",
      content:
        "Explore sustainable technology development with AI, including energy optimization, waste reduction, and environmental impact assessment for green innovation.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Podcast Production and Editing",
      slug: "ai-powered-podcast-production-editing",
      description:
        "Streamline podcast creation using AI for audio enhancement and content optimization.",
      content:
        "Master podcast production with AI tools, covering audio cleanup, voice enhancement, automated transcription, and content optimization for engaging audio content.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Blockchain Analytics with AI Intelligence",
      slug: "blockchain-analytics-ai-intelligence",
      description:
        "Analyze blockchain data using AI for pattern recognition and fraud detection.",
      content:
        "Explore blockchain analytics with AI, including transaction analysis, smart contract auditing, and cryptocurrency market prediction for informed decision-making.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Interior Design Visualization",
      slug: "ai-enhanced-interior-design-visualization",
      description:
        "Transform interior spaces using AI for design visualization and space planning.",
      content:
        "Learn interior design with AI, covering room layout optimization, furniture placement, color scheme generation, and photorealistic rendering for stunning spaces.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Automated Email Marketing with AI Personalization",
      slug: "automated-email-marketing-ai-personalization",
      description:
        "Create personalized email campaigns using AI for improved engagement and conversion.",
      content:
        "Master email marketing with AI, including content personalization, send time optimization, subject line generation, and automated campaign management.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Driven Financial Portfolio Management",
      slug: "ai-driven-financial-portfolio-management",
      description:
        "Optimize investment portfolios using AI for risk assessment and return maximization.",
      content:
        "Explore AI in finance, covering portfolio optimization, risk analysis, market prediction, and automated trading strategies for intelligent investment management.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Medical Imaging Analysis with AI Diagnostics",
      slug: "medical-imaging-analysis-ai-diagnostics",
      description:
        "Enhance medical diagnostics using AI for accurate image analysis and pattern recognition.",
      content:
        "Learn AI applications in medical imaging, including X-ray analysis, MRI interpretation, and diagnostic assistance for improved healthcare outcomes.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Recipe Generation and Meal Planning",
      slug: "ai-powered-recipe-generation-meal-planning",
      description:
        "Create personalized recipes and meal plans using AI for dietary optimization.",
      content:
        "Discover AI in culinary arts, covering recipe creation, nutritional analysis, meal planning, and dietary restriction accommodation for healthy living.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Autonomous Vehicle AI Navigation Systems",
      slug: "autonomous-vehicle-ai-navigation-systems",
      description:
        "Develop intelligent navigation systems for autonomous vehicles using advanced AI.",
      content:
        "Explore autonomous vehicle technology with AI, including path planning, obstacle detection, traffic analysis, and safety optimization for self-driving cars.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Sports Performance Analysis",
      slug: "ai-enhanced-sports-performance-analysis",
      description:
        "Analyze athletic performance using AI for training optimization and injury prevention.",
      content:
        "Learn sports analytics with AI, covering performance tracking, biomechanical analysis, training optimization, and injury prediction for athletic excellence.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Conversational AI Chatbot Development",
      slug: "conversational-ai-chatbot-development",
      description:
        "Build intelligent chatbots using AI for natural language understanding and response.",
      content:
        "Master chatbot development with AI, including natural language processing, intent recognition, context management, and multi-platform deployment.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Weather Prediction and Climate Modeling",
      slug: "ai-powered-weather-prediction-climate-modeling",
      description:
        "Enhance weather forecasting using AI for accurate climate prediction and analysis.",
      content:
        "Explore meteorology with AI, covering weather pattern analysis, climate modeling, extreme weather prediction, and environmental monitoring systems.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Digital Art Creation with AI Style Transfer",
      slug: "digital-art-creation-ai-style-transfer",
      description:
        "Create unique digital artwork using AI for style transfer and artistic enhancement.",
      content:
        "Master digital art with AI, covering style transfer techniques, artistic filter application, and creative image manipulation for stunning visual art.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Assisted Legal Document Analysis",
      slug: "ai-assisted-legal-document-analysis",
      description:
        "Streamline legal research using AI for document analysis and case law review.",
      content:
        "Learn legal technology with AI, covering contract analysis, legal research automation, compliance checking, and document classification for law practice.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Smart Home Automation with AI Integration",
      slug: "smart-home-automation-ai-integration",
      description:
        "Build intelligent home systems using AI for automated control and energy optimization.",
      content:
        "Explore smart home technology with AI, covering device automation, energy management, security systems, and predictive maintenance for modern living.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Supply Chain Optimization",
      slug: "ai-powered-supply-chain-optimization",
      description:
        "Optimize logistics and supply chain operations using AI for efficiency and cost reduction.",
      content:
        "Master supply chain management with AI, covering demand forecasting, inventory optimization, route planning, and supplier relationship management.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Facial Recognition and Emotion Detection AI",
      slug: "facial-recognition-emotion-detection-ai",
      description:
        "Develop facial recognition systems with AI for emotion analysis and identity verification.",
      content:
        "Learn computer vision with AI, covering facial detection, emotion recognition, biometric authentication, and privacy-preserving identification systems.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Agricultural Monitoring Systems",
      slug: "ai-enhanced-agricultural-monitoring-systems",
      description:
        "Revolutionize farming using AI for crop monitoring and yield optimization.",
      content:
        "Explore precision agriculture with AI, covering crop health analysis, pest detection, irrigation optimization, and harvest prediction for sustainable farming.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Real-time Language Interpretation with AI",
      slug: "real-time-language-interpretation-ai",
      description:
        "Build real-time translation systems using AI for seamless multilingual communication.",
      content:
        "Master real-time translation with AI, covering speech recognition, language processing, cultural context adaptation, and live interpretation systems.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Driven Customer Behavior Prediction",
      slug: "ai-driven-customer-behavior-prediction",
      description:
        "Predict customer behavior using AI for improved marketing and sales strategies.",
      content:
        "Learn customer analytics with AI, covering behavior prediction, churn analysis, recommendation systems, and personalized marketing for business growth.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Automated Video Content Moderation with AI",
      slug: "automated-video-content-moderation-ai",
      description:
        "Implement AI-powered content moderation for safe and compliant video platforms.",
      content:
        "Explore content moderation with AI, covering inappropriate content detection, automated flagging, compliance monitoring, and platform safety management.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Drug Discovery and Development",
      slug: "ai-powered-drug-discovery-development",
      description:
        "Accelerate pharmaceutical research using AI for drug discovery and molecular analysis.",
      content:
        "Learn pharmaceutical AI applications, covering molecular modeling, drug interaction prediction, clinical trial optimization, and therapeutic development.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Intelligent Document Processing with OCR AI",
      slug: "intelligent-document-processing-ocr-ai",
      description:
        "Automate document processing using AI for text extraction and data analysis.",
      content:
        "Master document automation with AI, covering OCR technology, text extraction, document classification, and automated data entry for business efficiency.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Mental Health Support Systems",
      slug: "ai-enhanced-mental-health-support-systems",
      description:
        "Develop AI-powered mental health tools for therapy assistance and wellness monitoring.",
      content:
        "Explore mental health technology with AI, covering mood analysis, therapy chatbots, wellness tracking, and personalized mental health interventions.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Robotic Process Automation with AI Intelligence",
      slug: "robotic-process-automation-ai-intelligence",
      description:
        "Implement intelligent RPA solutions using AI for complex business process automation.",
      content:
        "Learn RPA with AI, covering process automation, decision-making algorithms, workflow optimization, and intelligent task execution for business efficiency.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Energy Grid Management",
      slug: "ai-powered-energy-grid-management",
      description:
        "Optimize electrical grid systems using AI for efficient energy distribution and management.",
      content:
        "Explore smart grid technology with AI, covering load balancing, renewable energy integration, demand prediction, and grid stability optimization.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Computer Vision for Quality Control in Manufacturing",
      slug: "computer-vision-quality-control-manufacturing",
      description:
        "Implement AI vision systems for automated quality inspection in manufacturing processes.",
      content:
        "Master industrial AI applications, covering defect detection, quality assessment, automated inspection, and production line optimization for manufacturing.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Driven Personalized News Curation",
      slug: "ai-driven-personalized-news-curation",
      description:
        "Create intelligent news platforms using AI for personalized content delivery and analysis.",
      content:
        "Learn news technology with AI, covering content curation, sentiment analysis, fact-checking automation, and personalized news recommendation systems.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Augmented Reality with AI Object Recognition",
      slug: "augmented-reality-ai-object-recognition",
      description:
        "Develop AR applications using AI for real-time object recognition and interaction.",
      content:
        "Explore AR development with AI, covering object detection, spatial mapping, gesture recognition, and immersive user experience design for AR applications.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Fraud Detection in Banking",
      slug: "ai-enhanced-fraud-detection-banking",
      description:
        "Implement advanced fraud detection systems using AI for financial security and risk management.",
      content:
        "Master financial security with AI, covering transaction analysis, anomaly detection, risk assessment, and real-time fraud prevention for banking systems.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Predictive Maintenance with IoT and AI",
      slug: "predictive-maintenance-iot-ai",
      description:
        "Optimize equipment maintenance using AI and IoT for predictive failure analysis.",
      content:
        "Learn predictive maintenance with AI, covering sensor data analysis, failure prediction, maintenance scheduling, and equipment optimization for industry.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Voice Synthesis and Cloning",
      slug: "ai-powered-voice-synthesis-cloning",
      description:
        "Create realistic voice synthesis systems using AI for audio content generation.",
      content:
        "Explore voice technology with AI, covering speech synthesis, voice cloning, audio generation, and natural-sounding voice creation for multimedia applications.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Intelligent Traffic Management with AI",
      slug: "intelligent-traffic-management-ai",
      description:
        "Optimize urban traffic flow using AI for smart city transportation systems.",
      content:
        "Master smart city technology with AI, covering traffic optimization, congestion prediction, signal control, and urban mobility management for efficient transportation.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Driven Personalized Fitness Coaching",
      slug: "ai-driven-personalized-fitness-coaching",
      description:
        "Create intelligent fitness applications using AI for personalized workout and nutrition plans.",
      content:
        "Learn fitness technology with AI, covering workout optimization, nutrition planning, progress tracking, and personalized health coaching for wellness applications.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Automated Code Review with AI Analysis",
      slug: "automated-code-review-ai-analysis",
      description:
        "Implement AI-powered code review systems for automated quality assessment and improvement.",
      content:
        "Master code quality with AI, covering automated review, bug detection, code optimization, and development workflow enhancement for software engineering.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Satellite Image Analysis",
      slug: "ai-enhanced-satellite-image-analysis",
      description:
        "Analyze satellite imagery using AI for environmental monitoring and geographic intelligence.",
      content:
        "Explore geospatial AI applications, covering satellite image processing, environmental monitoring, land use analysis, and geographic intelligence systems.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Intelligent Inventory Management with AI",
      slug: "intelligent-inventory-management-ai",
      description:
        "Optimize inventory systems using AI for demand forecasting and stock management.",
      content:
        "Learn inventory optimization with AI, covering demand prediction, stock level optimization, automated ordering, and supply chain efficiency for retail and logistics.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Music Recommendation Systems",
      slug: "ai-powered-music-recommendation-systems",
      description:
        "Build intelligent music platforms using AI for personalized music discovery and curation.",
      content:
        "Master music technology with AI, covering recommendation algorithms, music analysis, user preference learning, and personalized playlist generation for streaming platforms.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Autonomous Drone Navigation with AI",
      slug: "autonomous-drone-navigation-ai",
      description:
        "Develop intelligent drone systems using AI for autonomous flight and mission execution.",
      content:
        "Explore drone technology with AI, covering autonomous navigation, obstacle avoidance, mission planning, and intelligent flight control for various applications.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Educational Assessment Tools",
      slug: "ai-enhanced-educational-assessment-tools",
      description:
        "Create intelligent assessment systems using AI for personalized learning evaluation.",
      content:
        "Learn educational technology with AI, covering automated grading, learning analytics, adaptive testing, and personalized feedback systems for education.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Smart Manufacturing with AI Optimization",
      slug: "smart-manufacturing-ai-optimization",
      description:
        "Revolutionize manufacturing processes using AI for production optimization and automation.",
      content:
        "Master Industry 4.0 with AI, covering production optimization, predictive maintenance, quality control, and intelligent manufacturing systems for modern factories.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Driven Social Media Analytics",
      slug: "ai-driven-social-media-analytics",
      description:
        "Analyze social media data using AI for brand monitoring and audience insights.",
      content:
        "Explore social media intelligence with AI, covering sentiment analysis, trend detection, influencer identification, and brand monitoring for digital marketing.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Personalized Shopping Experience with AI",
      slug: "personalized-shopping-experience-ai",
      description:
        "Create intelligent e-commerce platforms using AI for personalized shopping and recommendations.",
      content:
        "Learn e-commerce AI applications, covering product recommendations, price optimization, customer segmentation, and personalized shopping experiences for online retail.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Powered Environmental Monitoring Systems",
      slug: "ai-powered-environmental-monitoring-systems",
      description:
        "Monitor environmental conditions using AI for climate analysis and conservation efforts.",
      content:
        "Master environmental technology with AI, covering air quality monitoring, climate prediction, ecosystem analysis, and conservation planning for environmental protection.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: true,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "Intelligent Human Resources with AI Recruitment",
      slug: "intelligent-human-resources-ai-recruitment",
      description:
        "Transform HR processes using AI for intelligent recruitment and employee management.",
      content:
        "Explore HR technology with AI, covering resume screening, candidate matching, performance analysis, and employee engagement optimization for human resources.",
      categoryId: getRandomCategoryId(),
      isPremium: false,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
    {
      title: "AI-Enhanced Cybersecurity Incident Response",
      slug: "ai-enhanced-cybersecurity-incident-response",
      description:
        "Implement intelligent security systems using AI for automated incident response and threat mitigation.",
      content:
        "Learn cybersecurity with AI, covering threat detection, incident response automation, security orchestration, and intelligent threat hunting for comprehensive protection.",
      categoryId: getRandomCategoryId(),
      isPremium: true,
      isPublished: true,
      status: "APPROVED",
      isFeatured: false,
      featuredImage: `/images/img-${Math.floor(Math.random() * 9) + 1}.jpeg`,
    },
  ];

  for (const [index, postData] of posts.entries()) {
    await prisma.post.create({
      data: {
        ...postData,
        authorId,
        viewCount: Math.floor(Math.random() * 1000) + 1, // Random view count between 1-1000
      },
    });
  }

  console.log("✅ Created 100 posts");
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
