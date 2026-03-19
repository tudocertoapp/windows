import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

function getVisionApiKey() {
  // Preferimos usar app.json -> expo.extra.googleVisionApiKey para não hardcodear chave no código.
  const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
  return extra.googleVisionApiKey || '';
}

async function imageToBase64(image) {
  if (!image) throw new Error('Imagem ausente');
  if (typeof image === 'string') {
    // assume URI
    return await FileSystem.readAsStringAsync(image, { encoding: FileSystem.EncodingType.Base64 });
  }
  if (typeof image === 'object') {
    if (typeof image.base64 === 'string' && image.base64.trim()) return image.base64.trim();
    if (typeof image.uri === 'string' && image.uri.trim()) {
      return await FileSystem.readAsStringAsync(image.uri, { encoding: FileSystem.EncodingType.Base64 });
    }
  }
  throw new Error('Formato de imagem inválido');
}

/**
 * Faz OCR com Google Cloud Vision API (TEXT_DETECTION).
 * @param {string|{uri?:string, base64?:string}} image
 * @param {{ apiKey?: string, languageHints?: string[] }} opts
 * @returns {Promise<string>} texto extraído
 */
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

