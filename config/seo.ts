import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/utils";

export const seoConfig: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default:
      "Promptexify - AI Prompt Directory for ChatGPT, Claude, Gemini, AI Code Editor, and more",
    template: "%s | Promptexify",
  },
  description:
    "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, AI Code Editor, and more. Browse our comprehensive directory of tested prompts for creative writing, business, design, and more.",
  keywords: [
    "AI prompts",
    "ChatGPT prompts",
    "Claude prompts",
    "Gemini prompts",
    "AI Code Editor prompts",
    "prompt engineering",
    "AI tools",
    "AI prompt directory",
    "AI prompt library",
    "AI prompt engine",
    "AI prompt generator",
    "prompt directory",
    "prompt library",
  ],
  authors: [{ name: "Promptexify Team" }],
  creator: "Promptexify",
  publisher: "Promptexify",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: getBaseUrl(),
    title: "Promptexify - AI Prompt Directory",
    description:
      "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, and more. The comprehensive AI prompt directory for all your needs.",
    siteName: "Promptexify",
    images: [
      {
        url: "/static/og-image.png",
        width: 1200,
        height: 630,
        alt: "Promptexify - AI Prompt Directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Promptexify - AI Prompt Directory",
    description:
      "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, and more.",
    images: ["/static/og-image.png"],
    creator: "@promptexify",
  },
  icons: {
    icon: "/static/favicon/favicon.ico",
    shortcut: "/static/favicon/favicon-16x16.png",
    apple: "/static/favicon/apple-touch-icon.png",
  },
  manifest: "/static/favicon/site.webmanifest",
};

// Helper function to set custom metadata with default SEO config
export function setMetadata(customMetadata: Partial<Metadata> = {}): Metadata {
  return {
    ...seoConfig,
    ...customMetadata,
  };
}

// SEO configuration for different page types
export const pageSEOConfigs = {
  home: {
    title: "Promptexify - AI Prompt Directory",
    description: "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, and more.",
  },
  directory: {
    title: "AI Prompt Directory",
    description: "Browse our comprehensive collection of AI prompts for all major AI platforms.",
  },
  features: {
    title: "Features - Promptexify",
    description: "Discover all the powerful features that make Promptexify the best platform for AI prompts.",
  },
  pricing: {
    title: "Pricing - Promptexify",
    description: "Choose the perfect plan for your AI prompt needs. Free and premium options available.",
  },
  help: {
    title: "Help Center - Promptexify",
    description: "Get help with subscriptions, content contribution, technical support, and more.",
  },
  about: {
    title: "About - Promptexify",
    description: "Learn about Promptexify, the comprehensive AI prompt directory for all your needs.",
  },
  contact: {
    title: "Contact - Promptexify",
    description: "Get in touch with the Promptexify team for support and inquiries.",
  },
  entry: {
    title: "AI Prompt - Promptexify",
    description: "Discover high-quality AI prompts for ChatGPT, Claude, Gemini, and more.",
  },
} as const;

// Helper function to get metadata for specific page types
export function getMetadata(pageType: keyof typeof pageSEOConfigs) {
  return setMetadata(pageSEOConfigs[pageType]);
}

// Helper function to generate post-specific metadata
export function generatePostMetadata(post: {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  category?: { name: string } | null;
  tags?: Array<{ name: string }> | null;
  previewPath?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  author?: { name: string | null } | null;
  isPremium?: boolean;
}) {
  const baseUrl = getBaseUrl();
  
  // Create SEO-friendly title and description
  const title = post.title;
  const description = post.description || 
    (post.content ? 
      post.content
        .replace(/^# .+\n\n/, "")
        .replace(/\n+/g, " ")
        .substring(0, 150) + "..." 
      : "AI prompt for " + (post.category?.name || "AI tools")
    );

  // Generate keywords from post data
  const keywords = [
    "AI prompt",
    post.category?.name,
    ...(post.tags?.map(tag => tag.name) || []),
    "ChatGPT",
    "Claude", 
    "Gemini",
    "AI tools",
    "prompt engineering"
  ].filter(Boolean) as string[];

  // Generate OpenGraph image URL
  const ogImageUrl = post.previewPath 
    ? `${baseUrl}${post.previewPath}`
    : `${baseUrl}/static/og-image.png`;

  return setMetadata({
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${baseUrl}/entry/${post.id}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      publishedTime: post.createdAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: post.author?.name ? [post.author.name] : undefined,
      tags: post.tags?.map(tag => tag.name) || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${baseUrl}/entry/${post.id}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  });
} 