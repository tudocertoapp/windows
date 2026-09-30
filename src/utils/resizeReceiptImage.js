import { Image, Platform } from 'react-native';

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.68;

function getImageSize(uri) {
  return new Promise((resolve, reject) => {
    if (!uri) {
      reject(new Error('URI vazia'));
      return;
    }
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err || new Error('Não foi possível medir a imagem'))
    );
  });
}

function resizeActions(width, height) {
  const longest = Math.max(width || 0, height || 0);
  if (!longest || longest <= MAX_EDGE) return [];
  if (width >= height) return [{ resize: { width: MAX_EDGE } }];
  return [{ resize: { height: MAX_EDGE } }];
}

async function resizeWithCanvas(uri) {
  if (typeof document === 'undefined') {
    throw new Error('Canvas indisponível');
  }
  const img = await new Promise((resolve, reject) => {
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Falha ao carregar imagem para reduzir'));
    el.src = uri;
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = dataUrl.split(',')[1] || '';
  if (!base64) throw new Error('Falha ao compactar a imagem');
  return { uri: dataUrl, base64, mime: 'image/jpeg' };
}

/**
 * Reduz o lado maior para 1024px e regrava JPEG ~68% antes de enviar ao Gemini.
 */
export async function resizeReceiptImage(uri) {
  if (!uri || typeof uri !== 'string') throw new Error('Imagem inválida');

  try {
    const ImageManipulator = await import('expo-image-manipulator');
    let actions = [];
    try {
      const size = await getImageSize(uri);
      actions = resizeActions(size.width, size.height);
    } catch (_) {
      actions = [{ resize: { width: MAX_EDGE } }];
    }
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!result?.base64) throw new Error('Redimensionamento sem base64');
    return { uri: result.uri || uri, base64: result.base64, mime: 'image/jpeg' };
  } catch (e) {
    if (Platform.OS === 'web') {
      return resizeWithCanvas(uri);
    }
    throw e;
  }
}
