"use client";

import { useState, useEffect, useCallback } from "react";
import { CSPNonce } from "@/lib/security";

interface CSRFHookReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  getFormProps: () => { csrf_token?: string };
}

/**
 * Hook for managing CSRF tokens in client components
 */
export function useCSRF(): CSRFHookReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      const data = await response.json();

      if (!data.token) {
        throw new Error("No CSRF token received");
      }

      setToken(data.token);
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
    (baseHeaders: HeadersInit = {}) => {
      if (!token) return baseHeaders;
      return addCSRFToHeaders(baseHeaders, token);
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
