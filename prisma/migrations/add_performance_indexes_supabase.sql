-- =============================================
-- Performance Optimization Indexes for Supabase PostgreSQL
-- =============================================
-- This version works with Supabase SQL Editor (no CONCURRENTLY needed)
-- Includes RLS-optimized indexes for secure row-level access
-- Note: These will create brief table locks, but should be fast on small-medium datasets

-- =============================================
-- USER TABLE INDEXES
-- =============================================

-- Authentication and profile access
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "User_stripeCustomerId_idx" ON "users" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "User_type_role_idx" ON "users" ("type", "role");
CREATE INDEX IF NOT EXISTS "User_createdAt_desc_idx" ON "users" ("createdAt" DESC);

-- RLS-optimized indexes for security policies
CREATE INDEX IF NOT EXISTS "User_id_role_idx" ON "users" ("id", "role");
CREATE INDEX IF NOT EXISTS "User_id_type_subscription_idx" ON "users" ("id", "type", "stripe_current_period_end");

-- Premium subscription queries
CREATE INDEX IF NOT EXISTS "User_type_subscription_active_idx" ON "users" ("type", "stripe_current_period_end") 
  WHERE "type" = 'PREMIUM';

-- Admin role queries
CREATE INDEX IF NOT EXISTS "User_role_admin_idx" ON "users" ("role") 
  WHERE "role" = 'ADMIN';

-- =============================================
-- CATEGORY TABLE INDEXES
-- =============================================

-- Basic category access and hierarchy
CREATE INDEX IF NOT EXISTS "Category_slug_idx" ON "categories" ("slug");
CREATE INDEX IF NOT EXISTS "Category_parentId_name_idx" ON "categories" ("parentId", "name");

-- =============================================
-- TAG TABLE INDEXES
-- =============================================

-- Tag search and filtering
CREATE INDEX IF NOT EXISTS "Tag_slug_idx" ON "tags" ("slug");
CREATE INDEX IF NOT EXISTS "Tag_createdAt_desc_idx" ON "tags" ("createdAt" DESC);

-- =============================================
-- POST TABLE INDEXES
-- =============================================

-- Basic post access and search
CREATE INDEX IF NOT EXISTS "Post_slug_idx" ON "posts" ("slug");
CREATE INDEX IF NOT EXISTS "Post_viewCount_desc_idx" ON "posts" ("viewCount" DESC);

-- RLS-optimized indexes for security policies
CREATE INDEX IF NOT EXISTS "Post_isPublished_status_idx" ON "posts" ("isPublished", "status");
CREATE INDEX IF NOT EXISTS "Post_authorId_isPublished_status_idx" ON "posts" ("authorId", "isPublished", "status");
CREATE INDEX IF NOT EXISTS "Post_isPremium_isPublished_status_idx" ON "posts" ("isPremium", "isPublished", "status");

-- Content discovery and filtering
CREATE INDEX IF NOT EXISTS "Post_isPublished_viewCount_desc_idx" ON "posts" ("isPublished", "viewCount" DESC);
CREATE INDEX IF NOT EXISTS "Post_categoryId_isPublished_viewCount_desc_idx" ON "posts" ("categoryId", "isPublished", "viewCount" DESC);
CREATE INDEX IF NOT EXISTS "Post_authorId_status_idx" ON "posts" ("authorId", "status");
CREATE INDEX IF NOT EXISTS "Post_isPublished_createdAt_desc_isPremium_idx" ON "posts" ("isPublished", "createdAt" DESC, "isPremium");

-- Partial indexes for published content (optimized for public access)
CREATE INDEX IF NOT EXISTS "Post_createdAt_desc_published_approved_idx" ON "posts" ("createdAt" DESC) 
  WHERE "isPublished" = true AND "status" = 'APPROVED';

CREATE INDEX IF NOT EXISTS "Post_viewCount_desc_published_approved_idx" ON "posts" ("viewCount" DESC) 
  WHERE "isPublished" = true AND "status" = 'APPROVED';

-- Premium content access optimization
CREATE INDEX IF NOT EXISTS "Post_premium_published_approved_idx" ON "posts" ("isPremium", "createdAt" DESC) 
  WHERE "isPublished" = true AND "status" = 'APPROVED';

-- Author content management
CREATE INDEX IF NOT EXISTS "Post_authorId_createdAt_desc_idx" ON "posts" ("authorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_authorId_status_createdAt_idx" ON "posts" ("authorId", "status", "createdAt" DESC);

-- =============================================
-- BOOKMARK TABLE INDEXES
-- =============================================

-- User bookmark management (RLS optimized)
CREATE INDEX IF NOT EXISTS "Bookmark_userId_postId_idx" ON "bookmarks" ("userId", "postId");
CREATE INDEX IF NOT EXISTS "Bookmark_userId_createdAt_desc_idx" ON "bookmarks" ("userId", "createdAt" DESC);

-- =============================================
-- FAVORITE TABLE INDEXES
-- =============================================

-- User favorite management (RLS optimized)
CREATE INDEX IF NOT EXISTS "Favorite_userId_postId_idx" ON "favorites" ("userId", "postId");
CREATE INDEX IF NOT EXISTS "Favorite_userId_createdAt_desc_idx" ON "favorites" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Favorite_postId_createdAt_desc_idx" ON "favorites" ("postId", "createdAt" DESC);

-- Public favorite counts (for analytics)
CREATE INDEX IF NOT EXISTS "Favorite_postId_count_idx" ON "favorites" ("postId");

-- =============================================
-- VIEW TABLE INDEXES
-- =============================================

-- Analytics and view tracking
CREATE INDEX IF NOT EXISTS "View_postId_idx" ON "views" ("postId");
CREATE INDEX IF NOT EXISTS "View_ipAddress_idx" ON "views" ("ipAddress");
CREATE INDEX IF NOT EXISTS "View_createdAt_desc_postId_idx" ON "views" ("createdAt" DESC, "postId");

-- Spam detection and rate limiting
CREATE INDEX IF NOT EXISTS "View_postId_ipAddress_unique_idx" ON "views" ("postId", "ipAddress");
CREATE INDEX IF NOT EXISTS "View_ipAddress_createdAt_desc_idx" ON "views" ("ipAddress", "createdAt" DESC);

-- =============================================
-- LOG TABLE INDEXES
-- =============================================

-- Security and audit logging (RLS optimized)
CREATE INDEX IF NOT EXISTS "Log_createdAt_desc_idx" ON "logs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_userId_createdAt_desc_idx" ON "logs" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_action_createdAt_desc_idx" ON "logs" ("action", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_severity_createdAt_desc_idx" ON "logs" ("severity", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_entityType_entityId_idx" ON "logs" ("entityType", "entityId");

-- Security monitoring and incident response
CREATE INDEX IF NOT EXISTS "Log_severity_action_createdAt_idx" ON "logs" ("severity", "action", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Log_userId_action_createdAt_idx" ON "logs" ("userId", "action", "createdAt" DESC);

-- =============================================
-- PERFORMANCE OPTIMIZATION
-- =============================================

-- Update table statistics for query planner optimization
ANALYZE "users";
ANALYZE "categories";
ANALYZE "tags";
ANALYZE "posts";
ANALYZE "bookmarks";
ANALYZE "favorites";
ANALYZE "views";
ANALYZE "logs";

-- =============================================
-- SUPABASE RLS HELPER FUNCTIONS
-- =============================================

-- Function to check if user is admin (for RLS policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "users" 
    WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has premium access (for RLS policies)
CREATE OR REPLACE FUNCTION has_premium_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "users" 
    WHERE "id" = auth.uid()::text 
    AND "type" = 'PREMIUM'
    AND (
      "stripe_current_period_end" IS NULL OR 
      "stripe_current_period_end" > NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if post is accessible to current user
CREATE OR REPLACE FUNCTION can_access_post(post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  post_record RECORD;
BEGIN
  SELECT "isPremium", "isPublished", "status", "authorId"
  INTO post_record
  FROM "posts" 
  WHERE "id" = post_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If post is not published, only author or admin can access
  IF NOT post_record."isPublished" OR post_record."status" != 'APPROVED' THEN
    RETURN post_record."authorId" = auth.uid()::text OR is_admin();
  END IF;
  
  -- If post is premium, check if user has premium access
  IF post_record."isPremium" THEN
    RETURN has_premium_access() OR post_record."authorId" = auth.uid()::text OR is_admin();
  END IF;
  
  -- Public post
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

SELECT 'Performance indexes and RLS helper functions created successfully! 🚀🔐' as result; 