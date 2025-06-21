"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { getBaseUrl } from "@/lib/utils";
import {
  signInSchema,
  signUpSchema,
  magicLinkSchema,
  type SignInData,
  type SignUpData,
  type MagicLinkData,
} from "@/lib/schemas";

const prisma = new PrismaClient();

// Server Actions
export async function signInWithPassword(data: SignInData) {
  const supabase = await createClient();

  // Validate input
  const validatedData = signInSchema.safeParse(data);
  if (!validatedData.success) {
    return {
      error: validatedData.error.errors[0]?.message || "Invalid input",
    };
  }

  const { email, password } = validatedData.data;

  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (authData.user) {
      // Update or create user in Prisma database
      await upsertUserInDatabase(authData.user);
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function signUpWithPassword(data: SignUpData) {
  const supabase = await createClient();

  // Validate input
  const validatedData = signUpSchema.safeParse(data);
  if (!validatedData.success) {
    return {
      error: validatedData.error.errors[0]?.message || "Invalid input",
    };
  }

  const { email, password, name } = validatedData.data;

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
        data: {
          name: name || email.split("@")[0], // Use email prefix as fallback name
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    // If user is immediately confirmed, create/update in database
    if (authData.user && authData.user.email_confirmed_at) {
      await upsertUserInDatabase(authData.user);
    }

    return {
      success: true,
      needsVerification: !authData.user?.email_confirmed_at,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function signInWithMagicLink(data: MagicLinkData) {
  const supabase = await createClient();

  // Validate input
  const validatedData = magicLinkSchema.safeParse(data);
  if (!validatedData.success) {
    return {
      error: validatedData.error.errors[0]?.message || "Invalid input",
    };
  }

  const { email } = validatedData.data;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Magic link error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function signInWithOAuth(provider: "google") {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
      queryParams: {
        prompt: "select_account", // Force account selection screen
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();

  try {
    // 1. Sign out from Supabase (this clears the session and cookies)
    const { error } = await supabase.auth.signOut({
      scope: "global", // This ensures sign out across all devices/sessions
    });

    if (error) {
      console.error("Supabase sign out error:", error);
      return { error: error.message };
    }

    // 2. Revalidate all cached data to ensure fresh state
    revalidatePath("/", "layout");

    // 3. Additional cache invalidation for security
    // This ensures no cached user data remains accessible
    revalidatePath("/dashboard", "layout");
    revalidatePath("/api", "layout");

    // 4. Secure redirect to sign-in page
    redirect("/signin");
  } catch (error) {
    // Check if this is a Next.js redirect (which is expected)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an expected redirect, re-throw it
        throw error;
      }
    }

    console.error("Sign out error:", error);
    return { error: "An unexpected error occurred during sign out." };
  }
}

export async function getCurrentUser() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Get additional user data from Prisma
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return {
      ...user,
      userData,
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Role-based access control utilities
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.userData?.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export async function requireRole(allowedRoles: Array<"USER" | "ADMIN">) {
  const user = await requireAuth();
  const userRole = user.userData?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect based on user role
    if (userRole === "USER") {
      redirect("/dashboard");
    } else {
      redirect("/");
    }
  }
  return user;
}

export async function requireUserAccess(allowedPaths: string[]) {
  const user = await requireAuth();
  const userRole = user.userData?.role;

  if (userRole === "USER") {
    // For USER role, only allow access to specific paths
    const allowedUserPaths = ["/dashboard/bookmarks", "/dashboard/account"];
    const currentPath = allowedPaths[0] || "";

    if (!allowedUserPaths.includes(currentPath)) {
      redirect("/dashboard");
    }
  }

  return user;
}

// Helper function to create/update user in Prisma database
async function upsertUserInDatabase(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    provider?: string;
  };
}) {
  try {
    const provider = supabaseUser.app_metadata?.provider || "email";
    const oauthProvider = provider === "google" ? "GOOGLE" : "EMAIL";
    const email = supabaseUser.email || "";
    const name =
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      email.split("@")[0] ||
      "User";
    const avatar = supabaseUser.user_metadata?.avatar_url || undefined;

    await prisma.user.upsert({
      where: { id: supabaseUser.id },
      update: {
        email,
        name,
        avatar,
        oauth: oauthProvider,
        updatedAt: new Date(),
      },
      create: {
        id: supabaseUser.id,
        email,
        name,
        avatar,
        oauth: oauthProvider,
        type: "FREE",
        role: "USER",
      },
    });
  } catch (error) {
    console.error("Database upsert error:", error);
    // Don't throw here to avoid breaking auth flow
  }
}
