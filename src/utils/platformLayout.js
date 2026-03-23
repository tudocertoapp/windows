/**
 * Utilitário para layout separado por plataforma (web vs mobile).
 * Permite que a ordem e visibilidade dos cards no web não afetem o mobile e vice-versa.
 */
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/**
 * Retorna a chave de storage apropriada para a plataforma atual.
 * Web usa sufixo _web, mobile usa a chave original.
 * Assim, as preferências de layout são salvas separadamente.
 */
export function getLayoutStorageKey(baseKey) {
  return IS_WEB ? `${baseKey}_web` : baseKey;
}

/**
 * Retorna o valor padrão correto para a plataforma.
 * Se platformDefaults.web existir, usa para web; senão usa default.
 */
export function getDefaultForPlatform(defaultValue, platformDefaults = {}) {
  if (IS_WEB && platformDefaults.web) return platformDefaults.web;
  return defaultValue;
}

export const isWeb = IS_WEB;
