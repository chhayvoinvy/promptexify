"use client";

import { useState, useTransition } from "react";
import { updateUserProfileAction } from "@/actions";
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
import {
  User,
  Mail,
  Calendar,
  Shield,
  Crown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
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
  };
}

export function AccountForm({ user }: AccountFormProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setFeedback({ type: null, message: "" });

      const result = await updateUserProfileAction(formData);

      if (result.success) {
        setFeedback({
          type: "success",
          message: result.message || "Profile updated successfully!",
        });
      } else {
        setFeedback({
          type: "error",
          message:
            result.error || "Failed to update profile. Please try again.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>

        {/* Feedback Alert */}
        {feedback.type && (
          <Alert
            variant={feedback.type === "error" ? "destructive" : "default"}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {/* Profile Information Card */}
        <Card>
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
                  placeholder="Enter your full name"
                  required
                  maxLength={50}
                  className="max-w-md"
                  disabled={isPending}
                />
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

              <Button type="submit" className="mt-4" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Information about your account status and membership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Type</span>
                <Badge
                  variant={user.type === "PREMIUM" ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {user.type === "PREMIUM" && <Crown className="h-3 w-3" />}
                  {user.type}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Role</span>
                <Badge variant="outline">{user.role}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sign-in Method</span>
                <Badge variant="outline">
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
            </div>

            {user.type === "FREE" && (
              // TODO: Add a way to upgrade to premium
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
