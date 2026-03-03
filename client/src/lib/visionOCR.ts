import { registerPlugin } from '@capacitor/core';

interface VisionOCRPlugin {
  recognizeText(options: { imageBase64: string }): Promise<{ text: string }>;
}

const VisionOCR = registerPlugin<VisionOCRPlugin>('VisionOCR');

export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    alert('OCR: attempting call');
    const result = await VisionOCR.recognizeText({ imageBase64 });
    alert('OCR result: ' + (result.text || 'empty').substring(0, 100));
    return result.text || null;
  } catch (e: any) {
    alert('OCR error: ' + e.message);
    return null;
  }
}
