const {
  getSupabaseAdmin,
  cors,
  parseBody,
} = require('../_lib/supabaseAdmin');
const { normalizeLojaSlug } = require('../_lib/lojaSlug');
const { findOwnerBySlug, userCanPublishPublicStore } = require('../_lib/lojaPublic');

function isLocalImageUri(uri) {
  if (!uri || typeof uri !== 'string') return false;
  const u = uri.trim();
  return (
    u.startsWith('file:')
    || u.startsWith('blob:')
    || u.startsWith('content:')
    || u.startsWith('ph:')
    || u.startsWith('data:')
    || u.startsWith('http://localhost')
    || u.startsWith('http://127.0.0.1')
  );
}

function cleanImage(uri) {
  if (!uri || typeof uri !== 'string') return null;
  return isLocalImageUri(uri) ? null : uri;
}

function sanitizeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const config = { ...raw };
  config.fotoCatalogo = cleanImage(config.fotoCatalogo);
  config.fotoCatalogoPreview = cleanImage(config.fotoCatalogoPreview);
  config.fotoFundo = cleanImage(config.fotoFundo);
  if (!Array.isArray(config.itens)) config.itens = [];
  config.itens = config.itens
    .filter((row) => row && row.id != null && row.tipo)
    .map((row, index) => ({
      id: String(row.id),
      tipo: row.tipo === 'servico' ? 'servico' : 'produto',
      visible: row.visible !== false,
      order: typeof row.order === 'number' ? row.order : index,
    }));
  return config;
}

module.exports = async function handler(req, res) {
  cors(res, req, 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Servidor não configurado.' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Faça login para salvar o catálogo.' });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const userId = authData?.user?.id;
  if (authError || !userId) return res.status(401).json({ error: 'Sessão inválida. Entre novamente.' });

  const body = parseBody(req);
  const config = sanitizeConfig(body?.config);
  if (!config) return res.status(400).json({ error: 'Configuração do catálogo inválida.' });

  const desiredSlug = normalizeLojaSlug(config.slugPublico);
  config.slugPublico = desiredSlug;
  let warning = null;
  let lojaSlug = desiredSlug || null;

  let existing = null;
  {
    const withSlug = await supabase
      .from('catalogo_configs')
      .select('loja_slug,config')
      .eq('user_id', userId)
      .maybeSingle();
    if (!withSlug.error) existing = withSlug.data;
    else {
      const onlyCfg = await supabase
        .from('catalogo_configs')
        .select('config')
        .eq('user_id', userId)
        .maybeSingle();
      existing = onlyCfg.data;
    }
  }

  if (desiredSlug) {
    const canPublish = await userCanPublishPublicStore(supabase, userId);
    const owner = canPublish ? await findOwnerBySlug(supabase, desiredSlug) : null;
    if (!canPublish) {
      warning = 'O apelido do link é do plano Pro empresa. Cores e layout foram salvos na sua conta.';
      lojaSlug = existing?.loja_slug || null;
      config.slugPublico = normalizeLojaSlug(existing?.config?.slugPublico) || '';
    } else if (owner && owner !== userId) {
      warning = 'Esse nome no link já está em uso. Cores e layout foram salvos na sua conta.';
      lojaSlug = existing?.loja_slug || null;
      config.slugPublico = normalizeLojaSlug(existing?.config?.slugPublico) || '';
    }
  }

  const payload = JSON.stringify(config);
  if (payload.length > 1500000) {
    return res.status(413).json({ error: 'O catálogo está grande demais. Use imagens enviadas para a nuvem, sem arquivo local.' });
  }

  const now = new Date().toISOString();
  config.updatedAt = now;
  const row = {
    user_id: userId,
    config,
    updated_at: now,
    loja_slug: lojaSlug,
  };
  let { error } = await supabase.from('catalogo_configs').upsert(row, { onConflict: 'user_id' });
  if (error) {
    const fallback = { user_id: userId, config, updated_at: now };
    const retry = await supabase.from('catalogo_configs').upsert(fallback, { onConflict: 'user_id' });
    error = retry.error;
  }

  if (error) {
    return res.status(500).json({ error: error.message || 'Não foi possível salvar o catálogo.' });
  }

  return res.status(200).json({ ok: true, config, warning });
};
