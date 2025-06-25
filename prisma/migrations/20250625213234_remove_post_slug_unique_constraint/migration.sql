-- DropIndex
DROP INDEX "posts_slug_key";

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_createdAt_idx" ON "logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "logs_userId_createdAt_idx" ON "logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "logs_action_createdAt_idx" ON "logs"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "logs_severity_createdAt_idx" ON "logs"("severity", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "logs_entityType_entityId_idx" ON "logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "bookmarks_userId_createdAt_idx" ON "bookmarks"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bookmarks_postId_idx" ON "bookmarks"("postId");

-- CreateIndex
CREATE INDEX "bookmarks_userId_postId_idx" ON "bookmarks"("userId", "postId");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_name_idx" ON "categories"("parentId", "name");

-- CreateIndex
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "favorites_postId_idx" ON "favorites"("postId");

-- CreateIndex
CREATE INDEX "favorites_postId_createdAt_idx" ON "favorites"("postId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "favorites_userId_postId_idx" ON "favorites"("userId", "postId");

-- CreateIndex
CREATE INDEX "posts_isPublished_createdAt_idx" ON "posts"("isPublished", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_categoryId_isPublished_createdAt_idx" ON "posts"("categoryId", "isPublished", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_isPremium_isPublished_idx" ON "posts"("isPremium", "isPublished");

-- CreateIndex
CREATE INDEX "posts_status_createdAt_idx" ON "posts"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_title_idx" ON "posts"("title");

-- CreateIndex
CREATE INDEX "posts_isPublished_isPremium_createdAt_idx" ON "posts"("isPublished", "isPremium", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_slug_idx" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_viewCount_idx" ON "posts"("viewCount" DESC);

-- CreateIndex
CREATE INDEX "posts_isPublished_viewCount_idx" ON "posts"("isPublished", "viewCount" DESC);

-- CreateIndex
CREATE INDEX "posts_categoryId_isPublished_viewCount_idx" ON "posts"("categoryId", "isPublished", "viewCount" DESC);

-- CreateIndex
CREATE INDEX "posts_authorId_status_idx" ON "posts"("authorId", "status");

-- CreateIndex
CREATE INDEX "posts_isPublished_createdAt_isPremium_idx" ON "posts"("isPublished", "createdAt" DESC, "isPremium");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_createdAt_idx" ON "tags"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_stripe_customer_id_idx" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "users_type_role_idx" ON "users"("type", "role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "views_postId_createdAt_idx" ON "views"("postId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "views_createdAt_idx" ON "views"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "views_postId_idx" ON "views"("postId");

-- CreateIndex
CREATE INDEX "views_ipAddress_idx" ON "views"("ipAddress");

-- CreateIndex
CREATE INDEX "views_createdAt_postId_idx" ON "views"("createdAt" DESC, "postId");
