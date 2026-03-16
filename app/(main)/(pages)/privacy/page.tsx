import { Container } from "@/components/ui/container";
import { getMetadata } from "@/config/seo";
import Link from "next/link";

export const metadata = getMetadata("privacy");

export default function PrivacyPolicyPage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Last updated: {new Date().toLocaleDateString("en-US")}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Promptexify (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This Privacy Policy
            describes how we collect, use, and protect your personal information when you use our
            AI prompt directory and related services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We may collect information you provide directly (e.g., account registration, contact
            forms), usage data (e.g., how you use the site), and technical data (e.g., IP address,
            browser type) necessary to operate and improve our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use collected information to provide and improve our services, process transactions,
            communicate with you, enforce our terms, and comply with applicable law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal
            data against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            Depending on your location, you may have rights to access, correct, delete, or restrict
            processing of your personal data. Contact us to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related questions or requests, please visit our{" "}
            <Link href="/contact" className="text-primary underline underline-offset-4">
              Contact
            </Link>{" "}
            page.
          </p>
        </section>
      </div>
    </Container>
  );
}
