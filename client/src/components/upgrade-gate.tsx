import { useState } from "react";
import { useTierAccess } from "@/hooks/use-tier-access";
import { useSubscription } from "@/hooks/use-subscription";
import { DOMAIN_TIER_MAP, TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { isNativeApp } from "@/lib/native";

const upgradeGateCopy: Record<string, { headline: string; sub: string }> = {
  hr: {
    headline: "Stop Writing HR Documents from Scratch",
    sub: "Generate TWC-compliant warnings, write-ups, and termination letters in seconds. One document saves more than a year of this subscription."
  },
  staffing: {
    headline: "Your Labor Cost Is Either Under Control or It Isn't",
    sub: "Track scheduled vs. actual labor %, get scheduling recommendations, and know your shift cost before service starts."
  },
  costs: {
    headline: "Your Prime Cost Is Either Under Control or It Isn't",
    sub: "Weekly tracking with 4-week trend, food and labor cost breakdown, target comparison, and plain-language status. Three numbers a week — that's all it takes to know where you stand."
  },
  training: {
    headline: "Six Training Manuals. One Generate Button.",
    sub: "Server, Kitchen, Bartender, Host, Busser, and Manager manuals — personalized to your restaurant, printable, and shareable in minutes."
  },
  service: {
    headline: "The Standard Only Holds If It's Written Down",
    sub: "Build, store, and share SOPs for every position. Stop retraining because nobody remembered what you said."
  },
  sops: {
    headline: "Training Without a Record Is Just a Conversation",
    sub: "Track who was trained, what they scored, and when they were certified. Your TWC documentation lives here."
  },
  reviews: {
    headline: "Every Negative Review Is a Conversion Opportunity",
    sub: "Generate professional, on-brand responses to Google and Yelp reviews in seconds. Turn complaints into return visits."
  },
  "social-media": {
    headline: "Consistent Social Presence Without the Time",
    sub: "Posts in your restaurant's voice, scheduled across platforms. Stop starting from scratch every time."
  },
  consultant: {
    headline: "A Consultant Who Knows Your Restaurant",
    sub: "Not generic advice — advice based on your actual food cost, your labor percentage, and your specific operational challenges."
  },
  "training-log": {
    headline: "Training Without a Record Is Just a Conversation",
    sub: "Track every certification, every assessment score, every manager sign-off. Your TWC documentation lives here — and it's exportable when you need it."
  },
  "sop-generator": {
    headline: "Your Operations Manual — Generated, Not Written",
    sub: "16 SOPs personalized to your restaurant. Bar, kitchen, front of house, and management procedures — all using your actual settings, staff, and policies."
  },
  "menu-engineering": {
    headline: "Know Which Items Are Costing You and Which Are Carrying You",
    sub: "Enter your menu with costs and sales data. Get a visual matrix showing your Stars, Plowhorses, Puzzles, and Dogs — with specific actions for each one."
  },
  facilities: {
    headline: "Build a Schedule That Hits Your Labor Target",
    sub: "Scheduling with live labor cost calculation. Know what the schedule costs before you publish it."
  },
};

interface UpgradeGateProps {
  domain: string;
  children: React.ReactNode;
}

export function UpgradeGate({ domain, children }: UpgradeGateProps) {
  const { canAccessDomain } = useTierAccess();
  const { purchaseSubscription, restoreNativePurchases } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  if (canAccessDomain(domain)) {
    return <>{children}</>;
  }

  const domainInfo = DOMAIN_TIER_MAP[domain];
  const domainName = domainInfo?.name ?? "this feature";
  const domainDescription = domainInfo?.description ?? "Access premium tools and features.";
  const domainCopy = upgradeGateCopy[domain];

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-24 z-10">
        <Card className="max-w-md w-full shadow-xl border-primary/20 mx-4" data-testid="card-upgrade-gate">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2" data-testid="text-upgrade-title">
              {domainCopy ? domainCopy.headline : `Unlock ${domainName}`}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {domainCopy ? domainCopy.sub : domainDescription}
            </p>
            {isNativeApp() ? (
              <>
                <div className="w-full rounded-lg p-4 mb-4 text-left" style={{ backgroundColor: '#12141f', border: '1px solid #2a2d3e' }}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Basic Plan</div>
                  <div className="text-sm font-semibold mb-1">The Restaurant Consultant — Basic</div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-2xl font-bold">$10.00</span>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>/month</span>
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>Monthly subscription · billed every 30 days</div>
                  <div className="text-xs" style={{ color: '#9ca3af' }}>Access to all {TOTAL_DOMAIN_COUNT} operational domains</div>
                </div>
                <Button
                  className="w-full mb-3"
                  onClick={async () => {
                    setIsPurchasing(true);
                    await purchaseSubscription("basic");
                    setIsPurchasing(false);
                  }}
                  disabled={isPurchasing}
                  data-testid="btn-native-subscribe"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Subscribe — $10.00/month
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  className="w-full mb-4"
                  variant="outline"
                  onClick={async () => {
                    setIsRestoring(true);
                    await restoreNativePurchases();
                    setIsRestoring(false);
                  }}
                  disabled={isRestoring}
                  data-testid="btn-restore-purchases-gate"
                >
                  {isRestoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Restore Purchases
                </Button>
                <p className="text-xs leading-relaxed mb-3" style={{ color: '#9ca3af' }}>
                  Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel your subscription in your Apple ID settings.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <a href="https://restaurantai.consulting/privacy" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: '#9ca3af' }} data-testid="link-gate-privacy">Privacy Policy</a>
                  <span style={{ color: '#2a2d3e' }}>·</span>
                  <a href="https://restaurantai.consulting/terms" target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-2" style={{ color: '#9ca3af' }} data-testid="link-gate-terms">Terms of Use</a>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-6">
                  All {TOTAL_DOMAIN_COUNT} domains + tools starting at <span className="text-primary">$10/month</span>
                </p>
                <Link href="/pricing">
                  <Button className="w-full mb-3" data-testid="btn-upgrade-now">
                    Unlock for $10/month
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/pricing" className="text-sm text-muted-foreground underline underline-offset-4" data-testid="link-see-plans">
                  See all plans
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
