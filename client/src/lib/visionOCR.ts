export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const cap = (window as any).Capacitor;
    if (!cap || !cap.isNativePlatform()) return null;

    return await new Promise((resolve) => {
      const callbackId = 'visionocr_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      
      (window as any)[callbackId] = (result: any) => {
        delete (window as any)[callbackId];
        try {
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          resolve(parsed?.text || null);
        } catch {
          resolve(null);
        }
      };
      
      const message = {
        type: 'message',
        pluginId: 'VisionOCR',
        methodName: 'recognizeText',
        callbackId: callbackId,
        options: { imageBase64 }
      };
      
      try {
        (window as any).webkit.messageHandlers.bridge.postMessage(message);
      } catch (e) {
        delete (window as any)[callbackId];
        alert('postMessage failed: ' + (e as any).message);
        resolve(null);
      }
      
      setTimeout(() => {
        if ((window as any)[callbackId]) {
          delete (window as any)[callbackId];
          resolve(null);
        }
      }, 30000);
    });
  } catch (e: any) {
    alert('OCR error: ' + e.message);
    return null;
  }
}
