import { googleVisionOcrText } from '../googleVisionOCR';
import { extractReceiptData, isValidReceiptData } from '../../utils/receiptOcr/extractReceiptData';

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

async function readWithCloudVision(imageUri, imageBase64, opts = {}) {
  const image = imageBase64 ? { uri: imageUri, base64: imageBase64 } : imageUri;
  const text = await googleVisionOcrText(image, { languageHints: opts.languageHints || ['pt'] });
  return text;
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

  onStage?.('cloud-start');
  let rawText = '';
  let lastError = '';

  try {
    rawText = await readWithCloudVision(imageUri, imageBase64);
    const cloudData = extractReceiptData(rawText);
    if (isValidReceiptData(cloudData)) {
      const out = { ...cloudData, success: true, source: 'cloud' };
      cacheSet(key, out);
      onStage?.('cloud-success');
      return out;
    }
    lastError = rawText
      ? 'Li o comprovante, mas não encontrei valor total e data com clareza. Tente uma foto mais nítida ou cadastre manualmente.'
      : 'O OCR não retornou texto. Verifique a chave API e se a imagem está legível.';
  } catch (e) {
    lastError = e?.message || 'Erro ao ler imagem com Google Vision';
    console.warn('[processReceipt]', lastError);
  }

  onStage?.('cloud-failed');
  return {
    success: false,
    source: 'cloud-failed',
    error: lastError,
    rawText: rawText || undefined,
  };
}
