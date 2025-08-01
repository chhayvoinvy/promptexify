import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { Container } from "@/components/ui/container";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container className="py-0">
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </Container>
  );
}
