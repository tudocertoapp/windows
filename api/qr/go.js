const { getSupabaseAdmin } = require('../_lib/supabaseAdmin');

function padCode(raw) {
  const s = String(raw || '').replace(/\D/g, '');
  if (!s) return '';
  return s.padStart(4, '0').slice(-4);
}

function safeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch (_) {
    return '';
  }
}

function html(title, body) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center">${body}</body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET,HEAD');
    return res.status(405).end();
  }

  const fromQuery = padCode(req.query?.code);
  const fromPath = padCode(String(req.url || '').split('?')[0].match(/\/q\/(\d{1,4})/)?.[1]);
  const code = fromQuery || fromPath;
  if (!code || code.length !== 4) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).end(html('QR', 'Número do QR inválido.'));
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).end(html('QR', 'Servidor do QR não configurado.'));
  }

  const { data, error } = await supabase
    .from('dynamic_qrcodes')
    .select('target_url')
    .eq('code', code)
    .maybeSingle();

  const dest = safeUrl(data?.target_url);
  if (error || !dest) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).end(html('QR', `Não achei o QR ${code}.`));
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', dest);
  return res.status(302).end();
};
