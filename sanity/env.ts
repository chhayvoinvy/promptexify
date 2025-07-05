// Environment configuration with enhanced security
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-03-15";

// Environment detection
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isServer = typeof window === "undefined";

// Required environment variables
export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "Missing environment variable: NEXT_PUBLIC_SANITY_DATASET"
);

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  "Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID"
);

// Optional but recommended for production
export const token = isServer ? process.env.SANITY_API_TOKEN : undefined;

// Security: Validate token is present in production
if (isProduction && isServer && !token) {
  console.warn(
    "SANITY_API_TOKEN is not set. Some features may not work correctly in production."
  );
}

// Validate project configuration
if (projectId && !/^[a-z0-9]+$/.test(projectId)) {
  throw new Error("Invalid Sanity project ID format");
}

if (dataset && !/^[a-z0-9_-]+$/.test(dataset)) {
  throw new Error("Invalid Sanity dataset name format");
}

// Security: Validate API version format
if (apiVersion && !/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) {
  throw new Error("Invalid Sanity API version format. Use YYYY-MM-DD format.");
}

// Helper function for asserting required values
function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined || v === null || v === "") {
    throw new Error(errorMessage);
  }
  return v;
}

// Export configuration object for easy access
export const config = {
  projectId,
  dataset,
  apiVersion,
  token,
  isProduction,
  isDevelopment,
  isServer,
  // Studio configuration
  studio: {
    basePath: "/dashboard/pages/studio",
    url: isProduction
      ? `https://${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/pages/studio`
      : "http://localhost:3000/dashboard/pages/studio",
  },
  // CDN configuration
  cdn: {
    enabled: isProduction,
    url: `https://cdn.sanity.io/images/${projectId}/${dataset}`,
  },
  // Security configuration
  security: {
    enableStega: isDevelopment,
    enableVision: isDevelopment,
    enablePreview: Boolean(token),
  },
} as const;
