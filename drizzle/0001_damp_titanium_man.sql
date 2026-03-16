ALTER TABLE "bookmarks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "favorites" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "_PostToTag" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "_prisma_migrations" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_authorId_fkey";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_categoryId_fkey";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_postId_fkey";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_userId_fkey";
--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_postId_fkey";
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_fkey";
--> statement-breakpoint
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_postId_fkey";
--> statement-breakpoint
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_userId_fkey";
--> statement-breakpoint
ALTER TABLE "_PostToTag" DROP CONSTRAINT "_PostToTag_A_fkey";
--> statement-breakpoint
ALTER TABLE "_PostToTag" DROP CONSTRAINT "_PostToTag_B_fkey";
--> statement-breakpoint
DROP INDEX "users_createdAt_idx";--> statement-breakpoint
DROP INDEX "users_email_key";--> statement-breakpoint
DROP INDEX "users_id_type_stripe_current_period_end_idx";--> statement-breakpoint
DROP INDEX "users_stripe_customer_id_key";--> statement-breakpoint
DROP INDEX "users_stripe_subscription_id_key";--> statement-breakpoint
DROP INDEX "tags_createdAt_idx";--> statement-breakpoint
DROP INDEX "tags_name_key";--> statement-breakpoint
DROP INDEX "tags_slug_key";--> statement-breakpoint
DROP INDEX "posts_authorId_createdAt_idx";--> statement-breakpoint
DROP INDEX "posts_authorId_isPublished_status_idx";--> statement-breakpoint
DROP INDEX "posts_authorId_status_createdAt_idx";--> statement-breakpoint
DROP INDEX "posts_authorId_status_idx";--> statement-breakpoint
DROP INDEX "posts_categoryId_isPublished_createdAt_idx";--> statement-breakpoint
DROP INDEX "posts_isFeatured_isPublished_idx";--> statement-breakpoint
DROP INDEX "posts_isPremium_isPublished_idx";--> statement-breakpoint
DROP INDEX "posts_isPublished_createdAt_idx";--> statement-breakpoint
DROP INDEX "posts_isPublished_isPremium_createdAt_idx";--> statement-breakpoint
DROP INDEX "posts_slug_key";--> statement-breakpoint
DROP INDEX "posts_status_createdAt_idx";--> statement-breakpoint
DROP INDEX "bookmarks_postId_idx";--> statement-breakpoint
DROP INDEX "bookmarks_userId_createdAt_idx";--> statement-breakpoint
DROP INDEX "bookmarks_userId_postId_key";--> statement-breakpoint
DROP INDEX "media_createdAt_idx";--> statement-breakpoint
DROP INDEX "media_filename_key";--> statement-breakpoint
DROP INDEX "media_mimeType_idx";--> statement-breakpoint
DROP INDEX "media_postId_idx";--> statement-breakpoint
DROP INDEX "media_relativePath_idx";--> statement-breakpoint
DROP INDEX "media_uploadedBy_idx";--> statement-breakpoint
DROP INDEX "categories_name_key";--> statement-breakpoint
DROP INDEX "categories_parentId_idx";--> statement-breakpoint
DROP INDEX "categories_parentId_name_idx";--> statement-breakpoint
DROP INDEX "categories_slug_key";--> statement-breakpoint
DROP INDEX "favorites_postId_createdAt_idx";--> statement-breakpoint
DROP INDEX "favorites_postId_idx";--> statement-breakpoint
DROP INDEX "favorites_userId_createdAt_idx";--> statement-breakpoint
DROP INDEX "favorites_userId_postId_key";--> statement-breakpoint
DROP INDEX "logs_action_createdAt_idx";--> statement-breakpoint
DROP INDEX "logs_createdAt_idx";--> statement-breakpoint
DROP INDEX "logs_entityType_entityId_idx";--> statement-breakpoint
DROP INDEX "logs_severity_action_createdAt_idx";--> statement-breakpoint
DROP INDEX "logs_severity_createdAt_idx";--> statement-breakpoint
DROP INDEX "logs_userId_action_createdAt_idx";--> statement-breakpoint
DROP INDEX "logs_userId_createdAt_idx";--> statement-breakpoint
DROP INDEX "settings_createdAt_idx";--> statement-breakpoint
DROP INDEX "settings_storageType_idx";--> statement-breakpoint
DROP INDEX "settings_updatedAt_idx";--> statement-breakpoint
DROP INDEX "settings_updatedBy_idx";--> statement-breakpoint
DROP INDEX "_PostToTag_B_index";--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "users_id_role_idx";--> statement-breakpoint
DROP INDEX "users_stripe_customer_id_idx";--> statement-breakpoint
DROP INDEX "users_type_role_idx";--> statement-breakpoint
DROP INDEX "tags_name_idx";--> statement-breakpoint
DROP INDEX "tags_slug_idx";--> statement-breakpoint
DROP INDEX "categories_name_idx";--> statement-breakpoint
DROP INDEX "categories_slug_idx";--> statement-breakpoint
ALTER TABLE "_PostToTag" DROP CONSTRAINT "_PostToTag_AB_pkey";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "stripe_current_period_end" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "isPremium" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "isFeatured" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "isPublished" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "duration" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "storageType" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "maxImageSize" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "maxVideoSize" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "enableCompression" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "compressionQuality" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "maxTagsPerPost" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "enableCaptcha" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "requireApproval" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "maxPostsPerDay" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "maxUploadsPerHour" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "enableAuditLogging" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "createdAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "postsPageSize" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "featuredPostsLimit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_posts_id_fk" FOREIGN KEY ("A") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_tags_id_fk" FOREIGN KEY ("B") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_id_type_stripe_idx" ON "users" USING btree ("id","type","stripe_current_period_end");--> statement-breakpoint
CREATE INDEX "users_created_at_desc_idx" ON "users" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "tags_created_at_desc_idx" ON "tags" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "posts_is_published_created_at_idx" ON "posts" USING btree ("isPublished","createdAt");--> statement-breakpoint
CREATE INDEX "posts_category_published_created_idx" ON "posts" USING btree ("categoryId","isPublished","createdAt");--> statement-breakpoint
CREATE INDEX "posts_author_created_at_idx" ON "posts" USING btree ("authorId","createdAt");--> statement-breakpoint
CREATE INDEX "posts_is_premium_is_published_idx" ON "posts" USING btree ("isPremium","isPublished");--> statement-breakpoint
CREATE INDEX "posts_is_featured_is_published_idx" ON "posts" USING btree ("isFeatured","isPublished");--> statement-breakpoint
CREATE INDEX "posts_status_created_at_idx" ON "posts" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "posts_published_premium_created_idx" ON "posts" USING btree ("isPublished","isPremium","createdAt");--> statement-breakpoint
CREATE INDEX "posts_author_status_idx" ON "posts" USING btree ("authorId","status");--> statement-breakpoint
CREATE INDEX "posts_author_published_status_idx" ON "posts" USING btree ("authorId","isPublished","status");--> statement-breakpoint
CREATE INDEX "posts_author_status_created_idx" ON "posts" USING btree ("authorId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_id_post_id_key" ON "bookmarks" USING btree ("userId","postId");--> statement-breakpoint
CREATE INDEX "bookmarks_user_created_at_idx" ON "bookmarks" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "bookmarks_post_id_idx" ON "bookmarks" USING btree ("postId");--> statement-breakpoint
CREATE INDEX "media_relative_path_idx" ON "media" USING btree ("relativePath");--> statement-breakpoint
CREATE INDEX "media_post_id_idx" ON "media" USING btree ("postId");--> statement-breakpoint
CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploadedBy");--> statement-breakpoint
CREATE INDEX "media_mime_type_idx" ON "media" USING btree ("mimeType");--> statement-breakpoint
CREATE INDEX "media_created_at_desc_idx" ON "media" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "categories_parent_id_name_idx" ON "categories" USING btree ("parentId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_id_post_id_key" ON "favorites" USING btree ("userId","postId");--> statement-breakpoint
CREATE INDEX "favorites_user_created_at_idx" ON "favorites" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "favorites_post_id_idx" ON "favorites" USING btree ("postId");--> statement-breakpoint
CREATE INDEX "favorites_post_created_at_idx" ON "favorites" USING btree ("postId","createdAt");--> statement-breakpoint
CREATE INDEX "logs_created_at_desc_idx" ON "logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "logs_user_created_at_idx" ON "logs" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "logs_action_created_at_idx" ON "logs" USING btree ("action","createdAt");--> statement-breakpoint
CREATE INDEX "logs_severity_created_at_idx" ON "logs" USING btree ("severity","createdAt");--> statement-breakpoint
CREATE INDEX "logs_entity_type_id_idx" ON "logs" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "logs_severity_action_created_idx" ON "logs" USING btree ("severity","action","createdAt");--> statement-breakpoint
CREATE INDEX "logs_user_action_created_idx" ON "logs" USING btree ("userId","action","createdAt");--> statement-breakpoint
CREATE INDEX "settings_storage_type_idx" ON "settings" USING btree ("storageType");--> statement-breakpoint
CREATE INDEX "settings_updated_by_idx" ON "settings" USING btree ("updatedBy");--> statement-breakpoint
CREATE INDEX "settings_created_at_desc_idx" ON "settings" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "settings_updated_at_desc_idx" ON "settings" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_id_role_idx" ON "users" USING btree ("id","role");--> statement-breakpoint
CREATE INDEX "users_stripe_customer_id_idx" ON "users" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "users_type_role_idx" ON "users" USING btree ("type","role");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_filename_unique" UNIQUE("filename");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_unique" UNIQUE("slug");--> statement-breakpoint
DROP POLICY "users_delete_admin_only" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "users_insert_own" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "users_select_own_or_admin" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "users_update_own" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "tags_delete_admin" ON "tags" CASCADE;--> statement-breakpoint
DROP POLICY "tags_insert_admin" ON "tags" CASCADE;--> statement-breakpoint
DROP POLICY "tags_select_all" ON "tags" CASCADE;--> statement-breakpoint
DROP POLICY "tags_update_admin" ON "tags" CASCADE;--> statement-breakpoint
DROP POLICY "posts_delete_author_or_admin" ON "posts" CASCADE;--> statement-breakpoint
DROP POLICY "posts_insert_authenticated" ON "posts" CASCADE;--> statement-breakpoint
DROP POLICY "posts_select_published_or_own_or_admin" ON "posts" CASCADE;--> statement-breakpoint
DROP POLICY "posts_update_author_or_admin" ON "posts" CASCADE;--> statement-breakpoint
DROP POLICY "bookmarks_delete_own" ON "bookmarks" CASCADE;--> statement-breakpoint
DROP POLICY "bookmarks_insert_own" ON "bookmarks" CASCADE;--> statement-breakpoint
DROP POLICY "bookmarks_select_own" ON "bookmarks" CASCADE;--> statement-breakpoint
DROP POLICY "bookmarks_update_own" ON "bookmarks" CASCADE;--> statement-breakpoint
DROP POLICY "media_delete_owner_or_admin" ON "media" CASCADE;--> statement-breakpoint
DROP POLICY "media_insert_authenticated" ON "media" CASCADE;--> statement-breakpoint
DROP POLICY "media_select_all" ON "media" CASCADE;--> statement-breakpoint
DROP POLICY "media_update_owner_or_admin" ON "media" CASCADE;--> statement-breakpoint
DROP POLICY "categories_delete_admin" ON "categories" CASCADE;--> statement-breakpoint
DROP POLICY "categories_insert_admin" ON "categories" CASCADE;--> statement-breakpoint
DROP POLICY "categories_select_all" ON "categories" CASCADE;--> statement-breakpoint
DROP POLICY "categories_update_admin" ON "categories" CASCADE;--> statement-breakpoint
DROP POLICY "favorites_delete_own" ON "favorites" CASCADE;--> statement-breakpoint
DROP POLICY "favorites_insert_own" ON "favorites" CASCADE;--> statement-breakpoint
DROP POLICY "favorites_select_own" ON "favorites" CASCADE;--> statement-breakpoint
DROP POLICY "favorites_update_own" ON "favorites" CASCADE;--> statement-breakpoint
DROP POLICY "logs_insert_authenticated" ON "logs" CASCADE;--> statement-breakpoint
DROP POLICY "logs_select_admin" ON "logs" CASCADE;--> statement-breakpoint
DROP POLICY "settings_delete_admin" ON "settings" CASCADE;--> statement-breakpoint
DROP POLICY "settings_insert_admin" ON "settings" CASCADE;--> statement-breakpoint
DROP POLICY "settings_select_admin" ON "settings" CASCADE;--> statement-breakpoint
DROP POLICY "settings_update_admin" ON "settings" CASCADE;--> statement-breakpoint
DROP POLICY "_PostToTag_delete_author_or_admin" ON "_PostToTag" CASCADE;--> statement-breakpoint
DROP POLICY "_PostToTag_insert_author_or_admin" ON "_PostToTag" CASCADE;--> statement-breakpoint
DROP POLICY "_PostToTag_select_all" ON "_PostToTag" CASCADE;