import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { startLogin, isNativeApp } from "@/lib/native";
import {
  getOfferings,
  purchasePackage,
  getCustomerInfo,
  getEntitlementTier,
  restorePurchases as rcRestorePurchases,
} from "@/lib/revenuecat";

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  subscriptionId?: string;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const {
    data,
    isLoading,
    error,
    refetch: refetchStatus,
  } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    staleTime: 30000,
    retry: false,
    enabled: !!user && !authLoading,
  });

  // ── Web Stripe checkout mutation ────────────────────────────────────────────
  const checkoutMutation = useMutation({
    mutationFn: async (params?: { tier?: string; interval?: string }) => {
      const res = await apiRequest(
        "POST",
        "/api/subscription/checkout",
        params || {},
      );
      if (res.status === 401) throw new Error("SESSION_EXPIRED");
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "No checkout URL received. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      if (error.message === "SESSION_EXPIRED") {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => startLogin(), 1500);
      } else {
        toast({
          title: "Checkout Failed",
          description: error.message || "Unable to start checkout. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // ── Native RevenueCat purchase ──────────────────────────────────────────────
  const purchaseSubscription = async (tier: string = "basic", interval: string = "month") => {
    if (!isNativeApp()) {
      checkoutMutation.mutate({ tier, interval });
      return;
    }

    try {
      const offerings = await getOfferings();
      const current = offerings?.current;

      if (!current?.availablePackages?.length) {
        toast({
          title: "Unable to Load Subscriptions",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
        return;
      }

      const suffix = interval === "year" ? "annual" : "monthly";
      const targetIdentifier =
        `com.alstiginc.restaurantconsultant.${tier}_${suffix}`;

      const pkg =
        current.availablePackages.find(
          (p: any) => p.product?.productIdentifier === targetIdentifier,
        ) ??
        current.availablePackages.find((p: any) => {
          const id = (p.product?.productIdentifier || p.identifier || "").toLowerCase();
          return id.includes(tier) && id.includes(suffix);
        }) ??
        current.availablePackages.find((p: any) =>
          (p.product?.productIdentifier || p.identifier || "").toLowerCase().includes(tier),
        );

      const purchaseResult = await purchasePackage(pkg);
      if (!purchaseResult) return; // user cancelled — silent

      const customerInfo = await getCustomerInfo();
      const newTier = getEntitlementTier(customerInfo);

      if (newTier !== "free") {
        await apiRequest("POST", "/api/subscription/native-verify", {
          tier: newTier,
          platform: "ios",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        toast({
          title: "Subscription Active",
          description: `Your ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} plan is now active.`,
        });
      }
    } catch (error: any) {
      if (
        error?.code === "PURCHASE_CANCELLED" ||
        error?.userCancelled ||
        error?.message === "PURCHASE_CANCELLED" ||
        error?.code === 1
      ) {
        return;
      }
      console.error("RevenueCat purchase error:", error);
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  // ── Restore purchases (native) / Customer portal (web) ─────────────────────
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
    },
  });

  const restoreNativePurchases = async () => {
    if (!isNativeApp()) return;
    try {
      const result = await rcRestorePurchases();
      const customerInfo = await getCustomerInfo();
      const restoredTier = getEntitlementTier(customerInfo);

      if (restoredTier !== "free") {
        await apiRequest("POST", "/api/subscription/native-verify", {
          tier: restoredTier,
          platform: "ios",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        toast({
          title: "Purchases Restored",
          description: `Your ${restoredTier.charAt(0).toUpperCase() + restoredTier.slice(1)} plan has been restored.`,
        });
      } else {
        toast({
          title: "Nothing to Restore",
          description: "No active subscriptions found for this Apple ID.",
        });
      }
    } catch {
      toast({
        title: "Restore Failed",
        description: "Could not restore purchases. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hasAccess = isAdmin || (data?.hasSubscription ?? false);
  const tier = data?.subscriptionTier || "free";

  return {
    hasSubscription: hasAccess,
    subscriptionStatus: data?.subscriptionStatus,
    subscriptionTier: tier,
    isBasicOrAbove: tier === "basic" || tier === "pro",
    isPro: tier === "pro",
    isLoading: isLoading || adminLoading,
    error,
    // Web Stripe path (kept for web pages that call mutate directly)
    checkout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,
    // Native-aware purchase (call this from UI instead of checkout where possible)
    purchaseSubscription,
    // Restore (native) / Portal (web)
    openPortal: portalMutation.mutate,
    isOpeningPortal: portalMutation.isPending,
    restoreNativePurchases,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
    isAdmin,
  };
}
