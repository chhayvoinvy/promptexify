-- Row Level Security (RLS) for Supabase
-- Protects data when accessed via Supabase API (anon/authenticated roles).
-- Server-side Prisma connection typically uses a role with BYPASSRLS.

-- Helper: true if current user is admin (uses public.users.role)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'ADMIN'
  );
$$;

-- Helper: current user's id (auth.uid() from Supabase JWT)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- =============================================================================
-- USERS
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_or_admin"
  ON public.users FOR SELECT
  USING (
    id = auth.uid()::text
    OR public.current_user_is_admin()
  );

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "users_delete_admin_only"
  ON public.users FOR DELETE
  USING (public.current_user_is_admin());

-- =============================================================================
-- CATEGORIES (read all; write admin only)
-- =============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "categories_insert_admin"
  ON public.categories FOR INSERT
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "categories_update_admin"
  ON public.categories FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "categories_delete_admin"
  ON public.categories FOR DELETE
  USING (public.current_user_is_admin());

-- =============================================================================
-- TAGS (read all; write admin only)
-- =============================================================================
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_all"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "tags_insert_admin"
  ON public.tags FOR INSERT
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "tags_update_admin"
  ON public.tags FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "tags_delete_admin"
  ON public.tags FOR DELETE
  USING (public.current_user_is_admin());

-- =============================================================================
-- POSTS (public read published; author/admin full access; authenticated insert)
-- =============================================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_published_or_own_or_admin"
  ON public.posts FOR SELECT
  USING (
    "isPublished" = true
    OR "authorId" = auth.uid()::text
    OR public.current_user_is_admin()
  );

CREATE POLICY "posts_insert_authenticated"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK ("authorId" = auth.uid()::text);

CREATE POLICY "posts_update_author_or_admin"
  ON public.posts FOR UPDATE
  USING ("authorId" = auth.uid()::text OR public.current_user_is_admin())
  WITH CHECK ("authorId" = auth.uid()::text OR public.current_user_is_admin());

CREATE POLICY "posts_delete_author_or_admin"
  ON public.posts FOR DELETE
  USING ("authorId" = auth.uid()::text OR public.current_user_is_admin());

-- =============================================================================
-- BOOKMARKS (user sees only own rows)
-- =============================================================================
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT
  USING ("userId" = auth.uid()::text);

CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "bookmarks_update_own"
  ON public.bookmarks FOR UPDATE
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE
  USING ("userId" = auth.uid()::text);

-- =============================================================================
-- FAVORITES (user sees only own rows)
-- =============================================================================
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  USING ("userId" = auth.uid()::text);

CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "favorites_update_own"
  ON public.favorites FOR UPDATE
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING ("userId" = auth.uid()::text);

-- =============================================================================
-- LOGS (admin read; authenticated can insert for audit)
-- =============================================================================
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select_admin"
  ON public.logs FOR SELECT
  USING (public.current_user_is_admin());

CREATE POLICY "logs_insert_authenticated"
  ON public.logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- MEDIA (read all for listing; insert authenticated; update/delete owner or admin)
-- =============================================================================
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select_all"
  ON public.media FOR SELECT
  USING (true);

CREATE POLICY "media_insert_authenticated"
  ON public.media FOR INSERT
  TO authenticated
  WITH CHECK ("uploadedBy" = auth.uid()::text);

CREATE POLICY "media_update_owner_or_admin"
  ON public.media FOR UPDATE
  USING (
    "uploadedBy" = auth.uid()::text
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    "uploadedBy" = auth.uid()::text
    OR public.current_user_is_admin()
  );

CREATE POLICY "media_delete_owner_or_admin"
  ON public.media FOR DELETE
  USING (
    "uploadedBy" = auth.uid()::text
    OR public.current_user_is_admin()
  );

-- =============================================================================
-- SETTINGS (admin only; contains secrets)
-- =============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_admin"
  ON public.settings FOR SELECT
  USING (public.current_user_is_admin());

CREATE POLICY "settings_insert_admin"
  ON public.settings FOR INSERT
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "settings_update_admin"
  ON public.settings FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "settings_delete_admin"
  ON public.settings FOR DELETE
  USING (public.current_user_is_admin());
