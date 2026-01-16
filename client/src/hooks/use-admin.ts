import { useAuth } from "@/hooks/use-auth";

export function useAdmin() {
  const { user, isLoading } = useAuth();
  
  // Use isAdmin directly from user data instead of separate API call
  // This is more reliable since user data is already fetched
  const isAdmin = user?.isAdmin === "true";

  return {
    isAdmin,
    isLoading,
    error: null,
  };
}
