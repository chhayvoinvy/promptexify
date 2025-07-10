export const PAGE_TITLES = {
  "/dashboard": {
    title: "Dashboard",
    description: "Overview of your activity and saved content",
  },
  "/dashboard/favorites": {
    title: "Favorites",
    description: "Posts you've liked, organized by date",
  },
  "/dashboard/bookmarks": {
    title: "Your Bookmarks",
    description: "Your saved prompts and bookmarked content",
  },
  "/dashboard/account": {
    title: "Account Settings",
    description: "Manage your account information and preferences",
  },
  "/dashboard/posts": {
    title: "Posts Management",
    description: "Manage and organize your posts",
  },
  "/dashboard/posts/new": {
    title: "Create New Post",
    description: "Add a new post to your collection",
  },
  "/dashboard/categories": {
    title: "Categories Management",
    description: "Organize your content with categories",
  },
  "/dashboard/categories/new": {
    title: "Create New Category",
    description: "Add a new category to organize your content",
  },
  "/dashboard/tags": {
    title: "Tags Management",
    description: "Manage tags for better content organization",
  },
  "/dashboard/tags/new": {
    title: "Create New Tag",
    description: "Add a new tag for content organization",
  },
  "/dashboard/settings": {
    title: "Settings",
    description: "Configure your account and application preferences",
  },
  "/dashboard/billing": {
    title: "Billing",
    description: "Manage your subscription and billing information",
  },
  "/dashboard/automation": {
    title: "Automation",
    description: "Configure and manage automated workflows",
  },
} as const;

// Helper function to get title for a pathname
export function getPageTitle(pathname: string) {
  // Handle dynamic routes (edit pages)
  if (pathname.startsWith("/dashboard/posts/edit/")) {
    return {
      title: "Edit Post",
      description: "Update your post details",
    };
  }
  
  if (pathname.startsWith("/dashboard/categories/edit/")) {
    return {
      title: "Edit Category",
      description: "Update category details",
    };
  }
  
  if (pathname.startsWith("/dashboard/tags/edit/")) {
    return {
      title: "Edit Tag",
      description: "Update tag details",
    };
  }

  // Return exact match or default
  return PAGE_TITLES[pathname as keyof typeof PAGE_TITLES] || PAGE_TITLES["/dashboard"];
} 