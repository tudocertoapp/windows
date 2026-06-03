const { createClient } = require('@supabase/supabase-js');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function cors(res, req, methods = 'GET,POST,OPTIONS') {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function validateOwnerRef(supabase, ref) {
  if (!ref || !UUID_RE.test(ref)) return false;
  const { data: ownerProfile } = await supabase.from('profiles').select('id').eq('id', ref).maybeSingle();
  if (ownerProfile?.id) return true;
  try {
    const { data: authUser, error } = await supabase.auth.admin.getUserById(ref);
    return !error && !!authUser?.user?.id;
  } catch (_) {
    return false;
  }
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (_) {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : {};
}

module.exports = {
  UUID_RE,
  getSupabaseAdmin,
  cors,
  validateOwnerRef,
  parseBody,
};
