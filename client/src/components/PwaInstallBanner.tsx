import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogoIconOnly } from "@/components/BrandLogo";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { isNativeApp } from "@/lib/native";

export function PwaInstallBanner() {
  const {
    isIOS,
    canPromptNative,
    shouldShowBanner,
    promptInstall,
    dismiss,
  } = usePwaInstall();
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  if (isNativeApp() || !shouldShowBanner) return null;

  const handleInstall = async () => {
    if (canPromptNative) {
      const accepted = await promptInstall();
      if (accepted) return;
    } else if (isIOS) {
      setShowIOSSteps(true);
      return;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] safe-area-bottom"
        data-testid="pwa-install-banner"
      >
        <div className="mx-2 mb-2 rounded-xl border border-border bg-card shadow-lg">
          {!showIOSSteps ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0">
                <BrandLogoIconOnly size={36} />
              </div>
              <p className="flex-1 text-sm font-medium text-foreground leading-snug">
                Add The Restaurant Consultant to your homescreen for instant access
              </p>
              <Button
                size="sm"
                onClick={handleInstall}
                data-testid="button-pwa-install"
              >
                Install
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={dismiss}
                data-testid="button-pwa-dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Add to Home Screen</p>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => { setShowIOSSteps(false); dismiss(); }}
                  data-testid="button-pwa-ios-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Share className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">1. Tap the Share button</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Look for <ArrowUp className="h-3 w-3 inline" /> at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">2. Tap "Add to Home Screen"</p>
                    <p className="text-xs text-muted-foreground">Scroll down in the share menu to find it</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">3. Tap "Add"</p>
                    <p className="text-xs text-muted-foreground">Confirm to add the app to your homescreen</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
