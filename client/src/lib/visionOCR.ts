import { Capacitor } from '@capacitor/core';

export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const bridge = (window as any).Capacitor;
    if (!bridge || !bridge.Plugins || !bridge.Plugins.VisionOCR) {
      console.log('VisionOCR plugin not available');
      return null;
    }
    const result = await bridge.Plugins.VisionOCR.recognizeText({ imageBase64 });
    return result.text || null;
  } catch (e: any) {
    console.error('Vision OCR failed:', e);
    return null;
  }
}
