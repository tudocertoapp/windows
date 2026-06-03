import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  CATALOGO_CONFIG_KEY,
  mergeCatalogoConfig,
  syncCatalogoItens,
} from './catalogoStore';
import { prepareCatalogoConfigForRemote } from './catalogoRemoteAssets';

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
  let prepared = config;
  if (user?.id && !skipAssetUpload) {
    prepared = await prepareCatalogoConfigForRemote(user.id, config);
  }

  await AsyncStorage.setItem(CATALOGO_CONFIG_KEY, JSON.stringify(prepared));
  if (!user?.id) return { ok: true, remote: false, config: prepared };

  const { error } = await supabase
    .from('catalogo_configs')
    .upsert({
      user_id: user.id,
      config: prepared,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.warn('[catalogoPersist]', error.message);
    return { ok: true, remote: false, error: error.message, config: prepared };
  }
  return { ok: true, remote: true, config: prepared };
}
