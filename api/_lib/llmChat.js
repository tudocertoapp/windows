function groqKey() {
  return (process.env.GROQ_API_KEY || '').trim();
}

/** Chat só pela Groq. Gemini fica só no OCR de comprovante, não no assistente. */
const GROQ_CHAT_MODELS = [
  (process.env.GROQ_MODEL || '').trim(),
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
].filter(Boolean);

function groqModel() {
  return GROQ_CHAT_MODELS[0] || 'llama-3.3-70b-versatile';
}

function llmStatus() {
  if (groqKey()) return { configured: true };
  return { configured: false };
}

function publicError(err) {
  const msg = String(err?.message || err || '');
  if (/gemini|groq|llama|chatgpt|openai|qwen|gpt-?oss|model|api key|GEMINI|GROQ/i.test(msg)) {
    return 'Não consegui responder agora. Tente de novo em instantes.';
  }
  return stripBrandNames(msg) || 'Não consegui responder agora. Tente de novo.';
}

function isUnknownModelError(msg) {
  return /does not exist|do not have access|model_not_found|invalid_model/i.test(String(msg || ''));
}

async function chatGroqOnce({ apiKey, model, system, messages }) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model,
      temperature: 0.75,
      max_tokens: 1400,
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

async function chatGroq({ system, messages }) {
  const apiKey = groqKey();
  const tried = new Set();
  let lastErr = null;
  for (const model of GROQ_CHAT_MODELS) {
    if (tried.has(model)) continue;
    tried.add(model);
    try {
      return await chatGroqOnce({ apiKey, model, system, messages });
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
    .replace(/\bllama[\s-]*\d*(\.\d+)?[\s-]*\d*b?\b/gi, 'assistente')
    .replace(/\bchatgpt\b/gi, 'assistente')
    .replace(/\bgpt-?oss[-\s]*\d*b?\b/gi, 'assistente')
    .replace(/\bopenai\b/gi, 'assistente')
    .replace(/\bqwen[\w.-]*/gi, 'assistente')
    .replace(/\ballam[\w.-]*/gi, 'assistente');
}

async function chatWithAccountLlm({ system, messages }) {
  if (!groqKey()) {
    const err = new Error('Assistente indisponível no momento.');
    err.status = 503;
    throw err;
  }
  const text = stripBrandNames(await chatGroq({ system, messages }));
  return { text };
}

module.exports = { llmStatus, chatWithAccountLlm, stripBrandNames, publicError };
