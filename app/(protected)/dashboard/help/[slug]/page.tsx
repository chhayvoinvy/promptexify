import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface HelpArticleMeta {
  title: string;
  description: string;
  category: string;
  icon?: string;
  order?: number;
  lastUpdated: string;
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

async function getHelpArticle(slug: string) {
  try {
    const filePath = path.join(process.cwd(), "content", "help", `${slug}.mdx`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);

    return {
      meta: data as HelpArticleMeta,
      content,
      slug,
    };
  } catch (error) {
    console.error("Error reading help article:", error);
    return null;
  }
}

function getIconComponent(iconName?: string) {
  const iconMap = {
    crown: Icons.crown,
    upload: Icons.upload,
    "help-circle": Icons.helpCircle,
  };

  return iconMap[iconName as keyof typeof iconMap] || Icons.helpCircle;
}

export default async function HelpArticlePage({ params }: Props) {
  // Get current user and check authentication
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  // Await params before accessing properties (Next.js 15 requirement)
  const { slug } = await params;
  const article = await getHelpArticle(slug);

  if (!article) {
    notFound();
  }

  const IconComponent = getIconComponent(article.meta.icon);

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
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {article.meta.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Last updated:{" "}
                        {new Date(
                          article.meta.lastUpdated
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      {article.meta.title}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      {article.meta.description}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Article Content */}
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <MDXRemote
                  source={article.content}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                      rehypePlugins: [
                        rehypeSlug,
                        [
                          rehypeAutolinkHeadings,
                          {
                            properties: {
                              className: ["subheading-anchor"],
                              ariaLabel: "Link to section",
                            },
                          },
                        ],
                      ],
                    },
                  }}
                />
              </div>

              <Separator />

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30 rounded-lg p-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold mb-1">Was this helpful?</h3>
                  <p className="text-sm text-muted-foreground">
                    Let us know how we can improve our documentation.
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

              {/* Navigation to other articles */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Previous Article</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse more help articles
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
                  <h4 className="font-semibold mb-2">Need More Help?</h4>
                  <p className="text-sm text-muted-foreground">
                    Contact our support team directly
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 p-0"
                    asChild
                  >
                    <Link href="/dashboard/help/contact-support">
                      Contact Support
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
