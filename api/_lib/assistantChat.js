/**
 * Assistente da conta: Groq (Llama) no servidor.
 * Chamado pela mesma função do OCR para caber no plano Hobby da Vercel.
 */
const { createClient } = require('@supabase/supabase-js');
const { getSupabaseAdmin, parseBody } = require('./supabaseAdmin');
const { buildAccountSnapshot } = require('./accountSnapshot');
const { llmStatus, chatWithAccountLlm } = require('./llmChat');

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

function clipHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1200) }))
    .slice(-8);
}

function systemPrompt(snapshot, firstName) {
  const nome = firstName || 'usuário';
  return [
    'Você é o assistente do app Tudo Certo (agenda e finanças).',
    `Fale em português do Brasil, de forma clara e direta, como um ChatGPT prestativo. Trate a pessoa por ${nome} quando fizer sentido.`,
    'Use SOMENTE o JSON de dados da conta abaixo. Não invente valores, datas, produtos ou vendas que não estejam nele.',
    'Se a informação não estiver no resumo, diga que não encontrou no cadastro e sugira lançar no app.',
    'Pode dar dicas práticas de caixa, estoque, o que mais vende e o que está vencendo — sempre com base nos números.',
    'Não peça senha, CPF ou dados de cartão. Não fale de outras contas.',
    'Valores já vêm em reais quando houver campo *Fmt.',
    `DADOS_DA_CONTA:\n${JSON.stringify(snapshot)}`,
  ].join('\n');
}

function isAssistantRequest(req, body) {
  const url = String(req.url || '');
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
    const st = llmStatus();
    res.status(200).json({ ok: true, ...st });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const st = llmStatus();
  if (!st.configured) {
    res.status(503).json({
      error: 'Chave Groq não configurada no servidor (GROQ_API_KEY na Vercel).',
    });
    return;
  }

  const token = bearerToken(req);
  const resolved = await resolveUser(token);
  if (!resolved?.user?.id) {
    res.status(401).json({ error: 'Faça login para o assistente ler os dados da sua conta.' });
    return;
  }

  const body = parseBody(req) || {};
  const message = String(body.message || body.text || '').trim().slice(0, 2000);
  if (!message) {
    res.status(400).json({ error: 'Escreva uma pergunta.' });
    return;
  }

  try {
    const snapshot = await buildAccountSnapshot(resolved.db, resolved.user.id);
    const meta = resolved.user.user_metadata || {};
    const firstName = String(meta.nome || meta.full_name || resolved.user.email || '')
      .trim()
      .split(/\s+/)[0];
    const history = clipHistory(body.history);
    const { text, provider } = await chatWithAccountLlm({
      system: systemPrompt(snapshot, firstName),
      messages: [...history, { role: 'user', content: message }],
    });
    res.status(200).json({
      ok: true,
      reply: text || 'Não consegui montar a resposta agora. Tente de novo.',
      provider,
    });
  } catch (e) {
    const status = e?.status >= 400 && e.status < 600 ? e.status : 502;
    res.status(status).json({ error: e?.message || 'Falha ao consultar a IA.' });
  }
}

module.exports = { isAssistantRequest, handleAssistant };
