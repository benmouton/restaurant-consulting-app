import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";

const STEPS = [
  { num: 1, label: "Complete Setup" },
  { num: 2, label: "Generate a Manual" },
  { num: 3, label: "Ask the Consultant" },
];

export function OnboardingProgressBar() {
  const { onboardingStep, isOnboarding, dismiss, isDismissing } = useOnboarding();
  const [, navigate] = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (onboardingStep === 3) {
      setShowComplete(true);
      dismiss().catch(() => {});
      const t = setTimeout(() => {
        setFadeOut(true);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [onboardingStep]);

  if (!isOnboarding && !showComplete) return null;
  if (fadeOut) return null;

  const progressPct = onboardingStep === 3 ? 100 : (onboardingStep / 3) * 100;

  return (
    <div
      className="w-full z-[90] flex-shrink-0"
      style={{
        background: "#1a1d2e",
        borderBottom: "1px solid #b8860b",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 500ms ease",
      }}
      data-testid="onboarding-progress-bar"
    >
      <div className="flex items-center justify-between px-6 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          {STEPS.map((step, idx) => {
            const completed = onboardingStep >= step.num;
            const current = onboardingStep === step.num - 1 && !showComplete;
            return (
              <div key={step.num} className="flex items-center gap-1 sm:gap-2">
                {idx > 0 && (
                  <div
                    className="hidden sm:block h-px w-6 lg:w-10"
                    style={{ backgroundColor: completed ? "#b8860b" : "#2a2d3e" }}
                  />
                )}
                <div
                  className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: completed ? "#b8860b" : "transparent",
                    border: current ? "2px solid #b8860b" : completed ? "none" : "2px solid #2a2d3e",
                    color: completed ? "white" : current ? "#d4a017" : "#4b5563",
                    boxShadow: current ? "0 0 8px rgba(184,134,11,0.4)" : "none",
                  }}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : step.num}
                </div>
                <span
                  className="hidden sm:inline text-xs font-medium"
                  style={{ color: completed ? "#d4a017" : current ? "white" : "#4b5563" }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {showComplete ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white font-medium hidden sm:inline">You're set up.</span>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              style={{ borderColor: "#b8860b", color: "#d4a017" }}
              onClick={() => { setFadeOut(true); navigate("/"); }}
              data-testid="button-onboarding-go-dashboard"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : showConfirm ? (
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: "#9ca3af" }} className="hidden sm:inline">Are you sure? You can always find Setup in the menu.</span>
            <button
              className="px-2 py-1 rounded text-xs font-medium bg-transparent border-none cursor-pointer"
              style={{ color: "#ef4444" }}
              onClick={() => { dismiss(); setShowConfirm(false); }}
              disabled={isDismissing}
              data-testid="button-confirm-dismiss"
            >
              Yes, skip
            </button>
            <button
              className="px-2 py-1 rounded text-xs font-medium bg-transparent border-none cursor-pointer"
              style={{ color: "#d4a017" }}
              onClick={() => setShowConfirm(false)}
              data-testid="button-cancel-dismiss"
            >
              Keep going
            </button>
          </div>
        ) : (
          <button
            className="p-1 bg-transparent border-none cursor-pointer"
            style={{ color: "#4b5563" }}
            onClick={() => setShowConfirm(true)}
            data-testid="button-dismiss-onboarding"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="h-[3px] w-full" style={{ backgroundColor: "#2a2d3e" }}>
        <div
          className="h-full"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #b8860b, #d4a017)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}
