"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserProfileAction } from "@/actions";
import { useCSRFForm } from "@/hooks/use-csrf";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, Shield, Crown } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccountFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    type: "FREE" | "PREMIUM";
    role: "USER" | "ADMIN";
    oauth: "GOOGLE" | "EMAIL";
    createdAt: Date;
    updatedAt: Date;
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
  };
}

export function AccountForm({ user }: AccountFormProps) {
  const [isPending, startTransition] = useTransition();
  const { createFormDataWithCSRF, isReady } = useCSRFForm();

  function handleSubmit(formData: FormData) {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    startTransition(async () => {
      try {
        // Add CSRF protection to form data
        const secureFormData = createFormDataWithCSRF();
        
        // Add all form data to the secure form data
        for (const [key, value] of formData.entries()) {
          secureFormData.set(key, value);
        }

        const result = await updateUserProfileAction(secureFormData);

        if (result.success) {
          toast.success(result.message || "Profile updated successfully!");
        } else {
          toast.error(
            result.error || "Failed to update profile. Please try again."
          );
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Manage your account information and preferences
      </p>
      <div className="gap-6 flex">
        {/* Profile Information Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information. Your email cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={user.name || ""}
                  placeholder="Enter your full name (e.g., Mary Jane)"
                  required
                  maxLength={50}
                  pattern="[a-zA-Z\s]+"
                  title="Name can only contain letters (a-z, A-Z) and spaces"
                  className="max-w-md"
                  disabled={isPending || !isReady}
                  onInput={(e) => {
                    // Client-side validation: only allow a-z A-Z and spaces
                    const target = e.target as HTMLInputElement;
                    const value = target.value;
                    // Remove invalid characters but keep letters and spaces
                    const sanitized = value
                      .replace(/[^a-zA-Z\s]/g, "")
                      // Normalize multiple spaces to single space
                      .replace(/\s+/g, " ")
                      // Remove leading/trailing spaces during typing
                      .replace(/^\s+/, "");

                    if (value !== sanitized) {
                      target.value = sanitized;
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Only letters (a-z, A-Z) and spaces are allowed. 2-50
                  characters.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="max-w-md bg-muted"
                  />
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Email addresses cannot be changed for security reasons.
                </p>
              </div>

              <Button
                type="submit"
                className="mt-4"
                disabled={isPending || !isReady}
              >
                {isPending
                  ? "Saving..."
                  : isReady
                    ? "Save Changes"
                    : "Initializing..."}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Information about your account status and membership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Membership Type</span>
                <Badge
                  variant={user.type === "PREMIUM" ? "default" : "outline"}
                  className="flex items-center gap-1"
                >
                  {user.type === "PREMIUM" && <Crown className="h-3 w-3" />}
                  {user.type === "PREMIUM" ? "PREMIUM" : "FOREVER FREE"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sign-in Method</span>
                <Badge variant="outline">
                  <svg
                    className="h-3 w-3 mr-1 fill-current"
                    height="800px"
                    width="800px"
                    version="1.1"
                    id="Capa_1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 210 210"
                    xmlSpace="preserve"
                  >
                    <path
                      d="M0,105C0,47.103,47.103,0,105,0c23.383,0,45.515,7.523,64.004,21.756l-24.4,31.696C133.172,44.652,119.477,40,105,40
	c-35.841,0-65,29.159-65,65s29.159,65,65,65c28.867,0,53.398-18.913,61.852-45H105V85h105v20c0,57.897-47.103,105-105,105
	S0,162.897,0,105z"
                    />
                  </svg>
                  {user.oauth === "GOOGLE" ? "Google" : "Email"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Member Since</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Login</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {user.lastSignInAt
                    ? new Date(user.lastSignInAt).toLocaleString()
                    : "Just now"}
                </span>
              </div>
            </div>

            {user.type === "FREE" && (
              <Alert className="hidden">
                <Crown className="h-4 w-4" />
                <AlertDescription>
                  Upgrade to Premium to unlock advanced features and unlimited
                  access to all prompts.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
