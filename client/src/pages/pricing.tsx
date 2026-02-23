import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, ChefHat, ArrowLeft, Crown, Star, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";

const tiers = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    description: "Get started with core tools",
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyLabel: "Free forever",
    annualLabel: "Free forever",
    cta: "Current Plan",
    features: [
      { text: "Leadership Command Center", included: true },
      { text: "Training Templates", included: true },
      { text: "Crisis Management", included: true },
      { text: "Expert Consultant (limited)", included: true },
      { text: "All 12 operational domains", included: false },
      { text: "Staff scheduling", included: false },
      { text: "Food costing tools", included: false },
      { text: "Social media builder", included: false },
      { text: "Data export", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    icon: Star,
    description: "Full access for independent operators",
    monthlyPrice: 10,
    annualPrice: 99,
    monthlyLabel: "/month",
    annualLabel: "/year",
    popular: true,
    cta: "Start 7-Day Free Trial",
    features: [
      { text: "Leadership Command Center", included: true },
      { text: "Training Templates", included: true },
      { text: "Crisis Management", included: true },
      { text: "Expert Consultant (unlimited)", included: true },
      { text: "All 12 operational domains", included: true },
      { text: "Staff scheduling", included: true },
      { text: "Food costing tools", included: true },
      { text: "Social media builder", included: true },
      { text: "Data export", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    description: "Advanced tools for growing groups",
    monthlyPrice: 25,
    annualPrice: 249,
    monthlyLabel: "/month",
    annualLabel: "/year",
    cta: "Start 7-Day Free Trial",
    features: [
      { text: "Leadership Command Center", included: true },
      { text: "Training Templates", included: true },
      { text: "Crisis Management", included: true },
      { text: "Expert Consultant (unlimited)", included: true },
      { text: "All 12 operational domains", included: true },
      { text: "Staff scheduling", included: true },
      { text: "Food costing tools", included: true },
      { text: "Social media builder", included: true },
      { text: "Data export", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { subscriptionTier, checkout, isCheckingOut, openPortal } = useSubscription();
  const [, setLocation] = useLocation();
  const [checkingOutTier, setCheckingOutTier] = useState<string | null>(null);

  const handleCheckout = (tierId: string) => {
    if (!user) {
      window.location.href = "/api/login";
      return;
    }
    setCheckingOutTier(tierId);
    checkout({ tier: tierId, interval: isAnnual ? "year" : "month" });
  };

  const getButtonState = (tierId: string) => {
    if (tierId === subscriptionTier) {
      return { label: "Current Plan", disabled: true, variant: "outline" as const };
    }
    if (tierId === "free") {
      return { label: subscriptionTier === "free" ? "Current Plan" : "Manage Subscription", disabled: subscriptionTier === "free", variant: "outline" as const };
    }
    const isUpgrade = (tierId === "basic" && subscriptionTier === "free") ||
                       (tierId === "pro" && (subscriptionTier === "free" || subscriptionTier === "basic"));
    return {
      label: isUpgrade ? (tierId === "basic" || tierId === "pro" ? "Start 7-Day Free Trial" : "Upgrade") : "Switch Plan",
      disabled: false,
      variant: "default" as const,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold hidden sm:inline">The Restaurant Consultant</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Systems that work on your worst night. Pick the plan that fits your operation.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <Label htmlFor="billing-toggle" className={`text-sm ${!isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            data-testid="switch-billing-toggle"
          />
          <Label htmlFor="billing-toggle" className={`text-sm ${isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            Annual
          </Label>
          {isAnnual && (
            <Badge variant="secondary" className="ml-2 text-xs" data-testid="badge-save">
              Save 17%
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const TierIcon = tier.icon;
            const btnState = user ? getButtonState(tier.id) : {
              label: tier.id === "free" ? "Get Started" : "Start Free Trial",
              disabled: false,
              variant: "default" as const,
            };
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
            const priceLabel = isAnnual ? tier.annualLabel : tier.monthlyLabel;
            const isCurrentTier = subscriptionTier === tier.id;
            const isPopular = tier.popular;
            const isCheckingThisTier = isCheckingOut && checkingOutTier === tier.id;

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col transition-all ${
                  isCurrentTier 
                    ? 'border-primary/50 ring-2 ring-primary/30 shadow-lg shadow-primary/10' 
                    : isPopular 
                      ? 'border-primary shadow-lg ring-1 ring-primary/20' 
                      : 'premium-card'
                }`}
                data-testid={`card-tier-${tier.id}`}
              >
                {isPopular && !isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm" data-testid="badge-popular">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm" data-testid="badge-current">
                      Your Plan
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <TierIcon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      {price === 0 ? (
                        <span className="text-4xl font-bold">$0</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">${price}</span>
                          <span className="text-muted-foreground text-sm">{priceLabel}</span>
                        </>
                      )}
                    </div>
                    {isAnnual && price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${Math.round(price / 12)}/month billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground/60'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : btnState.variant}
                    disabled={btnState.disabled || isCheckingThisTier}
                    onClick={() => {
                      if (tier.id === "free") {
                        if (!user) window.location.href = "/api/login";
                        else if (subscriptionTier !== "free") openPortal();
                        else setLocation("/");
                      } else {
                        handleCheckout(tier.id);
                      }
                    }}
                    data-testid={`btn-select-${tier.id}`}
                  >
                    {isCheckingThisTier ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {btnState.label}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            All paid plans include a 7-day free trial. Cancel anytime. No questions asked.
          </p>
        </div>
      </main>
    </div>
  );
}
