function groqKey() {
  return (process.env.GROQ_API_KEY || '').trim();
}

function deepseekKey() {
  return (process.env.DEEPSEEK_API_KEY || '').trim();
}

function chatProvider() {
  const name = String(process.env.AI_PROVIDER || '').toLowerCase();
  if (name === 'groq') return groqKey() ? 'groq' : (deepseekKey() ? 'deepseek' : '');
  if (deepseekKey()) return 'deepseek';
  if (groqKey()) return 'groq';
  return '';
}

const DEEPSEEK_CHAT_MODELS = [
  (process.env.DEEPSEEK_MODEL || '').trim(),
  'deepseek-flash',
  'deepseek-v4-flash',
].filter(Boolean);

const GROQ_CHAT_MODELS = [
  (process.env.GROQ_MODEL || '').trim(),
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
].filter(Boolean);

function llmStatus() {
  if (chatProvider()) return { configured: true };
  return { configured: false };
}

function publicError(err) {
  const msg = String(err?.message || err || '');
  if (/gemini|groq|llama|chatgpt|openai|qwen|gpt-?oss|deepseek|model|api key|GEMINI|GROQ/i.test(msg)) {
    return 'Não consegui responder agora. Tente de novo em instantes.';
  }
  return stripBrandNames(msg) || 'Não consegui responder agora. Tente de novo.';
}

function isUnknownModelError(msg) {
  return /does not exist|do not have access|model_not_found|invalid_model/i.test(String(msg || ''));
}

async function chatOpenAiOnce({ url, apiKey, model, system, messages, timeoutMs }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs || 12000),
    body: JSON.stringify({
      model,
      temperature: 0.75,
      max_tokens: 220,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const msg = json?.choices?.[0]?.message || {};
  const raw = String(msg.content || msg.reasoning || '').trim();
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function chatWithModels({ url, apiKey, models, system, messages, timeoutMs }) {
  const tried = new Set();
  let lastErr = null;
  for (const model of models) {
    if (!model || tried.has(model)) continue;
    tried.add(model);
    try {
      return await chatOpenAiOnce({ url, apiKey, model, system, messages, timeoutMs });
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || '');
      if (isUnknownModelError(msg) || e?.status === 404 || /timed out|TimeoutError|AbortError/i.test(msg)) continue;
      throw e;
    }
  }
  throw lastErr || new Error('Assistente indisponível no momento.');
}

function stripBrandNames(text) {
  return String(text || '')
    .replace(/\b(google\s*)?gemini(\s*flash)?\b/gi, 'assistente')
    .replace(/\bgroq\b/gi, 'assistente')
    .replace(/\bdeepseek\b/gi, 'assistente')
    .replace(/\bllama[\s-]*\d*(\.\d+)?[\s-]*\d*b?\b/gi, 'assistente')
    .replace(/\bchatgpt\b/gi, 'assistente')
    .replace(/\bgpt-?oss[-\s]*\d*b?\b/gi, 'assistente')
    .replace(/\bopenai\b/gi, 'assistente')
    .replace(/\bqwen[\w.-]*/gi, 'assistente')
    .replace(/\ballam[\w.-]*/gi, 'assistente');
}

async function chatWithAccountLlm({ system, messages }) {
  const provider = chatProvider();
  if (!provider) {
    const err = new Error('Assistente indisponível no momento.');
    err.status = 503;
    throw err;
  }
  const raw = provider === 'deepseek'
    ? await chatWithModels({
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: deepseekKey(),
      models: DEEPSEEK_CHAT_MODELS,
      system,
      messages,
      timeoutMs: 20000,
    })
    : await chatWithModels({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: groqKey(),
      models: GROQ_CHAT_MODELS,
      system,
      messages,
      timeoutMs: 8000,
    });
  return { text: stripBrandNames(raw) };
}

module.exports = { llmStatus, chatWithAccountLlm, stripBrandNames, publicError };
