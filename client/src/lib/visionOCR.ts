export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const cap = (window as any).Capacitor;
    if (!cap) return null;
    
    const available = cap.isPluginAvailable('VisionOCR');
    const pluginKeys = Object.keys(cap.Plugins || {}).join(', ');
    alert('VisionOCR available: ' + available + '\nPlugins: ' + pluginKeys);
    
    if (available) {
      const result = await cap.Plugins.VisionOCR.recognizeText({ imageBase64 });
      alert('OCR result: ' + (result?.text || 'empty').substring(0, 100));
      return result?.text || null;
    }
    
    return null;
  } catch (e: any) {
    alert('OCR error: ' + e.message);
    return null;
  }
}
