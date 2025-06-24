import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive";
import { DataTable } from "@/components/dashboard/data-table";
import { SectionCards } from "@/components/dashboard/section-cards";
import { SiteHeader } from "@/components/dashboard/site-header";
import { UserStatsCards } from "@/components/dashboard/user-stats-cards";
import { SecurityDashboard } from "@/components/dashboard/security-dashboard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserDashboardStatsAction,
  getUserFavoritesCountAction,
} from "@/actions/users";
import { redirect } from "next/navigation";
import { Shield, BarChart3 } from "lucide-react";

import data from "./data.json";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Get current user and check authentication
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // If user is a regular USER, show user dashboard
  if (user.userData?.role === "USER") {
    // Fetch user dashboard statistics
    const [dashboardStats, favoritesCount] = await Promise.all([
      getUserDashboardStatsAction(),
      getUserFavoritesCountAction(),
    ]);

    if (
      !dashboardStats.success ||
      !favoritesCount.success ||
      !dashboardStats.data
    ) {
      // Handle error gracefully
      return (
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" user={user} />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">
                  Unable to load dashboard
                </h2>
                <p className="text-muted-foreground">
                  Please try refreshing the page or contact support if the
                  problem persists.
                </p>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      );
    }

    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" user={user} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 p-4 md:p-6">
                {/* Welcome Message */}
                <div className="mb-6">
                  <p className="text-muted-foreground">
                    Here&apos;s an overview of your activity and saved content.
                  </p>
                </div>

                {/* User Statistics */}
                <UserStatsCards
                  totalBookmarks={dashboardStats.data.totalBookmarks}
                  totalFavorites={favoritesCount.totalFavorites || 0}
                  joinedDate={dashboardStats.data.joinedDate}
                  recentFavorites={dashboardStats.data.recentFavorites}
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // For ADMIN role, show the admin dashboard with tabs
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Admin Dashboard Header */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                      Monitor your platform&apos;s performance, security, and
                      content management
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Dashboard Tabs */}
              <div className="px-4 lg:px-6">
                <Tabs defaultValue="overview" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="overview"
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Security
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <SectionCards />
                    <ChartAreaInteractive />
                    <DataTable data={data} />
                  </TabsContent>

                  <TabsContent value="security" className="space-y-6">
                    <SecurityDashboard />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
