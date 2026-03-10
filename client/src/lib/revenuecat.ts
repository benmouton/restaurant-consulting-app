import { isNativeApp } from './native';

let purchasesInstance: any = null;

export async function initRevenueCat() {
  if (!isNativeApp()) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.configure({
      apiKey: 'appl_geuHdJHWIJHTyVeTolpkBJAfMpM',
    });
    purchasesInstance = Purchases;
  } catch (e) {
    console.error('RevenueCat init failed:', e);
  }
}

export async function getOfferings() {
  if (!isNativeApp()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (e) {
    console.error('RevenueCat getOfferings failed:', e);
    return null;
  }
}

export async function purchasePackage(packageToPurchase: any) {
  if (!isNativeApp()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const result = await Purchases.purchasePackage({ aPackage: packageToPurchase });
    return result;
  } catch (e: any) {
    if (e?.code === 1 || e?.message?.includes('cancelled')) {
      return null;
    }
    console.error('RevenueCat purchase failed:', e);
    throw e;
  }
}

export async function restorePurchases() {
  if (!isNativeApp()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const result = await Purchases.restorePurchases();
    return result;
  } catch (e) {
    console.error('RevenueCat restore failed:', e);
    return null;
  }
}

export async function getCustomerInfo() {
  if (!isNativeApp()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const info = await Purchases.getCustomerInfo();
    return info;
  } catch (e) {
    console.error('RevenueCat getCustomerInfo failed:', e);
    return null;
  }
}

export function getEntitlementTier(customerInfo: any): string {
  const entitlements = customerInfo?.customerInfo?.entitlements?.active;
  if (!entitlements) return 'free';
  if (entitlements['Pro']) return 'pro';
  if (entitlements['Basic']) return 'basic';
  return 'free';
}
