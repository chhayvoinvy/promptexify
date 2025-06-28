"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: "USER" | "ADMIN";
  type: "FREE" | "PREMIUM";
  oauth: "GOOGLE" | "EMAIL";
  createdAt: Date;
  updatedAt: Date;
}

interface ExtendedUser extends User {
  userData?: UserData | null;
}

export interface AuthState {
  user: ExtendedUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        // More robust check using getSession
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const supabaseUser = session.user;
          // Fetch additional user data from our API
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const userData = await response.json();
            setUser({
              ...supabaseUser,
              userData,
            });
          } else {
            // If the profile fetch fails, still set the basic user
            setUser(supabaseUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Fetch additional user data from our API
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const userData = await response.json();
            setUser({
              ...session.user,
              userData,
            });
          } else {
            setUser(session.user);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return { user, loading };
}
