import React, { Suspense } from "react";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationDashboard } from "@/components/dashboard/automation-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

function AutomationSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>

            {/* Content Files Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            </div>

            {/* Generation Logs Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                    ))}
                </div>
            </div>
        </div>
    );
}

async function AutomationContent() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/signin");
    }

    // Only allow admin access
    if (user.userData?.role !== "ADMIN") {
        redirect("/dashboard");
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
                <div className="flex flex-1 flex-col gap-4 p-6 lg:p-6">
                    <AutomationDashboard />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function AutomationPage() {
    return (
        <Suspense fallback={<AutomationSkeleton />}>
            <AutomationContent />
        </Suspense>
    );
}