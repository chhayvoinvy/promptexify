import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createTagAction } from "@/app/actions";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default async function NewTagPage() {
  const user = await getCurrentUser();

  // Check if user is authenticated and has admin role
  if (!user) {
    redirect("/signin");
  }

  // Temporarily disabled for testing - uncomment to re-enable admin protection
  // if (user.userData?.role !== "ADMIN") {
  //   redirect("/dashboard");
  // }

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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/tags">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New Tag</h1>
              <p className="text-muted-foreground">
                Add a new tag to organize your content.
              </p>
            </div>
          </div>

          <form action={createTagAction} className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Tag Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tag Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter tag name"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    The display name for this tag (e.g., &quot;Machine
                    Learning&quot;)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="tag-slug (leave empty to auto-generate)"
                  />
                  <p className="text-sm text-muted-foreground">
                    URL-friendly version of the name. If left empty, will be
                    auto-generated from the tag name.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Create Tag
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/tags">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
