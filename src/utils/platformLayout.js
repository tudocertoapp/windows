/**
 * Utilitário para layout separado por plataforma (web vs mobile).
 * Permite que a ordem e visibilidade dos cards no web não afetem o mobile e vice-versa.
 */
import { Platform, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

const IS_WEB = Platform.OS === 'web';

/** Largura mínima para layout desktop (sidebar) na web */
const DESKTOP_BREAKPOINT = 768;

/**
 * Detecta se está em um dispositivo móvel pelo user agent (apenas na web).
 */
function isMobileUserAgent() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent);
}

/**
 * Retorna true se deve usar layout desktop (sidebar) na web.
 * No celular acessando pelo browser, retorna false para mostrar layout mobile (tab bar).
 */
export function useIsDesktopLayout() {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    if (!IS_WEB) return false;
    // Viewport estreita: sempre layout mobile (tab bar), evita sidebar em janela redimensionada
    if (width < DESKTOP_BREAKPOINT) return false;
    // UA mobile/tablet com largura típica de aparelho: tab bar, não sidebar
    if (isMobileUserAgent() && width < 1100) return false;
    return true;
  }, [width]);
}

/**
 * Retorna a chave de storage apropriada para a plataforma atual.
 * Web usa sufixo _web, mobile usa a chave original.
 */
export function getLayoutStorageKey(baseKey) {
  return IS_WEB ? `${baseKey}_web` : baseKey;
}

/**
 * Retorna o valor padrão correto para a plataforma.
 */
export function getDefaultForPlatform(defaultValue, platformDefaults = {}) {
  if (IS_WEB && platformDefaults.web) return platformDefaults.web;
  return defaultValue;
}

export const isWeb = IS_WEB;

/** No web, useNativeDriver deve ser false (módulo nativo não disponível) */
export const useNativeDriverSafe = !IS_WEB;

/**
 * Escala leve para deixar o web desktop mais compacto (mais informação por tela).
 * Use apenas para tamanhos (font/padding/altura). Mantém proporções sem “quebrar” layout.
 */
export const WEB_DESKTOP_SCALE = 0.92;

export function scaleWebDesktop(value, isWebDesktop) {
  if (!isWebDesktop) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return Math.round(n * WEB_DESKTOP_SCALE);
}
