import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export function startLogin() {
  if (isNativeApp()) {
    window.location.href = "/native-login";
  } else {
    window.location.href = "/api/login";
  }
}

export function startLoginWithReturn(returnTo: string) {
  if (isNativeApp()) {
    window.location.href = `/native-login?returnTo=${encodeURIComponent(returnTo)}`;
  } else {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
  }
}

export async function startLogout() {
  if (isNativeApp()) {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  } else {
    window.location.href = "/api/logout";
  }
}
