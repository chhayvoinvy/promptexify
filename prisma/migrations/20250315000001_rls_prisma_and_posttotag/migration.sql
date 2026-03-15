-- RLS for tables reported by Supabase linter (rls_disabled_in_public)
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

-- =============================================================================
-- _prisma_migrations (Prisma migration history)
-- Only Prisma CLI / service role should access; deny all via PostgREST.
-- =============================================================================
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;

-- No permissive policies: anon and authenticated get no access.
-- Roles with BYPASSRLS (e.g. connection pooler for Prisma) can still access.

-- =============================================================================
-- _PostToTag (Prisma implicit many-to-many: Post <-> Tag)
-- Columns: A = post id, B = tag id (first model alphabetically = Post)
-- =============================================================================
ALTER TABLE public."_PostToTag" ENABLE ROW LEVEL SECURITY;

-- Anyone can read (tags are public; post visibility enforced on posts table)
CREATE POLICY "_PostToTag_select_all"
  ON public."_PostToTag" FOR SELECT
  USING (true);

-- Only post author or admin can add/remove tag links
CREATE POLICY "_PostToTag_insert_author_or_admin"
  ON public."_PostToTag" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = "A"
      AND (posts."authorId" = auth.uid()::text OR public.current_user_is_admin())
    )
  );

CREATE POLICY "_PostToTag_delete_author_or_admin"
  ON public."_PostToTag" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = "A"
      AND (posts."authorId" = auth.uid()::text OR public.current_user_is_admin())
    )
  );
