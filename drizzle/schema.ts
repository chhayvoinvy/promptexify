import { pgTable, varchar, timestamp, text, integer, index, uniqueIndex, pgPolicy, foreignKey, boolean, doublePrecision, jsonb, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const oauthProvider = pgEnum("OAuthProvider", ['GOOGLE', 'EMAIL'])
export const postStatus = pgEnum("PostStatus", ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'])
export const storageType = pgEnum("StorageType", ['S3', 'LOCAL', 'DOSPACE'])
export const uploadFileType = pgEnum("UploadFileType", ['IMAGE', 'VIDEO'])
export const userRole = pgEnum("UserRole", ['USER', 'ADMIN'])
export const userType = pgEnum("UserType", ['FREE', 'PREMIUM'])


export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	avatar: text(),
	type: userType().default('FREE').notNull(),
	role: userRole().default('USER').notNull(),
	oauth: oauthProvider().notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripePriceId: text("stripe_price_id"),
	stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", { precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("users_createdAt_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_id_role_idx").using("btree", table.id.asc().nullsLast().op("text_ops"), table.role.asc().nullsLast().op("enum_ops")),
	index("users_id_type_stripe_current_period_end_idx").using("btree", table.id.asc().nullsLast().op("timestamp_ops"), table.type.asc().nullsLast().op("text_ops"), table.stripeCurrentPeriodEnd.asc().nullsLast().op("text_ops")),
	index("users_stripe_customer_id_idx").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("users_stripe_customer_id_key").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("users_stripe_subscription_id_key").using("btree", table.stripeSubscriptionId.asc().nullsLast().op("text_ops")),
	index("users_type_role_idx").using("btree", table.type.asc().nullsLast().op("enum_ops"), table.role.asc().nullsLast().op("enum_ops")),
	pgPolicy("users_delete_admin_only", { as: "permissive", for: "delete", to: ["public"], using: sql`current_user_is_admin()` }),
	pgPolicy("users_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("users_select_own_or_admin", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("users_update_own", { as: "permissive", for: "update", to: ["public"] }),
]);

export const tags = pgTable("tags", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("tags_createdAt_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("tags_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	uniqueIndex("tags_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("tags_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	uniqueIndex("tags_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("tags_delete_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`current_user_is_admin()` }),
	pgPolicy("tags_insert_admin", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("tags_select_all", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("tags_update_admin", { as: "permissive", for: "update", to: ["public"] }),
]);

export const posts = pgTable("posts", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	slug: text().notNull(),
	description: text(),
	content: text().notNull(),
	isPremium: boolean().default(false).notNull(),
	isFeatured: boolean().default(false).notNull(),
	isPublished: boolean().default(false).notNull(),
	status: postStatus().default('DRAFT').notNull(),
	authorId: text().notNull(),
	categoryId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	blurData: text(),
	uploadFileType: uploadFileType(),
	uploadPath: text(),
	previewPath: text(),
	previewVideoPath: text(),
}, (table) => [
	index("posts_authorId_createdAt_idx").using("btree", table.authorId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("posts_authorId_isPublished_status_idx").using("btree", table.authorId.asc().nullsLast().op("bool_ops"), table.isPublished.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("posts_authorId_status_createdAt_idx").using("btree", table.authorId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops"), table.createdAt.desc().nullsFirst().op("enum_ops")),
	index("posts_authorId_status_idx").using("btree", table.authorId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("posts_categoryId_isPublished_createdAt_idx").using("btree", table.categoryId.asc().nullsLast().op("bool_ops"), table.isPublished.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("posts_isFeatured_isPublished_idx").using("btree", table.isFeatured.asc().nullsLast().op("bool_ops"), table.isPublished.asc().nullsLast().op("bool_ops")),
	index("posts_isPremium_isPublished_idx").using("btree", table.isPremium.asc().nullsLast().op("bool_ops"), table.isPublished.asc().nullsLast().op("bool_ops")),
	index("posts_isPublished_createdAt_idx").using("btree", table.isPublished.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("posts_isPublished_isPremium_createdAt_idx").using("btree", table.isPublished.asc().nullsLast().op("bool_ops"), table.isPremium.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("bool_ops")),
	uniqueIndex("posts_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("posts_status_createdAt_idx").using("btree", table.status.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "posts_authorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "posts_categoryId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	pgPolicy("posts_delete_author_or_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`(("authorId" = (auth.uid())::text) OR current_user_is_admin())` }),
	pgPolicy("posts_insert_authenticated", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("posts_select_published_or_own_or_admin", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("posts_update_author_or_admin", { as: "permissive", for: "update", to: ["public"] }),
]);

export const bookmarks = pgTable("bookmarks", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	postId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("bookmarks_postId_idx").using("btree", table.postId.asc().nullsLast().op("text_ops")),
	index("bookmarks_userId_createdAt_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	uniqueIndex("bookmarks_userId_postId_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.postId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "bookmarks_postId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bookmarks_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	pgPolicy("bookmarks_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`("userId" = (auth.uid())::text)` }),
	pgPolicy("bookmarks_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("bookmarks_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("bookmarks_update_own", { as: "permissive", for: "update", to: ["public"] }),
]);

export const media = pgTable("media", {
	id: text().primaryKey().notNull(),
	filename: text().notNull(),
	relativePath: text().notNull(),
	originalName: text().notNull(),
	mimeType: text().notNull(),
	fileSize: integer().notNull(),
	width: integer(),
	height: integer(),
	duration: doublePrecision(),
	uploadedBy: text().notNull(),
	postId: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	blurDataUrl: text(),
}, (table) => [
	index("media_createdAt_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	uniqueIndex("media_filename_key").using("btree", table.filename.asc().nullsLast().op("text_ops")),
	index("media_mimeType_idx").using("btree", table.mimeType.asc().nullsLast().op("text_ops")),
	index("media_postId_idx").using("btree", table.postId.asc().nullsLast().op("text_ops")),
	index("media_relativePath_idx").using("btree", table.relativePath.asc().nullsLast().op("text_ops")),
	index("media_uploadedBy_idx").using("btree", table.uploadedBy.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "media_postId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	pgPolicy("media_delete_owner_or_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`(("uploadedBy" = (auth.uid())::text) OR current_user_is_admin())` }),
	pgPolicy("media_insert_authenticated", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("media_select_all", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("media_update_owner_or_admin", { as: "permissive", for: "update", to: ["public"] }),
]);

export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	parentId: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("categories_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	uniqueIndex("categories_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("categories_parentId_idx").using("btree", table.parentId.asc().nullsLast().op("text_ops")),
	index("categories_parentId_name_idx").using("btree", table.parentId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("categories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	uniqueIndex("categories_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parentId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	pgPolicy("categories_delete_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`current_user_is_admin()` }),
	pgPolicy("categories_insert_admin", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("categories_select_all", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("categories_update_admin", { as: "permissive", for: "update", to: ["public"] }),
]);

export const favorites = pgTable("favorites", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	postId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("favorites_postId_createdAt_idx").using("btree", table.postId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("favorites_postId_idx").using("btree", table.postId.asc().nullsLast().op("text_ops")),
	index("favorites_userId_createdAt_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	uniqueIndex("favorites_userId_postId_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.postId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "favorites_postId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "favorites_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	pgPolicy("favorites_delete_own", { as: "permissive", for: "delete", to: ["public"], using: sql`("userId" = (auth.uid())::text)` }),
	pgPolicy("favorites_insert_own", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("favorites_select_own", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("favorites_update_own", { as: "permissive", for: "update", to: ["public"] }),
]);

export const logs = pgTable("logs", {
	id: text().primaryKey().notNull(),
	action: text().notNull(),
	userId: text(),
	entityType: text().notNull(),
	entityId: text(),
	ipAddress: text(),
	userAgent: text(),
	metadata: jsonb(),
	severity: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("logs_action_createdAt_idx").using("btree", table.action.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("logs_createdAt_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("logs_entityType_entityId_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("logs_severity_action_createdAt_idx").using("btree", table.severity.asc().nullsLast().op("timestamp_ops"), table.action.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("logs_severity_createdAt_idx").using("btree", table.severity.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("logs_userId_action_createdAt_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.action.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("logs_userId_createdAt_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	pgPolicy("logs_insert_authenticated", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`true`  }),
	pgPolicy("logs_select_admin", { as: "permissive", for: "select", to: ["public"] }),
]);

export const settings = pgTable("settings", {
	id: text().primaryKey().notNull(),
	storageType: storageType().default('S3').notNull(),
	s3BucketName: text(),
	s3Region: text(),
	s3AccessKeyId: text(),
	s3SecretKey: text(),
	s3CloudfrontUrl: text(),
	doSpaceName: text(),
	doRegion: text(),
	doAccessKeyId: text(),
	doSecretKey: text(),
	doCdnUrl: text(),
	localBasePath: text().default('/uploads'),
	localBaseUrl: text().default('/uploads'),
	maxImageSize: integer().default(2097152).notNull(),
	maxVideoSize: integer().default(10485760).notNull(),
	enableCompression: boolean().default(true).notNull(),
	compressionQuality: integer().default(80).notNull(),
	maxTagsPerPost: integer().default(20).notNull(),
	enableCaptcha: boolean().default(false).notNull(),
	requireApproval: boolean().default(true).notNull(),
	maxPostsPerDay: integer().default(10).notNull(),
	maxUploadsPerHour: integer().default(20).notNull(),
	enableAuditLogging: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	updatedBy: text().notNull(),
	postsPageSize: integer().default(12).notNull(),
	featuredPostsLimit: integer().default(12).notNull(),
}, (table) => [
	index("settings_createdAt_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("settings_storageType_idx").using("btree", table.storageType.asc().nullsLast().op("enum_ops")),
	index("settings_updatedAt_idx").using("btree", table.updatedAt.desc().nullsFirst().op("timestamp_ops")),
	index("settings_updatedBy_idx").using("btree", table.updatedBy.asc().nullsLast().op("text_ops")),
	pgPolicy("settings_delete_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`current_user_is_admin()` }),
	pgPolicy("settings_insert_admin", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("settings_select_admin", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("settings_update_admin", { as: "permissive", for: "update", to: ["public"] }),
]);

export const postToTag = pgTable("_PostToTag", {
	a: text("A").notNull(),
	b: text("B").notNull(),
}, (table) => [
	index().using("btree", table.b.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.a],
			foreignColumns: [posts.id],
			name: "_PostToTag_A_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.b],
			foreignColumns: [tags.id],
			name: "_PostToTag_B_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.a, table.b], name: "_PostToTag_AB_pkey"}),
	pgPolicy("_PostToTag_delete_author_or_admin", { as: "permissive", for: "delete", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM posts
  WHERE ((posts.id = "_PostToTag"."A") AND ((posts."authorId" = (auth.uid())::text) OR current_user_is_admin()))))` }),
	pgPolicy("_PostToTag_insert_author_or_admin", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("_PostToTag_select_all", { as: "permissive", for: "select", to: ["public"] }),
]);
