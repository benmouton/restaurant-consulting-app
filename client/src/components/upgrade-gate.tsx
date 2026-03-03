import { useTierAccess } from "@/hooks/use-tier-access";
import { DOMAIN_TIER_MAP, TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { isNativeApp } from "@/lib/native";

interface UpgradeGateProps {
  domain: string;
  children: React.ReactNode;
}

export function UpgradeGate({ domain, children }: UpgradeGateProps) {
  const { canAccessDomain } = useTierAccess();

  if (canAccessDomain(domain)) {
    return <>{children}</>;
  }

  const domainInfo = DOMAIN_TIER_MAP[domain];
  const domainName = domainInfo?.name ?? "this feature";
  const domainDescription = domainInfo?.description ?? "Access premium tools and features.";

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
              Unlock {domainName}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {domainDescription}
            </p>
            {isNativeApp() ? (
              <p className="text-sm text-muted-foreground">
                This domain requires a subscription. Subscribe at <span className="font-medium text-primary">restaurantai.consulting</span>
              </p>
            ) : (
              <>
                <p className="text-sm font-medium mb-6">
                  All {TOTAL_DOMAIN_COUNT} domains + tools starting at <span className="text-primary">$10/month</span>
                </p>
                <Link href="/pricing">
                  <Button className="w-full mb-3" data-testid="btn-upgrade-now">
                    Upgrade Now
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
