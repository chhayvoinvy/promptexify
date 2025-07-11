"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { LogOut, Loader2 } from "@/components/ui/icons";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/actions";
import { clearClientSideData, logSecurityEvent } from "@/lib/utils";

interface LogoutButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = "ghost",
  size = "default",
  className,
  children,
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSignOut = useCallback(() => {
    startTransition(async () => {
      try {
        // Log security event for audit trail
        logSecurityEvent("logout_initiated", {
          component: "LogoutButton",
          userInitiated: true,
        });

        // Perform client-side cleanup first
        clearClientSideData();

        // Then perform server-side logout
        const result = await signOutAction();

        if (result?.error) {
          logSecurityEvent("logout_error", {
            error: result.error,
            hasSecurityFlag: result.securityFlag || false,
          });

          toast.error(result.error);

          // On error, still redirect to signin for security
          router.push("/signin");
        } else {
          // Log successful logout
          logSecurityEvent("logout_completed", {
            success: true,
          });
        }
        // Don't show success message as user will be redirected immediately
      } catch (error) {
        // Check if this is a Next.js redirect (which means successful sign out)
        if (error && typeof error === "object" && "digest" in error) {
          const errorDigest = (error as { digest?: string }).digest;
          if (
            typeof errorDigest === "string" &&
            errorDigest.includes("NEXT_REDIRECT")
          ) {
            // This is a successful sign out with redirect
            logSecurityEvent("logout_redirect_success");
            return;
          }
        }

        // This is an actual error - perform security fallback
        console.error("Logout error:", error);
        logSecurityEvent("logout_critical_error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });

        toast.error("Logout encountered an issue. Redirecting for security.");

        // Security fallback: always redirect to signin even on error
        clearClientSideData();
        router.push("/signin");
      }
    });
  }, [router]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
      // Security: Prevent double-click and ensure single logout action
      aria-label="Sign out securely"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {children && <span className="ml-2">{children}</span>}
    </Button>
  );
}
