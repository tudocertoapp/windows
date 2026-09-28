import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getApiOrigin } from '../lib/subscription';
import {
  CATALOGO_CONFIG_KEY,
  mergeCatalogoConfig,
  syncCatalogoItens,
  getCatalogoRotulos,
} from './catalogoStore';
import { prepareCatalogoConfigForRemote } from './catalogoRemoteAssets';

let catalogoSaveSeq = 0;

function stampConfig(config) {
  return {
    ...config,
    updatedAt: new Date().toISOString(),
  };
}

async function upsertCatalogoOnSupabase(userId, config) {
  const now = config.updatedAt || new Date().toISOString();
  const row = {
    user_id: userId,
    config,
    updated_at: now,
    loja_slug: String(config.slugPublico || '').trim() || null,
  };
  let { error } = await supabase.from('catalogo_configs').upsert(row, { onConflict: 'user_id' });
  if (error) {
    const retry = await supabase.from('catalogo_configs').upsert({
      user_id: userId,
      config,
      updated_at: now,
    }, { onConflict: 'user_id' });
    error = retry.error;
  }
  if (error) return { remote: false, error: error.message };
  return { remote: true, config };
}

async function saveCatalogoConfigRemote(userId, config) {
  const origin = getApiOrigin();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  let apiError = null;

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
      if (res.ok && json?.ok) {
        return { remote: true, config: json.config || config, warning: json.warning };
      }
      apiError = json.error || `HTTP ${res.status}`;
    } catch (e) {
      apiError = e?.message || 'Falha de rede ao publicar o catálogo.';
    }
  }

  const direct = await upsertCatalogoOnSupabase(userId, config);
  if (direct.remote) return { ...direct, warning: apiError || undefined };
  return { remote: false, error: direct.error || apiError || 'Não foi possível salvar o catálogo na nuvem.' };
}

export async function loadCatalogoConfig(user, products, services) {
  let remote = null;
  let remoteAt = 0;
  if (user?.id) {
    try {
      const { data, error } = await supabase
        .from('catalogo_configs')
        .select('config, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data?.config) {
        remote = data.config;
        remoteAt = Date.parse(data.updated_at || data.config?.updatedAt || 0) || 0;
      }
    } catch (_) {}
  }

  let local = null;
  try {
    const raw = await AsyncStorage.getItem(CATALOGO_CONFIG_KEY);
    if (raw) local = JSON.parse(raw);
  } catch (_) {}
  const localAt = Date.parse(local?.updatedAt || 0) || 0;

  const source = remote && (!local || remoteAt >= localAt) ? remote : (local || remote);
  const merged = mergeCatalogoConfig(source);
  const synced = { ...merged, itens: syncCatalogoItens(merged, products, services) };

  try {
    await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(synced));
  } catch (_) {}

  return synced;
}

export async function loadCatalogoRotulosLocal() {
  try {
    const raw = await AsyncStorage.getItem(CATALOGO_CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return getCatalogoRotulos(parsed);
  } catch (_) {
    return getCatalogoRotulos();
  }
}

export async function saveCatalogoConfig(user, config, options = {}) {
  const { skipAssetUpload = false } = options;
  const seq = ++catalogoSaveSeq;
  let prepared = config;
  if (user?.id && !skipAssetUpload) {
    prepared = await prepareCatalogoConfigForRemote(user.id, config);
  }
  prepared = stampConfig({
    ...prepared,
    slugPublico: String(prepared.slugPublico || '').trim().toLowerCase(),
  });
  if (seq !== catalogoSaveSeq) return { ok: true, remote: false, stale: true, config: prepared };

  await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(prepared));
  if (!user?.id) return { ok: true, remote: false, config: prepared };

  const saved = await saveCatalogoConfigRemote(user.id, prepared);
  if (seq !== catalogoSaveSeq) return { ok: true, remote: false, stale: true, config: prepared };
  if (!saved.remote) {
    console.warn('[catalogoPersist]', saved.error);
    return { ok: true, remote: false, error: saved.error, config: prepared };
  }
  try {
    await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(saved.config || prepared));
  } catch (_) {}
  return { ok: true, remote: true, warning: saved.warning, config: saved.config || prepared };
}
