-- Supabase RLS Policy Setup Script
-- Run this in your Supabase SQL Editor to fix security warnings
-- Updated with correct column names from Prisma schema

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id);

-- Posts table policies  
CREATE POLICY "Anyone can view published posts" ON public.posts
  FOR SELECT USING ("isPublished" = true AND status = 'APPROVED');

CREATE POLICY "Users can view own posts" ON public.posts
  FOR SELECT USING (auth.uid()::text = "authorId");

CREATE POLICY "Users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE USING (auth.uid()::text = "authorId");

CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid()::text = "authorId");

-- Categories table policies
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Tags table policies
CREATE POLICY "Anyone can view tags" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Bookmarks table policies
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid()::text = "userId");

-- Favorites table policies (similar to bookmarks)
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE USING (auth.uid()::text = "userId");

-- Views table policies (for analytics)
CREATE POLICY "Anyone can create views" ON public.views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view post views" ON public.views
  FOR SELECT USING (true);

-- Disable RLS on Prisma migration table (system table)
ALTER TABLE public._prisma_migrations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on PostToTag junction table (managed by Prisma)
ALTER TABLE public."_PostToTag" DISABLE ROW LEVEL SECURITY; 