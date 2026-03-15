import { Container } from "@/components/ui/container";
import { getMetadata } from "@/config/seo";

export const metadata = getMetadata("help");

/**
 * Help center landing page.
 * Content was previously sourced from Sanity CMS; help articles can be re-added via another source (e.g. Prisma, static markdown) if needed.
 */
export default async function HelpPage() {
  return (
    <Container className="py-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Find answers to your questions about our platform, features, and
          services. Help articles will be available here soon.
        </p>
        <p className="text-sm text-muted-foreground">
          For immediate support, please contact us through the dashboard or
          your account settings.
        </p>
      </div>
    </Container>
  );
}
