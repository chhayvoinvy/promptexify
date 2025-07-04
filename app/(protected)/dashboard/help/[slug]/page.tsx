import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import Link from "next/link";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function HelpArticlePage({ params }: Props) {
  // Get current user and check authentication
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Await params before accessing properties (Next.js 15 requirement)
  const { slug } = await params;

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
            {/* Back Button */}
            <div className="flex items-center gap-2 mt-4 ml-4 mb-8">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/help">
                  <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" />
                  Back to Help Center
                </Link>
              </Button>
            </div>
            <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
              {/* Article Header */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icons.helpCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                      Help Article Not Available
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      The help article "{slug}" is currently not available. Please contact support for assistance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30 rounded-lg p-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold mb-1">Need Help?</h3>
                  <p className="text-sm text-muted-foreground">
                    Contact our support team for assistance with your questions.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="mailto:feedback@promptexify.com">
                      Send Feedback
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="mailto:support@promptexify.com">
                      Contact Support
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Navigation */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Help Center</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse available help resources
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 p-0"
                    asChild
                  >
                    <Link href="/dashboard/help">
                      <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" />
                      Help Center
                    </Link>
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Return to your dashboard
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 p-0"
                    asChild
                  >
                    <Link href="/dashboard">
                      Dashboard
                      <Icons.arrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
