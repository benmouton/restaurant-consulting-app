import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/onboardingAnalytics";

interface OnboardingStatus {
  onboardingStep: number;
  onboardingDismissed: boolean;
  activatedAt: string | null;
}

export function useOnboarding() {
  const { user } = useAuth();

  const { data: status, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
    enabled: !!user,
  });

  const advanceStepMutation = useMutation({
    mutationFn: async (step: number) => {
      const res = await apiRequest("POST", "/api/onboarding/step", { step });
      return res.json();
    },
    onSuccess: (_data, step) => {
      track("onboarding_step_completed", { user_id: user?.id, step });
      if (step === 3) {
        track("onboarding_completed", { user_id: user?.id });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/dismiss");
      return res.json();
    },
    onSuccess: () => {
      track("onboarding_dismissed", { user_id: user?.id, step: status?.onboardingStep ?? 0 });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const onboardingStep = status?.onboardingStep ?? 0;
  const onboardingDismissed = status?.onboardingDismissed ?? true;
  const isOnboarding = onboardingStep < 3 && !onboardingDismissed;
  const showWelcome = onboardingStep === 0 && !onboardingDismissed;

  return {
    onboardingStep,
    onboardingDismissed,
    isOnboarding,
    showWelcome,
    isLoading,
    advanceStep: (step: number) => advanceStepMutation.mutateAsync(step),
    dismiss: () => dismissMutation.mutateAsync(),
    isAdvancing: advanceStepMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}
