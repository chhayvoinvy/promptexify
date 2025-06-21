"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { InputForm } from "@/components/ui/input-form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUpWithPassword, signInWithOAuth } from "@/lib/auth";
import { signUpSchema, type SignUpData } from "@/lib/schemas";

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

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [needsVerification, setNeedsVerification] = useState(false);
  const router = useRouter();

  const form = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  async function handleSignUp(data: SignUpData) {
    startTransition(async () => {
      const result = await signUpWithPassword(data);

      if (result.error) {
        toast.error(result.error);
      } else if (result.needsVerification) {
        setNeedsVerification(true);
        toast.success("Please check your email to verify your account!");
      } else {
        toast.success("Account created successfully!");
        router.push("/dashboard");
      }
    });
  }

  async function handleGoogleSignUp() {
    startTransition(async () => {
      const result = await signInWithOAuth("google");

      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  if (needsVerification) {
    return (
      <div className="space-y-4">
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong>Verification email sent!</strong>
            <br />
            Please check your email and click the verification link to complete
            your registration.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          onClick={() => setNeedsVerification(false)}
          className="w-full"
        >
          Back to Sign Up
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* OAuth Section */}
      <Button
        variant="outline"
        onClick={handleGoogleSignUp}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing up with Google...
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
            Or create account with
          </span>
        </div>
      </div>

      {/* Sign Up Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-4">
          <InputForm
            control={form.control}
            name="name"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            disabled={isPending}
          />

          <InputForm
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
          />

          <div className="relative">
            <InputForm
              control={form.control}
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              description="Must be at least 8 characters long"
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
