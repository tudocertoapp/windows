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
  const payload = {
    config,
    updated_at: now,
    loja_slug: String(config.slugPublico || '').trim() || null,
  };

  const { data: updated, error: updErr } = await supabase
    .from('catalogo_configs')
    .update(payload)
    .eq('user_id', userId)
    .select('config')
    .maybeSingle();
  if (!updErr && updated?.config) return { remote: true, config: updated.config };

  const { data: inserted, error: insErr } = await supabase
    .from('catalogo_configs')
    .insert({ user_id: userId, ...payload })
    .select('config')
    .maybeSingle();
  if (!insErr && inserted?.config) return { remote: true, config: inserted.config };

  const retry = await supabase
    .from('catalogo_configs')
    .upsert({ user_id: userId, config, updated_at: now }, { onConflict: 'user_id' })
    .select('config')
    .maybeSingle();
  if (!retry.error && retry.data?.config) return { remote: true, config: retry.data.config };

  return {
    remote: false,
    error: updErr?.message || insErr?.message || retry.error?.message || 'Não gravou na conta.',
  };
}

function sameJson(a, b) {
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch (_) {
    return false;
  }
}

function configLooksPublished(remoteCfg, expected) {
  if (!remoteCfg || !expected) return false;
  const same = (a, b) => String(a || '') === String(b || '');
  return same(remoteCfg.corPrincipal, expected.corPrincipal)
    && same(remoteCfg.temaEstilo, expected.temaEstilo)
    && same(remoteCfg.fotoCatalogo, expected.fotoCatalogo)
    && same(remoteCfg.layout, expected.layout)
    && sameJson(remoteCfg.coresTema, expected.coresTema)
    && sameJson(remoteCfg.heroPosicoes, expected.heroPosicoes);
}

async function readPublicStoreConfig(userId, slug) {
  const origin = getApiOrigin();
  if (!origin) return null;
  const params = slug
    ? `slug=${encodeURIComponent(slug)}`
    : `ref=${encodeURIComponent(userId)}`;
  try {
    const res = await fetch(`${origin}/api/loja/store?${params}&t=${Date.now()}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    return json?.ok ? (json.config || null) : null;
  } catch (_) {
    return null;
  }
}

async function saveCatalogoConfigRemote(userId, config) {
  const origin = getApiOrigin();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  let apiError = null;
  let apiWarning;
  let apiConfig = null;

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
      if (res.ok && json?.ok && json.config && typeof json.config === 'object') {
        apiConfig = json.config;
        apiWarning = json.warning;
      } else {
        apiError = json.error || `HTTP ${res.status}`;
      }
    } catch (e) {
      apiError = e?.message || 'Falha de rede ao publicar o catálogo.';
    }
  }

  const toWrite = {
    ...config,
    ...(apiConfig || {}),
    slugPublico: String((apiConfig?.slugPublico ?? config.slugPublico) || '').trim().toLowerCase(),
    updatedAt: apiConfig?.updatedAt || config.updatedAt || new Date().toISOString(),
  };

  if (!apiConfig) {
    const direct = await upsertCatalogoOnSupabase(userId, toWrite);
    if (!direct.remote) {
      return { remote: false, error: direct.error || apiError || 'Não foi possível salvar o catálogo na nuvem.' };
    }
  } else {
    await upsertCatalogoOnSupabase(userId, toWrite);
  }

  const publicCfg = await readPublicStoreConfig(userId, toWrite.slugPublico);
  if (configLooksPublished(publicCfg, toWrite)) {
    return {
      remote: true,
      config: { ...toWrite, ...(publicCfg || {}) },
      warning: apiWarning || undefined,
    };
  }

  const retry = await upsertCatalogoOnSupabase(userId, toWrite);
  const again = await readPublicStoreConfig(userId, toWrite.slugPublico);
  if (configLooksPublished(again, toWrite)) {
    return { remote: true, config: { ...toWrite, ...(again || {}) }, warning: apiWarning || undefined };
  }

  return {
    remote: false,
    error: retry.error
      || apiError
      || 'O link público ainda não leu esta versão no Supabase. Toque em Salvar de novo.',
  };
}

export async function loadCatalogoConfig(user, products, services) {
  let source = null;
  if (user?.id) {
    try {
      const { data, error } = await supabase
        .from('catalogo_configs')
        .select('config, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data?.config) source = data.config;
    } catch (_) {}
  }

  if (!source) {
    try {
      const raw = await AsyncStorage.getItem(CATALOGO_CONFIG_KEY);
      if (raw) source = JSON.parse(raw);
    } catch (_) {}
  }

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

  if (!user?.id) {
    await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(prepared));
    return { ok: true, remote: false, config: prepared };
  }

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
