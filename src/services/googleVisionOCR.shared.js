import axios from 'axios';
import Constants from 'expo-constants';
import { getVisionOcrEndpoint } from '../lib/visionApi';

/** Chave embutida no build (app.config.js → expo.extra) ou variável EXPO_PUBLIC_*. */
export function getVisionApiKey() {
  const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || Constants?.manifest2?.extra || {};
  const fromExtra = extra.googleVisionApiKey || '';
  const fromEnv =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_VISION_API_KEY) || '';
  return String(fromExtra || fromEnv).trim();
}

export async function ocrViaProxy(base64, languageHints = ['pt']) {
  const endpoint = getVisionOcrEndpoint();
  if (!endpoint) {
    throw new Error('Servidor OCR não configurado (EXPO_PUBLIC_SITE_URL).');
  }

  const { data } = await axios.post(
    endpoint,
    { imageBase64: base64, languageHints },
    { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
  );

  if (data?.error) throw new Error(data.error);
  return typeof data?.text === 'string' ? data.text.trim() : '';
}

export async function ocrViaDirectGoogle(base64, apiKey, languageHints = ['pt']) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints },
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

export function formatVisionProxyError(proxyErr) {
  const status = proxyErr?.response?.status;
  const msg =
    proxyErr?.response?.data?.error ||
    proxyErr?.message ||
    'Erro ao ler comprovante';

  if (status === 404) {
    return 'Servidor OCR indisponível. Faça deploy na Vercel com EXPO_PUBLIC_GOOGLE_VISION_API_KEY na rota /api/vision/ocr.';
  }
  if (/ECONNREFUSED|Network Error|Failed to fetch|timeout/i.test(String(msg))) {
    return 'Sem conexão com o servidor OCR. Verifique internet ou tente novamente.';
  }
  return msg;
}
