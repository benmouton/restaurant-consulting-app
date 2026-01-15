import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function SubscriptionCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Subscription Cancelled</CardTitle>
          <CardDescription>
            No worries - you can subscribe anytime when you're ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            className="w-full" 
            onClick={() => setLocation("/subscribe")}
            data-testid="btn-try-again"
          >
            Try Again
          </Button>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => setLocation("/")}
            data-testid="btn-go-home"
          >
            Go Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
