"use client";

import { useState, useEffect, useCallback } from "react";
import { CSPNonce } from "@/lib/csp";

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
let inflightRequest: Promise<string> | null = null;

async function obtainToken(): Promise<string> {
  // Return cached token when present
  if (globalToken) return globalToken;

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
      // Ensure we have a token before proceeding
      const currentToken = token || (await obtainToken());
      if (!currentToken) {
        console.error("Failed to obtain CSRF token for headers");
        return baseHeaders; // Or throw an error
      }
      return addCSRFToHeaders(baseHeaders, currentToken);
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
