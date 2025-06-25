import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SearchIcon,
  HomeIcon,
  BookOpenIcon,
  HelpCircleIcon,
} from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-2xl border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">404</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-foreground">
                Page Not Found
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto">
                Sorry, we couldn&apos;t find the page you&apos;re looking for.
                The page might have been moved, deleted, or you entered the
                wrong URL.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button asChild variant="default" size="lg" className="h-14">
                <Link href="/" className="flex items-center gap-3">
                  <HomeIcon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Go Home</div>
                    <div className="text-xs opacity-90">Back to homepage</div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="h-14">
                <Link href="/directory" className="flex items-center gap-3">
                  <SearchIcon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">Browse Prompts</div>
                    <div className="text-xs opacity-70">
                      Explore our directory
                    </div>
                  </div>
                </Link>
              </Button>
            </div>

            {/* Helpful Links */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-center mb-4 text-foreground">
                You might be looking for:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/about"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <BookOpenIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium group-hover:text-primary">
                    About Promptexify
                  </span>
                </Link>

                <Link
                  href="/help"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <HelpCircleIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium group-hover:text-primary">
                    Help & Support
                  </span>
                </Link>

                <Link
                  href="/contact"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <SearchIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium group-hover:text-primary">
                    Contact Us
                  </span>
                </Link>

                <Link
                  href="/privacy-policy"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <BookOpenIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium group-hover:text-primary">
                    Privacy Policy
                  </span>
                </Link>
              </div>
            </div>

            {/* Search suggestion */}
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Still can&apos;t find what you&apos;re looking for?{" "}
                <Link
                  href="/contact"
                  className="text-primary hover:underline font-medium"
                >
                  Contact our support team
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
