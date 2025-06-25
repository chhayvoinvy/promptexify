-- Performance Optimization Indexes for Supabase PostgreSQL
-- This version works with Supabase SQL Editor (no CONCURRENTLY needed)
-- Note: These will create brief table locks, but should be fast on small-medium datasets

-- User table indexes for authentication and filtering
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "User_stripeCustomerId_idx" ON "users" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "User_type_role_idx" ON "users" ("type", "role");
CREATE INDEX IF NOT EXISTS "User_createdAt_desc_idx" ON "users" ("createdAt" DESC);

-- Category table indexes for hierarchical queries
CREATE INDEX IF NOT EXISTS "Category_slug_idx" ON "categories" ("slug");
CREATE INDEX IF NOT EXISTS "Category_parentId_name_idx" ON "categories" ("parentId", "name");

-- Tag table indexes for search and analytics
CREATE INDEX IF NOT EXISTS "Tag_slug_idx" ON "tags" ("slug");
CREATE INDEX IF NOT EXISTS "Tag_createdAt_desc_idx" ON "tags" ("createdAt" DESC);

-- Post table comprehensive indexes for all query patterns
CREATE INDEX IF NOT EXISTS "Post_slug_idx" ON "posts" ("slug");
CREATE INDEX IF NOT EXISTS "Post_viewCount_desc_idx" ON "posts" ("viewCount" DESC);
CREATE INDEX IF NOT EXISTS "Post_isPublished_viewCount_desc_idx" ON "posts" ("isPublished", "viewCount" DESC);
CREATE INDEX IF NOT EXISTS "Post_categoryId_isPublished_viewCount_desc_idx" ON "posts" ("categoryId", "isPublished", "viewCount" DESC);
CREATE INDEX IF NOT EXISTS "Post_authorId_status_idx" ON "posts" ("authorId", "status");
CREATE INDEX IF NOT EXISTS "Post_isPublished_createdAt_desc_isPremium_idx" ON "posts" ("isPublished", "createdAt" DESC, "isPremium");

-- Partial indexes for specific query patterns (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS "Post_createdAt_desc_published_idx" ON "posts" ("createdAt" DESC) WHERE "isPublished" = true;
CREATE INDEX IF NOT EXISTS "Post_viewCount_desc_published_idx" ON "posts" ("viewCount" DESC) WHERE "isPublished" = true;

-- Bookmark and Favorite table optimizations
CREATE INDEX IF NOT EXISTS "Bookmark_userId_postId_idx" ON "bookmarks" ("userId", "postId");
CREATE INDEX IF NOT EXISTS "Favorite_userId_postId_idx" ON "favorites" ("userId", "postId");
CREATE INDEX IF NOT EXISTS "Favorite_postId_createdAt_desc_idx" ON "favorites" ("postId", "createdAt" DESC);

-- View table indexes for analytics and spam detection
CREATE INDEX IF NOT EXISTS "View_postId_idx" ON "views" ("postId");
CREATE INDEX IF NOT EXISTS "View_ipAddress_idx" ON "views" ("ipAddress");
CREATE INDEX IF NOT EXISTS "View_createdAt_desc_postId_idx" ON "views" ("createdAt" DESC, "postId");

-- Log table indexes for monitoring and debugging
CREATE INDEX IF NOT EXISTS "Log_createdAt_desc_idx" ON "logs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_userId_createdAt_desc_idx" ON "logs" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_action_createdAt_desc_idx" ON "logs" ("action", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_severity_createdAt_desc_idx" ON "logs" ("severity", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_entityType_entityId_idx" ON "logs" ("entityType", "entityId");

-- Update table statistics for query planner optimization
ANALYZE "users";
ANALYZE "categories";
ANALYZE "tags";
ANALYZE "posts";
ANALYZE "bookmarks";
ANALYZE "favorites";
ANALYZE "views";
ANALYZE "logs";

-- Success message
SELECT 'Performance indexes created successfully! 🚀' as result; 