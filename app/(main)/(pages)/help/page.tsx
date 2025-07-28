import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpCircle, Search, User, Zap, Wrench } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { sanityFetch, groq, cacheTags } from "@/lib/sanity";
import { Container } from "@/components/ui/container";
import { notFound } from "next/navigation";
import { getMetadata } from "@/config/seo";

// Enhanced type definitions based on schema
interface HelpArticle {
  _id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  order: number;
  slug: {
    current: string;
  };
  readingTime: number;
  featured: boolean;
  accessLevel: "public" | "premium" | "admin";
  publishedAt: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  searchKeywords?: string[];
}

// Enhanced metadata
export const metadata = getMetadata("help");

// Fetch help articles with enhanced error handling and caching
async function getHelpArticles(): Promise<HelpArticle[]> {
  try {
    const query =
      groq.published("helpArticle") + " | order(featured desc, order asc)";

    const articles = await sanityFetch<HelpArticle[]>(
      query,
      {},
      {
        next: {
          revalidate: 3600, // Revalidate every hour
          tags: [cacheTags.type("helpArticle"), cacheTags.all],
        },
      }
    );

    return articles || [];
  } catch (error) {
    console.error("Error fetching help articles:", error);
    return [];
  }
}

// Group articles by category
function groupArticlesByCategory(articles: HelpArticle[]) {
  return articles.reduce(
    (groups, article) => {
      const category = article.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(article);
      return groups;
    },
    {} as Record<string, HelpArticle[]>
  );
}

// Get category icon
function getCategoryIcon(iconName: string) {
  const iconMap = {
    crown: Icons.crown,
    upload: Icons.upload,
    "help-circle": HelpCircle,
    user: User,
    zap: Zap,
    tool: Wrench,
  } as const;

  const IconComponent = iconMap[iconName as keyof typeof iconMap];
  return IconComponent || HelpCircle;
}

// Get category display name
function getCategoryDisplayName(category: string) {
  const categoryMap = {
    subscription: "Subscription & Billing",
    contribution: "Content Contribution",
    support: "Technical Support",
    account: "Account Management",
    features: "Features & Usage",
    troubleshooting: "Troubleshooting",
  } as const;

  return categoryMap[category as keyof typeof categoryMap] || category;
}

export default async function HelpPage() {
  const articles = await getHelpArticles();

  if (!articles.length) {
    notFound();
  }

  const articlesByCategory = groupArticlesByCategory(articles);
  const featuredArticles = articles.filter((article) => article.featured);

  return (
    <Container className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
          Find answers to your questions about our platform, features, and
          services.
        </p>

        {/* Search Input - Future enhancement for client-side search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            className="pl-10"
            aria-label="Search help articles"
          />
        </div>
      </div>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Featured Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredArticles.map((article) => {
              const IconComponent = getCategoryIcon(article.icon);

              return (
                <Card
                  key={article._id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Featured
                        </span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          {article.readingTime} min read
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-lg">
                      <Link
                        href={`/help/${article.slug.current}`}
                        className="hover:text-primary transition-colors"
                      >
                        {article.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Articles by Category */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Browse by Category</h2>
        <div className="space-y-8">
          {Object.entries(articlesByCategory).map(
            ([category, categoryArticles]) => (
              <div key={category}>
                <h3 className="text-xl font-medium mb-4">
                  {getCategoryDisplayName(category)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryArticles.map((article) => {
                    const IconComponent = getCategoryIcon(article.icon);

                    return (
                      <Card
                        key={article._id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-1.5 bg-muted rounded">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex gap-2">
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                {article.difficulty}
                              </span>
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                {article.readingTime} min
                              </span>
                            </div>
                          </div>
                          <CardTitle className="text-base">
                            <Link
                              href={`/help/${article.slug.current}`}
                              className="hover:text-primary transition-colors"
                            >
                              {article.title}
                            </Link>
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {article.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </Container>
  );
}
