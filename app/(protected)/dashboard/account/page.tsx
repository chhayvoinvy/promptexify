import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { getUserProfileAction } from "@/actions";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AccountForm } from "@/components/dashboard/account-form";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

async function AccountContent() {
  // Get user profile data
  const profileResult = await getUserProfileAction();

  if (!profileResult.success || !profileResult.user) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unable to Load Profile</h3>
          <p className="text-muted-foreground text-center">
            {profileResult.error ||
              "There was an error loading your profile. Please try again."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <AccountForm user={profileResult.user} />;
}

function AccountLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full max-w-md bg-muted rounded animate-pulse" />
            <div className="h-10 w-full max-w-md bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function AccountPage() {
  // Require authentication and check role access
  const user = await requireAuth();

  // Both USER and ADMIN can access account page
  // No additional role restriction needed

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
          <Suspense fallback={<AccountLoading />}>
            <AccountContent />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
