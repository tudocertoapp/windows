const {
  getSupabaseAdmin,
  cors,
  validateOwnerRef,
  UUID_RE,
} = require('../_lib/supabaseAdmin');

function itemKey(tipo, id) {
  return `${tipo}:${id}`;
}

function productCategoryIds(p) {
  const data = p?.data && typeof p.data === 'object' ? p.data : {};
  return {
    categoryId: data.category_id || null,
    subcategoryId: data.subcategory_id || null,
  };
}

function resolvePublicItems(config, products, services) {
  const tipo = config?.tipo || 'ambos';
  const itens = Array.isArray(config?.itens) ? config.itens : [];
  const prodMap = new Map((products || []).map((p) => [String(p.id), p]));
  const servMap = new Map((services || []).map((s) => [String(s.id), s]));

  let rows = itens
    .filter((row) => row.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((row) => {
      const src = row.tipo === 'servico' ? servMap.get(String(row.id)) : prodMap.get(String(row.id));
      if (!src) return null;
      const cats = row.tipo === 'produto' ? productCategoryIds(src) : {};
      return {
        id: src.id,
        name: src.name,
        price: Number(src.price) || 0,
        discount: Number(src.discount) || 0,
        photoUri: src.photo_uri || src.photoUri || (Array.isArray(src.photo_uris) ? src.photo_uris[0] : null) || src.photoUris?.[0] || null,
        categoryId: cats.categoryId || null,
        subcategoryId: cats.subcategoryId || null,
        _tipo: row.tipo,
        _rowId: itemKey(row.tipo, row.id),
      };
    })
    .filter(Boolean);

  if (tipo === 'produtos') rows = rows.filter((r) => r._tipo === 'produto');
  if (tipo === 'servicos') rows = rows.filter((r) => r._tipo === 'servico');

  const max = Number(config?.maxItensVisiveis) || 0;
  if (max > 0) rows = rows.slice(0, max);
  return rows;
}

function defaultConfig() {
  return {
    tipo: 'ambos',
    layout: 'vitrine',
    lojaPublica: true,
    agendamentoOnline: true,
    agendaHoraInicio: '08:00',
    agendaHoraFim: '18:00',
    agendaIntervaloMin: 30,
    agendaDuracaoMin: 60,
    agendaDiasSemana: [1, 2, 3, 4, 5],
    agendaAntecedenciaDias: 30,
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

  const ref = String(req.query?.ref || req.query?.ownerUserId || '').trim();
  if (!ref || !UUID_RE.test(ref)) return res.status(400).json({ error: 'Link da loja inválido.' });
  if (!(await validateOwnerRef(supabase, ref))) return res.status(404).json({ error: 'Loja não encontrada.' });

  const [{ data: profile }, { data: cfgRow }, { data: products }, { data: services }] = await Promise.all([
    supabase.from('profiles').select('id,nome,empresa,foto,telefone,instagram,endereco,endereco_cidade,endereco_estado,profissao').eq('id', ref).maybeSingle(),
    supabase.from('catalogo_configs').select('config').eq('user_id', ref).maybeSingle(),
    supabase.from('products').select('id,name,price,discount,photo_uri,photo_uris,data').eq('user_id', ref),
    supabase.from('services').select('id,name,price,discount,photo_uri').eq('user_id', ref),
  ]);

  const config = { ...defaultConfig(), ...(cfgRow?.config || {}) };
  if (config.lojaPublica === false) return res.status(403).json({ error: 'Esta loja não está pública no momento.' });

  const items = resolvePublicItems(config, products || [], services || []);

  return res.status(200).json({
    ok: true,
    profile: profile || { id: ref },
    config,
    items,
  });
};
