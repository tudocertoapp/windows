const { createClient } = require('@supabase/supabase-js');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Servidor não configurado para cadastro público.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (_) {
      return res.status(400).json({ error: 'JSON inválido' });
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const ref = String(body.ref || body.ownerUserId || '').trim();
  const name = String(body.name || '').trim();
  if (!ref || !UUID_RE.test(ref)) {
    return res.status(400).json({ error: 'Link de cadastro inválido ou expirado.' });
  }
  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Informe seu nome.' });
  }

  let ownerOk = false;
  const { data: ownerProfile } = await supabase.from('profiles').select('id').eq('id', ref).maybeSingle();
  if (ownerProfile?.id) ownerOk = true;
  if (!ownerOk) {
    try {
      const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(ref);
      ownerOk = !authErr && !!authUser?.user?.id;
    } catch (_) {
      ownerOk = false;
    }
  }
  if (!ownerOk) {
    return res.status(400).json({ error: 'Empresa não encontrada para este link.' });
  }

  const email = String(body.email || '').trim() || null;
  const phone = String(body.phone || '').trim() || null;
  const address = String(body.address || '').trim() || null;
  const cpf = String(body.cpf || '').trim() || null;
  const birthDate = String(body.birthDate || body.birth_date || '').trim() || null;
  const linkInstagram = String(body.linkInstagram || body.link_instagram || '').trim() || null;

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: ref,
      name,
      email,
      phone,
      address,
      cpf,
      birth_date: birthDate,
      link_instagram: linkInstagram,
      nivel: 'novo_cliente',
      tipo: 'empresa',
      tags: [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('[public-register]', error.message);
    return res.status(500).json({ error: 'Não foi possível salvar o cadastro. Tente novamente.' });
  }

  return res.status(200).json({ ok: true, id: data?.id });
};
