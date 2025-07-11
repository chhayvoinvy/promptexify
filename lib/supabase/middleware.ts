import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Recreate response to ensure new cookies propagate
          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            // Enforce additional security: SameSite=Strict & Secure
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: "strict",
              secure: true,
            });
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proactively refresh session if access token is about to expire (<30s)
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session && session.expires_at) {
      const expiresInMs = session.expires_at * 1000 - Date.now();
      if (expiresInMs < 30_000) {
        await supabase.auth.refreshSession();
      }
    }
  } catch (error) {
    console.error("Supabase session refresh error:", error);
  }

  // Security headers for all responses
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  // Protected routes - require authentication
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    // Clear any potentially stale auth cookies on unauthorized access
    const redirectResponse = NextResponse.redirect(
      new URL("/signin", request.url)
    );

    // Clear auth-related cookies for security
    const authCookieNames = ["sb-access-token", "sb-refresh-token"];
    authCookieNames.forEach((cookieName) => {
      redirectResponse.cookies.delete(cookieName);
    });

    return redirectResponse;
  }

  // For authenticated users, we'll handle role-based redirects in the pages themselves
  // since we can't access Prisma in middleware. This is more performant anyway.
  // The main authentication check is done above.

  // Redirect authenticated users away from auth pages
  if (
    (request.nextUrl.pathname === "/signin" ||
      request.nextUrl.pathname === "/signup") &&
    user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so: NextResponse.next({ request })
  // 2. Copy over the cookies, like so: response.cookies.setAll(supabaseResponse.cookies.getAll())

  return supabaseResponse;
}
