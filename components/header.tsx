import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getCurrentUser } from "@/lib/auth";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-7xl mx-auto items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">/</span>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <nav className="flex items-center space-x-4">
            <Navbar />
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <UserProfileDropdown user={user} />
          ) : (
            <Link
              href="/signin"
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground/80"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
