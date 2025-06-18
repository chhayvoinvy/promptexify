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
  return await signOut();
}
