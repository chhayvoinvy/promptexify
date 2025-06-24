import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  order: number;
  slug: string;
  readingTime: number;
}

// Static help articles data - will be replaced with contentlayer once build works
const helpArticles: HelpArticle[] = [
  {
    id: "1",
    title: "Upgrade to Premium",
    description:
      "Learn about our premium features and how to upgrade your account for enhanced AI prompt experiences.",
    category: "subscription",
    icon: "crown",
    order: 1,
    slug: "upgrade-to-premium",
    readingTime: 8,
  },
  {
    id: "2",
    title: "How to Contribute Prompts",
    description:
      "Learn how to share your AI prompts with the Promptexify community and help others achieve better AI interactions.",
    category: "contribution",
    icon: "upload",
    order: 2,
    slug: "how-to-contribute",
    readingTime: 12,
  },
  {
    id: "3",
    title: "Contact Support",
    description:
      "Get help when you can't find answers in our help articles. Learn about our support channels and how to get the fastest resolution.",
    category: "support",
    icon: "help-circle",
    order: 3,
    slug: "contact-support",
    readingTime: 6,
  },
];

function getIconComponent(iconName: string) {
  const iconMap = {
    crown: Icons.crown,
    upload: Icons.upload,
    "help-circle": Icons.helpCircle,
  };

  return iconMap[iconName as keyof typeof iconMap] || Icons.helpCircle;
}

function HelpArticleCard({ article }: { article: HelpArticle }) {
  const IconComponent = getIconComponent(article.icon);

  return (
    <Card className="h-full transition-colors hover:bg-muted/50">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-primary/10 p-2 w-fit">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-secondary/80 hover:text-secondary-foreground"
          >
            # {article.category}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-lg leading-tight">
            {article.title}
          </CardTitle>
          <CardDescription className="mt-2 line-clamp-3">
            {article.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {article.readingTime} min read
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/help/${article.slug}`}>
              Read article
              <Icons.arrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HelpArticlesGrid() {
  // Sort articles by order field, then by title
  const sortedArticles = helpArticles.sort((a, b) => {
    if (a.order !== b.order) {
      return (a.order || 0) - (b.order || 0);
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sortedArticles.map((article) => (
        <HelpArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

function HelpPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function HelpPage() {
  // Get current user and check authentication
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
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
            <div className="flex flex-col gap-6 p-4 md:p-6">
              {/* Header Section */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Help Center
                </h1>
                <p className="text-muted-foreground">
                  Find answers to common questions and learn how to make the
                  most of Promptexify.
                </p>
              </div>

              {/* Search Section (Future Enhancement) */}
              <div className="relative">
                <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled
                />
                <Badge
                  variant="secondary"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                >
                  Coming Soon
                </Badge>
              </div>

              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-dashed">
                  <CardContent className="flex items-center flex-col justify-center p-4 gap-4 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Need immediate help?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contact our support team
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="mailto:support@promptexify.com">
                        Contact Support
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="flex items-center flex-col justify-center p-4 gap-4 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Report a bug</p>
                      <p className="text-xs text-muted-foreground">
                        Help us improve the platform
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="mailto:tech@promptexify.com">Report Bug</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="flex items-center flex-col justify-center p-4 gap-4 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Feature request</p>
                      <p className="text-xs text-muted-foreground">
                        Suggest new features
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="mailto:feedback@promptexify.com">
                        Send Feedback
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Help Articles Grid */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Browse Help Articles</h2>
                <Suspense fallback={<HelpPageSkeleton />}>
                  <HelpArticlesGrid />
                </Suspense>
              </div>

              {/* Popular Topics */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Popular Topics</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Premium Features",
                    "Bookmarks",
                    "Contributing",
                    "Billing",
                    "Account Settings",
                    "Troubleshooting",
                    "API Access",
                    "Mobile App",
                  ].map((topic) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary/80 hover:text-secondary-foreground text-xs"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Still Need Help Section */}
              <Card className="bg-muted/30">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    Still need help?
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Can&apos;t find what you&apos;re looking for? Our support
                    team is here to help.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button asChild>
                      <Link href="mailto:support@promptexify.com">
                        Email Support
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/help/contact-support">
                        View All Contact Options
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
