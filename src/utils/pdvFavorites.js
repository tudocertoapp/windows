import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const PDV_FAVORITES_KEY_BASE = '@tudocerto_pdv_favoritos';

export const EMPTY_PDV_FAVORITES = { items: [], clients: [] };

export function buildPdvFavoritesStorageKey(profile) {
  return `${PDV_FAVORITES_KEY_BASE}_${String(profile?.email || 'local')}`;
}

export function itemFavoriteKey(item) {
  const tipo = item?._tipo || item?.tipo || 'produto';
  return `${tipo}:${String(item?.id ?? '')}`;
}

export function clientFavoriteKey(client) {
  return String(client?.id ?? '');
}

function normalizeFavorites(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PDV_FAVORITES };
  const items = Array.isArray(raw.items) ? raw.items.map(String).filter(Boolean) : [];
  const clients = Array.isArray(raw.clients) ? raw.clients.map(String).filter(Boolean) : [];
  return { items: [...new Set(items)], clients: [...new Set(clients)] };
}

async function readLocalPdvFavorites(profile) {
  const key = buildPdvFavoritesStorageKey(profile);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { ...EMPTY_PDV_FAVORITES };
    return normalizeFavorites(JSON.parse(raw));
  } catch (_) {
    return { ...EMPTY_PDV_FAVORITES };
  }
}

async function writeLocalPdvFavorites(profile, favorites) {
  const key = buildPdvFavoritesStorageKey(profile);
  await AsyncStorage.setItem(key, JSON.stringify(favorites));
}

async function getAuthUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch (_) {
    return null;
  }
}

async function upsertPdvFavoritesRemote(userId, favorites) {
  const normalized = normalizeFavorites(favorites);
  const { error } = await supabase.from('pdv_favorites').upsert(
    {
      user_id: userId,
      items: normalized.items,
      clients: normalized.clients,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
  return normalized;
}

export async function readPdvFavorites(profile) {
  const local = await readLocalPdvFavorites(profile);
  const userId = await getAuthUserId();
  if (!userId) return local;

  try {
    const { data, error } = await supabase
      .from('pdv_favorites')
      .select('items, clients')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      if (local.items.length || local.clients.length) {
        await upsertPdvFavoritesRemote(userId, local);
      }
      return local;
    }

    const remote = normalizeFavorites({ items: data.items, clients: data.clients });
    const hasRemote = remote.items.length > 0 || remote.clients.length > 0;
    const hasLocal = local.items.length > 0 || local.clients.length > 0;

    if (hasRemote) {
      await writeLocalPdvFavorites(profile, remote);
      return remote;
    }

    if (hasLocal) {
      await upsertPdvFavoritesRemote(userId, local);
      return local;
    }

    return { ...EMPTY_PDV_FAVORITES };
  } catch (_) {
    return local;
  }
}

export async function writePdvFavorites(profile, favorites) {
  const normalized = normalizeFavorites(favorites);
  await writeLocalPdvFavorites(profile, normalized);

  const userId = await getAuthUserId();
  if (userId) {
    try {
      await upsertPdvFavoritesRemote(userId, normalized);
    } catch (_) {
      /* mantém cache local; sync na próxima leitura com sessão */
    }
  }

  return normalized;
}
