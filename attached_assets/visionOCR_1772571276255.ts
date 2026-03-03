import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from './native';

interface VisionOCRPlugin {
  recognizeText(options: { imageBase64: string }): Promise<{ text: string }>;
}

const VisionOCR = registerPlugin<VisionOCRPlugin>('VisionOCR');

/**
 * Extract text from an image using Apple Vision on-device OCR.
 * Returns the recognized text, or null if not on a native device.
 * Pass the full base64 data URL (e.g. "data:image/jpeg;base64,...") — 
 * the native side strips the prefix automatically.
 */
export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const result = await VisionOCR.recognizeText({ imageBase64 });
    return result.text || null;
  } catch (e) {
    console.error('Vision OCR failed:', e);
    return null;
  }
}
