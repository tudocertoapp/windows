/**
 * Salva a foto do perfil (logo/avatar) localmente para abrir rápido sem depender da rede.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const CACHE_KEY_PREFIX = '@tudocerto_profile_photo_cache_';
const CACHE_META_KEY_PREFIX = '@tudocerto_profile_photo_meta_';

function getCacheMetaKey(userId) {
  return `${CACHE_META_KEY_PREFIX}${userId || 'guest'}`;
}

function getCacheKey(userId) {
  return `${CACHE_KEY_PREFIX}${userId || 'guest'}`;
}

function getLocalPath(userId) {
  if (!FileSystem.cacheDirectory) return null;
  return `${FileSystem.cacheDirectory}profile_photo_${userId || 'guest'}.jpg`;
}

/**
 * Retorna a URI local da foto em cache (se existir), para exibir na hora.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export async function getCachedPhotoUri(userId) {
  try {
    const path = getLocalPath(userId);
    if (!path) return null;
    const info = await FileSystem.getInfoAsync(path, { size: false });
    if (info.exists) return path;
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Baixa a foto da URL e salva no cache local. Atualiza AsyncStorage com a URI local.
 * @param {string} photoUrl - URL da foto (ex: Supabase storage)
 * @param {string} userId
 * @returns {Promise<string|null>} URI local ou null
 */
export async function cacheProfilePhoto(photoUrl, userId) {
  if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.startsWith('http')) return null;
  try {
    const path = getLocalPath(userId);
    if (!path) return null;
    await FileSystem.downloadAsync(photoUrl, path);
    await AsyncStorage.setItem(getCacheKey(userId), path);
    await AsyncStorage.setItem(getCacheMetaKey(userId), JSON.stringify({ url: photoUrl }));
    return path;
  } catch (e) {
    console.warn('Erro ao salvar foto em cache:', e);
    return null;
  }
}

/**
 * Retorna a URI para exibir: primeiro tenta o cache local; se não tiver, retorna a URL.
 * @param {string|null} remoteUrl
 * @param {string|null} userId
 * @param {string|null} cachedLocalUri - já carregado do estado
 * @returns {{ uri: string|null, fromCache: boolean }}
 */
export function getDisplayUri(remoteUrl, userId, cachedLocalUri) {
  if (cachedLocalUri) return { uri: cachedLocalUri, fromCache: true };
  if (remoteUrl) return { uri: remoteUrl, fromCache: false };
  return { uri: null, fromCache: false };
}
