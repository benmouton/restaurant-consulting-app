import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscriptionStatus?: string;
  subscriptionId?: string;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading, error: adminError } = useAdmin();
  const { toast } = useToast();
  
  const { data, isLoading, error, refetch: refetchStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    staleTime: 30000,
    retry: false,
    enabled: !!user && !authLoading,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/checkout");
      if (res.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }
      return res.json();
    },
    onSuccess: (data) => {
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
      if (error.message === "SESSION_EXPIRED") {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
      } else {
        toast({
          title: "Checkout Failed",
          description: error.message || "Unable to start checkout. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  // Admins get automatic access without subscription
  const hasAccess = isAdmin || (data?.hasSubscription ?? false);

  return {
    hasSubscription: hasAccess,
    subscriptionStatus: data?.subscriptionStatus,
    isLoading: isLoading || adminLoading,
    error,
    checkout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,
    openPortal: portalMutation.mutate,
    isOpeningPortal: portalMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
    isAdmin,
  };
}
