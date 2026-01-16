import { useRole } from "@/hooks/use-role";
import { USER_ROLES, type UserRole } from "@shared/models/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Lock, ArrowLeft } from "lucide-react";

interface RoleGateProps {
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ requiredRole, children, fallback }: RoleGateProps) {
  const { hasRoleOrHigher, roleLabel, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasRoleOrHigher(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    const requiredRoleLabel = requiredRole === USER_ROLES.OWNER 
      ? "Owner" 
      : requiredRole === USER_ROLES.GENERAL_MANAGER 
        ? "General Manager" 
        : "Manager";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-muted mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This feature is available for <strong>{requiredRoleLabel}</strong> accounts{requiredRole !== USER_ROLES.OWNER ? " and above" : " only"}.
            </p>
            <p className="text-sm text-muted-foreground">
              Your current role: <strong>{roleLabel}</strong>
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-go-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
