import { googleVisionOcrText } from '../googleVisionOCR';
import { extractReceiptData, isValidReceiptData } from '../../utils/receiptOcr/extractReceiptData';

const receiptCache = new Map(); // sessão (não persistente)
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
 * processReceipt - OCR com Google Cloud Vision.
 * @returns {{ success: true, total, date, store, rawText, source } | { success: false, source: 'cloud-failed' }}
 */
export async function processReceipt(arg1) {
  const input = typeof arg1 === 'string' ? { imageUri: arg1 } : (arg1 || {});
  const { imageUri, imageBase64, cacheKey, onStage } = input;

  if (!imageUri || typeof imageUri !== 'string') throw new Error('imageUri inválida');

  const key = cacheKey || `${imageUri}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, success: true };

  onStage?.('cloud-start');
  try {
    const cloudText = await readWithCloudVision(imageUri, imageBase64);
    const cloudData = extractReceiptData(cloudText);
    if (isValidReceiptData(cloudData)) {
      const out = { ...cloudData, success: true, source: 'cloud' };
      cacheSet(key, out);
      onStage?.('cloud-success');
      return out;
    }
  } catch (_) {}

  onStage?.('cloud-failed');
  return {
    success: false,
    source: 'cloud-failed',
  };
}
