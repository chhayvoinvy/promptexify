import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTagById } from "@/lib/content";
import { redirect, notFound } from "next/navigation";
import { updateTagAction } from "@/actions";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface EditTagPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTagPage({ params }: EditTagPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.userData?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const tag = await getTagById(id);

  if (!tag) {
    notFound();
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
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/tags">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-muted-foreground">
                Update tag information and settings.
              </p>
            </div>
          </div>

          <div className="grid gap-6 max-w-4xl lg:grid-cols-3">
            {/* Tag Edit Form */}
            <div className="lg:col-span-2">
              <form action={updateTagAction} className="space-y-6">
                <input type="hidden" name="id" value={tag.id} />

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
                        defaultValue={tag.name}
                        placeholder="Enter tag name"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        The display name for this tag
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input
                        id="slug"
                        name="slug"
                        defaultValue={tag.slug}
                        placeholder="tag-slug"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        URL-friendly version of the name
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Update Tag
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/tags">Cancel</Link>
                  </Button>
                </div>
              </form>
            </div>

            {/* Tag Statistics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tag Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Tag</Label>
                    <Badge variant="outline" className="w-fit">
                      {tag.name}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Posts Using This Tag</Label>
                    <Badge variant="secondary" className="w-fit">
                      {tag._count.posts} posts
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <code className="text-sm bg-muted px-2 py-1 rounded block w-fit">
                      {tag.slug}
                    </code>
                  </div>

                  <div className="space-y-2">
                    <Label>Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tag.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Last Updated</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tag.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {tag._count.posts > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Warning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This tag is currently used by {tag._count.posts} post
                      {tag._count.posts !== 1 ? "s" : ""}. Changing the slug
                      will affect how this tag appears in URLs.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
