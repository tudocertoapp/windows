import { Platform } from 'react-native';
import axios from 'axios';
import { getVisionOcrEndpoint } from './visionApi';
import { isLocalOcrAvailable } from '../services/localOcr';

export function getVisionConfigHint() {
  return 'Leitura de comprovante no servidor (imagem reduzida antes do envio). No navegador, a leitura local entra se o servidor falhar.';
}

/**
 * Confere se /api/vision/ocr está no ar e se GEMINI_API_KEY existe no servidor.
 */
export async function probeVisionOcr() {
  const endpoint = getVisionOcrEndpoint();
  if (!endpoint) {
    if (Platform.OS === 'web' || isLocalOcrAvailable()) {
      return {
        status: 'warn',
        label: 'Leitura de foto sem URL do servidor',
        detail: 'Defina EXPO_PUBLIC_SITE_URL (produção) ou EXPO_PUBLIC_VISION_API_URL=http://localhost:3000 + npm run web:api. OCR local continua disponível no navegador.',
      };
    }
    return {
      status: 'warn',
      label: 'Servidor OCR não configurado',
      detail: getVisionConfigHint(),
    };
  }

  try {
    const { data } = await axios.get(endpoint, { timeout: 15000 });
    if (data?.configured) {
      return {
        status: 'ok',
        label: 'Leitura de foto ativa',
        detail: 'A foto é reduzida no aparelho e lida no servidor.',
      };
    }
    return {
      status: 'warn',
      label: 'Leitura de foto sem chave no servidor',
      detail: 'Configure a chave da API de visão nas variáveis da Vercel (e no .env local se usar npm run web:api).',
    };
  } catch (e) {
    const status = e?.response?.status;
    if (Platform.OS === 'web' || isLocalOcrAvailable()) {
      return {
        status: 'warn',
        label: status === 404 ? 'Rota OCR ausente no deploy' : 'Servidor OCR offline',
        detail: 'O navegador ainda pode ler a foto localmente. Faça deploy da API e configure a chave no servidor.',
      };
    }
    return {
      status: 'error',
      label: 'Servidor OCR indisponível',
      detail: e?.message || getVisionConfigHint(),
    };
  }
}
