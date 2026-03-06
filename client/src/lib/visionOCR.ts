import { isNativeApp } from './native';

export async function extractTextFromImage(imageDataUrl: string): Promise<string | null> {
  if (isNativeApp()) {
    try {
      const mlkit = await (globalThis as any).__capacitorMLKit?.TextRecognition;
      if (mlkit) {
        const base64 = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
        const result = await mlkit.recognize({ base64, language: 'latin' });
        return result.text || null;
      }
    } catch (e) {
      console.log('ML Kit OCR not available, falling back to server:', e);
    }
  }

  try {
    const base64 = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
    const res = await fetch('/api/ocr/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageBase64: base64 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch (e) {
    console.error('OCR extract failed:', e);
    return null;
  }
}
