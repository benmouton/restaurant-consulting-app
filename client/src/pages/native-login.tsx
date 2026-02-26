import { useState, useEffect } from "react";
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
  const [appleAvailable, setAppleAvailable] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    async function checkApplePlugin() {
      try {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
        if (SignInWithApple && typeof SignInWithApple.authorize === "function") {
          setAppleAvailable(true);
        } else {
          setAppleAvailable(false);
        }
      } catch {
        setAppleAvailable(false);
      }
    }
    if (isNativeApp()) {
      checkApplePlugin();
    } else {
      setAppleAvailable(false);
    }
  }, []);

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

      console.error("Apple Sign In error:", err);
      setAppleAvailable(false);
      setError("Apple Sign In is not available. Please use Continue in Browser instead.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleWebFallback() {
    const loginUrl = `/api/login${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

    if (isNativeApp()) {
      import("@capacitor/browser").then(({ Browser }) => {
        Browser.open({ url: `https://restaurantai.consulting${loginUrl}` });
      }).catch(() => {
        window.location.href = loginUrl;
      });
    } else {
      window.location.href = loginUrl;
    }
  }

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
            {appleAvailable !== false && (
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
            )}

            <Button
              onClick={handleWebFallback}
              variant={appleAvailable === false ? "default" : "outline"}
              className={`w-full h-12 text-base ${appleAvailable === false ? "" : ""}`}
              data-testid="btn-web-signin"
            >
              <Globe className="h-5 w-5 mr-2" />
              {appleAvailable === false ? "Sign In" : "Continue in Browser"}
            </Button>

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
