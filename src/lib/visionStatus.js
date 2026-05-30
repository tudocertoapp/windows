import { Platform } from 'react-native';
import { getVisionOcrEndpoint } from './visionApi';
import { getVisionApiKey } from '../services/googleVisionOCR.shared';

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function getVisionConfigHint() {
  const endpoint = getVisionOcrEndpoint();
  if (Platform.OS === 'web') {
    if (!endpoint) {
      return 'No .env: EXPO_PUBLIC_VISION_API_URL=http://localhost:3000 e rode npm run web:api';
    }
    if (/localhost|127\.0\.0\.1/i.test(endpoint)) {
      return 'Deixe npm run web:api rodando (porta 3000) enquanto usa o app no navegador.';
    }
    return 'Confirme EXPO_PUBLIC_GOOGLE_VISION_API_KEY na Vercel (Settings → Environment Variables).';
  }
  if (getVisionApiKey()) return 'Google Vision configurado no app.';
  if (endpoint) return 'OCR via servidor (EXPO_PUBLIC_SITE_URL).';
  return 'Adicione EXPO_PUBLIC_GOOGLE_VISION_API_KEY no .env e reinicie com expo start --clear.';
}

/**
 * Verifica se o fluxo de OCR usado em Meus gastos está pronto.
 * Web: exige proxy /api/vision/ocr (dev local ou Vercel).
 * Mobile: chave no build ou proxy de produção.
 */
export async function probeVisionOcr() {
  const apiKey = getVisionApiKey();
  const endpoint = getVisionOcrEndpoint();

  if (Platform.OS === 'web') {
    if (!endpoint) {
      return {
        status: 'error',
        label: 'OCR indisponível',
        detail: getVisionConfigHint(),
      };
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: TINY_PNG, languageHints: ['pt'] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return {
          status: 'ok',
          label: 'OCR ativo',
          detail: /localhost|127\.0\.0\.1/i.test(endpoint)
            ? 'Servidor local OK — pode enviar foto da notinha.'
            : 'Leitura de comprovantes pronta.',
        };
      }
      const errText = String(data?.error || `HTTP ${res.status}`);
      if (/chave|key|configurada/i.test(errText)) {
        return { status: 'error', label: 'Chave no servidor ausente', detail: errText };
      }
      if (res.status === 404) {
        return {
          status: 'error',
          label: 'Rota OCR não encontrada',
          detail: 'Faça deploy na Vercel com a pasta api/vision ou rode npm run web:api no PC.',
        };
      }
      return { status: 'warn', label: 'Servidor OCR com erro', detail: errText };
    } catch (_) {
      return {
        status: 'error',
        label: 'Servidor OCR offline',
        detail: getVisionConfigHint(),
      };
    }
  }

  if (apiKey) {
    return {
      status: 'ok',
      label: 'OCR ativo',
      detail: 'Google Vision configurado no dispositivo.',
    };
  }

  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: TINY_PNG, languageHints: ['pt'] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { status: 'ok', label: 'OCR ativo', detail: 'Leitura via servidor.' };
      }
      return {
        status: 'warn',
        label: 'Proxy OCR com erro',
        detail: data?.error || `HTTP ${res.status}`,
      };
    } catch (_) {
      return { status: 'error', label: 'OCR não configurado', detail: getVisionConfigHint() };
    }
  }

  return { status: 'error', label: 'OCR não configurado', detail: getVisionConfigHint() };
}
