"use client";

import { useEffect, useState } from "react";
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

export function GoogleOneTap() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [nonce] = useState(() => {
    // Get nonce from global variable set in layout
    return typeof window !== "undefined" ? window.__CSP_NONCE__ || null : null;
  });

  useEffect(() => {
    // Only show for unauthenticated users
    if (loading || user) return;

    // Load Google One Tap script with nonce if available
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    if (nonce) {
      script.nonce = nonce;
    }
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
              });

              if (!error && data.user) {
                // Create or update user in the database
                const result = await createUserInDatabaseAction(data.user);

                if (result.error) {
                  console.error(
                    "Failed to create user in database:",
                    result.error
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

        // Show the One Tap prompt
        window.google.accounts.id.prompt();
      }
    };

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // Cancel One Tap if component unmounts
      if (window.google?.accounts.id.cancel) {
        window.google.accounts.id.cancel();
      }
    };
  }, [user, loading, supabase.auth, nonce, router]);

  // This component doesn't render anything visible
  return null;
}
