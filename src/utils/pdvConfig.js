import AsyncStorage from '@react-native-async-storage/async-storage';

const PDV_CONFIG_KEY_BASE = '@tudocerto_pdv_config';

export const DEFAULT_PDV_CONFIG = {
  requireOperatorLogin: true,
  requireFrontDeskAuth: true,
};

export function buildPdvConfigStorageKey(profile) {
  return `${PDV_CONFIG_KEY_BASE}_${String(profile?.email || 'local')}`;
}

export async function readPdvConfig(profile) {
  const key = buildPdvConfigStorageKey(profile);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { ...DEFAULT_PDV_CONFIG };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PDV_CONFIG };
    return {
      ...DEFAULT_PDV_CONFIG,
      ...(typeof parsed.requireOperatorLogin === 'boolean' ? { requireOperatorLogin: parsed.requireOperatorLogin } : {}),
      ...(typeof parsed.requireFrontDeskAuth === 'boolean' ? { requireFrontDeskAuth: parsed.requireFrontDeskAuth } : {}),
    };
  } catch (_) {
    return { ...DEFAULT_PDV_CONFIG };
  }
}

export async function writePdvConfig(profile, config) {
  const key = buildPdvConfigStorageKey(profile);
  const merged = { ...DEFAULT_PDV_CONFIG, ...(config || {}) };
  await AsyncStorage.setItem(key, JSON.stringify(merged));
  return merged;
}
