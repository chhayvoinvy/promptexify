"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
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
  const supabase = createClient();

  useEffect(() => {
    // Only show for unauthenticated users
    if (loading || user) return;

    // Load Google One Tap script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response) => {
            try {
              const { error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
              });

              if (!error) {
                window.location.href = "/";
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
  }, [user, loading, supabase.auth]);

  // This component doesn't render anything visible
  return null;
}
