-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."OAuthProvider" AS ENUM('GOOGLE', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."PostStatus" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."StorageType" AS ENUM('S3', 'LOCAL', 'DOSPACE');--> statement-breakpoint
CREATE TYPE "public"."UploadFileType" AS ENUM('IMAGE', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."UserType" AS ENUM('FREE', 'PREMIUM');--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"type" "UserType" DEFAULT 'FREE' NOT NULL,
	"role" "UserRole" DEFAULT 'USER' NOT NULL,
	"oauth" "OAuthProvider" NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"stripe_current_period_end" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"isPremium" boolean DEFAULT false NOT NULL,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"status" "PostStatus" DEFAULT 'DRAFT' NOT NULL,
	"authorId" text NOT NULL,
	"categoryId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"blurData" text,
	"uploadFileType" "UploadFileType",
	"uploadPath" text,
	"previewPath" text,
	"previewVideoPath" text
);
--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"postId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"relativePath" text NOT NULL,
	"originalName" text NOT NULL,
	"mimeType" text NOT NULL,
	"fileSize" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration" double precision,
	"uploadedBy" text NOT NULL,
	"postId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"blurDataUrl" text
);
--> statement-breakpoint
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parentId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"postId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"userId" text,
	"entityType" text NOT NULL,
	"entityId" text,
	"ipAddress" text,
	"userAgent" text,
	"metadata" jsonb,
	"severity" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"storageType" "StorageType" DEFAULT 'S3' NOT NULL,
	"s3BucketName" text,
	"s3Region" text,
	"s3AccessKeyId" text,
	"s3SecretKey" text,
	"s3CloudfrontUrl" text,
	"doSpaceName" text,
	"doRegion" text,
	"doAccessKeyId" text,
	"doSecretKey" text,
	"doCdnUrl" text,
	"localBasePath" text DEFAULT '/uploads',
	"localBaseUrl" text DEFAULT '/uploads',
	"maxImageSize" integer DEFAULT 2097152 NOT NULL,
	"maxVideoSize" integer DEFAULT 10485760 NOT NULL,
	"enableCompression" boolean DEFAULT true NOT NULL,
	"compressionQuality" integer DEFAULT 80 NOT NULL,
	"maxTagsPerPost" integer DEFAULT 20 NOT NULL,
	"enableCaptcha" boolean DEFAULT false NOT NULL,
	"requireApproval" boolean DEFAULT true NOT NULL,
	"maxPostsPerDay" integer DEFAULT 10 NOT NULL,
	"maxUploadsPerHour" integer DEFAULT 20 NOT NULL,
	"enableAuditLogging" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"updatedBy" text NOT NULL,
	"postsPageSize" integer DEFAULT 12 NOT NULL,
	"featuredPostsLimit" integer DEFAULT 12 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "_PostToTag" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_PostToTag_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
ALTER TABLE "_PostToTag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "users_createdAt_idx" ON "users" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_id_role_idx" ON "users" USING btree ("id" text_ops,"role" enum_ops);--> statement-breakpoint
CREATE INDEX "users_id_type_stripe_current_period_end_idx" ON "users" USING btree ("id" timestamp_ops,"type" text_ops,"stripe_current_period_end" text_ops);--> statement-breakpoint
CREATE INDEX "users_stripe_customer_id_idx" ON "users" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users" USING btree ("stripe_subscription_id" text_ops);--> statement-breakpoint
CREATE INDEX "users_type_role_idx" ON "users" USING btree ("type" enum_ops,"role" enum_ops);--> statement-breakpoint
CREATE INDEX "tags_createdAt_idx" ON "tags" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_key" ON "tags" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_key" ON "tags" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts" USING btree ("authorId" timestamp_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "posts_authorId_isPublished_status_idx" ON "posts" USING btree ("authorId" bool_ops,"isPublished" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "posts_authorId_status_createdAt_idx" ON "posts" USING btree ("authorId" enum_ops,"status" enum_ops,"createdAt" enum_ops);--> statement-breakpoint
CREATE INDEX "posts_authorId_status_idx" ON "posts" USING btree ("authorId" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "posts_categoryId_isPublished_createdAt_idx" ON "posts" USING btree ("categoryId" bool_ops,"isPublished" timestamp_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "posts_isFeatured_isPublished_idx" ON "posts" USING btree ("isFeatured" bool_ops,"isPublished" bool_ops);--> statement-breakpoint
CREATE INDEX "posts_isPremium_isPublished_idx" ON "posts" USING btree ("isPremium" bool_ops,"isPublished" bool_ops);--> statement-breakpoint
CREATE INDEX "posts_isPublished_createdAt_idx" ON "posts" USING btree ("isPublished" timestamp_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "posts_isPublished_isPremium_createdAt_idx" ON "posts" USING btree ("isPublished" bool_ops,"isPremium" timestamp_ops,"createdAt" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_key" ON "posts" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "posts_status_createdAt_idx" ON "posts" USING btree ("status" timestamp_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "bookmarks_postId_idx" ON "bookmarks" USING btree ("postId" text_ops);--> statement-breakpoint
CREATE INDEX "bookmarks_userId_createdAt_idx" ON "bookmarks" USING btree ("userId" timestamp_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_userId_postId_key" ON "bookmarks" USING btree ("userId" text_ops,"postId" text_ops);--> statement-breakpoint
CREATE INDEX "media_createdAt_idx" ON "media" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "media_filename_key" ON "media" USING btree ("filename" text_ops);--> statement-breakpoint
CREATE INDEX "media_mimeType_idx" ON "media" USING btree ("mimeType" text_ops);--> statement-breakpoint
CREATE INDEX "media_postId_idx" ON "media" USING btree ("postId" text_ops);--> statement-breakpoint
CREATE INDEX "media_relativePath_idx" ON "media" USING btree ("relativePath" text_ops);--> statement-breakpoint
CREATE INDEX "media_uploadedBy_idx" ON "media" USING btree ("uploadedBy" text_ops);--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_key" ON "categories" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "categories_parentId_idx" ON "categories" USING btree ("parentId" text_ops);--> statement-breakpoint
CREATE INDEX "categories_parentId_name_idx" ON "categories" USING btree ("parentId" text_ops,"name" text_ops);--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "favorites_postId_createdAt_idx" ON "favorites" USING btree ("postId" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "favorites_postId_idx" ON "favorites" USING btree ("postId" text_ops);--> statement-breakpoint
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites" USING btree ("userId" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_userId_postId_key" ON "favorites" USING btree ("userId" text_ops,"postId" text_ops);--> statement-breakpoint
CREATE INDEX "logs_action_createdAt_idx" ON "logs" USING btree ("action" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "logs_createdAt_idx" ON "logs" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "logs_entityType_entityId_idx" ON "logs" USING btree ("entityType" text_ops,"entityId" text_ops);--> statement-breakpoint
CREATE INDEX "logs_severity_action_createdAt_idx" ON "logs" USING btree ("severity" timestamp_ops,"action" text_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "logs_severity_createdAt_idx" ON "logs" USING btree ("severity" timestamp_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "logs_userId_action_createdAt_idx" ON "logs" USING btree ("userId" timestamp_ops,"action" text_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "logs_userId_createdAt_idx" ON "logs" USING btree ("userId" timestamp_ops,"createdAt" text_ops);--> statement-breakpoint
CREATE INDEX "settings_createdAt_idx" ON "settings" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "settings_storageType_idx" ON "settings" USING btree ("storageType" enum_ops);--> statement-breakpoint
CREATE INDEX "settings_updatedAt_idx" ON "settings" USING btree ("updatedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "settings_updatedBy_idx" ON "settings" USING btree ("updatedBy" text_ops);--> statement-breakpoint
CREATE INDEX "_PostToTag_B_index" ON "_PostToTag" USING btree ("B" text_ops);--> statement-breakpoint
CREATE POLICY "users_delete_admin_only" ON "users" AS PERMISSIVE FOR DELETE TO public USING (current_user_is_admin());--> statement-breakpoint
CREATE POLICY "users_insert_own" ON "users" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "users_select_own_or_admin" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "users_update_own" ON "users" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "tags_delete_admin" ON "tags" AS PERMISSIVE FOR DELETE TO public USING (current_user_is_admin());--> statement-breakpoint
CREATE POLICY "tags_insert_admin" ON "tags" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "tags_select_all" ON "tags" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "tags_update_admin" ON "tags" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "posts_delete_author_or_admin" ON "posts" AS PERMISSIVE FOR DELETE TO public USING ((("authorId" = (auth.uid())::text) OR current_user_is_admin()));--> statement-breakpoint
CREATE POLICY "posts_insert_authenticated" ON "posts" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "posts_select_published_or_own_or_admin" ON "posts" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "posts_update_author_or_admin" ON "posts" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "bookmarks_delete_own" ON "bookmarks" AS PERMISSIVE FOR DELETE TO public USING (("userId" = (auth.uid())::text));--> statement-breakpoint
CREATE POLICY "bookmarks_insert_own" ON "bookmarks" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "bookmarks_select_own" ON "bookmarks" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "bookmarks_update_own" ON "bookmarks" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "media_delete_owner_or_admin" ON "media" AS PERMISSIVE FOR DELETE TO public USING ((("uploadedBy" = (auth.uid())::text) OR current_user_is_admin()));--> statement-breakpoint
CREATE POLICY "media_insert_authenticated" ON "media" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "media_select_all" ON "media" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "media_update_owner_or_admin" ON "media" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "categories_delete_admin" ON "categories" AS PERMISSIVE FOR DELETE TO public USING (current_user_is_admin());--> statement-breakpoint
CREATE POLICY "categories_insert_admin" ON "categories" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "categories_select_all" ON "categories" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "categories_update_admin" ON "categories" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "favorites_delete_own" ON "favorites" AS PERMISSIVE FOR DELETE TO public USING (("userId" = (auth.uid())::text));--> statement-breakpoint
CREATE POLICY "favorites_insert_own" ON "favorites" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "favorites_select_own" ON "favorites" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "favorites_update_own" ON "favorites" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "logs_insert_authenticated" ON "logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "logs_select_admin" ON "logs" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "settings_delete_admin" ON "settings" AS PERMISSIVE FOR DELETE TO public USING (current_user_is_admin());--> statement-breakpoint
CREATE POLICY "settings_insert_admin" ON "settings" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "settings_select_admin" ON "settings" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "settings_update_admin" ON "settings" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "_PostToTag_delete_author_or_admin" ON "_PostToTag" AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = "_PostToTag"."A") AND ((posts."authorId" = (auth.uid())::text) OR current_user_is_admin())))));--> statement-breakpoint
CREATE POLICY "_PostToTag_insert_author_or_admin" ON "_PostToTag" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "_PostToTag_select_all" ON "_PostToTag" AS PERMISSIVE FOR SELECT TO public;
*/