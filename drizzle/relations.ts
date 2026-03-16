import { relations } from "drizzle-orm/relations";
import { users, posts, categories, bookmarks, media, favorites, postToTag, tags } from "./schema";

export const postsRelations = relations(posts, ({one, many}) => ({
	user: one(users, {
		fields: [posts.authorId],
		references: [users.id]
	}),
	category: one(categories, {
		fields: [posts.categoryId],
		references: [categories.id]
	}),
	bookmarks: many(bookmarks),
	media: many(media),
	favorites: many(favorites),
	postToTags: many(postToTag),
}));

export const usersRelations = relations(users, ({many}) => ({
	posts: many(posts),
	bookmarks: many(bookmarks),
	favorites: many(favorites),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	posts: many(posts),
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
}));

export const bookmarksRelations = relations(bookmarks, ({one}) => ({
	post: one(posts, {
		fields: [bookmarks.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [bookmarks.userId],
		references: [users.id]
	}),
}));

export const mediaRelations = relations(media, ({one}) => ({
	post: one(posts, {
		fields: [media.postId],
		references: [posts.id]
	}),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	post: one(posts, {
		fields: [favorites.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
}));

export const postToTagRelations = relations(postToTag, ({one}) => ({
	post: one(posts, {
		fields: [postToTag.a],
		references: [posts.id]
	}),
	tag: one(tags, {
		fields: [postToTag.b],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	postToTags: many(postToTag),
}));