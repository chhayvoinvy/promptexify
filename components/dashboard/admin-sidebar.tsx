"use client";

import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconEdit,
  IconTags,
  IconCategory,
  IconBookmark,
  IconHeart,
  // IconUser,
} from "@tabler/icons-react";
import Link from "next/link";

import { NavDocuments } from "@/components/dashboard/nav-documents";
import { NavMain } from "@/components/dashboard/nav-main";
import { NavSecondary } from "@/components/dashboard/nav-secondary";
import { NavUser } from "@/components/dashboard/nav-user";
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

const navigationData = {
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
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
      adminOnly: true,
    },
  ],

  navSecondary: [
    // {
    //   title: "Account",
    //   url: "/dashboard/account",
    //   icon: IconUser,
    // },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
      adminOnly: true,
    },
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: IconHelp,
      adminOnly: true,
    },
    {
      title: "Search",
      url: "/directory",
      icon: IconSearch,
    },
  ],
  // pages: [
  //   {
  //     name: "About us",
  //     url: "/dashboard/about",
  //     icon: IconDatabase,
  //   },
  //   {
  //     name: "Contact us",
  //     url: "/dashboard/contact",
  //     icon: IconReport,
  //   },
  //   {
  //     name: "Privacy Policy",
  //     url: "/privacy",
  //     icon: IconFileWord,
  //   },
  // ],
  contentManagement: [
    {
      title: "Posts",
      url: "/dashboard/posts",
      icon: IconEdit,
    },
    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: IconCategory,
    },
    {
      title: "Tags",
      url: "/dashboard/tags",
      icon: IconTags,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const isAdmin = user.userData?.role === "ADMIN";

  const filteredNavMain = navigationData.navMain.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const filteredNavSecondary = navigationData.navSecondary.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Promptexify</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />

        {isAdmin && (
          <NavDocuments
            items={navigationData.contentManagement.map((item) => ({
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
