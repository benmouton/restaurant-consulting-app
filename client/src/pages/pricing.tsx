import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { FREE_DOMAIN_COUNT, TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { startLogin, isNativeApp } from "@/lib/native";
import { getOfferings } from "@/lib/revenuecat";
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
      { text: "Ownership & Leadership", included: true },
      { text: "Kitchen Operations", included: true },
      { text: "Crisis Management", included: true },
      { text: `${FREE_DOMAIN_COUNT} of ${TOTAL_DOMAIN_COUNT} operational domains`, included: true },
      { text: `All ${TOTAL_DOMAIN_COUNT} domains + tools`, included: false },
      { text: "Operations Consultant", included: false },
      { text: "Staff scheduling", included: false },
      { text: "Food costing tools", included: false },
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
      { text: `All ${TOTAL_DOMAIN_COUNT} operational domains`, included: true },
      { text: "Operations Consultant", included: true },
      { text: "Staff scheduling", included: true },
      { text: "Food costing tools", included: true },
      { text: "Social media builder", included: true },
      { text: "Living Playbooks", included: true },
      { text: "Employee Handbook Builder", included: true },
      { text: "Kitchen Command Center", included: true },
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
      { text: "Everything in Basic", included: true },
      { text: `All ${TOTAL_DOMAIN_COUNT} operational domains`, included: true },
      { text: "Operations Consultant", included: true },
      { text: "Data export", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Staff scheduling", included: true },
      { text: "Food costing tools", included: true },
      { text: "Social media builder", included: true },
      { text: "Living Playbooks", included: true },
    ],
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { subscriptionTier, checkout, isCheckingOut, openPortal, purchaseSubscription, restoreNativePurchases } = useSubscription();
  const [, setLocation] = useLocation();
  const [checkingOutTier, setCheckingOutTier] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [rcPackages, setRcPackages] = useState<any[]>([]);

  // Load real App Store prices from RevenueCat on native
  useEffect(() => {
    if (!isNativeApp()) return;
    (async () => {
      try {
        const offerings = await getOfferings();
        const pkgs = offerings?.current?.availablePackages ?? [];
        console.log("RC available packages:", JSON.stringify(pkgs.map((p: any) => ({
          id: p.identifier,
          productId: p.product?.productIdentifier ?? p.product?.identifier,
          price: p.product?.price,
          priceString: p.product?.priceString,
        }))));
        setRcPackages(pkgs);
      } catch (e) {
        console.error("Failed to load RC offerings:", e);
      }
    })();
  }, []);

  // Helper to find RC price for a given tier+interval
  const getRcPrice = (tier: string, interval: string): string | null => {
    const suffix = interval === "year" ? "annual" : "monthly";
    const pkg = rcPackages.find((p: any) => {
      const id = (p.product?.productIdentifier ?? p.product?.identifier ?? p.identifier ?? "").toLowerCase();
      return id.includes(tier) && id.includes(suffix);
    }) ?? rcPackages.find((p: any) => {
      const id = (p.product?.productIdentifier ?? p.product?.identifier ?? p.identifier ?? "").toLowerCase();
      return id.includes(tier);
    });
    return pkg?.product?.priceString ?? null;
  };

  const handleCheckout = async (tierId: string) => {
    if (!user) {
      startLogin();
      return;
    }
    setCheckingOutTier(tierId);
    if (isNativeApp()) {
      await purchaseSubscription(tierId, isAnnual ? "year" : "month");
      setCheckingOutTier(null);
    } else {
      checkout({ tier: tierId, interval: isAnnual ? "year" : "month" });
    }
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

        {isNativeApp() ? (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Label htmlFor="native-billing-toggle" className={`text-sm ${!isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Monthly</Label>
              <Switch id="native-billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} data-testid="switch-native-billing" />
              <Label htmlFor="native-billing-toggle" className={`text-sm ${isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>Annual</Label>
              {isAnnual && <Badge variant="secondary" className="text-xs">Save ~20%</Badge>}
            </div>

            <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Basic Plan</div>
              <div className="font-semibold text-base mb-3">The Restaurant Consultant — Basic</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">{getRcPrice('basic', isAnnual ? 'year' : 'month') ?? (isAnnual ? '$96.00' : '$9.99')}</span>
                <span className="text-sm" style={{ color: '#9ca3af' }}>{isAnnual ? '/year' : '/month'}</span>
              </div>
              <div className="text-sm mb-4" style={{ color: '#9ca3af' }}>
                {isAnnual ? 'Annual subscription · billed once per year' : 'Monthly subscription · billed every 30 days'}
              </div>
              <div className="flex items-start gap-2 mb-5">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d4a017' }} />
                <span className="text-sm" style={{ color: '#9ca3af' }}>Access to all {TOTAL_DOMAIN_COUNT} operational domains</span>
              </div>
              <Button
                className="w-full"
                disabled={checkingOutTier === 'basic'}
                onClick={() => handleCheckout('basic')}
                data-testid="btn-native-basic"
              >
                {checkingOutTier === 'basic' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Subscribe — {getRcPrice('basic', isAnnual ? 'year' : 'month') ?? (isAnnual ? '$96.00/year' : '$9.99/month')}
              </Button>
            </div>

            <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: '#1a1d2e', border: '2px solid #d4a017' }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d4a017' }}>Pro Plan</div>
              <div className="font-semibold text-base mb-3">The Restaurant Consultant — Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">{getRcPrice('pro', isAnnual ? 'year' : 'month') ?? (isAnnual ? '$249.99' : '$24.99')}</span>
                <span className="text-sm" style={{ color: '#9ca3af' }}>{isAnnual ? '/year' : '/month'}</span>
              </div>
              <div className="text-sm mb-4" style={{ color: '#9ca3af' }}>
                {isAnnual ? 'Annual subscription · billed once per year' : 'Monthly subscription · billed every 30 days'}
              </div>
              <div className="space-y-2 mb-5">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d4a017' }} />
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Full access to all {TOTAL_DOMAIN_COUNT} operational domains</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#d4a017' }} />
                  <span className="text-sm" style={{ color: '#9ca3af' }}>Priority support + advanced analytics</span>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={checkingOutTier === 'pro'}
                onClick={() => handleCheckout('pro')}
                data-testid="btn-native-pro"
                style={{ backgroundColor: '#d4a017', color: '#0f1117' }}
              >
                {checkingOutTier === 'pro' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Subscribe — {getRcPrice('pro', isAnnual ? 'year' : 'month') ?? (isAnnual ? '$249.99/year' : '$24.99/month')}
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full mb-6 text-muted-foreground"
              disabled={isRestoring}
              onClick={async () => { setIsRestoring(true); await restoreNativePurchases(); setIsRestoring(false); }}
              data-testid="btn-restore-native"
            >
              {isRestoring ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
              Restore Purchases
            </Button>

            <div className="text-center space-y-3 pb-8">
              <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
                Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel your subscription in your Apple ID settings.
              </p>
              <div className="flex items-center justify-center gap-4">
                <a href="https://restaurantai.consulting/privacy" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: '#9ca3af' }} data-testid="link-privacy-native">Privacy Policy</a>
                <span style={{ color: '#2a2d3e' }}>·</span>
                <a href="https://restaurantai.consulting/terms" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: '#9ca3af' }} data-testid="link-terms-native">Terms of Use</a>
              </div>
            </div>
          </div>
        ) : (
        <>
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
                        if (!user) startLogin();
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

        {isNativeApp() && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              disabled={isRestoring}
              onClick={async () => {
                setIsRestoring(true);
                await restoreNativePurchases();
                setIsRestoring(false);
              }}
              className="text-muted-foreground"
              data-testid="btn-restore-purchases-pricing"
            >
              {isRestoring ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
              Restore Purchases
            </Button>
          </div>
        )}

        <div className="mt-12 max-w-2xl mx-auto space-y-6">
          <div
            className="rounded-md p-6"
            style={{ backgroundColor: '#1a1d2e', borderLeft: '3px solid #d4a853' }}
            data-testid="card-math-payoff"
          >
            <h3 className="text-lg font-bold text-white mb-4">Does it pay for itself?</h3>
            <ul className="space-y-3 text-white/90 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#d4a853' }} />
                <span>
                  Catch <span className="font-semibold" style={{ color: '#d4a853' }}>one food cost mistake</span> per month and save{' '}
                  <span className="font-semibold" style={{ color: '#d4a853' }}>$200–$500</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#d4a853' }} />
                <span>
                  Reduce one bad hire with better onboarding — save{' '}
                  <span className="font-semibold" style={{ color: '#d4a853' }}>$3,000+</span> in turnover costs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#d4a853' }} />
                <span>
                  Skip one consulting session — that's{' '}
                  <span className="font-semibold" style={{ color: '#d4a853' }}>$150–$300</span> saved instantly
                </span>
              </li>
            </ul>
            <p className="mt-4 text-white/70 text-xs">
              At <span className="font-semibold" style={{ color: '#d4a853' }}>$10/month</span>, this tool pays for itself before the first week is over.
            </p>
          </div>

          <div
            className="rounded-md p-6"
            style={{ backgroundColor: '#1a1d2e', borderLeft: '3px solid #d4a853' }}
            data-testid="card-testimonial"
          >
            <p className="text-white/90 text-sm italic leading-relaxed">
              "I was spending $400/month on a consultant who gave me a binder I never opened. This app gave me
              the same systems — plus tools I actually use every day — for $10. It's not even close."
            </p>
            <p className="mt-3 text-white/50 text-xs">
              — Independent restaurant operator, 85-seat casual dining
            </p>
          </div>
        </div>

        <div className="mt-16 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8 tracking-tight" data-testid="text-comparison-title">
            What's Included in Each Plan
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-comparison">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-1/2">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold w-1/6">Free</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary w-1/6">Basic</th>
                  <th className="text-center py-3 px-4 font-semibold w-1/6">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Kitchen Operations", free: true, basic: true, pro: true, section: "Domains" },
                  { label: "Crisis Management", free: true, basic: true, pro: true },
                  { label: "Ownership & Leadership", free: true, basic: true, pro: true },
                  { label: "HR & Documentation", free: false, basic: true, pro: true },
                  { label: "Staffing & Labor", free: false, basic: true, pro: true },
                  { label: "Cost & Margin Control", free: false, basic: true, pro: true },
                  { label: "Training Systems", free: false, basic: true, pro: true },
                  { label: "Service Standards", free: false, basic: true, pro: true },
                  { label: "SOPs & Scalability", free: false, basic: true, pro: true },
                  { label: "Reviews & Reputation", free: false, basic: true, pro: true },
                  { label: "Social Media Tools", free: false, basic: true, pro: true },
                  { label: "Facilities & Asset Protection", free: false, basic: true, pro: true },
                  { label: "Operations Consultant", free: false, basic: true, pro: true, section: "Tools" },
                  { label: "Staff Scheduling", free: false, basic: true, pro: true },
                  { label: "Food Costing", free: false, basic: true, pro: true },
                  { label: "Living Playbooks", free: false, basic: true, pro: true },
                  { label: "Data Export", free: false, basic: false, pro: true, section: "Pro Features" },
                  { label: "Priority Support", free: false, basic: false, pro: true },
                  { label: "Advanced Analytics", free: false, basic: false, pro: true },
                ].map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-border/50 ${row.section ? 'bg-muted/30' : ''}`}
                    data-testid={`row-feature-${idx}`}
                  >
                    <td className="py-3 px-4">
                      {row.section && (
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                          {row.section}
                        </span>
                      )}
                      {row.label}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.free ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.basic ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.pro ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            All paid plans include a 7-day free trial. Cancel anytime. No questions asked.
          </p>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
