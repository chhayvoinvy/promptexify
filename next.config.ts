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
        // Externalize OpenTelemetry packages to prevent version conflicts
        "@opentelemetry/instrumentation": "@opentelemetry/instrumentation",
        "@opentelemetry/instrumentation-connect": "@opentelemetry/instrumentation-connect",
        "@opentelemetry/instrumentation-express": "@opentelemetry/instrumentation-express",
        "@opentelemetry/instrumentation-generic-pool": "@opentelemetry/instrumentation-generic-pool",
        "@opentelemetry/instrumentation-hapi": "@opentelemetry/instrumentation-hapi",
        "@opentelemetry/instrumentation-ioredis": "@opentelemetry/instrumentation-ioredis",
        "@opentelemetry/instrumentation-knex": "@opentelemetry/instrumentation-knex",
        "@opentelemetry/instrumentation-lru-memoizer": "@opentelemetry/instrumentation-lru-memoizer",
        "@opentelemetry/instrumentation-mongoose": "@opentelemetry/instrumentation-mongoose",
        "@opentelemetry/instrumentation-mysql2": "@opentelemetry/instrumentation-mysql2",
        "@opentelemetry/instrumentation-redis-4": "@opentelemetry/instrumentation-redis-4",
        "@opentelemetry/instrumentation-undici": "@opentelemetry/instrumentation-undici",
        "@opentelemetry/instrumentation-amqplib": "@opentelemetry/instrumentation-amqplib",
        "@opentelemetry/instrumentation-dataloader": "@opentelemetry/instrumentation-dataloader",
        "@opentelemetry/instrumentation-fs": "@opentelemetry/instrumentation-fs",
        "@opentelemetry/instrumentation-graphql": "@opentelemetry/instrumentation-graphql",
        "@opentelemetry/instrumentation-http": "@opentelemetry/instrumentation-http",
        "@opentelemetry/instrumentation-kafkajs": "@opentelemetry/instrumentation-kafkajs",
        "@opentelemetry/instrumentation-koa": "@opentelemetry/instrumentation-koa",
        "@opentelemetry/instrumentation-mongodb": "@opentelemetry/instrumentation-mongodb",
        "@opentelemetry/instrumentation-mysql": "@opentelemetry/instrumentation-mysql",
        "@opentelemetry/instrumentation-pg": "@opentelemetry/instrumentation-pg",
        "@opentelemetry/instrumentation-tedious": "@opentelemetry/instrumentation-tedious",
        "@prisma/instrumentation": "@prisma/instrumentation",
      });
    }

    // Configure source map generation
    if (!dev && !isServer) {
      config.devtool = "hidden-source-map";
    }

    // Add resolver to handle OpenTelemetry version conflicts
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        // Force all OpenTelemetry instrumentation packages to use the same version
        "@opentelemetry/instrumentation": require.resolve("@opentelemetry/instrumentation"),
      },
      fallback: {
        ...config.resolve?.fallback,
        // Ensure consistent OpenTelemetry instrumentation version
        "@opentelemetry/instrumentation": require.resolve("@opentelemetry/instrumentation"),
      },
    };

    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
      { module: /node_modules\/node-gyp-build/ },
      { module: /node_modules\/bufferutil/ },
      { module: /node_modules\/utf-8-validate/ },
      // Comprehensive OpenTelemetry instrumentation warnings suppression
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@opentelemetry\/instrumentation-.*/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      // Suppress critical dependency warnings for dynamic imports
      { message: /Critical dependency: the request of a dependency is an expression/ },
      // Suppress OpenTelemetry version conflict warnings
      { message: /Package @opentelemetry\/instrumentation can't be external/ },
      { message: /The package resolves to a different version/ },
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

    // Add webpack plugin to handle OpenTelemetry version conflicts
    config.plugins = config.plugins || [];
    config.plugins.push(
      new (require('webpack').NormalModuleReplacementPlugin)(
        /@opentelemetry\/instrumentation/,
        (resource: any) => {
          // Normalize all OpenTelemetry instrumentation imports to use the same version
          resource.request = require.resolve("@opentelemetry/instrumentation");
        }
      )
    );

    return config;
  },

  // External packages for server components
  serverExternalPackages: [
    "@supabase/realtime-js",
    "bufferutil",
    "utf-8-validate",
    // Comprehensive list of OpenTelemetry packages to prevent bundling issues
    "@opentelemetry/instrumentation",
    "@opentelemetry/instrumentation-connect",
    "@opentelemetry/instrumentation-express",
    "@opentelemetry/instrumentation-generic-pool",
    "@opentelemetry/instrumentation-hapi",
    "@opentelemetry/instrumentation-ioredis",
    "@opentelemetry/instrumentation-knex",
    "@opentelemetry/instrumentation-lru-memoizer",
    "@opentelemetry/instrumentation-mongoose",
    "@opentelemetry/instrumentation-mysql2",
    "@opentelemetry/instrumentation-redis-4",
    "@opentelemetry/instrumentation-undici",
    "@opentelemetry/instrumentation-amqplib",
    "@opentelemetry/instrumentation-dataloader",
    "@opentelemetry/instrumentation-fs",
    "@opentelemetry/instrumentation-graphql",
    "@opentelemetry/instrumentation-http",
    "@opentelemetry/instrumentation-kafkajs",
    "@opentelemetry/instrumentation-koa",
    "@opentelemetry/instrumentation-mongodb",
    "@opentelemetry/instrumentation-mysql",
    "@opentelemetry/instrumentation-pg",
    "@opentelemetry/instrumentation-tedious",
    "@prisma/instrumentation",
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

export default nextConfig;
