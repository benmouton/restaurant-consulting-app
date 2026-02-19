import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandLogoFull } from "@/components/BrandLogo";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function TestAccessPage() {
  const [, params] = useRoute("/test-access/:token");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "activating" | "success" | "expired" | "revoked" | "invalid">("loading");

  useEffect(() => {
    if (!params?.token) {
      setStatus("invalid");
      return;
    }

    async function validate() {
      try {
        const res = await fetch(`/api/test-access/${params!.token}/validate`, { credentials: "include" });
        const data = await res.json();

        if (!data.valid) {
          setStatus(data.reason === "expired" ? "expired" : data.reason === "revoked" ? "revoked" : "invalid");
          return;
        }

        setStatus("activating");
        const activateRes = await fetch(`/api/test-access/${params!.token}/activate`, {
          method: "POST",
          credentials: "include",
        });

        if (activateRes.ok) {
          setStatus("success");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
          setTimeout(() => setLocation("/"), 2000);
        } else {
          const err = await activateRes.json();
          if (err.error?.includes("expired")) setStatus("expired");
          else if (err.error?.includes("revoked")) setStatus("revoked");
          else setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    }

    validate();
  }, [params?.token, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogoFull />
        </div>

        {(status === "loading" || status === "activating") && (
          <Card data-testid="card-test-access-loading">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {status === "loading" ? "Verifying your access link..." : "Setting up your account..."}
              </p>
            </CardContent>
          </Card>
        )}

        {status === "success" && (
          <Card data-testid="card-test-access-success">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>
                Your test access has been activated. Redirecting to the dashboard...
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {status === "expired" && (
          <Card data-testid="card-test-access-expired">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
              <CardTitle>Link Expired</CardTitle>
              <CardDescription>
                This test access link has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Want full access to The Restaurant Consultant?
              </p>
              <Button className="w-full" onClick={() => setLocation("/")} data-testid="button-subscribe-from-expired">
                Get Started for $10/month
              </Button>
            </CardContent>
          </Card>
        )}

        {(status === "revoked" || status === "invalid") && (
          <Card data-testid="card-test-access-invalid">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle>Link Not Valid</CardTitle>
              <CardDescription>
                This link is no longer valid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home-invalid">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
