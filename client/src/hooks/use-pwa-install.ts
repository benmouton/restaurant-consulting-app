import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsInstalled(standalone);

    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);

    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const wasDismissed = localStorage.getItem("pwa-dismissed") === "true";
    setDismissed(wasDismissed);

    const count = parseInt(localStorage.getItem("pwa-visit-count") || "0", 10) + 1;
    localStorage.setItem("pwa-visit-count", String(count));
    setVisitCount(count);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem("pwa-dismissed", "true");
    setDismissed(true);
  }, []);

  const canPromptNative = !!deferredPrompt;

  const shouldShowBanner =
    isMobile && !isInstalled && !dismissed && visitCount >= 2;

  const canShowInstallOption = !isInstalled;

  return {
    isInstalled,
    isIOS,
    isMobile,
    canPromptNative,
    shouldShowBanner,
    canShowInstallOption,
    promptInstall,
    dismiss,
  };
}
