const { getSupabaseAdmin, cors } = require('../_lib/supabaseAdmin');

function mapProfileResult(p, config) {
  if (config.lojaPublica === false) return null;
  const displayName = config.nomeLoja?.trim() || p.empresa?.trim() || p.nome?.trim() || 'Profissional';
  return {
    ownerUserId: p.id,
    nome: p.nome || '',
    empresa: p.empresa || '',
    foto: config.fotoCatalogo || p.foto || null,
    telefone: config.whatsappPedido || p.telefone || '',
    subtitulo: config.subtitulo || config.slogan || p.profissao || '',
    displayName,
  };
}

module.exports = async function handler(req, res) {
  cors(res, req, 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Servidor não configurado.' });

  const q = String(req.query?.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'Digite ao menos 2 caracteres.' });

  const pattern = `%${q.replace(/[%_\\]/g, '')}%`;

  const [byNome, byEmpresa, byProfissao] = await Promise.all([
    supabase.from('profiles').select('id,nome,empresa,foto,telefone,profissao').ilike('nome', pattern).limit(12),
    supabase.from('profiles').select('id,nome,empresa,foto,telefone,profissao').ilike('empresa', pattern).limit(12),
    supabase.from('profiles').select('id,nome,empresa,foto,telefone,profissao').ilike('profissao', pattern).limit(12),
  ]);

  const merged = new Map();
  [...(byNome.data || []), ...(byEmpresa.data || []), ...(byProfissao.data || [])].forEach((p) => {
    if (p?.id) merged.set(p.id, p);
  });

  const ids = [...merged.keys()].slice(0, 20);
  if (!ids.length) return res.status(200).json({ ok: true, results: [] });

  const { data: configs } = await supabase.from('catalogo_configs').select('user_id,config').in('user_id', ids);
  const cfgMap = new Map((configs || []).map((c) => [c.user_id, c.config || {}]));

  const results = ids
    .map((id) => mapProfileResult(merged.get(id), cfgMap.get(id) || {}))
    .filter(Boolean)
    .slice(0, 12);

  return res.status(200).json({ ok: true, results });
};
