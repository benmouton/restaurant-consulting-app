export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const res = await fetch('/api/ocr/extract-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ imageBase64 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch (e) {
    console.error('OCR extract failed:', e);
    return null;
  }
}
