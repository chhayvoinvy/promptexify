import type { NextConfig } from "next";
import { withContentlayer } from "next-contentlayer2";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: "standalone",
  images: {
    remotePatterns: [
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
  // Generate robots.txt and sitemap.xml
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
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Optimize webpack cache performance
    webpackBuildWorker: true,
  },
  // Security headers are now handled by middleware for better environment control
  // This ensures consistent application across all routes and proper CSP nonce handling
  webpack: (config, { isServer }) => {
    // Fix for Supabase realtime warnings
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
      };
    }

    // Ignore specific warnings from Supabase realtime
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
      { file: /node_modules\/@supabase\/realtime-js/ },
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve/,
      /the request of a dependency is an expression/,
      /Serializing big strings/,
    ];

    // Optimize webpack cache performance
    config.cache = {
      ...config.cache,
      compression: "gzip",
      maxMemoryGenerations: 1,
    };

    return config;
  },
};

export default withContentlayer(nextConfig);
