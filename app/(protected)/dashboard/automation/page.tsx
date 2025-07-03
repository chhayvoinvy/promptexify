import React, { Suspense } from "react";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationDashboard } from "@/components/dashboard/automation-dashboard";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

function AutomationLoading() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-96 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-9 w-32 bg-muted rounded animate-pulse" />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                ))}
            </div>

            {/* Content Files Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-64 bg-muted rounded animate-pulse" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-40 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Generation Logs Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="h-6 w-36 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-56 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
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
        <div className="space-y-6">
            <AutomationDashboard />
        </div>
    );
}

export default async function AutomationPage() {
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
                    <Suspense fallback={<AutomationLoading />}>
                        <AutomationContent />
                    </Suspense>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}