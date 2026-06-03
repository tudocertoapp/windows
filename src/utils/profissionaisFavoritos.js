import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiOrigin } from '../lib/subscription';
import { parseLojaRefFromInput } from './lojaPublicLink';
import { getLojaDisplayName } from './catalogoStore';

export const FAVORITOS_STORAGE_PREFIX = '@tudocerto_prof_favoritos_';

function storageKey(userId) {
  return `${FAVORITOS_STORAGE_PREFIX}${userId || 'guest'}`;
}

export function normalizeProfissionalFavorito(raw) {
  if (!raw?.ownerUserId) return null;
  return {
    ownerUserId: String(raw.ownerUserId),
    nome: raw.nome || '',
    empresa: raw.empresa || '',
    foto: raw.foto || null,
    telefone: raw.telefone || '',
    subtitulo: raw.subtitulo || '',
    addedAt: raw.addedAt || new Date().toISOString(),
  };
}

export async function loadProfissionaisFavoritos(userId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const list = raw ? JSON.parse(raw) : [];
    return (Array.isArray(list) ? list : [])
      .map(normalizeProfissionalFavorito)
      .filter(Boolean)
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  } catch (_) {
    return [];
  }
}

async function persist(userId, list) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(list));
}

export async function addProfissionalFavorito(userId, prof) {
  const item = normalizeProfissionalFavorito(prof);
  if (!item) return loadProfissionaisFavoritos(userId);
  const list = await loadProfissionaisFavoritos(userId);
  const next = [item, ...list.filter((p) => p.ownerUserId !== item.ownerUserId)];
  await persist(userId, next);
  return next;
}

export async function removeProfissionalFavorito(userId, ownerUserId) {
  const list = await loadProfissionaisFavoritos(userId);
  const next = list.filter((p) => p.ownerUserId !== String(ownerUserId));
  await persist(userId, next);
  return next;
}

export async function fetchProfissionalPreview(input) {
  const ref = parseLojaRefFromInput(input);
  if (!ref) throw new Error('Informe o ID ou link da loja do profissional.');

  const apiBase = getApiOrigin();
  if (!apiBase) throw new Error('Busca indisponível offline. Conecte-se à internet.');

  const res = await fetch(`${apiBase}/api/loja/store?ref=${encodeURIComponent(ref)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Profissional ou loja não encontrado.');

  const profile = json.profile || {};
  const config = json.config || {};
  return {
    ownerUserId: ref,
    nome: profile.nome || '',
    empresa: profile.empresa || '',
    foto: profile.foto || config.fotoCatalogo || null,
    telefone: config.whatsappPedido || profile.telefone || '',
    subtitulo: config.subtitulo || config.slogan || profile.profissao || '',
    displayName: getLojaDisplayName(config, profile),
  };
}

export async function searchProfissionais(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const apiBase = getApiOrigin();
  if (!apiBase) throw new Error('Busca indisponível offline.');

  const res = await fetch(`${apiBase}/api/loja/search?q=${encodeURIComponent(q)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Não foi possível buscar.');
  return json.results || [];
}
