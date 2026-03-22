/**
 * Web: cache de foto do perfil - usa apenas URL remota (sem FileSystem).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = '@tudocerto_profile_photo_cache_';
const CACHE_META_KEY_PREFIX = '@tudocerto_profile_photo_meta_';

function getCacheMetaKey(userId) {
  return `${CACHE_META_KEY_PREFIX}${userId || 'guest'}`;
}

function getCacheKey(userId) {
  return `${CACHE_KEY_PREFIX}${userId || 'guest'}`;
}

export async function getCachedPhotoUri(userId) {
  try {
    const stored = await AsyncStorage.getItem(getCacheKey(userId));
    return stored || null;
  } catch (_) {
    return null;
  }
}

export async function cacheProfilePhoto(photoUrl, userId) {
  if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.startsWith('http')) return null;
  try {
    await AsyncStorage.setItem(getCacheKey(userId), photoUrl);
    await AsyncStorage.setItem(getCacheMetaKey(userId), JSON.stringify({ url: photoUrl }));
    return photoUrl;
  } catch (e) {
    console.warn('Erro ao salvar foto em cache:', e);
    return null;
  }
}

export function getDisplayUri(remoteUrl, userId, cachedLocalUri) {
  if (cachedLocalUri) return { uri: cachedLocalUri, fromCache: true };
  if (remoteUrl) return { uri: remoteUrl, fromCache: false };
  return { uri: null, fromCache: false };
}
