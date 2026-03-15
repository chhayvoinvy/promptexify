import { Container } from "@/components/ui/container";
import { getMetadata } from "@/config/seo";

export const metadata = getMetadata("contact");

export default function ContactPage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Have a question or feedback? We&apos;d love to hear from you.
        </p>

        <section className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-2">General Inquiries</h2>
            <p className="text-muted-foreground text-sm">
              For general questions about Promptexify, our features, or your account, please use
              the support options available in your dashboard after signing in, or reach out via
              the email address provided in your account settings.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-2">Support</h2>
            <p className="text-muted-foreground text-sm">
              If you need technical support, sign in to your account and
              visit the dashboard for help and resources.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-2">Privacy &amp; Legal</h2>
            <p className="text-muted-foreground text-sm">
              For privacy-related requests or legal inquiries, please refer to our{" "}
              <a href="/privacy" className="text-primary underline underline-offset-4">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="text-primary underline underline-offset-4">
                Terms of Use
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </Container>
  );
}
