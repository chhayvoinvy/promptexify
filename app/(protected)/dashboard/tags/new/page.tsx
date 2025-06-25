"use client";

import { useState, useTransition } from "react";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTagAction } from "@/actions";
import { useAuth } from "@/hooks/use-auth";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default function NewTagPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated or not authorized
  if (!loading) {
    if (!user) {
      router.push("/signin");
      return null;
    }
    if (user.userData?.role !== "ADMIN") {
      router.push("/dashboard");
      return null;
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        <p className="text-sm text-muted-foreground">
          This may take a few seconds.
        </p>
      </div>
    );
  }

  const handleSubmit = async (formData: FormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const result = await createTagAction(formData);

        if (result.success) {
          toast.success(result.message || "Tag created successfully");
          router.push("/dashboard/tags");
        } else {
          toast.error(result.error || "Failed to create tag");
        }
      } catch (error) {
        console.error("Error creating tag:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user!} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/tags">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-muted-foreground">
                Add a new tag to organize your content.
              </p>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-6 max-w-2xl">
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
                    Learning&quot;). Only letters, numbers, spaces, hyphens, and
                    underscores are allowed. Maximum 50 characters.
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
                    auto-generated from the tag name. Only lowercase letters
                    (a-z), numbers (0-9), and hyphens (-) are allowed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Tag"}
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
