import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function useAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data, isLoading, error, isFetching } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: !!user && !authLoading,
    retry: 2,
    staleTime: 30000,
  });

  // If there's an error or still loading, treat as loading state
  // This prevents showing subscription prompt before admin check completes
  const stillLoading = authLoading || isLoading || (!data && isFetching);

  return {
    isAdmin: data?.isAdmin ?? false,
    isLoading: stillLoading,
    error,
  };
}
