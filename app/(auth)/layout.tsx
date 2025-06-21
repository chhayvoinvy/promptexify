import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center mx-auto relative min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <div className="mb-8">
          <Logo width={200} height={31} priority />
        </div>
        <main>{children}</main>
        <div className="flex items-center justify-center mt-5 max-w-sm px-4">
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
