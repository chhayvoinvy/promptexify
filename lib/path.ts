import { getStorageConfig, StorageConfig } from "@/lib/storage";

/**
 * Path Resolver Service
 * Converts relative paths to full URLs based on current storage configuration
 * This enables storage provider independence
 */

// Cache for resolved URLs to avoid repeated processing
const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Resolve a relative media path to a full URL
 * @param relativePath - Relative path like "images/user123-prompt-abc123.avif"
 * @returns Full URL based on current storage configuration
 */
export async function resolveMediaUrl(relativePath: string): Promise<string> {
  if (!relativePath) return "";

  // If it's already a full URL, return it as-is
  if (
    relativePath.startsWith("http://") ||
    relativePath.startsWith("https://")
  ) {
    return relativePath;
  }

  // Check cache first
  const cached = urlCache.get(relativePath);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  try {
    const storageConfig = await getStorageConfig();
    const fullUrl = constructFullUrl(relativePath, storageConfig);

    // Cache the result
    urlCache.set(relativePath, { url: fullUrl, timestamp: Date.now() });

    return fullUrl;
  } catch (error) {
    console.error("Error resolving media URL:", error);
    // Fallback to relative path (will work for local development)
    return relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  }
}

/**
 * Resolve multiple media paths to full URLs
 * @param relativePaths - Array of relative paths
 * @returns Array of full URLs
 */
export async function resolveMediaUrls(
  relativePaths: string[]
): Promise<string[]> {
  if (!relativePaths.length) return [];

  const storageConfig = await getStorageConfig();

  return relativePaths.map((relativePath) => {
    if (!relativePath) return "";

    // Check cache first
    const cached = urlCache.get(relativePath);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.url;
    }

    const fullUrl = constructFullUrl(relativePath, storageConfig);

    // Cache the result
    urlCache.set(relativePath, { url: fullUrl, timestamp: Date.now() });

    return fullUrl;
  });
}

/**
 * Construct full URL based on storage configuration
 * @param relativePath - Relative path like "images/user123-prompt-abc123.avif"
 * @param storageConfig - Current storage configuration
 * @returns Full URL
 */
function constructFullUrl(
  relativePath: string,
  storageConfig: StorageConfig
): string {
  // Ensure relative path doesn't start with /
  const cleanPath = relativePath.startsWith("/")
    ? relativePath.slice(1)
    : relativePath;

  switch (storageConfig.storageType) {
    case "S3":
      return constructS3Url(cleanPath, storageConfig);

    case "DOSPACE":
      return constructDOSpacesUrl(cleanPath, storageConfig);

    case "LOCAL":
      return constructLocalUrl(cleanPath, storageConfig);

    default:
      console.warn(`Unknown storage type: ${storageConfig.storageType}`);
      return `/${cleanPath}`;
  }
}

/**
 * Construct S3 URL
 */
function constructS3Url(relativePath: string, config: StorageConfig): string {
  const cdnUrl = config.s3CloudfrontUrl;
  const bucketName = config.s3BucketName;
  const region = config.s3Region || "us-east-1";

  if (cdnUrl) {
    return `${cdnUrl.replace(/\/$/, "")}/${relativePath}`;
  }

  return `https://${bucketName}.s3.${region}.amazonaws.com/${relativePath}`;
}

/**
 * Construct DigitalOcean Spaces URL
 */
function constructDOSpacesUrl(
  relativePath: string,
  config: StorageConfig
): string {
  const cdnUrl = config.doCdnUrl;
  const spaceName = config.doSpaceName;
  const region = config.doRegion;

  if (cdnUrl) {
    return `${cdnUrl.replace(/\/$/, "")}/${relativePath}`;
  }

  return `https://${spaceName}.${region}.digitaloceanspaces.com/${relativePath}`;
}

/**
 * Construct local URL
 */
function constructLocalUrl(
  relativePath: string,
  config: StorageConfig
): string {
  const baseUrl = config.localBaseUrl || "/uploads";
  return `${baseUrl.replace(/\/$/, "")}/${relativePath}`;
}

/**
 * Clear URL cache (useful when storage configuration changes)
 */
export function clearUrlCache(): void {
  urlCache.clear();
}

/**
 * Get relative path from full URL or convert local path to relative path (for migrations)
 * @param urlOrPath - Full URL from any storage provider or local path
 * @returns Relative path or null if not a valid media URL
 */
export function extractRelativePath(urlOrPath: string): string | null {
  try {
    // If it's already a relative path (starts with images/ or videos/), return as-is
    if (urlOrPath.match(/^(images|videos)\//)) {
      return urlOrPath;
    }

    // If it's a local path (starts with /uploads/ or similar), extract the relative part
    if (urlOrPath.startsWith("/")) {
      const imageMatch = urlOrPath.match(/\/images\/(.+)$/);
      const videoMatch = urlOrPath.match(/\/videos\/(.+)$/);

      if (imageMatch) {
        return `images/${imageMatch[1]}`;
      }
      if (videoMatch) {
        return `videos/${videoMatch[1]}`;
      }

      return null;
    }

    // Handle full URLs (http/https)
    const url = new URL(urlOrPath);
    const pathname = url.pathname;

    // Check if it's a media file path
    if (pathname.includes("/images/") || pathname.includes("/videos/")) {
      // Extract the part after the last occurrence of /images/ or /videos/
      const imageMatch = pathname.match(/\/images\/(.+)$/);
      const videoMatch = pathname.match(/\/videos\/(.+)$/);

      if (imageMatch) {
        return `images/${imageMatch[1]}`;
      }
      if (videoMatch) {
        return `videos/${videoMatch[1]}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting relative path from:", urlOrPath, error);
    return null;
  }
}

/**
 * Batch migration helper - convert full URLs to relative paths
 * @param fullUrls - Array of full URLs to convert
 * @returns Array of relative paths
 */
export function batchExtractRelativePaths(
  fullUrls: string[]
): (string | null)[] {
  return fullUrls.map((url) => extractRelativePath(url));
}
