/**
 * Web: OCR com Google Vision - converte imagem para base64 via Fetch/FileReader.
 */
import axios from 'axios';

function getVisionApiKey() {
  if (typeof window !== 'undefined' && window.__EXPO_CONFIG__?.extra?.googleVisionApiKey) {
    return window.__EXPO_CONFIG__.extra.googleVisionApiKey;
  }
  return process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';
}

async function imageToBase64(image) {
  if (!image) throw new Error('Imagem ausente');
  if (typeof image === 'string') {
    if (image.startsWith('data:')) return image.split(',')[1] || '';
    const res = await fetch(image);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string' && result.startsWith('data:')) {
          resolve(result.split(',')[1] || '');
        } else reject(new Error('Falha ao converter imagem'));
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(blob);
    });
  }
  if (typeof image === 'object') {
    if (typeof image.base64 === 'string' && image.base64.trim()) return image.base64.trim();
    if (typeof image.uri === 'string' && image.uri.trim()) {
      return imageToBase64(image.uri);
    }
  }
  throw new Error('Formato de imagem inválido');
}

export async function googleVisionOcrText(image, opts = {}) {
  const apiKey = (opts.apiKey || getVisionApiKey() || '').trim();
  if (!apiKey) throw new Error('Chave da Google Vision ausente (googleVisionApiKey)');

  const base64 = await imageToBase64(image);
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        imageContext: {
          languageHints: opts.languageHints || ['pt'],
        },
      },
    ],
  };

  const { data } = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 45000,
  });

  const resp = data?.responses?.[0];
  const full = resp?.fullTextAnnotation?.text;
  if (typeof full === 'string' && full.trim()) return full.trim();

  const first = resp?.textAnnotations?.[0]?.description;
  if (typeof first === 'string' && first.trim()) return first.trim();

  const errMsg = resp?.error?.message;
  if (errMsg) throw new Error(errMsg);
  return '';
}
