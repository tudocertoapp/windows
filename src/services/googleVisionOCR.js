import { readImageAsBase64 } from '../utils/readImageAsBase64';
import {
  getVisionApiKey,
  ocrViaProxy,
  ocrViaDirectGoogle,
  formatVisionProxyError,
} from './googleVisionOCR.shared';
import { getVisionOcrEndpoint } from '../lib/visionApi';

async function imageToBase64(image) {
  if (!image) throw new Error('Imagem ausente');

  if (typeof image === 'object') {
    if (typeof image.base64 === 'string' && image.base64.trim()) {
      const b = image.base64.trim();
      return b.startsWith('data:') ? b.split(',')[1] || '' : b;
    }
    if (typeof image.uri === 'string' && image.uri.trim()) {
      return readImageAsBase64(image.uri);
    }
  }

  if (typeof image === 'string') {
    if (image.startsWith('data:')) return image.split(',')[1] || '';
    return readImageAsBase64(image);
  }

  throw new Error('Formato de imagem inválido');
}

/**
 * OCR (iOS/Android): proxy Vercel primeiro; depois Google Vision direto com chave do build.
 */
export async function googleVisionOcrText(image, opts = {}) {
  const languageHints = opts.languageHints || ['pt'];
  const base64 = await imageToBase64(image);
  const proxyEndpoint = getVisionOcrEndpoint();

  if (proxyEndpoint) {
    try {
      const text = await ocrViaProxy(base64, languageHints);
      if (text) return text;
    } catch (proxyErr) {
      const status = proxyErr?.response?.status;
      // 404/5xx no proxy: tenta chave direta se existir no app
      if (status !== 404 && status !== 502 && status !== 503) {
        throw new Error(formatVisionProxyError(proxyErr));
      }
    }
  }

  const apiKey = (opts.apiKey || getVisionApiKey() || '').trim();
  if (!apiKey) {
    throw new Error(
      'Chave Google Vision ausente no app. Adicione EXPO_PUBLIC_GOOGLE_VISION_API_KEY no .env e gere um novo build (expo start --clear ou EAS Build).'
    );
  }

  return ocrViaDirectGoogle(base64, apiKey, languageHints);
}
