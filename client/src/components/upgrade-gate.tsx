import { useTierAccess } from "@/hooks/use-tier-access";
import { DOMAIN_TIER_MAP } from "@/config/tierConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { Link } from "wouter";

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
      <div className="backdrop-blur-md pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
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
            <p className="text-sm font-medium mb-6">
              Access all 9 premium domains for <span className="text-primary">$10/month</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ConsultantUpgradeGateProps {
  children: React.ReactNode;
}

export function ConsultantUpgradeGate({ children }: ConsultantUpgradeGateProps) {
  const { canAccessDomain } = useTierAccess();

  if (canAccessDomain("consultant")) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh]">
      <div className="backdrop-blur-md pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="bg-muted rounded-lg p-4 max-w-lg">
              <p className="text-sm">"How do I handle a no-call no-show during a Friday rush?"</p>
            </div>
          </div>
          <div className="flex items-start gap-3 justify-end">
            <div className="bg-primary/10 rounded-lg p-4 max-w-lg">
              <p className="text-sm">Here's your immediate action plan: First, assess who on your current team can absorb the station...</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0" />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="bg-muted rounded-lg p-4 max-w-lg">
              <p className="text-sm">"What's a good labor percentage target for a fast-casual concept?"</p>
            </div>
          </div>
          <div className="flex items-start gap-3 justify-end">
            <div className="bg-primary/10 rounded-lg p-4 max-w-lg">
              <p className="text-sm">For fast-casual, you should target 25-30% labor cost. Here's how to break that down by daypart...</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0" />
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="bg-muted rounded-lg p-4 max-w-lg">
              <p className="text-sm">"My food cost jumped 4% this month. Where do I start?"</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-20 z-10">
        <Card className="max-w-md w-full shadow-xl border-primary/20 mx-4" data-testid="card-consultant-upgrade">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-5">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2" data-testid="text-consultant-upgrade-title">
              Unlock the Operations Consultant
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Expert guidance on any restaurant operations challenge — staffing, costs, service, leadership, and more.
            </p>
            <p className="text-sm font-medium mb-6">
              Access all 9 premium domains for <span className="text-primary">$10/month</span>
            </p>
            <Link href="/pricing">
              <Button className="w-full mb-3" data-testid="btn-consultant-upgrade">
                Upgrade Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground underline underline-offset-4" data-testid="link-consultant-plans">
              See all plans
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
