// Re-export all actions from their respective modules

// Authentication actions
export {
  signInAction,
  signUpAction,
  magicLinkAction,
  oauthAction,
  signOutAction,
  handleAuthRedirect,
} from "./auth";

// Bookmark actions
export {
  toggleBookmarkAction,
  getUserBookmarksAction,
  checkBookmarkStatusAction,
} from "./bookmarks";

// Favorite actions
export {
  toggleFavoriteAction,
  getUserFavoritesAction,
  checkFavoriteStatusAction,
} from "./favorites";

// Post management actions
export { createPostAction, updatePostAction } from "./posts";

// Category management actions
export { createCategoryAction, updateCategoryAction } from "./categories";

// Tag management actions
export { createTagAction, updateTagAction } from "./tags";

// User profile actions
export { updateUserProfileAction, getUserProfileAction } from "./users";
