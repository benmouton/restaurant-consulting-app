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
  restorePurchases,
} from "@/lib/revenuecat";

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  subscriptionId?: string;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading, error: adminError } = useAdmin();
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

  const checkoutMutation = useMutation({
    mutationFn: async (params?: { tier?: string; interval?: string }) => {
      if (isNativeApp()) {
        const offerings = await getOfferings();
        const offering = offerings?.all?.default; // ✅ correct: top-level .current

        const targetTier = params?.tier || "basic";
        let targetPackage: any = null;

        if (offering?.availablePackages?.length) {
          targetPackage =
            offering.availablePackages.find((p: any) =>
              p.identifier?.toLowerCase().includes(targetTier),
            ) || offering.availablePackages[0];
        }

        if (!targetPackage) {
          const interval = params?.interval || "monthly";
          targetPackage =
            offering?.[interval] || offering?.monthly || offering?.annual;
        }

        if (!targetPackage) {
          throw new Error("No packages available. Please try again later.");
        }

        const purchaseResult = await purchasePackage(targetPackage);
        if (!purchaseResult) {
          throw new Error("PURCHASE_CANCELLED");
        }

        const customerInfo = await getCustomerInfo();
        const tier = getEntitlementTier(customerInfo);

        await apiRequest("POST", "/api/subscription/native-verify", {
          tier,
          platform: "ios",
        });

        return { tier, success: true };
      }

      const res = await apiRequest(
        "POST",
        "/api/subscription/checkout",
        params || {},
      );
      if (res.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (isNativeApp()) {
        if (data?.success) {
          toast({
            title: "Subscription Active",
            description: `Your ${data.tier} plan is now active.`,
          });
          queryClient.invalidateQueries({
            queryKey: ["/api/subscription/status"],
          });
        }
        return;
      }
      if (data.url) {
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
      console.error("Checkout error:", error);
      if (error.message === "PURCHASE_CANCELLED") {
        return;
      }
      if (error.message === "SESSION_EXPIRED") {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          startLogin();
        }, 1500);
      } else {
        toast({
          title: "Checkout Failed",
          description:
            error.message || "Unable to start checkout. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      if (isNativeApp()) {
        const restored = await restorePurchases();
        const customerInfo = await getCustomerInfo();
        const tier = getEntitlementTier(customerInfo);
        return { tier, restored: true };
      }
      const res = await apiRequest("POST", "/api/subscription/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (isNativeApp()) {
        toast({
          title: "Purchases Restored",
          description:
            data?.tier !== "free"
              ? `Your ${data.tier} plan has been restored.`
              : "No active subscriptions found.",
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/subscription/status"],
        });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

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
    checkout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,
    openPortal: portalMutation.mutate,
    isOpeningPortal: portalMutation.isPending,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
    isAdmin,
  };
}
