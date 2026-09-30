/**
 * Lê comprovante com Gemini Flash. A chave fica só no servidor (Vercel / .env).
 * Variável: GEMINI_API_KEY
 */
function getGeminiApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
}

function cors(res, req) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function guessMime(base64) {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch (__) {
      return null;
    }
  }
}

function normalizeDate(s) {
  const t = String(s || '').trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = t.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{2,4})$/);
  if (!br) return t;
  let y = br[3];
  if (y.length === 2) y = `${Number(y) <= 60 ? '20' : '19'}${y}`;
  return `${br[1]}/${br[2]}/${y}`;
}

function normalizeParsed(obj) {
  if (!obj || typeof obj !== 'object') return { store: '', total: null, date: '', rawText: '' };
  const store = String(obj.store || obj.estabelecimento || '').trim();
  let total = obj.total ?? obj.valor ?? obj.value ?? null;
  if (typeof total === 'string') {
    const cleaned = String(total).trim();
    const n = cleaned.includes(',')
      ? Number(cleaned.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
      : Number(cleaned.replace(/[^\d.-]/g, ''));
    total = Number.isFinite(n) ? n : null;
  }
  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) total = null;
  const date = normalizeDate(obj.date || obj.data || '');
  const rawText = String(obj.rawText || obj.texto || obj.text || '').trim();
  return { store, total, date, rawText };
}

function modelCandidates() {
  const preferred = (process.env.GEMINI_MODEL || '').trim();
  const list = [preferred, 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  return [...new Set(list.filter(Boolean))];
}

async function callGemini({ apiKey, model, mime, base64, jsonMime }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt =
    'Leia este comprovante ou nota fiscal brasileira. Responda SOMENTE um JSON válido com as chaves:\n' +
    '{"store":"nome do estabelecimento ou string vazia","total":numero_ou_null,"date":"dd/mm/aaaa ou string vazia","rawText":"texto visível na imagem"}\n' +
    'total é o valor total a pagar em reais (número com ponto decimal). Não invente valor, data ou loja se não estiver legível.';

  const generationConfig = {
    temperature: 0.1,
    maxOutputTokens: 2048,
  };
  if (jsonMime) generationConfig.responseMimeType = 'application/json';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mime, data: base64 } },
        ],
      },
    ],
    generationConfig,
  };

  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await geminiRes.json().catch(() => ({}));
  return { geminiRes, data };
}

module.exports = async function handler(req, res) {
  cors(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  res.setHeader('Content-Type', 'application/json');

  const apiKey = getGeminiApiKey();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      provider: 'gemini-flash',
      configured: Boolean(apiKey),
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: 'Chave Gemini não configurada no servidor (GEMINI_API_KEY na Vercel).',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (_) {
      return res.status(400).json({ error: 'JSON inválido' });
    }
  }

  const base64 =
    typeof body?.imageBase64 === 'string' ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '') : '';
  if (!base64) {
    return res.status(400).json({ error: 'imageBase64 é obrigatório' });
  }

  const mime = typeof body?.mimeType === 'string' && body.mimeType.startsWith('image/') ? body.mimeType : guessMime(base64);

  try {
    let lastError = '';
    for (const model of modelCandidates()) {
      let { geminiRes, data } = await callGemini({ apiKey, model, mime, base64, jsonMime: true });
      if (!geminiRes.ok && /mime|responseMimeType/i.test(String(data?.error?.message || ''))) {
        ({ geminiRes, data } = await callGemini({ apiKey, model, mime, base64, jsonMime: false }));
      }
      if (!geminiRes.ok) {
        const msg = data?.error?.message || `Gemini HTTP ${geminiRes.status}`;
        lastError = msg;
        if (geminiRes.status === 404) continue;
        return res.status(geminiRes.status >= 400 && geminiRes.status < 600 ? geminiRes.status : 502).json({ error: msg });
      }

      const textPart = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('\n') || '';
      const parsed = normalizeParsed(parseJsonLoose(textPart));
      const text = parsed.rawText || textPart.trim();

      return res.status(200).json({
        text,
        store: parsed.store,
        total: parsed.total,
        date: parsed.date,
        source: 'gemini-flash',
        model,
      });
    }

    return res.status(502).json({ error: lastError || 'Modelo Gemini indisponível' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Erro ao chamar Gemini' });
  }
};
