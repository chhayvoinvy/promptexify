"use client";

import * as React from "react";
import {
  IconDashboard,
  IconHelp,
  IconSearch,
  IconSettings,
  IconEdit,
  IconTags,
  IconCategory,
  IconBookmark,
  IconHeart,
  type Icon,
} from "@tabler/icons-react";
import Link from "next/link";

import { NavDocuments } from "@/components/dashboard/nav-documents";
import { NavMain } from "@/components/dashboard/nav-main";
import { NavSecondary } from "@/components/dashboard/nav-secondary";
import { NavUser } from "@/components/dashboard/nav-user";
import { LogoCompact } from "@/components/ui/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
interface UserData {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  type: "FREE" | "PREMIUM";
  role: "USER" | "ADMIN";
  oauth: "GOOGLE" | "EMAIL";
}

interface User {
  email?: string;
  userData?: UserData | null;
}

interface NavigationItem {
  title: string;
  url: string;
  icon: Icon;
  adminOnly?: boolean;
  allowUser?: boolean;
}

const navigationData: {
  navMain: NavigationItem[];
  navSecondary: NavigationItem[];
  contentManagement: NavigationItem[];
} = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Bookmarks",
      url: "/dashboard/bookmarks",
      icon: IconBookmark,
    },
    {
      title: "Favorites",
      url: "/dashboard/favorites",
      icon: IconHeart,
    },
    // {
    //   title: "Billing",
    //   url: "/dashboard/billing",
    //   icon: IconCreditCard,
    // },
    // {
    //   title: "Analytics",
    //   url: "/dashboard/analytics",
    //   icon: IconChartBar,
    //   adminOnly: true,
    // },
  ],

  navSecondary: [
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "/directory",
      icon: IconSearch,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
      adminOnly: true, // Admin only
    },
  ],

  contentManagement: [
    {
      title: "Posts",
      url: "/dashboard/posts",
      icon: IconEdit,
      allowUser: true, // Allow both USER and ADMIN roles
    },
    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: IconCategory,
      adminOnly: true, // Admin only
    },
    {
      title: "Tags",
      url: "/dashboard/tags",
      icon: IconTags,
      adminOnly: true, // Admin only
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const isAdmin = user.userData?.role === "ADMIN";
  const isUser = user.userData?.role === "USER";

  const filteredNavMain = navigationData.navMain.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const filteredNavSecondary = navigationData.navSecondary.filter(
    (item) => !item.adminOnly || isAdmin
  );

  // Filter content management items based on user role
  const filteredContentManagement = navigationData.contentManagement
    .filter((item) => {
      if (item.adminOnly) return isAdmin;
      if (item.allowUser) return isAdmin || isUser;
      return isAdmin; // Default to admin only
    })
    .map((item) => {
      // Change "Posts" to "Contribute" for users
      if (item.title === "Posts" && isUser) {
        return {
          ...item,
          title: "Contribute",
        };
      }
      return item;
    });

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <LogoCompact />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />

        {/* Show content management section for both admins and users (filtered by permissions) */}
        {(isAdmin || isUser) && filteredContentManagement.length > 0 && (
          <NavDocuments
            items={filteredContentManagement.map((item) => ({
              name: item.title,
              url: item.url,
              icon: item.icon,
            }))}
          />
        )}
        <NavSecondary items={filteredNavSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
