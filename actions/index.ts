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
export {
  createPostAction,
  updatePostAction,
  togglePostPublishAction,
  deletePostAction,
  approvePostAction,
  rejectPostAction,
} from "./posts";

// Category management actions
export {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "./categories";

// Tag management actions
export { createTagAction, updateTagAction, deleteTagAction } from "./tags";

// Automation actions
export * from "./automation";

// User profile actions
export {
  updateUserProfileAction,
  getUserProfileAction,
  getUserDashboardStatsAction,
  getUserFavoritesCountAction,
  getAdminDashboardStatsAction,
  getAllUsersActivityAction,
} from "./users";
