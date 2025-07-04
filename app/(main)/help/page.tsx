import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { client } from "@/lib/sanity";
import { Container } from "@/components/ui/container";

// Define the HelpArticle interface based on the Sanity schema
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
}

// Fetch help articles from Sanity
async function getHelpArticles() {
  const query = `*[_type == "helpArticle"] | order(order asc)`;
  const articles = await client.fetch<HelpArticle[]>(query);
  return articles;
}

// Helper to map icon names to components
function getIconComponent(iconName: string) {
  const iconMap: { [key: string]: React.ElementType } = {
    crown: Icons.crown,
    upload: Icons.upload,
    "help-circle": Icons.helpCircle,
  };
  return iconMap[iconName] || Icons.helpCircle;
}

// The main help page component
export default async function HelpPage() {
  const articles = await getHelpArticles();

  return (
    <Container className="py-8 md:py-12">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
            </div>
            <p className="text-muted-foreground">
              Find answers to common questions and learn how to use Promptexify.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search articles..." className="pl-8" />
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const IconComponent = getIconComponent(article.icon);
            return (
              <Link
                href={`/help/${article.slug.current}`}
                key={article._id}
                className="group"
              >
                <Card className="flex h-full flex-col transition-all hover:border-primary/60 hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg group-hover:text-primary">
                          {article.title}
                        </CardTitle>
                        <CardDescription>{article.description}</CardDescription>
                      </div>
                      <IconComponent className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
