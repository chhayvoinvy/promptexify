# Migration: Prisma → Drizzle ORM with Supabase

This document describes how to move from **Prisma** to **Drizzle ORM** while keeping **Supabase** for auth and PostgreSQL. The database stays the same (Supabase Postgres); only the ORM layer changes.

## Current migration status (hybrid)

The following are **already migrated to Drizzle**:

- **`lib/db/`** — Drizzle schema (`lib/db/schema.ts`), client (`lib/db/index.ts`), and type exports (`PostStatus`, `StorageType`).
- **`lib/query.ts`** — Full query layer (posts, categories, tags, caching) now uses Drizzle.
- **Auth** — `app/auth/callback/route.ts`, `lib/auth.ts` (user upsert and getCurrentUser).
- **Actions** — `actions/bookmarks.ts`, `actions/favorites.ts`.
- **Lib** — `lib/settings.ts`, `lib/subscription.ts`.
- **API** — `app/api/settings/content-config/route.ts`, `app/api/admin/automation/logs/route.ts`.
- **SEO** — `app/(seo)/sitemap-posts.xml/route.ts`, `app/(seo)/sitemap-categories.xml/route.ts` (use `withErrorHandling` from `@/lib/db`).

All other modules still use **Prisma** (`lib/prisma.ts`). To finish the migration, replace `prisma` with `db` and Prisma API with Drizzle in the remaining files (see checklist in this doc).

---

## Current State (Summary)

| Area | Details |
|------|--------|
| **ORM** | Prisma 6.x, client generated to `app/generated/prisma` |
| **Database** | PostgreSQL via `DATABASE_URL` / `DIRECT_URL` (Supabase) |
| **Auth** | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`); user records mirrored into `users` table |
| **Schema** | 11 tables: `users`, `categories`, `tags`, `posts`, `bookmarks`, `favorites`, `logs`, `media`, `settings`, `_PostToTag` (implicit m:n), `_prisma_migrations` |
| **Enums** | `UserType`, `UserRole`, `OAuthProvider`, `PostStatus`, `UploadFileType`, `StorageType` |
| **RLS** | Enabled on `_prisma_migrations` and `_PostToTag` (Supabase RLS policies) |

**Prisma usage:**

- **~30+ files** import `prisma` from `@/lib/prisma` or types from `@/app/generated/prisma`.
- **Core query layer**: `lib/query.ts` — `POST_SELECTS` / `USER_SELECTS`, `PostQueries`, `MetadataQueries`, `Queries`, cached/memoized helpers.
- **Utilities**: `lib/prisma.ts` — singleton client, `withErrorHandling`, `withTransaction`, `checkDatabaseHealth`, `DatabaseMetrics`.
- **Actions**: `actions/posts.ts`, `bookmarks.ts`, `favorites.ts`, `tags.ts`, `categories.ts`, `settings.ts`, `users.ts`, `automation.ts`.
- **API routes**: upload (image/video), settings, admin automation logs, tags, categories, posts.
- **Auth**: `app/auth/callback/route.ts` and `lib/auth.ts` — user upsert/lookup via Prisma.
- **Other**: `lib/settings.ts`, `lib/content.ts`, `lib/automation/service.ts`, `lib/security/audit.ts`, `lib/subscription.ts`, `lib/image/storage.ts`, sitemaps, scripts.

---

## Why Drizzle + Supabase?

- **Same database**: Keep using Supabase Postgres and existing RLS; no data migration required.
- **Lighter runtime**: No generated client; schema is the source of truth in code.
- **SQL-like API**: Explicit queries and joins; good fit if you prefer control and visibility.
- **Supabase docs**: [Drizzle + Supabase](https://orm.drizzle.team/docs/get-started/supabase-new) recommend `drizzle-orm` + `postgres` (postgres.js) with your `DATABASE_URL`. If you use Supabase **connection pooler** in **Transaction** mode, use `prepare: false`.

Auth remains **Supabase Auth**; only the place that reads/writes the `users` (and other) tables switches from Prisma to Drizzle.

---

## Migration Strategy

1. **Add Drizzle and keep Prisma** in parallel during migration.
2. **Define Drizzle schema** that matches existing tables (or introspect from DB).
3. **Introduce a single Drizzle client** (e.g. `lib/db.ts`) and reuse it everywhere.
4. **Migrate in order**: db client + schema → query layer → actions → API routes → auth → remaining libs and scripts.
5. **Remove Prisma** once all usages are replaced and tests pass.

---

## Step 1: Install Drizzle and Driver

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit
```

Use **postgres** (postgres.js) as recommended for Supabase. If you prefer **node-postgres**:

```bash
npm i drizzle-orm pg
npm i -D drizzle-kit @types/pg
```

---

## Step 2: Drizzle Config

Create `drizzle.config.ts` at the project root:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Use `DIRECT_URL` for migrations if you use a pooler for app traffic (e.g. Supabase pooler with transaction mode):

```ts
dbCredentials: {
  url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
},
```

---

## Step 3: Drizzle Schema (Match Existing DB)

Create `lib/db/schema.ts` and define tables/enums to mirror your Prisma schema. Example structure (adapt to your exact column names and enums):

**Enums:**

```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("UserType", ["FREE", "PREMIUM"]);
export const userRoleEnum = pgEnum("UserRole", ["USER", "ADMIN"]);
export const oauthProviderEnum = pgEnum("OAuthProvider", ["GOOGLE", "EMAIL"]);
export const postStatusEnum = pgEnum("PostStatus", [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
]);
export const uploadFileTypeEnum = pgEnum("UploadFileType", ["IMAGE", "VIDEO"]);
export const storageTypeEnum = pgEnum("StorageType", ["S3", "LOCAL", "DOSPACE"]);
```

**Tables (examples):**

```ts
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    avatar: text("avatar"),
    type: userTypeEnum("type").default("FREE"),
    role: userRoleEnum("role").default("USER"),
    oauth: oauthProviderEnum("oauth").notNull(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    // indexes to match Prisma
  ]
);

export const categories = pgTable("categories", { ... });
export const tags = pgTable("tags", { ... });

// Prisma's implicit many-to-many: table name is "_PostToTag", columns A (post id), B (tag id)
export const postToTag = pgTable("_PostToTag", {
  A: uuid("A").notNull().references(() => posts.id, { onDelete: "cascade" }),
  B: uuid("B").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  content: text("content").notNull(),
  isPremium: boolean("is_premium").default(false),
  isFeatured: boolean("is_featured").default(false),
  isPublished: boolean("is_published").default(false),
  status: postStatusEnum("status").default("DRAFT"),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  blurData: text("blur_data"),
  uploadFileType: uploadFileTypeEnum("upload_file_type"),
  uploadPath: text("upload_path"),
  previewPath: text("preview_path"),
  previewVideoPath: text("preview_video_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", { ... });
export const favorites = pgTable("favorites", { ... });
export const logs = pgTable("logs", { ... });
export const media = pgTable("media", { ... });
export const settings = pgTable("settings", { ... });
```

Map every Prisma `@map("...")` to Drizzle’s column name (e.g. `createdAt` → `created_at`). Add indexes to match Prisma’s `@@index` for performance.

**Alternative: introspect existing DB**

```bash
npx drizzle-kit introspect
```

This generates a schema from the current database. You can then move it to `lib/db/schema.ts` and add relations / enums as needed (Drizzle introspect may output different naming).

---

## Step 4: Drizzle Client (Replace Prisma Singleton)

Create `lib/db/index.ts` (or `lib/db.ts`):

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// If using Supabase connection pooler in "Transaction" mode, use prepare: false
const client = postgres(connectionString, {
  prepare: process.env.DATABASE_POOLER_MODE === "transaction" ? false : true,
  max: 10,
});

export const db = drizzle(client, { schema });
```

For serverless (e.g. Vercel), avoid creating a new client per request by reusing a global client (same pattern as your current Prisma singleton).

---

## Step 5: Transaction and Error Handling

In `lib/prisma.ts` you have `withTransaction` and `withErrorHandling`. With Drizzle:

**Transactions:**

```ts
import { db } from "@/lib/db";

await db.transaction(async (tx) => {
  await tx.insert(posts).values({ ... });
  await tx.insert(postToTag).values([...]);
});
```

**Error handling:** Keep a generic wrapper (e.g. `withErrorHandling(operation, "context")`) and use it around Drizzle calls; handle `error.message` for timeout, connection limit, and unique constraint as you do today.

---

## Step 6: Query Layer Migration (`lib/query.ts`)

This is the largest change. Prisma uses `select`/`include` and nested `where`/`orderBy`. In Drizzle you use:

- **Selects**: `db.select({ id: posts.id, title: posts.title, ... })` with explicit columns.
- **Joins**: `db.query.posts.findFirst({ where: eq(posts.id, id), with: { author: true, category: true, tags: true } })` (if using relational queries) or manual `leftJoin`/`innerJoin`.
- **Where**: `eq`, `and`, `or`, `inArray`, `like`, `ilike`, etc. from `drizzle-orm`.
- **Order by**: `desc(posts.createdAt)`, etc.
- **Count**: `db.select({ count: sql<number>\`count(*)\` }).from(posts).where(...)` or a separate count query.

**Example: get post by slug (replacing `findUnique` + big select):**

```ts
const [post] = await db
  .select()
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .leftJoin(categories, eq(posts.categoryId, categories.id))
  .leftJoin(postToTag, eq(posts.id, postToTag.A))
  .leftJoin(tags, eq(postToTag.B, tags.id))
  .where(eq(posts.slug, slug));
```

For many-to-many (tags), you’ll typically do one query for the post + author + category and a second for tags (or use Drizzle’s relational query API if you define relations in schema).

**Types:** Replace `Prisma.PostGetPayload<{ select: typeof POST_SELECTS.list }>` with Drizzle-inferred types, e.g.:

```ts
import type { InferSelectModel } from "drizzle-orm";
export type PostRow = InferSelectModel<typeof posts>;
```

Build your `PostListResult` / `PostFullResult` from the shapes you actually select.

**Aggregations:** Prisma’s `groupBy` becomes raw SQL or multiple Drizzle queries with `count`/`sum`; `_count` for relations becomes separate count queries or subqueries.

---

## Step 7: Actions and API Routes

Replace each Prisma call with Drizzle equivalents:

| Prisma | Drizzle |
|--------|--------|
| `prisma.post.findFirst({ where: { slug } })` | `db.select().from(posts).where(eq(posts.slug, slug)).limit(1)` |
| `prisma.post.create({ data: { ... } })` | `db.insert(posts).values({ ... }).returning()` |
| `prisma.post.update({ where: { id }, data: { ... } })` | `db.update(posts).set({ ... }).where(eq(posts.id, id)).returning()` |
| `prisma.post.delete({ where: { id } })` | `db.delete(posts).where(eq(posts.id, id))` |
| `prisma.user.upsert({ where: { id }, create: {...}, update: {...} })` | Check existence then `insert` or `update` (or use a raw `INSERT ... ON CONFLICT` with Drizzle’s `sql`) |
| `prisma.tag.upsert({ where: { slug }, create: {...}, update: {...} })` | Same pattern |
| `prisma.media.updateMany({ where: { postId }, data: { postId: null } })` | `db.update(media).set({ postId: null }).where(eq(media.postId, postId))` |

Use `.returning()` where you need the inserted/updated row.

---

## Step 8: Auth Callback and `lib/auth.ts`

Replace Prisma user upsert in `app/auth/callback/route.ts` and any user lookup in `lib/auth.ts` with Drizzle:

```ts
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Upsert: try update, then insert if no row
const updated = await db.update(users).set({ email, name, avatar, oauth, updatedAt: new Date() }).where(eq(users.id, id)).returning();
if (updated.length === 0) {
  await db.insert(users).values({ id, email, name, avatar, oauth, type: "FREE", role: "USER" });
}
```

---

## Step 9: Scripts and Seed

- **Seed:** Replace `prisma/seed.ts` with a script that uses `db` from `lib/db` and `insert` into your Drizzle tables.
- **Scripts:** Update `scripts/migrate-preview-paths.ts`, `scripts/debug-video-data.ts`, etc., to import `db` and use Drizzle queries. Fix `scripts/migrate-preview-paths.ts` to use the same client path as the app (e.g. `@/lib/db` or `../lib/db`) instead of `@prisma/client`.

---

## Step 10: Package Scripts and Prisma Removal

**package.json:**

- **Build:** Replace `prisma generate --no-hints && prisma migrate deploy && prisma db push --accept-data-loss` with Drizzle migrate, e.g. `drizzle-kit migrate` or `tsx drizzle/migrate.ts` (depending on how you run migrations).
- **Postinstall:** Remove `prisma generate` or replace with `drizzle-kit generate` if you need to generate something at install time (Drizzle typically does not).
- **db:migrate:** `drizzle-kit migrate` (or your migration runner).
- **db:push:** `drizzle-kit push` (dev only).
- **db:studio:** Use `drizzle-kit studio` or keep using Supabase dashboard / Prisma Studio temporarily.
- **db:seed:** Point to your new seed script (e.g. `tsx lib/db/seed.ts`).
- **db:reset:** Implement via Drizzle or raw SQL (drop/recreate or truncate + re-migrate).

Then remove:

- `prisma` and `@prisma/client` from dependencies.
- `prisma/` directory (optional; you may keep migrations for history and run them once if the DB is new, then rely on Drizzle for new changes).
- `app/generated/prisma`.
- All imports of `prisma` and `@/app/generated/prisma`.

---

## RLS and Supabase

- **RLS:** No change. Policies on `_PostToTag` and `_prisma_migrations` remain. When the app connects with a role that bypasses RLS (e.g. service role / pooler), behavior is unchanged.
- **Auth:** Continue using Supabase Auth; only the code that writes/reads the `users` table (and the rest of the app) switches to Drizzle.

---

## Suggested Order of Work

1. Add Drizzle deps, `drizzle.config.ts`, and `lib/db/schema.ts` (full schema matching current DB).
2. Add `lib/db/index.ts` (client) and a thin `withErrorHandling` / `withTransaction` wrapper around `db.transaction` if you want to keep the same API.
3. Migrate `lib/query.ts`: implement `PostQueries`, `MetadataQueries`, and cached/memoized helpers with Drizzle; update exported types.
4. Migrate actions (posts, bookmarks, favorites, tags, categories, settings, users, automation).
5. Migrate API routes (upload, settings, admin, tags, categories, posts).
6. Migrate auth callback and `lib/auth.ts`.
7. Migrate `lib/settings.ts`, `lib/content.ts`, `lib/automation/service.ts`, `lib/security/audit.ts`, `lib/subscription.ts`, `lib/image/storage.ts`, sitemaps.
8. Migrate scripts and seed.
9. Remove Prisma from `package.json`, delete generated Prisma output, and fix any remaining references.
10. Run full test suite and manual QA; then remove Prisma and its scripts.

---

## Files to Touch (Checklist)

- `lib/db/schema.ts` (new)
- `lib/db/index.ts` (new)
- `lib/prisma.ts` → remove or replace with Drizzle wrappers in `lib/db`
- `lib/query.ts` (full rewrite of query implementation)
- `actions/posts.ts`, `bookmarks.ts`, `favorites.ts`, `tags.ts`, `categories.ts`, `settings.ts`, `users.ts`, `automation.ts`
- `app/api/upload/image/route.ts`, `app/api/upload/image/delete/route.ts`, `app/api/upload/video/route.ts`, `app/api/upload/video/delete/route.ts`
- `app/api/settings/content-config/route.ts`, `app/api/admin/automation/logs/route.ts`, `app/api/tags/route.ts`, `app/api/categories/[id]/route.ts`, `app/api/posts/[id]/route.ts`, `app/api/posts/[id]/status/route.ts`
- `app/auth/callback/route.ts`
- `app/(seo)/sitemap-posts.xml/route.ts`, `app/(seo)/sitemap-categories.xml/route.ts`
- `lib/auth.ts`, `lib/settings.ts`, `lib/content.ts`, `lib/automation/service.ts`, `lib/automation/database.ts`, `lib/security/audit.ts`, `lib/security/debug.ts`, `lib/subscription.ts`, `lib/image/storage.ts`
- `scripts/migrate-preview-paths.ts`, `scripts/debug-video-data.ts`, `scripts/test-preview-paths.ts`
- `prisma/seed.ts` → replace with Drizzle seed
- `package.json` (scripts + deps)

This should be enough to move the project to Drizzle ORM with Supabase without changing the database or auth model.
