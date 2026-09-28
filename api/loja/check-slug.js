const { getSupabaseAdmin, cors } = require('../_lib/supabaseAdmin');
const { normalizeLojaSlug } = require('../_lib/lojaSlug');
const { findOwnerBySlug } = require('../_lib/lojaPublic');

module.exports = async function handler(req, res) {
  cors(res, req, 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const raw = String(req.query?.slug || '').trim();
  const slug = normalizeLojaSlug(raw);
  if (!slug) {
    return res.status(200).json({
      available: false,
      slug: '',
      reason: 'Use 3 a 40 caracteres: letras, números e hífen.',
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Servidor não configurado.' });

  let exceptUserId = '';
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    exceptUserId = data?.user?.id || '';
  }

  const owner = await findOwnerBySlug(supabase, slug);
  const available = !owner || owner === exceptUserId;
  return res.status(200).json({
    available,
    slug,
    reason: available ? '' : 'Esse nome no link já está em uso.',
  });
};
