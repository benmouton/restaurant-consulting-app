import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Apple, Loader2, Globe } from "lucide-react";
import { isNativeApp } from "@/lib/native";

export default function NativeLoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBrowserFallback, setShowBrowserFallback] = useState(false);
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get("returnTo") || "/";

  async function handleAppleSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");

      const result = await SignInWithApple.authorize({
        clientId: "com.alstiginc.restaurantconsultant",
        redirectURI: "https://restaurantai.consulting",
        scopes: "name email",
      });

      const response = await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identityToken: result.response.identityToken,
          email: result.response.email,
          givenName: result.response.givenName,
          familyName: result.response.familyName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Sign in failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation(returnTo);
    } catch (err: any) {
      if (err?.message?.includes("canceled") || err?.message?.includes("cancelled")) {
        setIsLoading(false);
        return;
      }

      const isPluginMissing = err?.message?.includes("not implemented") || err?.message?.includes("not available");
      if (isPluginMissing) {
        setShowBrowserFallback(true);
        setError(null);
      } else {
        console.error("Apple Sign In error:", err);
        setError(err.message || "Sign in failed. Please try again.");
        setShowBrowserFallback(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleWebFallback() {
    if (isNativeApp()) {
      try {
        import("@capacitor/browser").then(({ Browser }) => {
          Browser.open({ url: `https://restaurantai.consulting/api/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` });
        });
      } catch {
        window.location.href = `/api/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
      }
    } else {
      window.location.href = `/api/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
    }
  }

  const native = isNativeApp();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">The Restaurant Consultant</h1>
          <p className="text-muted-foreground text-sm">Systems that work on your worst night.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Button
              onClick={handleAppleSignIn}
              disabled={isLoading}
              className="w-full bg-black hover:bg-black/90 text-white h-12 text-base"
              data-testid="btn-apple-signin"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Apple className="h-5 w-5 mr-2" />
              )}
              Sign in with Apple
            </Button>

            {(showBrowserFallback || !native) && (
              <Button
                onClick={handleWebFallback}
                variant="outline"
                className="w-full h-12 text-base"
                data-testid="btn-web-signin"
              >
                <Globe className="h-5 w-5 mr-2" />
                Continue in Browser
              </Button>
            )}

            {error && (
              <p className="text-sm text-destructive text-center" data-testid="text-login-error">
                {error}
              </p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
