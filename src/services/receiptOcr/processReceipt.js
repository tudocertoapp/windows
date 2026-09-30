import { localOcrText, isLocalOcrAvailable } from '../localOcr';
import { extractReceiptData, isValidReceiptData } from '../../utils/receiptOcr/extractReceiptData';
import { resizeReceiptImage } from '../../utils/resizeReceiptImage';
import { getVisionOcrEndpoint } from '../../lib/visionApi';
import { readReceiptViaProxy, formatVisionProxyError } from '../googleVisionOCR.shared';

const receiptCache = new Map();
const MAX_CACHE = 8;

function cacheGet(key) {
  if (!key) return null;
  return receiptCache.get(key) || null;
}

function cacheSet(key, value) {
  if (!key) return;
  if (receiptCache.size >= MAX_CACHE) {
    const firstKey = receiptCache.keys().next().value;
    receiptCache.delete(firstKey);
  }
  receiptCache.set(key, value);
}

function fromFields(fields, rawText, source) {
  const data = {
    total: typeof fields?.total === 'number' && Number.isFinite(fields.total) ? fields.total : null,
    date: fields?.date ? String(fields.date) : null,
    store: String(fields?.store || ''),
    rawText: rawText || '',
  };
  if (!data.total || !data.date) {
    const extracted = extractReceiptData(rawText);
    if (!data.total) data.total = extracted.total;
    if (!data.date) data.date = extracted.date;
    if (!data.store) data.store = extracted.store;
    if (!data.rawText) data.rawText = extracted.rawText;
  }
  return { ...data, source };
}

/**
 * @returns {{ success: true, total, date, store, rawText, source } | { success: false, source, error?: string, rawText?: string }}
 */
export async function processReceipt(arg1) {
  const input = typeof arg1 === 'string' ? { imageUri: arg1 } : arg1 || {};
  const { imageUri, imageBase64, cacheKey, onStage } = input;

  if (!imageUri || typeof imageUri !== 'string') throw new Error('imageUri inválida');

  const key = cacheKey || `${imageUri}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, success: true };

  let lastError = '';
  let rawText = '';
  const sourceUri =
    imageUri.startsWith('data:') || !imageBase64
      ? imageUri
      : `data:image/jpeg;base64,${String(imageBase64).replace(/^data:image\/\w+;base64,/, '')}`;

  onStage?.('resize');
  let resized;
  try {
    resized = await resizeReceiptImage(sourceUri);
  } catch (e) {
    lastError = e?.message || 'Não foi possível reduzir a imagem';
    console.warn('[processReceipt] resize', lastError);
  }
  if (!resized?.base64 && imageBase64) {
    resized = {
      uri: sourceUri,
      base64: String(imageBase64).replace(/^data:image\/\w+;base64,/, ''),
      mime: 'image/jpeg',
    };
  }

  const endpoint = getVisionOcrEndpoint();
  if (resized?.base64 && endpoint) {
    onStage?.('gemini-start');
    try {
      const remote = await readReceiptViaProxy(resized.base64, resized.mime);
      rawText = remote?.text || '';
      const data = fromFields(remote, rawText, 'gemini');
      if (isValidReceiptData(data)) {
        const out = { ...data, success: true, source: 'gemini' };
        cacheSet(key, out);
        onStage?.('gemini-success');
        return out;
      }
      lastError = rawText
        ? 'A IA leu o comprovante, mas não encontrou valor total e data com clareza. Tente uma foto mais nítida ou cadastre manualmente.'
        : 'A IA não retornou texto. Use uma foto mais nítida ou cadastre manualmente.';
    } catch (e) {
      lastError = formatVisionProxyError(e);
      console.warn('[processReceipt] gemini', lastError);
    }
    onStage?.('gemini-failed');
  } else if (!endpoint) {
    lastError = 'Servidor OCR não configurado (EXPO_PUBLIC_SITE_URL).';
  }

  if (isLocalOcrAvailable()) {
    onStage?.('local-start');
    try {
      const image = resized?.base64
        ? { uri: resized.uri || imageUri, base64: resized.base64 }
        : sourceUri;
      rawText = await localOcrText(image);
      const data = fromFields(null, rawText, 'local');
      if (isValidReceiptData(data)) {
        const out = { ...data, success: true, source: 'local' };
        cacheSet(key, out);
        onStage?.('local-success');
        return out;
      }
      lastError = rawText
        ? 'Li o comprovante, mas não encontrei valor total e data com clareza. Tente uma foto mais nítida ou cadastre manualmente.'
        : lastError || 'O OCR não retornou texto. Use uma foto mais nítida ou cadastre manualmente.';
    } catch (e) {
      lastError = e?.message || lastError || 'Erro ao ler imagem';
      console.warn('[processReceipt] local', lastError);
    }
    onStage?.('local-failed');
  }

  return {
    success: false,
    source: lastError ? 'failed' : 'failed',
    error: lastError || 'Não foi possível ler o comprovante.',
    rawText: rawText || undefined,
  };
}
