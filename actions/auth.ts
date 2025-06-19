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
    await signOut();
    // If we reach here, there was no redirect (shouldn't happen)
    return { success: true };
  } catch (error) {
    // Check if this is a Next.js redirect (which means success)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is a successful sign out with redirect - don't return anything
        // The redirect will handle the navigation
        throw error; // Re-throw to allow the redirect to proceed
      }
    }

    // This is an actual error
    console.error("Sign out action error:", error);
    return { error: "Failed to sign out" };
  }
}

// Re-export helper function for use in other action files
export { handleAuthRedirect };
