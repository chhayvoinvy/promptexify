// Sanity document types for type safety

// Base document interface
export interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
}

// Slug interface
export interface SanitySlug {
  _type: "slug";
  current: string;
}

// Image interface
export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  alt?: string;
  caption?: string;
}

// Portable Text interfaces
export interface PortableTextBlock {
  _type: "block";
  _key: string;
  style: string;
  children: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
}

export interface PortableTextSpan {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
}

export interface PortableTextMarkDef {
  _type: string;
  _key: string;
  [key: string]: unknown;
}

// Content block types
export interface CalloutBlock {
  _type: "callout";
  _key: string;
  type: "info" | "warning" | "success" | "error" | "tip";
  content: string;
}

export interface CodeBlock {
  _type: "codeBlock";
  _key: string;
  language?: string;
  code: string;
  filename?: string;
}

export interface ImageBlock extends SanityImage {
  _key: string;
}

export type ContentBlock =
  | PortableTextBlock
  | CalloutBlock
  | CodeBlock
  | ImageBlock;

// Author document
export interface Author extends SanityDocument {
  _type: "author";
  name: string;
  slug: SanitySlug;
  email: string;
  bio?: string;
  avatar?: SanityImage;
  role: "admin" | "editor" | "author" | "contributor";
  isActive: boolean;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  joinedAt: string;
  lastActiveAt?: string;
}

// Page document
export interface Page extends SanityDocument {
  _type: "page";
  title: string;
  slug: SanitySlug;
  description: string;
  content: ContentBlock[];
  author?: {
    _ref: string;
    _type: "reference";
  };
  isPublished: boolean;
  publishedAt?: string;
  lastModified?: string;
  featuredImage?: SanityImage;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    openGraph?: {
      image?: SanityImage;
      title?: string;
      description?: string;
    };
  };
  accessLevel: "public" | "premium" | "admin";
}

// Help Article document
export interface HelpArticle extends SanityDocument {
  _type: "helpArticle";
  title: string;
  slug: SanitySlug;
  description: string;
  category:
    | "subscription"
    | "contribution"
    | "support"
    | "account"
    | "features"
    | "troubleshooting";
  tags?: string[];
  icon: "crown" | "upload" | "help-circle" | "user" | "zap" | "tool";
  difficulty: "beginner" | "intermediate" | "advanced";
  order?: number;
  readingTime?: number;
  content: ContentBlock[];
  author?: {
    _ref: string;
    _type: "reference";
  };
  isPublished: boolean;
  publishedAt?: string;
  updatedAt?: string;
  featured: boolean;
  relatedArticles?: Array<{
    _ref: string;
    _type: "reference";
  }>;
  searchKeywords?: string[];
  accessLevel: "public" | "premium" | "admin";
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    noIndex?: boolean;
  };
}

// Populated versions (with references resolved)
export interface PopulatedPage extends Omit<Page, "author"> {
  author?: Author;
}

export interface PopulatedHelpArticle
  extends Omit<HelpArticle, "author" | "relatedArticles"> {
  author?: Author;
  relatedArticles?: HelpArticle[];
}

// Query result types
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Common query parameters
export interface QueryParams {
  limit?: number;
  offset?: number;
  published?: boolean;
  category?: string;
  accessLevel?: "public" | "premium" | "admin";
  featured?: boolean;
}

// Search result types
export interface SearchResult<T> {
  document: T;
  score: number;
  highlights?: string[];
}

// Webhook payload types
export interface WebhookMutation {
  create?: Partial<SanityDocument>;
  createOrReplace?: Partial<SanityDocument>;
  patch?: {
    id: string;
    [key: string]: unknown;
  };
  delete?: {
    id: string;
  };
}

export interface WebhookPayload {
  _type: "webhook";
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  projectId: string;
  dataset: string;
  mutations: WebhookMutation[];
}

// Utility types
export type DocumentType = "page" | "helpArticle" | "author";

export type DocumentByType<T extends DocumentType> = T extends "page"
  ? Page
  : T extends "helpArticle"
    ? HelpArticle
    : T extends "author"
      ? Author
      : never;

export type PopulatedDocumentByType<T extends DocumentType> = T extends "page"
  ? PopulatedPage
  : T extends "helpArticle"
    ? PopulatedHelpArticle
    : T extends "author"
      ? Author
      : never;

// Form data types for Sanity Studio
export interface PageFormData {
  title: string;
  slug: string;
  description: string;
  content: ContentBlock[];
  isPublished: boolean;
  publishedAt?: string;
  featuredImage?: SanityImage;
  accessLevel: "public" | "premium" | "admin";
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    noIndex?: boolean;
    noFollow?: boolean;
  };
}

export interface HelpArticleFormData {
  title: string;
  slug: string;
  description: string;
  category:
    | "subscription"
    | "contribution"
    | "support"
    | "account"
    | "features"
    | "troubleshooting";
  icon: "crown" | "upload" | "help-circle" | "user" | "zap" | "tool";
  difficulty: "beginner" | "intermediate" | "advanced";
  order?: number;
  readingTime?: number;
  content: ContentBlock[];
  isPublished: boolean;
  featured: boolean;
  accessLevel: "public" | "premium" | "admin";
  tags?: string[];
  searchKeywords?: string[];
}

// Export common types for convenience
export type {
  SanityDocument,
  SanitySlug,
  SanityImage,
  ContentBlock,
  PortableTextBlock,
  CalloutBlock,
  CodeBlock,
  ImageBlock,
};
