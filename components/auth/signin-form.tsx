"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { InputForm } from "@/components/ui/input-form";
import { Separator } from "@/components/ui/separator";
import {
  signInWithPassword,
  signInWithMagicLink,
  signInWithOAuth,
} from "@/lib/auth";
import {
  signInSchema,
  magicLinkSchema,
  type SignInData,
  type MagicLinkData,
} from "@/lib/schemas";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

type AuthMode = "password" | "magic-link";

export function SignInForm() {
  const [mode, setMode] = useState<AuthMode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const passwordForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const magicLinkForm = useForm<MagicLinkData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  async function handlePasswordSignIn(data: SignInData) {
    startTransition(async () => {
      const result = await signInWithPassword(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Welcome back!");
        router.push("/");
      }
    });
  }

  async function handleMagicLinkSignIn(data: MagicLinkData) {
    startTransition(async () => {
      const result = await signInWithMagicLink(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Check your email for the magic link!");
      }
    });
  }

  async function handleGoogleSignIn() {
    startTransition(async () => {
      const result = await signInWithOAuth("google");

      if (result.error) {
        toast.error(result.error);
      }
      // Note: If successful, the page will redirect automatically
    });
  }

  return (
    <div className="space-y-6">
      {/* OAuth Section */}
      <Button
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in with Google...
          </>
        ) : (
          <>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-5 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Auth Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "password" ? "default" : "ghost"}
          onClick={() => setMode("password")}
          className="flex-1"
          type="button"
        >
          Password
        </Button>
        <Button
          variant={mode === "magic-link" ? "default" : "ghost"}
          onClick={() => setMode("magic-link")}
          className="flex-1"
          type="button"
        >
          Magic Link
        </Button>
      </div>

      {/* Password Form */}
      {mode === "password" && (
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSignIn)}
            className="space-y-4"
          >
            <InputForm
              control={passwordForm.control}
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isPending}
            />

            <div className="relative">
              <InputForm
                control={passwordForm.control}
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                disabled={isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-7 h-9 px-3 py-1 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>
      )}

      {/* Magic Link Form */}
      {mode === "magic-link" && (
        <Form {...magicLinkForm}>
          <form
            onSubmit={magicLinkForm.handleSubmit(handleMagicLinkSignIn)}
            className="space-y-4"
          >
            <InputForm
              control={magicLinkForm.control}
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              description="We'll send you a secure link to sign in"
              required
              disabled={isPending}
            />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Magic Link"
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
