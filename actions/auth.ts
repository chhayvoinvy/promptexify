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
import { withCSRFProtection, handleSecureActionError } from "@/lib/security";

// Helper function to handle authentication redirects properly
function handleAuthRedirect(): never {
  redirect("/signin");
}

// Re-export auth functions as server actions with CSRF protection
export const signInAction = withCSRFProtection(async (formData: FormData) => {
  try {
    // Extract data from FormData
    const data: SignInData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    return await signInWithPassword(data);
  } catch (error) {
    return handleSecureActionError(error);
  }
});

export const signUpAction = withCSRFProtection(async (formData: FormData) => {
  try {
    // Extract data from FormData
    const data: SignUpData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
    };

    return await signUpWithPassword(data);
  } catch (error) {
    return handleSecureActionError(error);
  }
});

export const magicLinkAction = withCSRFProtection(
  async (formData: FormData) => {
    try {
      // Extract data from FormData
      const data: MagicLinkData = {
        email: formData.get("email") as string,
        name: (formData.get("name") as string) || undefined,
      };

      return await signInWithMagicLink(data);
    } catch (error) {
      return handleSecureActionError(error);
    }
  }
);

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
