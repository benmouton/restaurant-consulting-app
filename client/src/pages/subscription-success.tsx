import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const [, setLocation] = useLocation();
  const { refetch, hasSubscription, isLoading } = useSubscription();

  useEffect(() => {
    refetch();
    const timer = setTimeout(() => {
      refetch();
    }, 2000);
    return () => clearTimeout(timer);
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Check className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">Welcome to Pro!</CardTitle>
          <CardDescription>
            Your subscription is now active. You have full access to Restaurant Consultant Pro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => setLocation("/")}
            data-testid="btn-get-started"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
