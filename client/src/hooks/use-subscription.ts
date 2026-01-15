import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscriptionStatus?: string;
  subscriptionId?: string;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    staleTime: 30000,
    retry: false,
    enabled: !!user && !authLoading,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/checkout");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
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

  return {
    hasSubscription: data?.hasSubscription ?? false,
    subscriptionStatus: data?.subscriptionStatus,
    isLoading,
    error,
    checkout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,
    openPortal: portalMutation.mutate,
    isOpeningPortal: portalMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
  };
}
