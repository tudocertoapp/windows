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
  const t = fold(text);
  if (!t) return false;
  if (isDataCancel(t)) return false;
  if (/\b(parar|encerrar|desligar|desliga|tchau)\b/.test(t)) return false;
  if (t.length > 90) return false;
  return (
    /^(sim+|s|ok+|okay|uhum|aham|isso|claro|fechou|combinado|autorizo|afirmativo|yes|yeah|cadastra|cadastre|agenda|agende|registra|registre)$/.test(t)
    || /\b(sim|ok|okay|pode sim|pode fazer|pode agendar|pode cadastrar|pode editar|pode alterar|pode mudar|pode atualizar|pode registrar|pode lancar|pode salvar|pode confirmar|pode ir|pode continuar|pode prosseguir|confirmo|confirmar|isso mesmo|claro que sim|com certeza|manda ver|vai em frente|tudo bem|ta bom|esta bem|autorizo|autorizado|pode|pode excluir|pode apagar|pode cancelar)\b/.test(t)
  );
}

export function confirmsPendingWrite(text, tool) {
  if (isDataConfirm(text)) return true;
  const t = fold(text);
  if (!t) return false;
  if (tool === 'delete_appointments') {
    if (/\b(nao quero|nao confirma|melhor nao|deixa quieto|esquece)\b/.test(t) && !/\bsim\b/.test(t)) return false;
    return t.split(/\s+/).length <= 8
      && /\b(cancela|cancelar|exclui|excluir|apaga|apagar|remove|remover|confirma|confirmar|manda|pode cancelar|pode excluir|pode apagar)\b/.test(t);
  }
  return false;
}

export function abortsPendingWrite(text, tool) {
  const t = fold(text);
  if (tool === 'delete_appointments') {
    if (/\b(cancela|cancelar|exclui|excluir|apaga|apagar)\b/.test(t) && !/\b(nao|deixa quieto|esquece)\b/.test(t)) return false;
  }
  return isDataCancel(t);
}

export function isDataCancel(text) {
  const t = fold(text);
  if (!t) return false;
  if (/\b(agendamento|agendamentos|compromisso|evento|sessao|cliente|hoje|amanha)\b/.test(t) && t.split(/\s+/).length > 2) return false;
  return /^(nao|nao pode|cancela|cancelar|deixa|deixa quieto|melhor nao|esquece|nao quero)$/.test(t)
    || /\b(nao confirma|nao autorizo|melhor nao)\b/.test(t)
    || /^(cancela|cancelar)$/.test(t);
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
