import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogoNav } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native";
import { Link } from "wouter";

const AppleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const ReplitIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 6a4 4 0 0 1 4-4h4.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H6a2 2 0 0 0-2 2v1H2V6zm2 8h2a2 2 0 0 1 2 2v1.5A1.5 1.5 0 0 0 9.5 19H12v3H6a4 4 0 0 1-4-4v-4zm10 8h-2v-3h2.5a1.5 1.5 0 0 0 1.5-1.5v-5a1.5 1.5 0 0 0-1.5-1.5H12V8h6a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-6z"/>
  </svg>
);

export default function LoginPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isNativeApp()) {
      window.location.href = "/native-login";
      return;
    }
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogoNav linkTo="/" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-login-headline">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your restaurant systems
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { window.location.href = "/api/auth/apple/web"; }}
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/90 transition-colors border border-black"
              data-testid="button-signin-apple"
            >
              <AppleIcon />
              Sign in with Apple
            </button>

            <button
              onClick={() => { window.location.href = "/api/login"; }}
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-card text-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors border border-border"
              data-testid="button-signin-replit"
            >
              <ReplitIcon />
              Continue with Replit
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
