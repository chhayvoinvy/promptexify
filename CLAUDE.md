# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack

# Build & Production
npm run build            # Generates Prisma client, runs migrations, pushes schema, then builds
npm start                # Start production server

# Database
npm run db:migrate       # Run pending migrations (prisma migrate deploy)
npm run db:push          # Push schema changes without migrations
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed the database
npm run db:reset         # Reset database

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run lint:format      # Format with Prettier

# Background worker
npm run worker           # Start BullMQ worker process

# CSP utilities
npm run csp:hash         # Generate a CSP hash for an inline script
npm run csp:analyze      # Analyze a CSP violation report
```

No test runner is configured; the only test file is `lib/security/sanitize.test.ts`. Run it with:
```bash
npx tsx lib/security/sanitize.test.ts
```

Additional commands:
```bash
npm run content:generate  # Execute content automation (CSV → posts pipeline)
```

## Architecture

### Tech Stack
- **Next.js 15** App Router with Turbopack, React 18
- **PostgreSQL** via **Prisma ORM** (client generated to `app/generated/prisma/`)
- **Supabase Auth** — handles sessions; user records are mirrored into Prisma `users` table via `upsertUserInDatabase`
- **Redis / BullMQ** — rate limiting and background job queues; falls back to in-memory when Redis is unavailable
- **AWS S3 / DigitalOcean Spaces** — media uploads; storage provider configurable in DB `settings` table

### Route Groups

```
app/
  (auth)/          # Public auth pages: signin, signup
  (main)/          # Public-facing site: home, directory, entry/[id]
    @modal/        # Parallel route for post preview modal
  (protected)/     # Authenticated routes (layout enforces auth)
    dashboard/     # User dashboard: posts, bookmarks, favorites, billing, settings, etc.
  api/             # API routes: posts, admin, upload, webhooks, csrf, analytics, etc.
```

### Data Flow

1. **Authentication**: Supabase session → `lib/supabase/middleware.ts` updates cookie → `getCurrentUser()` in `lib/auth.ts` fetches Supabase user + Prisma `userData`. Use `requireAuth()` / `requireAdmin()` for protected server actions/routes.

2. **Posts**: Stored in Postgres. Queries are in `lib/query.ts` (`PostQueries`, `MetadataQueries` classes) with typed `POST_SELECTS` objects for list/full/api/admin shapes. The `Queries` object at the bottom provides a unified interface that bypasses cache for authenticated users.

3. **Caching**: `lib/cache.ts` wraps `unstable_cache` with Redis/memory fallback. Use `CACHE_TAGS` constants and `revalidateCache()` after mutations. Redis is auto-configured for development (`localhost:6379`).

4. **Server Actions**: All in `actions/`. Actions are wrapped with `withCSRFProtection()` from `lib/security/csp.ts`. Input is sanitized via `lib/security/sanitize.ts` before DB writes.

5. **Middleware** (`middleware.ts`): Runs on every request (except static/image assets). Handles: Supabase session refresh → CSP nonce injection (`x-nonce` header + `csp-nonce` cookie) → CSRF validation for non-GET API calls → Redis rate limiting.

### Security Architecture

- **CSP**: Nonce generated per request via `CSPNonce.generate()`, passed to Server Components via `x-nonce` header, to Client Components via `csp-nonce` cookie.
- **CSRF**: Token stored in cookie, validated in middleware for all mutating API calls. Endpoints that skip CSRF: `/api/webhooks/`, `/api/upload/`, `/api/auth/`, `/auth/callback`, `/api/security/csp-report`.
- **Rate limiting**: `lib/edge.ts` — Redis-backed, falls back to in-memory. Applied globally to `/api/*` routes in middleware.
- **Input sanitization**: `lib/security/sanitize.ts` — use `sanitizeInput()` for text fields, `sanitizeContent()` for HTML content, `sanitizeTagSlug()` for slugs.
- **Audit logging**: `lib/security/audit.ts` `SecurityEvents` — logs auth failures, rate limit hits, etc. to the `logs` Prisma model.

### Prisma

- Client is generated to `app/generated/prisma` (not the default `node_modules/@prisma/client`). Always import from `@/app/generated/prisma` for types/enums.
- `lib/prisma.ts` exports a singleton `prisma` client plus `withTransaction()` and `withErrorHandling()` utilities.
- Schema enums: `UserType` (FREE/PREMIUM), `UserRole` (USER/ADMIN), `PostStatus` (DRAFT/PENDING_APPROVAL/APPROVED/REJECTED), `OAuthProvider` (GOOGLE/EMAIL).

### Key Patterns

- **`actions/index.ts`** re-exports all server actions as a barrel.
- **Cache invalidation**: call `revalidateCache(CACHE_TAGS.POSTS)` (or relevant tag) after any data mutation.
- **Access**: All users have full access; no paid tiers. `hasActivePremiumSubscription()` in `lib/auth.ts` always returns true.
- **Parallel modal route**: `app/(main)/@modal/` intercepts `/entry/[id]` links to show a modal preview without full page navigation.
- **Server action responses**: Actions return `ActionResult` — `{ success: boolean; message?: string; error?: string; data?: unknown }`.
- **Client mutations**: Use `useTransition()` for async server actions in Client Components (not `useFormStatus`). Multiple `useTransition` calls are fine for parallel independent ops.
- **Validation**: Zod schemas live in `lib/schemas.ts`. Slugs enforce no leading/trailing/consecutive hyphens via regex.
- **Performance**: Use `React.cache()` for request-level memoization in Server Components. Use `Promise.allSettled()` for parallel fetches that should not block on failure. `PerformanceMonitor` (in `lib/`) measures async operations; slow DB queries (>500ms) are logged by `DatabasePerformanceMonitor`.
- **Worker process**: The BullMQ worker (`scripts/worker.ts`) processes `process-csv` jobs from the `ContentAutomation` queue, transforming CSV rows → `ContentFile` objects → posts via `AutomationService.executeFromJsonInput()`. Requires Redis.
- **Storage backends**: S3, DigitalOcean Spaces, or LOCAL filesystem — selected via DB `settings` table, cached for 5 min. Upload results include `blurDataUrl` for blur placeholders.
