"use server";

import {
  signInWithPassword,
  signUpWithPassword,
  signInWithMagicLink,
  signInWithOAuth,
  signOut,
} from "@/lib/auth";
import {
  type SignInData,
  type SignUpData,
  type MagicLinkData,
} from "@/lib/schemas";
import { redirect } from "next/navigation";

// Helper function to handle authentication redirects properly
function handleAuthRedirect(): never {
  redirect("/signin");
}

// Re-export auth functions as server actions
export async function signInAction(data: SignInData) {
  return await signInWithPassword(data);
}

export async function signUpAction(data: SignUpData) {
  return await signUpWithPassword(data);
}

export async function magicLinkAction(data: MagicLinkData) {
  return await signInWithMagicLink(data);
}

export async function oauthAction(provider: "google") {
  return await signInWithOAuth(provider);
}

export async function signOutAction() {
  try {
    // Perform secure logout with comprehensive cleanup
    await signOut();

    // If we reach here, there was no redirect (shouldn't happen with proper signOut)
    return { success: true };
  } catch (error) {
    // Check if this is a Next.js redirect (which means success)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is a successful sign out with redirect - re-throw to allow redirect
        throw error;
      }
    }

    // This is an actual error - log securely (don't expose sensitive data)
    console.error("Sign out action error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    // Return secure error message
    return {
      error:
        "Sign out failed. Please try again or contact support if the issue persists.",
      // Include a security flag to indicate failed logout attempt
      securityFlag: true,
    };
  }
}

// Re-export helper function for use in other action files
export { handleAuthRedirect };
