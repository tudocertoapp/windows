/**
 * Logo da loja: versão original (qualidade) + preview leve para edição manual.
 */
import { Platform } from 'react-native';
import { uploadClientPhoto } from './uploadClientPhoto';

const PREVIEW_MAX_WIDTH = 360;
const PREVIEW_COMPRESS = 0.52;

async function resizeWithManipulator(uri) {
  const ImageManipulator = await import('expo-image-manipulator');
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: PREVIEW_MAX_WIDTH } }],
    {
      compress: PREVIEW_COMPRESS,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  return result.base64 || null;
}

async function resizeWithCanvas(uri) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, PREVIEW_MAX_WIDTH / (img.width || PREVIEW_MAX_WIDTH));
        const w = Math.max(1, Math.round((img.width || PREVIEW_MAX_WIDTH) * scale));
        const h = Math.max(1, Math.round((img.height || PREVIEW_MAX_WIDTH) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', PREVIEW_COMPRESS);
        const base64 = dataUrl.split(',')[1] || null;
        resolve(base64);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}

export async function createLogoPreviewBase64(asset) {
  const uri = asset?.uri;
  if (!uri) return asset?.base64 || null;
  try {
    const fromManipulator = await resizeWithManipulator(uri);
    if (fromManipulator) return fromManipulator;
  } catch (_) {}
  try {
    const fromCanvas = await resizeWithCanvas(uri);
    if (fromCanvas) return fromCanvas;
  } catch (_) {}
  return asset?.base64 || null;
}

/**
 * Envia original + preview leve. Se preview falhar, usa a original nos dois campos.
 */
export async function uploadCatalogoLogoPair(asset, userId) {
  if (!userId) throw new Error('userId é obrigatório');
  if (!asset?.base64) throw new Error('Não foi possível ler a imagem em alta qualidade');

  const stamp = Date.now();
  const original = await uploadClientPhoto(asset.base64, userId, `catalogo-logo-${stamp}`);

  let preview = original;
  try {
    const previewBase64 = await createLogoPreviewBase64(asset);
    if (previewBase64) {
      preview = await uploadClientPhoto(previewBase64, userId, `catalogo-logo-preview-${stamp}`);
    }
  } catch (e) {
    console.warn('Preview da logo não gerada:', e);
  }

  return { original, preview };
}

export async function createLocalLogoPreviewUri(asset) {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: PREVIEW_MAX_WIDTH } }],
      { compress: PREVIEW_COMPRESS, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri || asset.uri;
  } catch {
    return asset.uri;
  }
}
