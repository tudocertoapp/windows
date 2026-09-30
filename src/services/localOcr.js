import { readImageAsBase64 } from '../utils/readImageAsBase64';

async function imageToDataUrl(image) {
  if (!image) throw new Error('Imagem ausente');
  if (typeof image === 'string') {
    if (image.startsWith('data:')) return image;
    const b64 = await readImageAsBase64(image);
    return `data:image/jpeg;base64,${b64}`;
  }
  if (typeof image === 'object') {
    if (typeof image.base64 === 'string' && image.base64.trim()) {
      const b = image.base64.trim();
      return b.startsWith('data:') ? b : `data:image/jpeg;base64,${b}`;
    }
    if (typeof image.uri === 'string' && image.uri.trim()) {
      return imageToDataUrl(image.uri);
    }
  }
  throw new Error('Formato de imagem inválido');
}

/**
 * No nativo o Tesseract do navegador não roda.
 * A leitura de foto fica no web (e no desktop Electron).
 */
export async function localOcrText(image) {
  await imageToDataUrl(image);
  throw new Error(
    'A leitura de comprovante por foto está no navegador e no app desktop. No celular, envie o gasto por texto ou use o site.'
  );
}

export function isLocalOcrAvailable() {
  return false;
}
