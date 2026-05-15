/**
 * Web: OCR via proxy /api/vision/ocr (evita CORS no navegador).
 */
import {
  ocrViaProxy,
  formatVisionProxyError,
} from './googleVisionOCR.shared';
import { getVisionOcrEndpoint } from '../lib/visionApi';

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
    if (typeof image.base64 === 'string' && image.base64.trim()) {
      const b = image.base64.trim();
      return b.startsWith('data:') ? b.split(',')[1] || '' : b;
    }
    if (typeof image.uri === 'string' && image.uri.trim()) {
      return imageToBase64(image.uri);
    }
  }
  throw new Error('Formato de imagem inválido');
}

export async function googleVisionOcrText(image, opts = {}) {
  const languageHints = opts.languageHints || ['pt'];
  const base64 = await imageToBase64(image);

  const proxyEndpoint = getVisionOcrEndpoint();
  if (!proxyEndpoint) {
    throw new Error(
      'OCR no navegador precisa do servidor /api/vision/ocr. Defina EXPO_PUBLIC_SITE_URL no .env (após deploy) ou rode "npm run web:api" com EXPO_PUBLIC_VISION_API_URL=http://localhost:3000.'
    );
  }

  try {
    const text = await ocrViaProxy(base64, languageHints);
    if (text) return text;
    throw new Error('O OCR não encontrou texto na imagem. Use uma foto mais nítida.');
  } catch (proxyErr) {
    throw new Error(formatVisionProxyError(proxyErr));
  }
}
