import { Platform } from 'react-native';
import { getApiOrigin } from './subscription';

function isLocalDevUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(String(url || '').trim());
}

/**
 * URL base para POST /api/vision/ocr.
 * No celular nunca usa localhost (aponta para o próprio aparelho).
 */
export function getVisionProxyOrigin() {
  const visionUrl =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_VISION_API_URL : '';
  const siteUrl = getApiOrigin();

  if (Platform.OS === 'web') {
    if (visionUrl && !isLocalDevUrl(visionUrl)) {
      return String(visionUrl).replace(/\/$/, '');
    }
    if (visionUrl && isLocalDevUrl(visionUrl)) {
      return String(visionUrl).replace(/\/$/, '');
    }
    if (siteUrl) return siteUrl;
    if (typeof window !== 'undefined' && window.location?.origin) {
      const origin = window.location.origin.replace(/\/$/, '');
      if (!isLocalDevUrl(origin)) return origin;
    }
    return '';
  }

  // iOS / Android: produção na Vercel; ignorar localhost do .env de desenvolvimento no PC
  if (siteUrl) return siteUrl;
  if (visionUrl && !isLocalDevUrl(visionUrl)) {
    return String(visionUrl).replace(/\/$/, '');
  }
  return '';
}

export function getVisionOcrEndpoint() {
  const base = getVisionProxyOrigin();
  return base ? `${base}/api/vision/ocr` : '';
}
