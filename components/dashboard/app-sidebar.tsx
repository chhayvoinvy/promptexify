"use client";

import * as React from "react";
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconHelp,
  IconInnerShadowTop,
  IconReport,
  IconSearch,
  IconSettings,
  IconEdit,
  IconTags,
  IconCategory,
  IconBookmark,
  IconHeart,
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
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "/dashboard/capture",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard/capture/active",
        },
        {
          title: "Archived",
          url: "/dashboard/capture/archived",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "/dashboard/proposals",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard/proposals/active",
        },
        {
          title: "Archived",
          url: "/dashboard/proposals/archived",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "/dashboard/prompts",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard/prompts/active",
        },
        {
          title: "Archived",
          url: "/dashboard/prompts/archived",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
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
  ],
  pages: [
    {
      name: "About us",
      url: "/about",
      icon: IconDatabase,
    },
    {
      name: "Contact us",
      url: "/contact",
      icon: IconReport,
    },
    {
      name: "Privacy Policy",
      url: "/privacy",
      icon: IconFileWord,
    },
  ],
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
        <NavMain items={navigationData.navMain} />
        <NavDocuments items={navigationData.pages} />
        {user.userData?.role === "ADMIN" && (
          <NavDocuments
            items={navigationData.contentManagement.map((item) => ({
              name: item.title,
              url: item.url,
              icon: item.icon,
            }))}
          />
        )}
        <NavSecondary items={navigationData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
