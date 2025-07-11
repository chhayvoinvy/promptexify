import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix Supabase realtime-js webpack warnings
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
        "supports-color": "supports-color",
      });
    }

    // Configure source map generation for Sentry
    if (!dev && !isServer) {
      config.devtool = "hidden-source-map";
    }

    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
      { module: /node_modules\/node-gyp-build/ },
      { module: /node_modules\/bufferutil/ },
      { module: /node_modules\/utf-8-validate/ },
    ];

    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        cacheGroups: {
          ...config.optimization?.splitChunks?.cacheGroups,
          largeData: {
            test: /[\\/](lib|components)[\\/](automation|analytics)[\\/]/,
            name: "large-data",
            chunks: "all",
            priority: 10,
            enforce: true,
          },
        },
      },
    };

    // Add rule to handle large JSON/CSV data
    config.module.rules.push({
      test: /\.(json|csv)$/,
      type: "asset/resource",
      generator: {
        filename: "static/data/[hash][ext]",
      },
    });

    return config;
  },

  // External packages for server components
  serverExternalPackages: [
    "@supabase/realtime-js",
    "bufferutil",
    "utf-8-validate",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "localprompt.s3.us-west-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
        port: "",
        pathname: "/**",
      },
      // DigitalOcean Spaces patterns
      {
        protocol: "https",
        hostname: "*.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.nyc3.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.sfo3.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.ams3.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.sgp1.digitaloceanspaces.com",
        port: "",
        pathname: "/**",
      },
      // Generic CDN patterns
      {
        protocol: "https",
        hostname: "*.cdn.digitalocean.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Generate robots.txt and sitemap.xml, and handle local uploads
  async rewrites() {
    return [
      {
        source: "/preview/:path*",
        destination: "/api/media/preview/:path*",
      },
      {
        source: "/robots.txt",
        destination: "/robots.txt",
      },
      {
        source: "/sitemap.xml",
        destination: "/sitemap.xml",
      },
    ];
  },

  // Serve static files from uploads directory when using local storage
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; img-src 'self'; media-src 'self';",
          },
        ],
      },
      // Global CORS headers for API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_CORS_ALLOWED_ORIGIN || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-CSRF-Token",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    resolveAlias: {
      "sanity/structure": "./node_modules/sanity/structure",
    },
  },
};

// Conditionally apply Sentry configuration based on available environment variables
const shouldEnableSentryBuildFeatures = !!(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default shouldEnableSentryBuildFeatures
  ? withSentryConfig(nextConfig, {
      // Sentry configuration
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Source map upload configuration
      sourcemaps: {
        // Upload all source maps in the .next folder
        assets: [".next/static/chunks/**/*.js", ".next/static/chunks/**/*.js.map"],
        // Ignore node_modules and server files
        ignore: ["node_modules/**", ".next/server/**"],
        // Delete source maps after upload to avoid exposing them in production
        deleteSourcemapsAfterUpload: true,
      },

      // Allow wider file upload to include all necessary source maps
      widenClientFileUpload: true,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,
      
      // Disable logger to reduce build noise
      disableLogger: true,
      
      // Enable automatic Vercel monitoring integration
      automaticVercelMonitors: true,
      
      // Tunnel route for Sentry requests
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
