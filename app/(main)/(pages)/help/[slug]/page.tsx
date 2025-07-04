import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { client } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";

// Define the HelpArticle interface
interface HelpArticle {
  title: string;
  content: PortableTextBlock[]; // PortableText content
}

// Fetch a single help article from Sanity
async function getHelpArticle(slug: string) {
  const query = `*[_type == "helpArticle" && slug.current == $slug][0]`;
  const article = await client.fetch<HelpArticle>(query, { slug });
  return article;
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

        {/* Article Content */}
        <article className="prose dark:prose-invert lg:prose-xl">
          <h1>{article.title}</h1>
          <PortableText value={article.content} />
        </article>
      </div>
    </Container>
  );
}
