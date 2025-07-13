"use client";

import { useState, useEffect } from "react";

// Types for CSRF functionality
interface CSRFHookReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

interface CSRFTokenResponse {
  token: string;
}

/**
 * Hook to manage CSRF tokens for client-side forms
 * 
 * Usage:
 * const { token, isLoading, error, refreshToken } = useCSRF();
 * 
 * Then include the token in your forms:
 * <input type="hidden" name="csrf_token" value={token} />
 */
export function useCSRF(): CSRFHookReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/csrf", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CSRFTokenResponse = await response.json();
      setToken(data.token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("CSRF token fetch error:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    await fetchToken();
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return {
    token,
    isLoading,
    error,
    refreshToken,
  };
}

/**
 * Hook to get CSP nonce for client components following csp.md approach
 * Returns the nonce value or null if not available
 */
export function useNonce(): string | null {
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // Get nonce from window global as set by the root layout
    if (typeof window !== 'undefined' && '__CSP_NONCE__' in window) {
      setNonce((window as { __CSP_NONCE__?: string }).__CSP_NONCE__ || null);
    }
  }, []);

  return nonce;
}

/**
 * Hook for form submissions with CSRF protection
 * 
 * Usage:
 * const { submitForm, isSubmitting } = useFormWithCSRF({
 *   onSubmit: async (formData) => {
 *     // Your form submission logic
 *   },
 *   onSuccess: () => {
 *     // Success callback
 *   },
 *   onError: (error) => {
 *     // Error callback
 *   }
 * });
 */
export function useFormWithCSRF({
  onSubmit,
  onSuccess,
  onError,
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) {
  const { token, refreshToken } = useCSRF();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitForm = async (formData: FormData) => {
    if (!token) {
      const error = "CSRF token not available";
      onError?.(error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Add CSRF token to form data
      formData.set("csrf_token", token);

      // Submit the form
      await onSubmit(formData);

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Submission failed";
      
      // If CSRF error, try refreshing token
      if (errorMessage.includes("CSRF") || errorMessage.includes("403")) {
        try {
          await refreshToken();
        } catch (refreshError) {
          console.error("Failed to refresh CSRF token:", refreshError);
        }
      }

      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForm,
    isSubmitting,
    token,
  };
}

/**
 * Hook for CSRF form utilities
 * Provides helper functions for CSRF-protected forms
 */
export function useCSRFForm() {
  const { token, isLoading, error } = useCSRF();

  const createFormDataWithCSRF = (formElement?: HTMLFormElement) => {
    const formData = formElement ? new FormData(formElement) : new FormData();
    if (token) {
      formData.set("csrf_token", token);
    }
    return formData;
  };

  const getHeadersWithCSRF = async (additionalHeaders: Record<string, string> = {}) => {
    return {
      ...additionalHeaders,
      ...(token && { "X-CSRF-Token": token }),
    };
  };

  const isReady = !isLoading && !error && !!token;

  return {
    token,
    createFormDataWithCSRF,
    getHeadersWithCSRF,
    isReady,
    isLoading,
    error,
  };
}
