export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const cap = (window as any).Capacitor;
    if (!cap) return null;
    
    const result = await cap.nativeCallback('VisionOCR', 'recognizeText', { imageBase64 });
    return result?.text || null;
  } catch (e: any) {
    try {
      return await new Promise((resolve, reject) => {
        const callbackId = 'visionocr_' + Date.now();
        (window as any)[callbackId] = (result: any) => {
          delete (window as any)[callbackId];
          resolve(result?.text || null);
        };
        cap.toNative('VisionOCR', 'recognizeText', { imageBase64 }, callbackId);
      });
    } catch (e2: any) {
      alert('OCR both methods failed: ' + e.message + ' | ' + e2.message);
      return null;
    }
  }
}
