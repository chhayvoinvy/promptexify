"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Crown, Star, Zap, Loader2 } from "@/components/ui/icons";
import { PostWithInteractions } from "@/lib/content";
import { redirectToStripeCheckout } from "@/actions/stripe";
import { toast } from "sonner";

interface PremiumUpgradeModalProps {
  post: PostWithInteractions;
  onClose?: () => void;
}

export function PremiumUpgradeModal({
  post,
  onClose,
}: PremiumUpgradeModalProps) {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const monthlyPriceId =
    process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID!;
  const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID!;

  const monthlyPrice = 2.99;
  const yearlyPrice = 29.99;
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savings =
    ((monthlyPrice - yearlyMonthlyEquivalent) / monthlyPrice) * 100;

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      const priceId = isYearly ? yearlyPriceId : monthlyPriceId;
      await redirectToStripeCheckout(priceId);
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Use router.back() for clean navigation history
      router.back();
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
                <Crown className="h-5 w-5 text-teal-500" />
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

          {/* Pricing Display */}
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            {/* Pricing Toggle */}
            <div className="space-y-4">
              {/* Billing Period Toggle */}
              <div className="flex justify-center">
                <Tabs
                  value={isYearly ? "yearly" : "monthly"}
                  onValueChange={(value) => setIsYearly(value === "yearly")}
                  className="w-fit"
                >
                  <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger
                      value="monthly"
                      className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger
                      value="yearly"
                      className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      Yearly
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="text-center flex flex-col items-center justify-center py-3">
                <div className="text-4xl font-bold text-foreground">
                  ${isYearly ? yearlyPrice.toFixed(2) : monthlyPrice.toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{isYearly ? "year" : "month"}
                  </span>
                </div>
                {isYearly ? (
                  <>
                    <div className="text-sm text-muted-foreground flex items-center justify-center mt-2">
                      Only ${yearlyMonthlyEquivalent.toFixed(2)}/month
                      <Badge
                        variant="outline"
                        className="ml-2 text-sm bg-muted/20 text-green-700 dark:text-green-300"
                      >
                        Save {Math.round(savings)}%
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-sm"
                    >
                      Affordably priced
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-semibold disabled:opacity-50"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Processing..." : "Upgrade to Premium"}
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
