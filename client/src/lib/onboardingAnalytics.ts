export function track(event: string, data: Record<string, any> = {}) {
  console.log(`[onboarding] ${event}`, { ...data, timestamp: Date.now() });
}
