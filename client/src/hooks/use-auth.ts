import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<(User & { isTestUser?: boolean; testAccessExpiresAt?: string; testAccessLevel?: string }) | null> {
  // First check for test access session
  const testRes = await fetch("/api/test-access/user", { credentials: "include" });
  if (testRes.ok) {
    const testUser = await testRes.json();
    if (testUser) return testUser;
  }

  // Fall back to normal Replit Auth
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<(User & { isTestUser?: boolean; testAccessExpiresAt?: string; testAccessLevel?: string }) | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // If test user, clear test session instead
      if (user?.isTestUser) {
        await fetch("/api/test-access/logout", { method: "POST", credentials: "include" });
        window.location.href = "/";
        return;
      }
      window.location.href = "/api/logout";
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isTestUser: !!user?.isTestUser,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
