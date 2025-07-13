/**
 * Dynamic CSP Utilities
 * 
 * This module provides utilities for handling Content Security Policy (CSP) 
 * in pages that require nonces at runtime and cannot be statically generated.
 */

import React from "react";
import { CSPNonce } from "./csp";

/**
 * Configuration for pages that require dynamic CSP nonces
 * Add this to pages that use inline scripts/styles requiring nonces
 */
export const dynamic = 'force-dynamic';

/**
 * Hook for getting CSP nonce in server components that must be dynamic
 * Use this when you know the page cannot be statically generated
 */
export async function useDynamicCSPNonce(): Promise<string | null> {
  return CSPNonce.getFromHeaders();
}

/**
 * Hook for getting CSP nonce safely (handles both static and dynamic contexts)
 * Use this in layouts and components that might be statically rendered
 */
export async function useSafeCSPNonce(): Promise<string | null> {
  return CSPNonce.getFromHeadersSafe();
}

/**
 * Utility to mark a page as requiring dynamic CSP nonce
 * This forces the page to be server-rendered at request time
 * 
 * Add this export to your page file:
 * export const dynamic = requireDynamicCSP();
 */
export function requireDynamicCSP() {
  return 'force-dynamic';
}

/**
 * Types for CSP nonce requirements
 */
export interface CSPNonceContext {
  nonce: string | null;
  isProduction: boolean;
  hasNonce: boolean;
}

/**
 * Get complete CSP context for a component
 * Note: This is not a React Hook despite using the word "use" in its name
 */
export async function getCSPContext(): Promise<CSPNonceContext> {
  const nonce = await CSPNonce.getFromHeadersSafe();
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    nonce,
    isProduction,
    hasNonce: Boolean(nonce),
  };
}

/**
 * Utility for components that need to render different content based on CSP context
 * Note: This is not a React Hook despite using the word "use" in its name
 */
export async function withCSPNonce<T>(
  callback: (nonce: string | null) => T
): Promise<T> {
  const nonce = await CSPNonce.getFromHeadersSafe();
  return callback(nonce);
}

/**
 * Generate inline script tag with proper nonce handling
 */
export function createNonceScript(content: string, nonce?: string | null): React.ReactElement | null {
  if (!nonce) return null;
  
  return React.createElement('script', {
    nonce,
    dangerouslySetInnerHTML: { __html: content },
    suppressHydrationWarning: true,
  });
}

/**
 * Generate inline style tag with proper nonce handling
 */
export function createNonceStyle(content: string, nonce?: string | null): React.ReactElement | null {
  if (!nonce) return null;
  
  return React.createElement('style', {
    nonce,
    dangerouslySetInnerHTML: { __html: content },
    suppressHydrationWarning: true,
  });
}

// Re-export for convenience
export { CSPNonce } from "./csp"; 