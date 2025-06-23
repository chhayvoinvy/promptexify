"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Lock, Crown, Star, Zap, Loader2 } from "lucide-react";
import { PostWithInteractions } from "@/lib/content";
import { createStripeSubscription } from "@/actions/stripe";
import { subscriptionPlans } from "@/config/subscription-plans";
import { toast } from "sonner";

interface PremiumUpgradeModalProps {
  post: PostWithInteractions;
  onClose?: () => void;
}

export function PremiumUpgradeModal({
  post,
  onClose,
}: PremiumUpgradeModalProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentPlan = isYearly
    ? subscriptionPlans.yearly
    : subscriptionPlans.monthly;
  const yearlyPlan = subscriptionPlans.yearly;
  const monthlyPlan = subscriptionPlans.monthly;

  // Calculate savings for yearly plan
  const monthlyTotal = monthlyPlan.price * 12;
  const yearlySavings = monthlyTotal - yearlyPlan.price;
  const savingsPercentage = Math.round((yearlySavings / monthlyTotal) * 100);

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      const result = await createStripeSubscription(currentPlan.stripePriceId);

      if (result.status === "success" && result.stripeUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.stripeUrl;
      } else {
        toast.error(result.message || "Failed to create subscription");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error("Upgrade error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // If no onClose handler, navigate to home page (for direct URL access)
      window.location.href = "/";
    }
  };

  // Add blur effect to body when modal is open
  useEffect(() => {
    // Create a wrapper div for the body content to blur everything except the modal
    const bodyChildren = Array.from(document.body.children);
    const wrapperDiv = document.createElement("div");
    wrapperDiv.id = "blur-wrapper";
    wrapperDiv.style.filter = "blur(10px)";
    wrapperDiv.style.transition = "filter 0.5s ease-in-out";

    // Move all body children to the wrapper except for the portal div
    bodyChildren.forEach((child) => {
      if (!child.hasAttribute("data-radix-portal-container")) {
        wrapperDiv.appendChild(child);
      }
    });

    document.body.appendChild(wrapperDiv);

    return () => {
      // Move children back to body and remove wrapper
      const wrapper = document.getElementById("blur-wrapper");
      if (wrapper) {
        const wrapperChildren = Array.from(wrapper.children);
        wrapperChildren.forEach((child) => {
          document.body.appendChild(child);
        });
        wrapper.remove();
      }
    };
  }, []);

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="fixed top-[50%] left-[50%] z-50 max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex flex-col p-0 gap-0 rounded-xl shadow-2xl sm:max-w-lg lg:max-w-xl md:max-h-[90vh] lg:max-h-[95vh]">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-teal-500 to-sky-500 px-6 py-6 text-white rounded-t-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="h-6 w-6 text-yellow-300" />
              <DialogTitle className="text-xl font-bold text-white">
                Unlock Premium Content
              </DialogTitle>
            </div>
            <DialogDescription className="text-teal-50">
              Upgrade to Premium to access exclusive AI prompts and advanced
              features
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col p-6 gap-6 overflow-y-auto">
          {/* Premium Content Preview */}
          <div className="bg-muted/30 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-teal-500" />
                Premium Prompt Preview
              </h3>
              <Badge className="text-foreground bg-gradient-to-r from-teal-500 to-sky-300 dark:from-teal-400 dark:to-sky-300">
                Premium
              </Badge>
            </div>
            <div className="relative">
              <span className="text-xs text-muted-foreground line-clamp-3 blur-xs select-none">
                {post.content?.substring(0, 200) ||
                  post.description ||
                  "Exclusive premium content awaits..."}
              </span>
            </div>
          </div>

          {/* Premium Features */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base">
              Unlock Premium Benefits:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-top gap-3 p-3 bg-muted/20 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-medium text-sm">Exclusive Prompts</div>
                  <div className="text-xs text-muted-foreground">
                    Access premium AI prompts
                  </div>
                </div>
              </div>
              <div className="flex items-top gap-3 p-3 bg-muted/20 rounded-lg">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium text-sm">Advanced Features</div>
                  <div className="text-xs text-muted-foreground">
                    Enhanced tools & prompts
                  </div>
                </div>
              </div>
              <div className="flex items-top gap-3 p-3 bg-muted/20 rounded-lg">
                <Crown className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="font-medium text-sm">Priority Support</div>
                  <div className="text-xs text-muted-foreground">
                    Get help when you need it
                  </div>
                </div>
              </div>
              <div className="flex items-top gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <div className="font-medium text-sm">Ad-Free Experience</div>
                  <div className="text-xs text-muted-foreground">
                    Enjoy without interruptions
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <span
                className={`text-sm ${
                  !isYearly ? "font-semibold" : "text-muted-foreground"
                }`}
              >
                Monthly
              </span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span
                className={`text-sm ${
                  isYearly ? "font-semibold" : "text-muted-foreground"
                }`}
              >
                Yearly
              </span>
              {isYearly && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                >
                  Save {savingsPercentage}%
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-teal-50 to-sky-50 dark:from-teal-950/20 dark:to-sky-950/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                ${currentPlan.price}
                {isYearly ? "/year" : "/month"}
              </div>
              {isYearly && (
                <div className="text-xs text-muted-foreground">
                  Save ${yearlySavings.toFixed(2)} per year
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-semibold"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              size="lg"
              disabled={isLoading}
            >
              Maybe Later
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-xs text-muted-foreground py-0">
            Secure payment with Stripe • Cancel anytime
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
