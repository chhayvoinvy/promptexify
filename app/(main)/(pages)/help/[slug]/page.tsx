import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";
import { sanityFetch } from "@/lib/sanity";
import { type PopulatedHelpArticle } from "@/sanity/types";
import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Fetch a single help article from Sanity with all related data
async function getHelpArticle(
  slug: string
): Promise<PopulatedHelpArticle | null> {
  try {
    const query = `*[_type == "helpArticle" && slug.current == $slug && isPublished == true][0] {
      _id,
      _type,
      _createdAt,
      _updatedAt,
      _rev,
      title,
      slug,
      description,
      category,
      tags,
      icon,
      difficulty,
      order,
      readingTime,
      content,
      author -> {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        _rev,
        name,
        slug,
        email,
        bio,
        avatar,
        role,
        isActive,
        socialLinks,
        joinedAt,
        lastActiveAt
      },
      isPublished,
      publishedAt,
      updatedAt,
      featured,
      relatedArticles[] -> {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        _rev,
        title,
        slug,
        description,
        category,
        tags,
        icon,
        difficulty,
        order,
        readingTime,
        content,
        isPublished,
        publishedAt,
        updatedAt,
        featured,
        searchKeywords,
        accessLevel,
        seo
      },
      searchKeywords,
      accessLevel,
      seo
    }`;

    const article = await sanityFetch<PopulatedHelpArticle>(
      query,
      { slug },
      {
        next: { tags: [`helpArticle:${slug}`] },
      }
    );

    return article;
  } catch (error) {
    console.error("Error fetching help article:", error);
    return null;
  }
}

// Get related articles for better navigation
async function getRelatedArticles(
  category: string,
  currentId: string
): Promise<PopulatedHelpArticle[]> {
  try {
    const query = `*[_type == "helpArticle" && category == $category && _id != $currentId && isPublished == true] | order(order asc, publishedAt desc) [0...4] {
      _id,
      _type,
      _createdAt,
      _updatedAt,
      _rev,
      title,
      slug,
      description,
      category,
      tags,
      icon,
      difficulty,
      order,
      readingTime,
      content,
      isPublished,
      publishedAt,
      updatedAt,
      featured,
      searchKeywords,
      accessLevel,
      seo
    }`;

    const articles = await sanityFetch<PopulatedHelpArticle[]>(
      query,
      { category, currentId },
      {
        next: { tags: [`helpArticle:category:${category}`] },
      }
    );

    return articles || [];
  } catch (error) {
    console.error("Error fetching related articles:", error);
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getHelpArticle(slug);

  if (!article) {
    return {
      title: "Help Article Not Found",
      description: "The requested help article could not be found.",
    };
  }

  const metaTitle = article.seo?.metaTitle || article.title;
  const metaDescription = article.seo?.metaDescription || article.description;

  return {
    title: metaTitle,
    description: metaDescription,
    robots: {
      index: !article.seo?.noIndex,
      follow: true,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: article.author?.name ? [article.author.name] : undefined,
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
    },
  };
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getHelpArticle(slug);

  if (!article) {
    notFound();
  }

  // Get related articles
  const relatedArticles = await getRelatedArticles(
    article.category,
    article._id
  );

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Get category icon
  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case "crown":
        return <Icons.crown className="h-4 w-4" />;
      case "upload":
        return <Icons.upload className="h-4 w-4" />;
      case "help-circle":
        return <Icons.helpCircle className="h-4 w-4" />;
      case "user":
        return <Icons.user className="h-4 w-4" />;
      case "zap":
        return <Icons.zap className="h-4 w-4" />;
      case "tool":
        return <Icons.settings className="h-4 w-4" />;
      default:
        return <Icons.helpCircle className="h-4 w-4" />;
    }
  };

  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/help">
              <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Help Center
            </Link>
          </Button>
        </div>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {getCategoryIcon(article.icon)}
            <span className="text-sm text-muted-foreground capitalize">
              {article.category}
            </span>
          </div>

          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <Badge
              variant="outline"
              className={getDifficultyColor(article.difficulty)}
            >
              {article.difficulty}
            </Badge>

            {article.readingTime && (
              <span className="flex items-center gap-1">
                <Icons.clock className="h-3 w-3" />
                {article.readingTime} min read
              </span>
            )}

            {article.publishedAt && (
              <span className="flex items-center gap-1">
                <Icons.calendar className="h-3 w-3" />
                {new Date(article.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <p className="text-xl text-muted-foreground mb-6">
            {article.description}
          </p>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Article Content */}
        <article className="prose dark:prose-invert lg:prose-xl max-w-none">
          <PortableText value={article.content} />
        </article>

        {/* Author Info */}
        {article.author && (
          <div className="mt-12 p-6 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              {article.author.avatar && (
                <div className="w-16 h-16 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <Icons.user className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <h4 className="font-semibold">{article.author.name}</h4>
                <p className="text-sm text-muted-foreground capitalize">
                  {article.author.role}
                </p>
                {article.author.bio && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {article.author.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xl font-semibold mb-6">Related Articles</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {relatedArticles.map((relatedArticle) => (
                <Card
                  key={relatedArticle._id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(relatedArticle.icon)}
                      <span className="text-xs text-muted-foreground capitalize">
                        {relatedArticle.category}
                      </span>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">
                      <Link
                        href={`/help/${relatedArticle.slug.current}`}
                        className="hover:text-primary transition-colors"
                      >
                        {relatedArticle.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-2">
                      {relatedArticle.description}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(
                          relatedArticle.difficulty
                        )}
                      >
                        {relatedArticle.difficulty}
                      </Badge>
                      {relatedArticle.readingTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Icons.clock className="h-3 w-3" />
                          {relatedArticle.readingTime} min
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
