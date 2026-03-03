export async function extractTextFromImage(imageBase64: string): Promise<string | null> {
  try {
    const w = window as any;
    
    const cap = w.Capacitor;
    if (!cap) {
      alert('No Capacitor object');
      return null;
    }
    
    const methods = Object.keys(cap).join(', ');
    alert('Capacitor methods: ' + methods);
    
    return null;
  } catch (e: any) {
    alert('Error: ' + e.message);
    return null;
  }
}
