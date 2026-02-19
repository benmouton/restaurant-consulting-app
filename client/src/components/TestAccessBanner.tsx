import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Key, ArrowRight } from "lucide-react";

interface TestAccessStatus {
  active: boolean;
  expired?: boolean;
  name?: string;
  accessLevel?: string;
  expiresAt?: string;
  remainingDays?: number;
  userId?: string;
}

export function TestAccessBanner() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: testStatus } = useQuery<TestAccessStatus>({
    queryKey: ["/api/test-access/status"],
    enabled: !!user?.isTestUser,
    refetchInterval: 60000,
  });

  if (!user?.isTestUser || !testStatus?.active) return null;

  const isUrgent = (testStatus.remainingDays ?? 999) <= 3;
  const daysText = testStatus.remainingDays === 1 
    ? "1 day remaining" 
    : `${testStatus.remainingDays} days remaining`;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${
        isUrgent
          ? "bg-destructive/10 dark:bg-destructive/15 border-b border-destructive/20 text-destructive-foreground dark:text-destructive"
          : "bg-muted border-b border-border text-muted-foreground"
      }`}
      data-testid="banner-test-access"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Key className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          <span className="font-medium">Test Access</span>
          <span className="mx-1.5">&mdash;</span>
          <span>{daysText}</span>
        </span>
      </div>
      <Button
        size="sm"
        variant={isUrgent ? "default" : "outline"}
        onClick={() => setLocation("/subscribe")}
        data-testid="button-subscribe-from-banner"
        className="shrink-0"
      >
        Subscribe for $10/month
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
}
