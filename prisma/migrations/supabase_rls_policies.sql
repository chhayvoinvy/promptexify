-- =============================================
-- Supabase Row Level Security (RLS) Policies
-- =============================================
-- This script sets up comprehensive RLS policies for the promptexify database
-- It is now idempotent and can be run multiple times safely.
-- Execute this in Supabase SQL Editor

-- Enable RLS on all tables
-- These statements are safe to run multiple times.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "logs" ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON "users";
CREATE POLICY "Users can read own profile" ON "users"
  FOR SELECT USING (auth.uid()::text = "id");

-- Users can update their own profile (limited fields)
DROP POLICY IF EXISTS "Users can update own profile" ON "users";
CREATE POLICY "Users can update own profile" ON "users"
  FOR UPDATE USING (auth.uid()::text = "id")
  WITH CHECK (
    auth.uid()::text = "id" AND
    -- Users cannot modify critical fields
    "role" = (SELECT "role" FROM "users" WHERE "id" = auth.uid()::text) AND
    "type" = (SELECT "type" FROM "users" WHERE "id" = auth.uid()::text) AND
    "oauth" = (SELECT "oauth" FROM "users" WHERE "id" = auth.uid()::text)
  );

-- Admins can read all users
DROP POLICY IF EXISTS "Admins can read all users" ON "users";
CREATE POLICY "Admins can read all users" ON "users"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- Admins can update all users
DROP POLICY IF EXISTS "Admins can update all users" ON "users";
CREATE POLICY "Admins can update all users" ON "users"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- Public can read limited user info for posts
DROP POLICY IF EXISTS "Public can read user info for posts" ON "users";
CREATE POLICY "Public can read user info for posts" ON "users"
  FOR SELECT USING (true);
  -- This will be restricted by SELECT in application layer to only include name, avatar, id

-- =============================================
-- CATEGORIES TABLE POLICIES
-- =============================================

-- Anyone can read categories
DROP POLICY IF EXISTS "Anyone can read categories" ON "categories";
CREATE POLICY "Anyone can read categories" ON "categories"
  FOR SELECT USING (true);

-- Only admins can create/update/delete categories
DROP POLICY IF EXISTS "Admins can manage categories" ON "categories";
CREATE POLICY "Admins can manage categories" ON "categories"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- =============================================
-- TAGS TABLE POLICIES
-- =============================================

-- Anyone can read tags
DROP POLICY IF EXISTS "Anyone can read tags" ON "tags";
CREATE POLICY "Anyone can read tags" ON "tags"
  FOR SELECT USING (true);

-- Only admins can create/update/delete tags
DROP POLICY IF EXISTS "Admins can manage tags" ON "tags";
CREATE POLICY "Admins can manage tags" ON "tags"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- =============================================
-- POSTS TABLE POLICIES
-- =============================================

-- Anyone can read published posts
DROP POLICY IF EXISTS "Anyone can read published posts" ON "posts";
CREATE POLICY "Anyone can read published posts" ON "posts"
  FOR SELECT USING (
    "isPublished" = true AND "status" = 'APPROVED'
  );

-- Premium users can read premium posts (if they have active subscription)
DROP POLICY IF EXISTS "Premium users can read premium posts" ON "posts";
CREATE POLICY "Premium users can read premium posts" ON "posts"
  FOR SELECT USING (
    "isPublished" = true AND 
    "status" = 'APPROVED' AND
    (
      "isPremium" = false OR
      (
        "isPremium" = true AND
        EXISTS (
          SELECT 1 FROM "users" 
          WHERE "id" = auth.uid()::text 
          AND "type" = 'PREMIUM'
          AND (
            "stripe_current_period_end" IS NULL OR 
            "stripe_current_period_end" > NOW()
          )
        )
      )
    )
  );

-- Authors can read their own posts (all statuses)
DROP POLICY IF EXISTS "Authors can read own posts" ON "posts";
CREATE POLICY "Authors can read own posts" ON "posts"
  FOR SELECT USING (
    "authorId" = auth.uid()::text
  );

-- Authors can create posts
DROP POLICY IF EXISTS "Authors can create posts" ON "posts";
CREATE POLICY "Authors can create posts" ON "posts"
  FOR INSERT WITH CHECK (
    "authorId" = auth.uid()::text AND
    auth.uid() IS NOT NULL
  );

-- Authors can update their own posts
DROP POLICY IF EXISTS "Authors can update own posts" ON "posts";
CREATE POLICY "Authors can update own posts" ON "posts"
  FOR UPDATE USING (
    "authorId" = auth.uid()::text
  ) WITH CHECK (
    "authorId" = auth.uid()::text AND
    -- Authors cannot change certain fields
    "authorId" = (SELECT "authorId" FROM "posts" WHERE "id" = "posts"."id") AND
    -- Authors cannot change featured status (admin-only)
    "isFeatured" = (SELECT "isFeatured" FROM "posts" WHERE "id" = "posts"."id")
  );

-- Authors can delete their own posts
DROP POLICY IF EXISTS "Authors can delete own posts" ON "posts";
CREATE POLICY "Authors can delete own posts" ON "posts"
  FOR DELETE USING (
    "authorId" = auth.uid()::text
  );

-- Admins can manage all posts
DROP POLICY IF EXISTS "Admins can manage all posts" ON "posts";
CREATE POLICY "Admins can manage all posts" ON "posts"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- =============================================
-- BOOKMARKS TABLE POLICIES
-- =============================================

-- Users can read their own bookmarks
DROP POLICY IF EXISTS "Users can read own bookmarks" ON "bookmarks";
CREATE POLICY "Users can read own bookmarks" ON "bookmarks"
  FOR SELECT USING (
    "userId" = auth.uid()::text
  );

-- Users can create their own bookmarks
DROP POLICY IF EXISTS "Users can create own bookmarks" ON "bookmarks";
CREATE POLICY "Users can create own bookmarks" ON "bookmarks"
  FOR INSERT WITH CHECK (
    "userId" = auth.uid()::text AND
    auth.uid() IS NOT NULL AND
    -- Can only bookmark published posts
    EXISTS (
      SELECT 1 FROM "posts" 
      WHERE "id" = "postId" AND "isPublished" = true AND "status" = 'APPROVED'
    )
  );

-- Users can delete their own bookmarks
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON "bookmarks";
CREATE POLICY "Users can delete own bookmarks" ON "bookmarks"
  FOR DELETE USING (
    "userId" = auth.uid()::text
  );

-- Admins can read all bookmarks
DROP POLICY IF EXISTS "Admins can read all bookmarks" ON "bookmarks";
CREATE POLICY "Admins can read all bookmarks" ON "bookmarks"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- =============================================
-- FAVORITES TABLE POLICIES
-- =============================================

-- Users can read their own favorites
DROP POLICY IF EXISTS "Users can read own favorites" ON "favorites";
CREATE POLICY "Users can read own favorites" ON "favorites"
  FOR SELECT USING (
    "userId" = auth.uid()::text
  );

-- Users can create their own favorites
DROP POLICY IF EXISTS "Users can create own favorites" ON "favorites";
CREATE POLICY "Users can create own favorites" ON "favorites"
  FOR INSERT WITH CHECK (
    "userId" = auth.uid()::text AND
    auth.uid() IS NOT NULL AND
    -- Can only favorite published posts
    EXISTS (
      SELECT 1 FROM "posts" 
      WHERE "id" = "postId" AND "isPublished" = true AND "status" = 'APPROVED'
    )
  );

-- Users can delete their own favorites
DROP POLICY IF EXISTS "Users can delete own favorites" ON "favorites";
CREATE POLICY "Users can delete own favorites" ON "favorites"
  FOR DELETE USING (
    "userId" = auth.uid()::text
  );

-- Admins can read all favorites (for analytics)
DROP POLICY IF EXISTS "Admins can read all favorites" ON "favorites";
CREATE POLICY "Admins can read all favorites" ON "favorites"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- Public can read favorite counts for posts (anonymous aggregation)
DROP POLICY IF EXISTS "Public can read favorite counts" ON "favorites";
CREATE POLICY "Public can read favorite counts" ON "favorites"
  FOR SELECT USING (
    -- This will be used for counting only, not individual records
    true
  );

-- =============================================
-- VIEWS TABLE POLICIES
-- =============================================

-- Anyone can create views for published posts (for analytics)
DROP POLICY IF EXISTS "Anyone can create post views" ON "views";
CREATE POLICY "Anyone can create post views" ON "views"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "posts" 
      WHERE "id" = "postId" AND "isPublished" = true AND "status" = 'APPROVED'
    )
  );

-- Only admins can read view data
DROP POLICY IF EXISTS "Admins can read all views" ON "views";
CREATE POLICY "Admins can read all views" ON "views"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- Public can read view counts for posts (anonymous aggregation)
DROP POLICY IF EXISTS "Public can read view counts" ON "views";
CREATE POLICY "Public can read view counts" ON "views"
  FOR SELECT USING (
    -- This will be used for counting only, not individual records
    true
  );

-- =============================================
-- LOGS TABLE POLICIES
-- =============================================

-- Only admins can read logs
DROP POLICY IF EXISTS "Admins can read all logs" ON "logs";
CREATE POLICY "Admins can read all logs" ON "logs"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "users" 
      WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
    )
  );

-- System can create logs (for audit trail)
DROP POLICY IF EXISTS "System can create logs" ON "logs";
CREATE POLICY "System can create logs" ON "logs"
  FOR INSERT WITH CHECK (
    -- Allow system to create logs
    true
  );

-- Users can read their own logs
DROP POLICY IF EXISTS "Users can read own logs" ON "logs";
CREATE POLICY "Users can read own logs" ON "logs"
  FOR SELECT USING (
    "userId" = auth.uid()::text
  );

-- =============================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================

-- Function to check if user is admin
-- CREATE OR REPLACE is already idempotent
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "users" 
    WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has premium access
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

-- Function to check if post is accessible to user
CREATE OR REPLACE FUNCTION can_access_post(post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  post_record RECORD;
BEGIN
  SELECT "isPremium", "isFeatured", "isPublished", "status", "authorId"
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
  
  -- Public post (featured posts are publicly accessible)
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INDEXES FOR RLS PERFORMANCE
-- =============================================

-- Ensure we have indexes on columns used in RLS policies
-- CREATE INDEX IF NOT EXISTS is already idempotent
CREATE INDEX IF NOT EXISTS idx_users_id_role 
  ON "users"("id", "role");

CREATE INDEX IF NOT EXISTS idx_users_id_type_subscription 
  ON "users"("id", "type", "stripe_current_period_end");

CREATE INDEX IF NOT EXISTS idx_posts_published_status 
  ON "posts"("isPublished", "status");

CREATE INDEX IF NOT EXISTS idx_posts_author_published 
  ON "posts"("authorId", "isPublished", "status");

-- Featured posts indexes for RLS optimization
CREATE INDEX IF NOT EXISTS idx_posts_featured_published 
  ON "posts"("isFeatured", "isPublished");

CREATE INDEX IF NOT EXISTS idx_posts_featured_author 
  ON "posts"("isFeatured", "authorId");

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_post 
  ON "bookmarks"("userId", "postId");

CREATE INDEX IF NOT EXISTS idx_favorites_user_post 
  ON "favorites"("userId", "postId");

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON "users" TO authenticated;
GRANT UPDATE ON "users" TO authenticated;

GRANT SELECT ON "categories" TO anon, authenticated;
GRANT ALL ON "categories" TO authenticated;

GRANT SELECT ON "tags" TO anon, authenticated;
GRANT ALL ON "tags" TO authenticated;

GRANT SELECT ON "posts" TO anon, authenticated;
GRANT ALL ON "posts" TO authenticated;

GRANT ALL ON "bookmarks" TO authenticated;
GRANT ALL ON "favorites" TO authenticated;
GRANT INSERT ON "views" TO anon, authenticated;
GRANT SELECT ON "views" TO authenticated;
GRANT ALL ON "logs" TO authenticated;

-- =============================================
-- SECURITY NOTES
-- =============================================

/*
IMPORTANT SECURITY CONSIDERATIONS:

1. These policies assume your application uses Supabase Auth
2. The auth.uid() function returns the authenticated user's ID
3. Premium content access is controlled by subscription status
4. Admins have full access to all data
5. Authors can only modify their own content (except admin-only fields like isFeatured)
6. Featured posts are admin-only - only admins can set/unset featured status
7. View tracking is anonymous but auditable
8. Logs are restricted to admins and individual users

TESTING RECOMMENDATIONS:

1. Test with different user roles (admin, premium, free)
2. Verify premium content is properly restricted
3. Test bookmark/favorite creation and deletion
4. Ensure view tracking works for anonymous users
5. Verify audit logs are properly restricted
6. Test featured posts functionality (admin-only access)
7. Verify authors cannot change featured status of their posts

MONITORING:

1. Monitor RLS policy performance with slow query logs
2. Use EXPLAIN ANALYZE on queries to check policy overhead
3. Consider policy optimization if performance issues arise
4. Regularly audit user permissions and access patterns
5. Monitor featured posts access patterns and performance
*/
