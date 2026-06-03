import { readImageAsBase64 } from './readImageAsBase64';
import { uploadClientPhoto } from './uploadClientPhoto';
import { createLogoPreviewBase64, uploadCatalogoLogoPair } from './catalogoLogoImage';

/** URI ainda no dispositivo (não é URL pública persistente). */
export function isLocalCatalogoImageUri(uri) {
  if (!uri || typeof uri !== 'string') return false;
  const u = uri.trim();
  if (
    u.startsWith('file:')
    || u.startsWith('blob:')
    || u.startsWith('content:')
    || u.startsWith('ph:')
    || u.startsWith('data:')
  ) return true;
  if (u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1')) return true;
  return false;
}

async function uploadUriAsJpeg(uri, userId, storageKey) {
  const base64 = await readImageAsBase64(uri);
  return uploadClientPhoto(base64, userId, storageKey);
}

/**
 * Garante que logo, preview e banner da loja estejam no Storage antes de gravar no Supabase.
 */
export async function prepareCatalogoConfigForRemote(userId, config) {
  if (!userId || !config) return config;

  const next = { ...config };
  const stamp = Date.now();

  if (isLocalCatalogoImageUri(next.fotoCatalogo)) {
    try {
      const base64 = await readImageAsBase64(next.fotoCatalogo);
      const { original, preview } = await uploadCatalogoLogoPair({ uri: next.fotoCatalogo, base64 }, userId);
      next.fotoCatalogo = original;
      if (isLocalCatalogoImageUri(next.fotoCatalogoPreview)) {
        next.fotoCatalogoPreview = preview;
      } else if (!next.fotoCatalogoPreview) {
        next.fotoCatalogoPreview = preview;
      }
    } catch (e) {
      console.warn('[catalogoRemoteAssets] logo:', e?.message || e);
    }
  }

  if (isLocalCatalogoImageUri(next.fotoCatalogoPreview)) {
    try {
      const previewBase64 = await createLogoPreviewBase64({ uri: next.fotoCatalogoPreview });
      if (previewBase64) {
        next.fotoCatalogoPreview = await uploadClientPhoto(
          previewBase64,
          userId,
          `catalogo-logo-preview-${stamp}`,
        );
      }
    } catch (e) {
      console.warn('[catalogoRemoteAssets] logo preview:', e?.message || e);
    }
  }

  if (isLocalCatalogoImageUri(next.fotoFundo)) {
    try {
      next.fotoFundo = await uploadUriAsJpeg(next.fotoFundo, userId, `catalogo-banner-${stamp}`);
    } catch (e) {
      console.warn('[catalogoRemoteAssets] banner:', e?.message || e);
    }
  }

  return next;
}
