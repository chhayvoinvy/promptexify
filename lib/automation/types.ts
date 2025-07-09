/**
 * Automation System Types
 *
 * TypeScript interfaces and types for the automation system
 * following Next.js best practices and OWASP secure coding guidelines
 */

export interface ProcessingStats {
  filesProcessed: number;
  postsCreated: number;
  tagsCreated: number;
  categoriesCreated: number;
  errors: string[];
  warnings: string[];
}

export interface ContentFile {
  category: string;
  tags: TagData[];
  posts: PostData[];
}

export interface TagData {
  name: string;
  slug: string;
}

export interface PostData {
  title: string;
  slug: string;
  description: string;
  content: string;
  isPremium: boolean;
  isPublished: boolean;
  status: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
  isFeatured: boolean;
  uploadPath?: string;
  uploadFileType?: "IMAGE" | "VIDEO"; // Optional file type
}

export interface GenerationResult {
  output: string;
  error?: string;
  duration: number;
  filesProcessed: number;
  postsCreated: number;
  statusMessages: string[];
}

export interface GenerationLog {
  id: string;
  timestamp: string;
  status: "success" | "error";
  message: string;
  filesProcessed?: number;
  postsCreated?: number;
  statusMessages?: string[];
  error?: string;
  userId?: string;
  severity: string;
}

export interface AutomationConfig {
  authorId: string;
  requiredAuthorRole?: "ADMIN";
  contentDirectory: string;
  logging: {
    enabled: boolean;
    verbose: boolean;
  };
  security: {
    maxFiles: number;
    maxFileSize: number;
    maxPostsPerFile: number;
    maxContentLength: number;
    allowedFileExtensions: string[];
    rateLimitPerHour: number;
    maxSerializationSize: number;
    maxBatchSize: number;
  };
  performance: {
    batchSize: number;
    maxConcurrentFiles: number;
    transactionTimeout: number;
    chunkSize: number;
    memoryLimit: number;
  };
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}
