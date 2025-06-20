import type { User } from "@supabase/supabase-js";

// Types for user with additional data
export interface UserData {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  type: "FREE" | "PREMIUM";
  role: "USER" | "ADMIN";
  oauth: "GOOGLE" | "EMAIL";
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithData extends User {
  userData?: UserData | null;
}

// Role-based utility functions (client-side safe)
export function hasRole(
  user: UserWithData | null,
  role: "USER" | "ADMIN"
): boolean {
  return user?.userData?.role === role;
}

export function isAdmin(user: UserWithData | null): boolean {
  return hasRole(user, "ADMIN");
}

export function isUser(user: UserWithData | null): boolean {
  return hasRole(user, "USER");
}
