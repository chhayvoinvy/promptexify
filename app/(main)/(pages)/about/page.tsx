import { Container } from "@/components/ui/container";
import { getMetadata } from "@/config/seo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = getMetadata("about");

export default function AboutPage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">About Promptexify</h1>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Promptexify is the directory for the new coding era: Rules, MCP (Model
          Context Protocol), Skills, and prompts for AI coding tools—Cursor,
          Claude Code, and other AI code editors. Discover, share, and manage
          content that makes AI-assisted development more effective.
        </p>

        <section className="space-y-6 mb-10">
          <div>
            <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              We believe developers should have access to well-crafted Rules,
              MCP configs, Skills, and prompts that save time and improve code.
              Our platform brings together a growing library so you can get more
              from Cursor, Claude Code, and your favorite AI coding tools.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">What We Offer</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>A searchable directory of Rules, MCP, Skills, and prompts</li>
              <li>User accounts to save bookmarks and favorites</li>
              <li>Create and share your own rules and prompts</li>
              <li>Community-driven content for AI coding tools</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">Get Started</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
            Browse our directory or create an account to save and manage Rules,
            MCP, Skills, and prompts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/directory">Browse Directory</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          Questions? Visit our{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4">
            Contact
          </Link>{" "}
          page.
        </p>
      </div>
    </Container>
  );
}
