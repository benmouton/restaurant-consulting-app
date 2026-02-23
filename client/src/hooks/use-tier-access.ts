import { useSubscription } from "@/hooks/use-subscription";
import { getRequiredTier } from "@/config/tierConfig";

export function useTierAccess() {
  const { subscriptionTier, isLoading, isAdmin } = useSubscription();

  const canAccessDomain = (slug: string): boolean => {
    if (isAdmin) return true;
    if (subscriptionTier === "basic" || subscriptionTier === "pro") return true;
    return getRequiredTier(slug) === "free";
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
