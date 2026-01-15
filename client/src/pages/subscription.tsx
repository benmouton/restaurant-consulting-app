import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, CreditCard, Shield, Sparkles, FileText, Users, Calculator } from "lucide-react";
import { useLocation } from "wouter";

export default function SubscriptionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasSubscription, checkout, isCheckingOut, openPortal, isOpeningPortal } = useSubscription();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to subscribe to Restaurant Consultant Pro</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/")}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasSubscription) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>You're Subscribed</CardTitle>
            <CardDescription>You have full access to Restaurant Consultant Pro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => openPortal()}
              disabled={isOpeningPortal}
              data-testid="btn-manage-subscription"
            >
              {isOpeningPortal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Manage Subscription
            </Button>
            <Button className="w-full" onClick={() => setLocation("/")} data-testid="btn-go-to-app">
              Go to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const features = [
    { icon: Sparkles, text: "AI-powered restaurant consultant" },
    { icon: FileText, text: "10 operational framework domains" },
    { icon: Users, text: "FOH & BOH training templates" },
    { icon: Calculator, text: "Financial document analysis" },
    { icon: Shield, text: "Domain-specific AI tools" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Restaurant Consultant Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Build durable operational systems that remove chaos and replace it with clarity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pro Subscription</span>
                <div className="text-right">
                  <span className="text-3xl font-bold">$10</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardTitle>
              <CardDescription>
                Full access to everything you need to build restaurant systems that work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => checkout()}
                disabled={isCheckingOut}
                data-testid="btn-subscribe"
              >
                {isCheckingOut ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Subscribe Now
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Cancel anytime. Secure payment via Stripe.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Subscribe?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Restaurants fail from lack of structure, not lack of effort.</strong>
                </p>
                <p>
                  This platform gives you battle-tested frameworks from real restaurant operations: 
                  service standards, training protocols, accountability systems, and AI tools 
                  that understand the reality of a slammed dinner rush.
                </p>
                <p>
                  Stop reinventing the wheel. Build systems that work.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>AI consultant trained on "systems over heroics" philosophy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Complete operational frameworks across 10 domains</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Ready-to-use training templates with real examples</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Upload and analyze financial documents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>Domain-specific AI tools for daily operations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
