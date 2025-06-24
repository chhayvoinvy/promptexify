import { notFound } from "next/navigation";
import { allPages } from "@/.contentlayer/generated";
import { Mdx } from "@/components/mdx-components";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function generateMetadata() {
  const page = allPages.find((page) => page.slugAsParams === "contact");

  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
  };
}

export default async function ContactPage() {
  const page = allPages.find((page) => page.slugAsParams === "contact");

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-5 py-6 max-w-7xl">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Page content */}
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {page.title}
            </h1>
            <p className="text-lg text-muted-foreground">{page.description}</p>
            <div className="mt-4 text-sm text-muted-foreground">
              Last updated: {new Date(page.lastUpdated).toLocaleDateString()}
            </div>
          </div>

          <div className="mt-8">
            <Mdx code={page.body.code} />
          </div>
        </article>
      </div>
    </div>
  );
}
