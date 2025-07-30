"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createUserInDatabaseAction } from "@/actions/auth";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    __CSP_NONCE__?: string;
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

// Utility function to check network connectivity
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Try to fetch a small resource to test connectivity
    await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    console.warn("Network connectivity check failed:", error);
    return false;
  }
};

export function GoogleOneTap() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [nonce] = useState(() => {
    // Get nonce from global variable set in layout
    return typeof window !== "undefined" ? window.__CSP_NONCE__ || null : null;
  });
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);

  const initializeGoogleOneTap = useCallback(async () => {
    // Check network connectivity first
    const networkAvailable = await checkNetworkConnectivity();
    setIsNetworkAvailable(networkAvailable);

    if (!networkAvailable) {
      console.warn("Google One Tap: Network connectivity issues detected");
      return;
    }

    // Check if Google Client ID is configured
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      console.warn(
        "Google One Tap: NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured"
      );
      return;
    }

    // Check if script is already loaded
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    // Load Google One Tap script with nonce if available
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    if (nonce) {
      script.nonce = nonce;
    }

    // Add error handling for script loading
    script.onerror = () => {
      const error =
        "Google One Tap: Failed to load Google Identity Services script";
      console.error(error);
      setScriptError(error);

      // Retry logic for script loading failures
      if (retryCount < 2) {
        setTimeout(
          () => {
            setRetryCount((prev) => prev + 1);
            console.log(
              `Google One Tap: Retrying script load (attempt ${retryCount + 2})`
            );
          },
          2000 * (retryCount + 1)
        ); // Exponential backoff
      }
    };

    script.onload = () => {
      setScriptLoaded(true);
      setScriptError(null);
      setRetryCount(0);

      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            use_fedcm_for_prompt: true,
            callback: async (response) => {
              try {
                console.log(
                  "Google One Tap: Received credential, attempting sign-in..."
                );

                const { data, error } = await supabase.auth.signInWithIdToken({
                  provider: "google",
                  token: response.credential,
                });

                if (!error && data.user) {
                  console.log(
                    "Google One Tap: Sign-in successful, creating user in database..."
                  );

                  // Create or update user in the database
                  const result = await createUserInDatabaseAction(data.user);

                  if (result.error) {
                    console.error(
                      "Failed to create user in database:",
                      result.error
                    );
                  } else {
                    console.log(
                      "Google One Tap: User created/updated in database successfully"
                    );
                  }

                  // Redirect to home page regardless of database creation result
                  // to prevent blocking user access
                  router.push("/");
                }

                if (error) {
                  console.error("Google One Tap sign-in error:", error);
                }
              } catch (err) {
                console.error("Google One Tap error:", err);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Show the One Tap prompt with error handling
          try {
            console.log("Google One Tap: Showing prompt...");
            window.google.accounts.id.prompt();
          } catch (promptError) {
            console.error(
              "Google One Tap: Failed to show prompt:",
              promptError
            );
          }
        } catch (initError) {
          console.error("Google One Tap: Failed to initialize:", initError);
        }
      } else {
        const error = "Google One Tap: Google Identity Services not available";
        console.error(error);
        setScriptError(error);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // Cancel One Tap if component unmounts
      if (window.google?.accounts?.id?.cancel) {
        try {
          window.google.accounts.id.cancel();
        } catch (cancelError) {
          console.error("Google One Tap: Failed to cancel:", cancelError);
        }
      }
    };
  }, [user, loading, supabase.auth, nonce, router, retryCount]);

  useEffect(() => {
    // Only show for unauthenticated users
    if (loading || user) return;

    initializeGoogleOneTap();
  }, [user, loading, initializeGoogleOneTap]);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Google One Tap Debug:", {
        user: !!user,
        loading,
        scriptLoaded,
        scriptError,
        hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        nonce: !!nonce,
        retryCount,
        isNetworkAvailable,
        googleAvailable: !!window.google?.accounts?.id,
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    user,
    loading,
    scriptLoaded,
    scriptError,
    nonce,
    retryCount,
    isNetworkAvailable,
  ]);

  // This component doesn't render anything visible
  return null;
}
