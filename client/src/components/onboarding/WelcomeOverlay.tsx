import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import { track } from "@/lib/onboardingAnalytics";
import { useAuth } from "@/hooks/use-auth";

export function WelcomeOverlay() {
  const { showWelcome, dismiss, isDismissing } = useOnboarding();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (showWelcome) {
      track("onboarding_welcome_shown", { user_id: user?.id });
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [showWelcome]);

  if (!showWelcome || started) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-[560px] rounded-xl p-12 text-center"
        style={{
          background: "#1a1d2e",
          border: "1px solid #b8860b",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 400ms ease, transform 400ms ease",
          animation: visible ? "welcomeBorderPulse 1s ease-in-out 2" : "none",
        }}
        data-testid="welcome-overlay"
      >
        <div
          className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(184,134,11,0.15)" }}
        >
          <KeyRound className="h-6 w-6" style={{ color: "#d4a017" }} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Welcome to The Restaurant Consultant.
        </h1>

        <p className="text-base mb-2" style={{ color: "#d4a017" }}>
          Built by operators, for operators.
        </p>

        <p className="text-sm leading-relaxed mb-2" style={{ color: "#9ca3af" }}>
          This platform runs on your restaurant's information.
          The more you put in, the more specific the advice —
          and the more useful every tool becomes.
        </p>

        <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>
          It takes about 5 minutes to get set up.
          Let's do it now.
        </p>

        <Button
          className="w-full text-base font-semibold py-6"
          style={{ backgroundColor: "#b8860b", color: "white" }}
          onClick={() => {
            track("onboarding_started", { user_id: user?.id });
            setStarted(true);
            navigate("/templates");
          }}
          data-testid="button-onboarding-start"
        >
          Let's go
        </Button>

        <button
          className="mt-4 text-xs bg-transparent border-none cursor-pointer"
          style={{ color: "#6b7280" }}
          onClick={() => dismiss()}
          disabled={isDismissing}
          data-testid="button-onboarding-skip"
        >
          Skip for now
        </button>
      </div>

      <style>{`
        @keyframes welcomeBorderPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184,134,11,0); }
          50% { box-shadow: 0 0 20px 2px rgba(184,134,11,0.3); }
        }
      `}</style>
    </div>
  );
}
