"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface PageTitleConfig {
  title: string;
  description?: string;
}

export function usePageTitle(): PageTitleConfig {
  const pathname = usePathname();

  return useMemo(() => {
    // Default fallback
    let config: PageTitleConfig = { title: "Dashboard" };

    // Match routes and return appropriate titles
    if (pathname === "/dashboard") {
      config = {
        title: "Dashboard",
        description: "Overview of your activity and saved content",
      };
    } else if (pathname === "/dashboard/favorites") {
      config = {
        title: "Favorites",
        description: "Posts you've liked, organized by date",
      };
    } else if (pathname === "/dashboard/bookmarks") {
      config = {
        title: "Your Bookmarks",
        description: "Your saved prompts and bookmarked content",
      };
    } else if (pathname === "/dashboard/account") {
      config = {
        title: "Account Settings",
        description: "Manage your account information and preferences",
      };
    } else if (pathname === "/dashboard/posts") {
      config = {
        title: "Posts Management",
        description: "Manage and organize your posts",
      };
    } else if (pathname === "/dashboard/posts/new") {
      config = {
        title: "Create New Post",
        description: "Add a new post to your collection",
      };
    } else if (pathname.startsWith("/dashboard/posts/edit/")) {
      config = {
        title: "Edit Post",
        description: "Update your post details",
      };
    } else if (pathname === "/dashboard/categories") {
      config = {
        title: "Categories Management",
        description: "Organize your content with categories",
      };
    } else if (pathname === "/dashboard/categories/new") {
      config = {
        title: "Create New Category",
        description: "Add a new category to organize your content",
      };
    } else if (pathname.startsWith("/dashboard/categories/edit/")) {
      config = {
        title: "Edit Category",
        description: "Update category details",
      };
    } else if (pathname === "/dashboard/tags") {
      config = {
        title: "Tags Management",
        description: "Manage tags for better content organization",
      };
    } else if (pathname === "/dashboard/tags/new") {
      config = {
        title: "Create New Tag",
        description: "Add a new tag for content organization",
      };
    } else if (pathname.startsWith("/dashboard/tags/edit/")) {
      config = {
        title: "Edit Tag",
        description: "Update tag details",
      };
    }

    return config;
  }, [pathname]);
}
