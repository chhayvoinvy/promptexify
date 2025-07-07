import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix Supabase realtime-js webpack warnings
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
        "supports-color": "supports-color",
      });
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
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Generate robots.txt and sitemap.xml, and handle local uploads
  async rewrites() {
    return [
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

export default withSentryConfig(nextConfig, {
  // Sentry configuration
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  widenClientFileUpload: false,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
