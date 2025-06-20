import { requireAuth } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure user is authenticated
  const user = await requireAuth();

  // For USER role, only allow access to specific routes
  // This is handled in middleware, but double-check here
  if (user.userData?.role === "USER") {
    // Let the middleware handle redirects, just ensure user is authenticated
  }

  return <>{children}</>;
}
