"use client";

import { useState, useEffect, useCallback } from "react";
import { CSPNonce } from "@/lib/security/csp";

interface CSRFHookReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  getFormProps: () => { csrf_token?: string };
}

// ----------------------------------------------
// Module-level cache so every component shares a
// single CSRF token fetch instead of each firing
// its own request (eliminates the N duplicate
// requests problem on pages with many Dropdowns).
// ----------------------------------------------

let globalToken: string | null = null;
// Track when the token was last fetched so we can refresh it proactively
let globalTokenFetchedAt: number | null = null;
let inflightRequest: Promise<string> | null = null;

// Tokens last 24 h. Refresh after 23 h so the next mutation never fails.
const TOKEN_REFRESH_INTERVAL = 23 * 60 * 60 * 1000; // 23 hours in ms

async function obtainToken(): Promise<string> {
  // Return cached token when present
  if (globalToken) {
    // If token is older than threshold, force refresh
    if (
      globalTokenFetchedAt &&
      Date.now() - globalTokenFetchedAt < TOKEN_REFRESH_INTERVAL
    ) {
      return globalToken;
    }
    // Stale – clear and fetch a new one
    globalToken = null;
  }

  // If another component already started the request, wait for it
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    const response = await fetch("/api/csrf", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
    }

    const data: { token?: string } = await response.json();

    if (!data.token) {
      throw new Error("No CSRF token received");
    }

    globalToken = data.token;
    globalTokenFetchedAt = Date.now();
    return globalToken;
  })().finally(() => {
    // Clear inflight reference so future refreshes work
    inflightRequest = null;
  });

  return inflightRequest;
}

/**
 * Hook for managing CSRF tokens in client components
 */
export function useCSRF(): CSRFHookReturn {
  const [token, setToken] = useState<string | null>(globalToken);
  const [isLoading, setIsLoading] = useState(!globalToken);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newToken = await obtainToken();
      setToken(newToken);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch CSRF token";
      setError(errorMessage);
      console.error("CSRF token fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    await fetchToken();
  }, [fetchToken]);

  const getFormProps = useCallback(() => {
    return token ? { csrf_token: token } : {};
  }, [token]);

  // Fetch token on mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken,
    getFormProps,
  };
}

/**
 * Utility function to add CSRF token to FormData
 */
export function addCSRFToFormData(formData: FormData, token: string): void {
  formData.set("csrf_token", token);
}

/**
 * Utility function to add CSRF token to request headers
 */
export function addCSRFToHeaders(
  headers: HeadersInit,
  token: string
): HeadersInit {
  return {
    ...headers,
    "x-csrf-token": token,
  };
}

/**
 * Hook for forms that need CSRF protection with automatic token injection
 */
export function useCSRFForm() {
  const { token, isLoading, error } = useCSRF();

  const createFormDataWithCSRF = useCallback(
    (data: Record<string, FormDataEntryValue>) => {
      const formData = new FormData();

      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Add CSRF token if available
      if (token) {
        addCSRFToFormData(formData, token);
      }

      return formData;
    },
    [token]
  );

  const getHeadersWithCSRF = useCallback(
    async (baseHeaders: HeadersInit = {}) => {
      try {
        // Try to use existing token first
        let currentToken = token;

        // If no token or token is stale, fetch a fresh one
        if (
          !currentToken ||
          (globalTokenFetchedAt &&
            Date.now() - globalTokenFetchedAt > TOKEN_REFRESH_INTERVAL)
        ) {
          console.log("[CSRF] Refreshing token for request");
          currentToken = await obtainToken();
        }

        if (!currentToken) {
          console.error("Failed to obtain CSRF token for headers");
          throw new Error("CSRF token unavailable");
        }

        return addCSRFToHeaders(baseHeaders, currentToken);
      } catch (error) {
        console.error("Error getting CSRF headers:", error);
        // Return base headers as fallback, but this will likely cause CSRF validation to fail
        // which should trigger the error handling in the calling code
        return baseHeaders;
      }
    },
    [token]
  );

  return {
    token,
    isLoading,
    error,
    createFormDataWithCSRF,
    getHeadersWithCSRF,
    isReady: !isLoading && !error && !!token,
  };
}

/**
 * Hook to get CSP nonce for client components
 * Returns the nonce value or null if not available
 */
export function useNonce(): string | null {
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // Get nonce from window global on client side
    const nonceValue = CSPNonce.getFromWindow();
    setNonce(nonceValue);
  }, []);

  return nonce;
}
