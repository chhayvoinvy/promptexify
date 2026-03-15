import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/utils";

export const seoConfig: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default:
      "Promptexify - Directory for the New Coding Era | Cursor, Claude Code",
    template: "%s | Promptexify",
  },
  description:
    "Discover and share Rules, MCP (Model Context Protocol), Skills, and prompts for AI coding tools. Optimize Cursor, Claude Code, and other AI code editors with ready-to-use rulesets and prompt templates.",
  keywords: [
    "AI coding prompts",
    "Cursor rules",
    "MCP prompts",
    "AI Skills",
    "Claude Code prompts",
    "AI code editor prompts",
    "prompt engineering",
    "Rules for AI",
    "MCP Model Context Protocol",
    "AI prompt directory",
    "prompt library",
    "AI coding tools",
    "prompt templates",
    "cursor rules directory",
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
    title: "Promptexify - Directory for the New Coding Era",
    description:
      "Rules, MCP, Skills, and prompts for AI coding tools. Optimize Cursor, Claude Code, and AI code editors with ready-to-use rulesets and prompt templates.",
    siteName: "Promptexify",
    images: [
      {
        url: "/static/og-image.png",
        width: 1200,
        height: 630,
        alt: "Promptexify - Directory for the New Coding Era",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Promptexify - Directory for the New Coding Era",
    description:
      "Directory for the new coding era. Discover Rules, MCP, Skills, and prompts for Cursor, Claude Code, and AI coding tools. Better prompts, better code.",
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
    title: "Promptexify - Directory for the New Coding Era",
    description:
      "Directory for the new coding era. Discover Rules, MCP, Skills, and prompts for Cursor, Claude Code, and AI coding tools. Better prompts, better code.",
  },
  directory: {
    title: "Directory",
    description:
      "Browse Rules, MCP configs, Skills, and prompts for AI coding tools. Cursor, Claude Code, and more.",
  },
  features: {
    title: "Features - Promptexify",
    description:
      "Directory for the new coding era. Rules, MCP, Skills, and prompt features for Cursor and AI code editors.",
  },
  help: {
    title: "Help Center - Promptexify",
    description: "Get help with subscriptions, content contribution, technical support, and more.",
  },
  about: {
    title: "About - Promptexify",
    description:
      "Learn about Promptexify: directory for the new coding era. Rules, MCP, Skills, and prompts for Cursor, Claude Code, and AI coding tools.",
  },
  contact: {
    title: "Contact - Promptexify",
    description: "Get in touch with the Promptexify team for support and inquiries.",
  },
  privacy: {
    title: "Privacy Policy - Promptexify",
    description: "Learn how Promptexify collects, uses, and protects your personal information.",
  },
  terms: {
    title: "Terms of Use - Promptexify",
    description: "Terms and conditions for using Promptexify—directory for the new coding era.",
  },
  entry: {
    title: "Rule / Prompt - Promptexify",
    description:
      "Rules, MCP, Skills, or prompts for AI coding tools. Use with Cursor, Claude Code, and more.",
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
      : "Rule or prompt for " + (post.category?.name || "AI coding tools")
    );

  // Generate keywords from post data
  const keywords = [
    "AI coding prompt",
    "Rules",
    "MCP",
    "Skills",
    post.category?.name,
    ...(post.tags?.map(tag => tag.name) || []),
    "Cursor",
    "Claude Code",
    "AI coding tools",
    "prompt engineering",
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