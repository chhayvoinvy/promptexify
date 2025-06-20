"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Star, Zap } from "lucide-react";
import { PostWithInteractions } from "@/lib/content";

interface PremiumUpgradeModalProps {
  post: PostWithInteractions;
  onClose?: () => void;
}

export function PremiumUpgradeModal({
  post,
  onClose,
}: PremiumUpgradeModalProps) {
  const handleUpgrade = () => {
    // TODO: Implement upgrade flow (Stripe integration, etc.)
    console.log("Redirect to upgrade page");
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // If no onClose handler, navigate to home page (for direct URL access)
      window.location.href = "/";
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-2xl h-auto max-h-[600px] flex flex-col p-0 gap-0 sm:w-[90vw] md:w-[85vw]">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-teal-500 to-sky-500 px-6 py-6 text-white">
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

        <div className="flex flex-col p-6 gap-6">
          {/* Premium Content Preview */}
          <div className="bg-muted/30 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-teal-500" />
                Premium Prompt Preview
              </h3>
              <Badge className="text-foreground bg-gradient-to-r from-teal-500 to-sky-500">
                Premium
              </Badge>
            </div>
            <div className="relative">
              <div className="text-sm text-muted-foreground line-clamp-3 blur-sm select-none">
                {post.content?.substring(0, 200) ||
                  post.description ||
                  "Exclusive premium content awaits..."}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Premium Features */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base">
              Unlock Premium Benefits:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-medium text-sm">Exclusive Prompts</div>
                  <div className="text-xs text-muted-foreground">
                    Access premium AI prompts
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium text-sm">Advanced Features</div>
                  <div className="text-xs text-muted-foreground">
                    Enhanced tools & functionality
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <Crown className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="font-medium text-sm">Priority Support</div>
                  <div className="text-xs text-muted-foreground">
                    Get help when you need it
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
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

          {/* Pricing */}
          <div className="bg-gradient-to-r from-teal-50 to-sky-50 dark:from-teal-950/20 dark:to-sky-950/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                $9.99/month
              </div>
              <div className="text-sm text-muted-foreground">
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-semibold"
              size="lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
            <Button variant="outline" onClick={handleClose} size="lg">
              Maybe Later
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-xs text-muted-foreground">
            Secure payment • 30-day money-back guarantee • Cancel anytime
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
