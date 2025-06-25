import type { NextConfig } from "next";
import { withContentlayer } from "next-contentlayer2";

const nextConfig: NextConfig = {
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
  // Add proper security headers
  async headers() {
    const securityHeaders = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value:
          "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
      },
    ];

    const isDevelopment = process.env.NODE_ENV === "development";

    // CSP will be handled by middleware for nonce support
    // Only add non-CSP security headers here
    if (!isDevelopment) {
      return [
        {
          source: "/(.*)",
          headers: securityHeaders,
        },
      ];
    }

    // More lenient headers for development
    return [
      {
        source: "/(.*)",
        headers: securityHeaders.filter(
          (header) => header.key !== "Strict-Transport-Security"
        ),
      },
    ];
  },
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
