function groqKey() {
  return (process.env.GROQ_API_KEY || '').trim();
}

/** Llama 3.3 saiu do plano grátis da Groq (ago/2026). A chave atual só vê estes chats. */
const GROQ_CHAT_MODELS = [
  (process.env.GROQ_MODEL || '').trim(),
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
].filter(Boolean);

function groqModel() {
  return GROQ_CHAT_MODELS[0] || 'openai/gpt-oss-20b';
}

function geminiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
}

function llmStatus() {
  if (groqKey()) return { configured: true, provider: 'groq', model: groqModel() };
  if (geminiKey()) return { configured: true, provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' };
  return { configured: false, provider: null, model: null };
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
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 900,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Groq HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return String(json?.choices?.[0]?.message?.content || '').trim();
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
      if (isUnknownModelError(e?.message)) continue;
      throw e;
    }
  }
  throw lastErr || new Error('Nenhum modelo Groq disponível nesta chave.');
}

function geminiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
}

function llmStatus() {
  if (groqKey()) return { configured: true, provider: 'groq', model: groqModel() };
  if (geminiKey()) return { configured: true, provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' };
  return { configured: false, provider: null, model: null };
}

async function chatGroq({ system, messages }) {
  const apiKey = groqKey();
  const model = groqModel();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 900,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Groq HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return String(json?.choices?.[0]?.message?.content || '').trim();
}

async function chatGemini({ system, messages }) {
  const apiKey = geminiKey();
  const model = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.35, maxOutputTokens: 900 },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Gemini HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const parts = json?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

async function chatWithAccountLlm({ system, messages }) {
  if (groqKey()) {
    try {
      return { text: await chatGroq({ system, messages }), provider: 'groq' };
    } catch (e) {
      if (geminiKey()) {
        return { text: await chatGemini({ system, messages }), provider: 'gemini' };
      }
      throw e;
    }
  }
  if (geminiKey()) return { text: await chatGemini({ system, messages }), provider: 'gemini' };
  const err = new Error('Nenhuma chave de IA no servidor (GROQ_API_KEY).');
  err.status = 503;
  throw err;
}

module.exports = { llmStatus, chatWithAccountLlm };
