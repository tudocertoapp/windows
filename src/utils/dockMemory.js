import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_FACTS = 2500;
const KEY = (uid) => `@tudocerto_dock_memory_${uid || 'guest'}`;

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function byteSize(obj) {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch (_) {
    return JSON.stringify(obj).length;
  }
}

function emptyStore() {
  return { v: 1, facts: [] };
}

export function isLearnPhrase(text) {
  const t = fold(text);
  if (!t) return false;
  return /\b(nao e|nao era|na verdade|o correto|o certo e|voce errou|errou|errado|aprenda|anota que|anote que|lembra que|lembre que|da proxima|da próxima|corrijo|correcao|correção)\b/.test(t);
}

export function isDataConfirm(text) {
  return /^(sim|s|ok|pode|confirmo|confirmar|isso|pode registrar|pode lancar|yes)\b/i.test(String(text || '').trim());
}

export function isDataCancel(text) {
  return /^(nao|não|cancela|cancelar|deixa|melhor nao)\b/i.test(String(text || '').trim());
}

export async function loadDockMemory(userId) {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.facts)) return emptyStore();
    return { v: 1, facts: parsed.facts };
  } catch (_) {
    return emptyStore();
  }
}

export async function rememberDockFact(userId, text, source = 'correction') {
  const fact = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!fact) return emptyStore();
  const store = await loadDockMemory(userId);
  store.facts.push({
    t: fact,
    at: new Date().toISOString(),
    src: String(source || 'correction').slice(0, 24),
  });
  while (store.facts.length > MAX_FACTS || byteSize(store) > MAX_BYTES) {
    if (!store.facts.length) break;
    store.facts.shift();
  }
  await AsyncStorage.setItem(KEY(userId), JSON.stringify(store)).catch(() => {});
  return store;
}

export function memoryForPrompt(store) {
  const facts = Array.isArray(store?.facts) ? store.facts : [];
  return facts.slice(-48).map((f) => String(f.t || '').slice(0, 220)).filter(Boolean);
}
