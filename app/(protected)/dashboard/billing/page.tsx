import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { getEnhancedUserSubscriptionPlan } from "@/lib/subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Crown,
  Calendar,
  AlertCircle,
  AlertTriangle,
} from "@/components/ui/icons";
import { AppSidebar } from "@/components/dashboard/admin-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { subscriptionPlans } from "@/config/subscription-plans";
import {
  createCustomerPortalSession,
  createStripeSubscription,
} from "@/actions/stripe";
import { redirect } from "next/navigation";
import { syncUserSubscriptionWithStripe } from "@/actions/stripe";
import { getCurrentUser } from "@/lib/auth";
import { formatStripeDate } from "@/lib/utils";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface BillingActionProps {
  subscriptionPlan: Awaited<ReturnType<typeof getEnhancedUserSubscriptionPlan>>;
}

function BillingAction({ subscriptionPlan }: BillingActionProps) {
  async function handleManageSubscription() {
    "use server";

    const result = await createCustomerPortalSession();

    if (result.status === "success" && result.stripeUrl) {
      redirect(result.stripeUrl);
    }
  }

  async function handleUpgradeToMonthly() {
    "use server";

    const result = await createStripeSubscription(
      subscriptionPlans.monthly.stripePriceId
    );

    if (result.status === "success" && result.stripeUrl) {
      redirect(result.stripeUrl);
    }
  }

  async function handleUpgradeToYearly() {
    "use server";

    const result = await createStripeSubscription(
      subscriptionPlans.yearly.stripePriceId
    );

    if (result.status === "success" && result.stripeUrl) {
      redirect(result.stripeUrl);
    }
  }

  if (subscriptionPlan.isPaid) {
    return (
      <div className="space-y-4">
        <form action={handleManageSubscription}>
          <Button type="submit" className="w-full">
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          You can update payment method, billing information, or cancel your
          subscription.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <form action={handleUpgradeToMonthly}>
          <Button type="submit" variant="outline" className="w-full h-auto p-4">
            <div className="text-center">
              <div className="font-semibold">
                {subscriptionPlans.monthly.name}
              </div>
              <div className="text-2xl font-bold">
                ${subscriptionPlans.monthly.price}/mo
              </div>
              <div className="text-sm text-muted-foreground">
                Billed monthly
              </div>
            </div>
          </Button>
        </form>

        <form action={handleUpgradeToYearly}>
          <Button type="submit" className="w-full h-auto p-4">
            <div className="text-center">
              <div className="font-semibold">
                {subscriptionPlans.yearly.name}
              </div>
              <div className="text-2xl font-bold">
                ${subscriptionPlans.yearly.price}/yr
              </div>
              <div className="text-sm text-muted-foreground">
                2 months free!
              </div>
            </div>
          </Button>
        </form>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Upgrade to access premium features and content.
      </p>
    </div>
  );
}

async function BillingContent() {
  try {
    const user = await requireAuth();

    if (!user.userData?.id) {
      throw new Error("User data not found");
    }

    // Get subscription plan data
    const subscriptionPlan = await getEnhancedUserSubscriptionPlan(
      user.userData.id
    );

    // Sync user data with Stripe to ensure consistency
    const syncResult = await syncUserSubscriptionWithStripe(user.userData.id);

    // Re-fetch user data if sync occurred
    const currentUser = syncResult.synced ? await getCurrentUser() : user;

    // Use the safe date formatting utility
    const formatDate = formatStripeDate;

    return (
      <div className="space-y-6">
        {/* Sync notification */}
        {syncResult.synced && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Account Updated
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                {syncResult.message}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your current subscription status and plan details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Account Type</span>
                <Badge
                  variant={
                    currentUser?.userData?.type === "PREMIUM"
                      ? "default"
                      : "secondary"
                  }
                >
                  {currentUser?.userData?.type || user.userData.type}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-medium">Plan</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={subscriptionPlan.isPaid ? "default" : "secondary"}
                  >
                    {subscriptionPlan.name}
                  </Badge>
                </div>
              </div>

              {subscriptionPlan.isPaid ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status</span>
                    <Badge
                      className={
                        subscriptionPlan.isCanceled
                          ? "bg-red-500/50 text-destructive border-red-500 dark:border-red-500 dark:bg-red-500/20 dark:text-red-500"
                          : "bg-green-500/50 text-green-500-foreground border-green-500 dark:border-green-500 dark:bg-green-500/20 dark:text-green-500"
                      }
                      variant="outline"
                    >
                      {subscriptionPlan.isCanceled ? "Canceled" : "Active"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Billing</span>
                    <span className="text-sm font-medium">
                      ${subscriptionPlan.price}/{subscriptionPlan.interval}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {subscriptionPlan.isCanceled
                        ? "Access until"
                        : "Next billing date"}
                    </span>
                    <span className="text-sm">
                      {formatDate(subscriptionPlan.stripeCurrentPeriodEnd)}
                    </span>
                  </div>

                  {subscriptionPlan.isCanceled && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive">
                          Subscription Canceled
                        </p>
                        <p className="text-muted-foreground">
                          Your subscription has been canceled and will end on{" "}
                          {formatDate(subscriptionPlan.stripeCurrentPeriodEnd)}.
                          You&apos;ll retain access until then.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Data inconsistency warning - should be resolved by sync */}
                  {(currentUser?.userData?.type || user.userData.type) ===
                    "FREE" &&
                    subscriptionPlan.isPaid && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800 dark:text-yellow-200">
                            Account Sync Notice
                          </p>
                          <p className="text-yellow-700 dark:text-yellow-300">
                            Data inconsistency detected. Please refresh the page
                            or contact support if this persists.
                          </p>
                        </div>
                      </div>
                    )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status</span>
                    <Badge variant="secondary">Free</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cost</span>
                    <span className="text-sm font-medium">$0.00</span>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Upgrade to Premium</strong> to unlock advanced
                      features, premium content, and priority support.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <BillingAction subscriptionPlan={subscriptionPlan} />
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Plan Features
              </CardTitle>
              <CardDescription>
                What&apos;s included with your{" "}
                {subscriptionPlan.isPaid ? "current" : "selected"} plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {subscriptionPlan.features.map(
                  (feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  )
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Premium Plans (only show if user is on free plan) */}
          {!subscriptionPlan.isPaid && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>
                  Choose the plan that works best for you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {subscriptionPlans.monthly.name}
                      </CardTitle>
                      <CardDescription>
                        {subscriptionPlans.monthly.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">
                        ${subscriptionPlans.monthly.price}
                        <span className="text-lg font-normal text-muted-foreground">
                          /month
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {subscriptionPlans.monthly.features.map(
                          (feature: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {feature}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {subscriptionPlans.yearly.name}
                          </CardTitle>
                          <CardDescription>
                            {subscriptionPlans.yearly.description}
                          </CardDescription>
                        </div>
                        <Badge>Best Value</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">
                        ${subscriptionPlans.yearly.price}
                        <span className="text-lg font-normal text-muted-foreground">
                          /year
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {subscriptionPlans.yearly.features.map(
                          (feature: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {feature}
                            </li>
                          )
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Billing page error:", error);
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Unable to Load Billing Information
          </h3>
          <p className="text-muted-foreground text-center">
            There was an error loading your billing information. Please try
            again.
          </p>
        </CardContent>
      </Card>
    );
  }
}

function BillingLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse mt-2" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-4 p-6">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              <div className="h-20 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function BillingPage() {
  // Require authentication - both USER and ADMIN can access billing
  const user = await requireAuth();

  if (!user) {
    redirect("/signin");
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-6 lg:p-6">
          <Suspense fallback={<BillingLoading />}>
            <BillingContent />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
