/** Limite por usuário autenticado. Cada instância da Vercel é isolada (usuários concorrentes não compartilham sessão). */
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 40;
const buckets = new Map();

function prune(now) {
  if (buckets.size < 400) return;
  for (const [k, v] of buckets) {
    if (now - v.start > WINDOW_MS * 2) buckets.delete(k);
  }
}

function checkRateLimit(userId) {
  const id = String(userId || '');
  if (!id) return { ok: false };
  const now = Date.now();
  prune(now);
  const cur = buckets.get(id);
  if (!cur || now - cur.start > WINDOW_MS) {
    buckets.set(id, { start: now, count: 1 });
    return { ok: true };
  }
  cur.count += 1;
  if (cur.count > MAX_PER_WINDOW) return { ok: false };
  return { ok: true };
}

module.exports = { checkRateLimit };
