import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getApiOrigin } from '../lib/subscription';
import {
  CATALOGO_CONFIG_KEY,
  mergeCatalogoConfig,
  syncCatalogoItens,
} from './catalogoStore';
import { prepareCatalogoConfigForRemote } from './catalogoRemoteAssets';

let catalogoSaveSeq = 0;

async function saveCatalogoConfigRemote(userId, config) {
  const origin = getApiOrigin();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (origin && token) {
    try {
      const res = await fetch(`${origin}/api/loja/save-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) return { remote: true, config: json.config || config };
      if (res.status === 401 || res.status === 413) {
        return { remote: false, error: json.error || 'Não foi possível salvar o catálogo na nuvem.' };
      }
    } catch (_) {}
  }

  const { error } = await supabase
    .from('catalogo_configs')
    .upsert({
      user_id: userId,
      config,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) return { remote: false, error: error.message };
  return { remote: true, config };
}

export async function loadCatalogoConfig(user, products, services) {
  let remote = null;
  if (user?.id) {
    try {
      const { data, error } = await supabase
        .from('catalogo_configs')
        .select('config, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data?.config) remote = data.config;
    } catch (_) {}
  }

  let local = null;
  try {
    const raw = await AsyncStorage.getItem(CATALOGO_CONFIG_KEY);
    if (raw) local = JSON.parse(raw);
  } catch (_) {}

  const source = remote || local || null;
  const merged = mergeCatalogoConfig(source);
  const synced = { ...merged, itens: syncCatalogoItens(merged, products, services) };

  try {
    await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(synced));
  } catch (_) {}

  return synced;
}

export async function saveCatalogoConfig(user, config, options = {}) {
  const { skipAssetUpload = false } = options;
  const seq = ++catalogoSaveSeq;
  let prepared = config;
  if (user?.id && !skipAssetUpload) {
    prepared = await prepareCatalogoConfigForRemote(user.id, config);
  }
  if (seq !== catalogoSaveSeq) return { ok: true, remote: false, stale: true, config: prepared };

  await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(prepared));
  if (!user?.id) return { ok: true, remote: false, config: prepared };

  const saved = await saveCatalogoConfigRemote(user.id, prepared);
  if (seq !== catalogoSaveSeq) return { ok: true, remote: false, stale: true, config: prepared };
  if (!saved.remote) {
    console.warn('[catalogoPersist]', saved.error);
    return { ok: true, remote: false, error: saved.error, config: prepared };
  }
  return { ok: true, remote: true, config: saved.config || prepared };
}
