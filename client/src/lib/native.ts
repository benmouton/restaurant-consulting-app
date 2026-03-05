import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {}
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform === true) return true;
  if (typeof navigator !== 'undefined' && /capacitor/i.test(navigator.userAgent)) return true;
  return false;
};

export function startLogin() {
  if (isNativeApp()) {
    window.location.href = "/native-login";
  } else {
    window.location.href = "/login";
  }
}

export function startLoginWithReturn(returnTo: string) {
  if (isNativeApp()) {
    window.location.href = `/native-login?returnTo=${encodeURIComponent(returnTo)}`;
  } else {
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
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

export async function hapticTap() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticSuccess() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

export async function hapticError() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch {}
}

export async function hapticMedium() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function nativeShare(opts: { title: string; text?: string; url?: string }) {
  if (!isNativeApp()) return false;
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: opts.title,
      text: opts.text || 'From The Restaurant Consultant',
      url: opts.url || 'https://restaurantai.consulting',
      dialogTitle: 'Share with your team',
    });
    return true;
  } catch {
    return false;
  }
}

export async function takePhoto(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    return photo.dataUrl || null;
  } catch {
    return null;
  }
}

export async function pickPhoto(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });
    return photo.dataUrl || null;
  } catch {
    return null;
  }
}

export async function checkBiometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const NativeBiometric = (await import('capacitor-native-biometric')).NativeBiometric;
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function verifyBiometric(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const NativeBiometric = (await import('capacitor-native-biometric')).NativeBiometric;
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock The Restaurant Consultant',
      title: 'Authenticate',
    });
    return true;
  } catch {
    return false;
  }
}

export async function getBiometricEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'biometric_enabled' });
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean) {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'biometric_enabled', value: String(enabled) });
  } catch {}
}

export async function cacheSet(key: string, data: unknown) {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({
      key: `cache_${key}`,
      value: JSON.stringify({ data, timestamp: Date.now() }),
    });
  } catch {}
}

export async function cacheGet<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
  if (!isNativeApp()) return null;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: `cache_${key}` });
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getNetworkStatus(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return true;
  }
}

export async function onNetworkChange(callback: (connected: boolean) => void): Promise<(() => void) | null> {
  if (!isNativeApp()) return null;
  try {
    const { Network } = await import('@capacitor/network');
    const handle = await Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    });
    return () => handle.remove();
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive === 'granted') {
      await PushNotifications.register();
      return new Promise((resolve) => {
        let resolved = false;
        PushNotifications.addListener('registration', (token) => {
          if (!resolved) {
            resolved = true;
            resolve(token.value);
          }
        });
        PushNotifications.addListener('registrationError', () => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, 10000);
      });
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPushRegistered(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'push_registered' });
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setPushRegistered(registered: boolean) {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'push_registered', value: String(registered) });
  } catch {}
}

export async function saveInspectionPhoto(photo: string, category: string) {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'inspection_photos' });
    const photos: Array<{ dataUrl: string; category: string; timestamp: number }> = value ? JSON.parse(value) : [];
    photos.unshift({ dataUrl: photo, category, timestamp: Date.now() });
    const trimmed = photos.slice(0, 50);
    await Preferences.set({ key: 'inspection_photos', value: JSON.stringify(trimmed) });
  } catch {}
}

export async function getInspectionPhotos(): Promise<Array<{ dataUrl: string; category: string; timestamp: number }>> {
  if (!isNativeApp()) return [];
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'inspection_photos' });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}
