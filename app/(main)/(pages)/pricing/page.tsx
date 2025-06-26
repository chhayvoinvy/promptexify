"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Crown, Zap, Loader2, Check, Shield, Users } from "lucide-react";
import { redirectToStripeCheckout } from "@/actions/stripe";
import { toast } from "sonner";
import { subscriptionPlans } from "@/config/subscription-plans";
import { Container } from "@/components/ui/container";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const monthlyPriceId = subscriptionPlans.monthly.stripePriceId;
  const yearlyPriceId = subscriptionPlans.yearly.stripePriceId;

  const monthlyPrice = subscriptionPlans.monthly.price;
  const yearlyPrice = subscriptionPlans.yearly.price;
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

  const features = [
    {
      icon: Crown,
      title: "Exclusive Prompts",
      description: "Access premium AI prompts",
    },
    {
      icon: Zap,
      title: "Advanced Features",
      description: "Enhanced tools & prompts",
    },
    {
      icon: Shield,
      title: "Ad-Free Experience",
      description: "Enjoy without interruptions",
    },
  ];

  const faqItems = [
    {
      question: "What's included in the Premium subscription?",
      answer:
        "Premium includes access to exclusive AI prompts, advanced features, priority support, and an ad-free experience. You'll also get early access to new prompts and tools as they're released.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer:
        "Yes, you can cancel your subscription at any time. Your access to premium features will continue until the end of your current billing period.",
    },
    {
      question: "Is there a free trial available?",
      answer:
        "While we don't offer a traditional free trial, our free tier gives you access to basic prompts so you can explore the platform before upgrading to Premium.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, MasterCard, American Express) and other payment methods supported by Stripe, our secure payment processor.",
    },
    {
      question: "How does the yearly plan save me money?",
      answer:
        "The yearly plan gives you 2 months free compared to paying monthly. You'll save over 16% by choosing annual billing.",
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer:
        "Yes, you can change your subscription plan at any time. Changes will be prorated and reflected in your next billing cycle.",
    },
    {
      question: "Is my payment information secure?",
      answer:
        "Absolutely. We use Stripe, an industry-leading payment processor that handles billions of dollars in transactions. Your payment information is encrypted and never stored on our servers.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day money-back guarantee. If you're not satisfied with Premium, contact our support team within 30 days of your purchase for a full refund.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Container className="px-4 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Pricing
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Upgrade to Premium to access exclusive AI prompts and advanced
            features. Choose the plan that works best for you.
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-15">
          <Tabs
            value={isYearly ? "yearly" : "monthly"}
            onValueChange={(value) => setIsYearly(value === "yearly")}
            className="w-fit"
          >
            <TabsList className="bg-muted/50 p-1 h-12">
              <TabsTrigger
                value="monthly"
                className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6 py-2"
              >
                Monthly
              </TabsTrigger>
              <TabsTrigger
                value="yearly"
                className="data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6 py-2"
              >
                <div className="flex items-center gap-2">
                  Yearly
                  <Badge variant="secondary" className="text-xs">
                    Save {Math.round(savings)}%
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-10 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="text-4xl font-bold mt-2">
                $0
                <span className="text-lg font-normal text-muted-foreground">
                  /month
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Limited access to prompts</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Basic features</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Community support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-teal-500 shadow-lg scale-105 py-10">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-teal-300 to-sky-300 text-zinc-900 px-4 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-teal-300" />
                Premium
              </CardTitle>
              <CardDescription>Everything you need to succeed</CardDescription>
              <div className="text-4xl font-bold mt-2">
                ${isYearly ? yearlyPrice.toFixed(2) : monthlyPrice.toFixed(2)}
                <span className="text-lg font-normal text-muted-foreground">
                  /{isYearly ? "year" : "month"}
                </span>
              </div>
              {isYearly && (
                <div className="text-sm text-muted-foreground">
                  Only ${yearlyMonthlyEquivalent.toFixed(2)}/month • Save{" "}
                  {Math.round(savings)}%
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {subscriptionPlans[
                  isYearly ? "yearly" : "monthly"
                ].features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-teal-300 to-sky-300 hover:from-zinc-400 hover:to-zinc-400 text-zinc-900 font-semibold transition-colors duration-300"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Processing..." : "Upgrade to Premium"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Secure payment with Stripe
              </p>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="relative">
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6 text-zinc-400 dark:text-zinc-600" />
                Enterprise
              </CardTitle>
              <CardDescription>For teams and organizations</CardDescription>
              <div className="text-4xl font-bold mt-2">
                Custom
                <span className="text-lg font-normal text-muted-foreground">
                  /pricing
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Everything in Premium</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Team management</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-zinc-400 dark:text-zinc-600" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full">
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <section className="pb-6 pt-28">
          <div className="container max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="mb-4 font-semibold bg-gradient-to-r from-teal-500 to-sky-500 bg-clip-text text-transparent">
                Features
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold">
                Why Choose Premium?
              </h2>
              <p className="mt-6 text-balance text-lg text-muted-foreground max-w-2xl">
                Unlock the full potential of AI prompts with our premium
                features designed for power users and professionals.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border bg-background p-5 md:p-8"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 aspect-video -translate-y-1/2 rounded-full border bg-gradient-to-b from-teal-500/80 to-white opacity-25 blur-2xl duration-300 group-hover:-translate-y-1/4 dark:from-white dark:to-white dark:opacity-5 dark:group-hover:opacity-10"
                  />
                  <div className="relative">
                    <div className="relative flex size-12 rounded-2xl border border-border shadow-sm *:relative *:m-auto *:size-6">
                      <feature.icon />
                    </div>

                    <h3 className="mt-6 font-semibold text-lg">
                      {feature.title}
                    </h3>

                    <p className="mt-2 pb-6 text-muted-foreground">
                      {feature.description}
                    </p>

                    <div className="-mb-5 flex gap-3 border-t border-muted py-4 md:-mb-7">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="px-4 rounded-xl"
                      >
                        <span className="flex items-center gap-2">
                          <span>Learn more</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto py-10 mt-10">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-medium">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Container>
    </div>
  );
}
