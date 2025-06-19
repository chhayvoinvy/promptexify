import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      if (data.user) {
        // Create or update user in Prisma database
        await upsertUserInDatabase(data.user);
      }

      // Redirect to the requested page or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    } catch (error) {
      console.error("Callback processing error:", error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
  }

  // If no code, redirect to sign in
  return NextResponse.redirect(`${origin}/signin`);
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
    console.error("Database upsert error in callback:", error);
    // Don't throw here to avoid breaking auth flow
  } finally {
    await prisma.$disconnect();
  }
}
