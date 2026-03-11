import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { isNativeApp } from "@/lib/native";
import { useState } from "react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  requirePaid?: boolean;
}

export function SubscriptionGate({ children, requirePaid = false }: SubscriptionGateProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasSubscription, subscriptionTier, isLoading: subLoading, checkout, isCheckingOut, purchaseSubscription, restoreNativePurchases, error } = useSubscription();
  const [, setLocation] = useLocation();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Unable to verify subscription</CardTitle>
            <CardDescription>Please try again or contact support.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requirePaid && subscriptionTier === "free") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Upgrade Required</CardTitle>
            <CardDescription>
              Upgrade your plan to access this feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isNativeApp() ? (
              <>
                <Button
                  className="w-full"
                  disabled={isPurchasing}
                  onClick={async () => {
                    setIsPurchasing(true);
                    await purchaseSubscription("basic");
                    setIsPurchasing(false);
                  }}
                  data-testid="btn-subscribe-native"
                >
                  {isPurchasing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Subscribe Now
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={isRestoring}
                  onClick={async () => {
                    setIsRestoring(true);
                    await restoreNativePurchases();
                    setIsRestoring(false);
                  }}
                  data-testid="btn-restore-purchases"
                >
                  {isRestoring ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Restore Purchases
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={() => setLocation("/pricing")}
                data-testid="btn-view-plans"
              >
                View Plans
              </Button>
            )}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="btn-go-back"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
