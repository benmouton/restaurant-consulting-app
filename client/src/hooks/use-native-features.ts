import { useState, useEffect, useCallback } from "react";
import {
  isNativeApp,
  getNetworkStatus,
  onNetworkChange,
  checkBiometricAvailable,
  getBiometricEnabled,
  setBiometricEnabled,
  verifyBiometric,
  getPushRegistered,
  requestPushPermission,
  setPushRegistered,
  cacheSet,
  cacheGet,
} from "@/lib/native";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const native = isNativeApp();

  useEffect(() => {
    if (!native) return;
    getNetworkStatus().then(setIsOnline);
    let cleanup: (() => void) | null = null;
    onNetworkChange((connected) => {
      setIsOnline(connected);
    }).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [native]);

  return { isOnline, isNative: native };
}

export function useBiometric() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [verified, setVerified] = useState(false);
  const native = isNativeApp();

  useEffect(() => {
    if (!native) return;
    checkBiometricAvailable().then(setAvailable);
    getBiometricEnabled().then(setEnabled);
  }, [native]);

  const toggle = useCallback(async () => {
    if (!available) return;
    if (!enabled) {
      const ok = await verifyBiometric();
      if (ok) {
        await setBiometricEnabled(true);
        setEnabled(true);
        setVerified(true);
      }
    } else {
      await setBiometricEnabled(false);
      setEnabled(false);
    }
  }, [available, enabled]);

  const verify = useCallback(async () => {
    if (!native || !enabled) {
      setVerified(true);
      return true;
    }
    const ok = await verifyBiometric();
    setVerified(ok);
    return ok;
  }, [native, enabled]);

  return { available, enabled, verified, toggle, verify, isNative: native };
}

export function usePushNotifications() {
  const [registered, setRegistered] = useState(false);
  const native = isNativeApp();

  useEffect(() => {
    if (!native) return;
    getPushRegistered().then(setRegistered);
  }, [native]);

  const register = useCallback(async () => {
    const token = await requestPushPermission();
    if (token) {
      await setPushRegistered(true);
      setRegistered(true);
      try {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
      } catch {}
      return true;
    }
    return false;
  }, []);

  return { registered, register, isNative: native };
}

export function useOfflineCache<T>(key: string, onlineData: T | undefined) {
  const [cachedData, setCachedData] = useState<T | undefined>(undefined);
  const native = isNativeApp();

  useEffect(() => {
    if (!native) return;
    if (onlineData) {
      cacheSet(key, onlineData);
      setCachedData(onlineData);
    } else {
      cacheGet<T>(key).then((cached) => {
        if (cached) setCachedData(cached.data);
      });
    }
  }, [native, key, onlineData]);

  return native ? cachedData : onlineData;
}
