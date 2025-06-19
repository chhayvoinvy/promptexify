"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { LogOut, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/actions";

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

  function handleSignOut() {
    startTransition(async () => {
      try {
        const result = await signOutAction();
        if (result?.error) {
          toast.error(result.error);
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
            // This is a successful sign out with redirect - don't show error
            return;
          }
        }

        // This is an actual error
        toast.error("Failed to sign out");
      }
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
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
