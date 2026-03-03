export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    if (!(window as any).Tesseract) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Tesseract'));
        document.head.appendChild(script);
      });
    }

    const { createWorker } = (window as any).Tesseract;
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageBase64);
    await worker.terminate();
    
    return text?.trim() || null;
  } catch (e: any) {
    console.error('OCR failed:', e);
    return null;
  }
}
