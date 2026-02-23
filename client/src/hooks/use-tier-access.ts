import { useSubscription } from "@/hooks/use-subscription";
import { FREE_DOMAIN_SLUGS } from "@shared/models/auth";

export function useTierAccess() {
  const { subscriptionTier, isLoading, isAdmin } = useSubscription();

  const canAccessDomain = (slug: string): boolean => {
    if (isAdmin) return true;
    if (subscriptionTier === "basic" || subscriptionTier === "pro") return true;
    return (FREE_DOMAIN_SLUGS as readonly string[]).includes(slug);
  };

  const isDomainLocked = (slug: string): boolean => {
    return !canAccessDomain(slug);
  };

  const canExportData = subscriptionTier === "pro" || isAdmin;
  const hasAdvancedAnalytics = subscriptionTier === "pro" || isAdmin;
  const hasPrioritySupport = subscriptionTier === "pro" || isAdmin;

  return {
    tier: subscriptionTier,
    isLoading,
    canAccessDomain,
    isDomainLocked,
    canExportData,
    hasAdvancedAnalytics,
    hasPrioritySupport,
    isFreeTier: subscriptionTier === "free",
    isBasicTier: subscriptionTier === "basic",
    isProTier: subscriptionTier === "pro",
  };
}
