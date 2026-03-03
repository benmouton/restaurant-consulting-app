export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const cap = (window as any).Capacitor;
    if (!cap || !cap.isNativePlatform()) return null;
    
    const { registerPlugin } = await import('@capacitor/core');
    const VisionOCR = registerPlugin('VisionOCR');
    const result: any = await VisionOCR.recognizeText({ imageBase64 });
    return result?.text || null;
  } catch (e) {
    console.error('Vision OCR failed:', e);
    return null;
  }
}
