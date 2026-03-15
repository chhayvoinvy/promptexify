import { Container } from "@/components/ui/container";
import { getMetadata } from "@/config/seo";

export const metadata = getMetadata("terms");

export default function TermsOfUsePage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert">
        <h1 className="text-4xl font-bold mb-2">Terms of Use</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Last updated: {new Date().toLocaleDateString("en-US")}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using Promptexify (&quot;the Service&quot;), you agree to be bound by these
            Terms of Use. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Use of the Service</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You may use the Service for lawful purposes only. You agree not to misuse the platform,
            infringe intellectual property rights, or attempt to gain unauthorized access to our
            systems or other users&apos; accounts.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Content</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain ownership of content you submit. By submitting content, you grant us a
            license to display, store, and use it in connection with operating the Service. You
            represent that you have the right to share such content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Service Availability</h2>
          <p className="text-muted-foreground leading-relaxed">
            We strive to keep the service available to all users at no charge. We may update or
            discontinue features with reasonable notice where practicable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service and all prompts and content are provided &quot;as is&quot; without warranties of
            any kind. We do not guarantee accuracy, completeness, or suitability for any
            particular purpose.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these terms, please visit our{" "}
            <a href="/contact" className="text-primary underline underline-offset-4">
              Contact
            </a>{" "}
            page.
          </p>
        </section>
      </div>
    </Container>
  );
}
