/**
 * Assistente nativo do Tudo Certo (Vercel).
 * Mesma função do OCR no plano Hobby; também via rewrite /api/ai/chat.
 */
const { createClient } = require('@supabase/supabase-js');
const { getSupabaseAdmin, parseBody } = require('./supabaseAdmin');
const { checkRateLimit } = require('./ai/rateLimit');
const { runAssistant } = require('./ai');

const MAX_MESSAGE = 2000;

function bearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = String(h).match(/^Bearer\s+(\S+)/i);
  return m ? m[1] : '';
}

function getAuthClient() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function resolveUser(token) {
  if (!token) return null;
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data?.user?.id) return { user: data.user, db: admin };
  }
  const anon = getAuthClient();
  if (!anon) return null;
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  const db = createClient(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user: data.user, db };
}

function clipMemory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item || '').trim().slice(0, 220))
    .filter(Boolean)
    .slice(-48);
}

function clipHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 400),
      intent: typeof m.intent === 'string' ? m.intent.slice(0, 40) : undefined,
      followUp: m.followUp && typeof m.followUp === 'object' ? m.followUp : undefined,
    }))
    .slice(-20);
}

function isAssistantRequest(req, body) {
  const url = String(req.url || '');
  if (/\/api\/ai\/chat\b/i.test(url)) return true;
  if (/[?&]task=assistant\b/i.test(url)) return true;
  if (body && (body.task === 'assistant' || body.assistant === true)) return true;
  return false;
}

async function handleAssistant(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ ok: true, configured: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const token = bearerToken(req);
  const resolved = await resolveUser(token);
  if (!resolved?.user?.id) {
    res.status(401).json({ error: 'Faça login para o assistente ler os dados da sua conta.' });
    return;
  }

  if (!checkRateLimit(resolved.user.id).ok) {
    res.status(429).json({ error: 'Muitas perguntas seguidas. Espere um minuto e tente de novo.' });
    return;
  }

  const body = parseBody(req) || {};
  const message = String(body.message || body.text || '').trim().slice(0, MAX_MESSAGE);
  if (!message && !body.confirm) {
    res.status(400).json({ error: 'Escreva uma pergunta.' });
    return;
  }

  const pendingAction =
    body.pendingAction && typeof body.pendingAction === 'object'
      ? { tool: String(body.pendingAction.tool || '').slice(0, 40), args: body.pendingAction.args && typeof body.pendingAction.args === 'object' ? body.pendingAction.args : {} }
      : null;
  if (pendingAction && !/^(create_expense|create_income|create_client|create_appointment|create_product|create_service)$/.test(pendingAction.tool)) {
    pendingAction.tool = '';
  }

  try {
    const meta = resolved.user.user_metadata || {};
    const firstName = String(meta.nome || meta.full_name || resolved.user.email || '')
      .trim()
      .split(/\s+/)[0];
    const out = await runAssistant({
      db: resolved.db,
      userId: resolved.user.id,
      firstName,
      preferredName: String(body.preferredName || body.callName || '').trim().slice(0, 40),
      voiceTone: String(body.voiceTone || body.tone || 'neutra').slice(0, 20),
      message: message || 'sim',
      history: clipHistory(body.history),
      pendingAction: pendingAction?.tool ? pendingAction : null,
      confirm: body.confirm === true,
      autoConfirm: false,
      memory: clipMemory(body.memory),
    });
    const payload = {
      ok: true,
      message: out.message || 'Não consegui montar a resposta agora.',
      reply: out.message || 'Não consegui montar a resposta agora.',
      intent: out.intent || 'unknown',
    };
    if (Array.isArray(out.cards) && out.cards.length) payload.cards = out.cards.slice(0, 4);
    if (out.pendingAction) payload.pendingAction = out.pendingAction;
    if (out.followUp) payload.followUp = out.followUp;
    if (out.uiAction && typeof out.uiAction === 'object') payload.uiAction = out.uiAction;
    if (out.callName) payload.callName = String(out.callName).slice(0, 40);
    res.status(200).json(payload);
  } catch (e) {
    res.status(502).json({ error: 'Não consegui responder agora. Tente de novo.' });
  }
}

module.exports = { isAssistantRequest, handleAssistant };
