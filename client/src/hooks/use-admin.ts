import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function useAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data, isLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: !!user && !authLoading,
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    isLoading: authLoading || isLoading,
  };
}
