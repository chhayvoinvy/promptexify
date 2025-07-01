# Base image
FROM node:20-alpine AS base

# Production dependencies
FROM base AS deps-prod
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Create lib directory structure for Prisma client
RUN mkdir -p lib/generated
RUN npm ci --omit=dev

# Development dependencies  
FROM base AS deps-dev
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Create lib directory structure for Prisma client
RUN mkdir -p lib/generated
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Development stage
FROM base AS development
WORKDIR /app

# Install additional development tools
RUN apk add --no-cache libc6-compat curl

# Copy dependencies from dev deps stage (includes generated Prisma client)
COPY --from=deps-dev /app/node_modules ./node_modules
COPY --from=deps-dev /app/lib ./lib
COPY package.json package-lock.json* ./

# Copy prisma schema for development
COPY prisma ./prisma

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Command for development
CMD ["npm", "run", "dev"]

# Production image, copy all the files and run next
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Copy production dependencies and Prisma client
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=deps-prod /app/lib ./lib

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"] 