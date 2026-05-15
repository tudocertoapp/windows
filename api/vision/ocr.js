/**
 * Proxy server-side para Google Cloud Vision (evita CORS no navegador / Expo web).
 * Variáveis: GOOGLE_VISION_API_KEY ou EXPO_PUBLIC_GOOGLE_VISION_API_KEY
 */
function getVisionApiKey() {
  return (
    process.env.GOOGLE_VISION_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY ||
    ''
  ).trim();
}

function cors(res, req) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  cors(res, req);
  if (req.method === 'OPTIONS') return res.status(204).end();

  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = getVisionApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: 'Chave Google Vision não configurada no servidor (GOOGLE_VISION_API_KEY ou EXPO_PUBLIC_GOOGLE_VISION_API_KEY).',
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

  const base64 = typeof body?.imageBase64 === 'string' ? body.imageBase64.replace(/^data:image\/\w+;base64,/, '') : '';
  if (!base64) {
    return res.status(400).json({ error: 'imageBase64 é obrigatório' });
  }

  const languageHints = Array.isArray(body.languageHints) ? body.languageHints : ['pt'];

  try {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints },
        },
      ],
    };

    const visionRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await visionRes.json().catch(() => ({}));
    if (!visionRes.ok) {
      const msg = data?.error?.message || `Vision HTTP ${visionRes.status}`;
      return res.status(visionRes.status >= 400 && visionRes.status < 600 ? visionRes.status : 502).json({ error: msg });
    }

    const resp = data?.responses?.[0];
    const errMsg = resp?.error?.message;
    if (errMsg) return res.status(400).json({ error: errMsg });

    const full = resp?.fullTextAnnotation?.text;
    const first = resp?.textAnnotations?.[0]?.description;
    const text =
      (typeof full === 'string' && full.trim()) ||
      (typeof first === 'string' && first.trim()) ||
      '';

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Erro ao chamar Google Vision' });
  }
};
