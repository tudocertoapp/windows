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

function firstPhoto(src) {
  if (!src) return null;
  const candidates = [
    src.photo_uri,
    src.photoUri,
    Array.isArray(src.photos) ? src.photos[0] : null,
    Array.isArray(src.photo_uris) ? src.photo_uris[0] : null,
    Array.isArray(src.photoUris) ? src.photoUris[0] : null,
  ];
  for (const uri of candidates) {
    if (typeof uri !== 'string' || !uri.trim()) continue;
    const u = uri.trim();
    if (
      u.startsWith('blob:')
      || u.startsWith('file:')
      || u.startsWith('data:')
      || u.startsWith('content:')
      || u.startsWith('ph:')
    ) continue;
    return u;
  }
  return null;
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
        photoUri: firstPhoto(src),
        categoryId: cats.categoryId || null,
        subcategoryId: cats.subcategoryId || null,
        _tipo: row.tipo,
        _rowId: itemKey(row.tipo, row.id),
      };
    })
    .filter(Boolean);

  if (tipo === 'produtos') rows = rows.filter((r) => r._tipo === 'produto');
  if (tipo === 'servicos') rows = rows.filter((r) => r._tipo === 'servico');

  if (!rows.length) {
    const pushProduct = (src) => {
      const cats = productCategoryIds(src);
      rows.push({
        id: src.id,
        name: src.name,
        price: Number(src.price) || 0,
        discount: Number(src.discount) || 0,
        photoUri: firstPhoto(src),
        categoryId: cats.categoryId || null,
        subcategoryId: cats.subcategoryId || null,
        _tipo: 'produto',
        _rowId: itemKey('produto', src.id),
      });
    };
    const pushService = (src) => {
      rows.push({
        id: src.id,
        name: src.name,
        price: Number(src.price) || 0,
        discount: Number(src.discount) || 0,
        photoUri: firstPhoto(src),
        categoryId: null,
        subcategoryId: null,
        _tipo: 'servico',
        _rowId: itemKey('servico', src.id),
      });
    };
    if (tipo !== 'servicos') (products || []).forEach(pushProduct);
    if (tipo !== 'produtos') (services || []).forEach(pushService);
  }

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
  res.setHeader('Cache-Control', 'no-store');
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Servidor não configurado.' });

  const ref = String(req.query?.ref || req.query?.ownerUserId || '').trim();
  if (!ref || !UUID_RE.test(ref)) return res.status(400).json({ error: 'Link da loja inválido.' });
  if (!(await validateOwnerRef(supabase, ref))) return res.status(404).json({ error: 'Loja não encontrada.' });

  const [{ data: profileRow }, { data: cfgRow }, { data: products }, { data: services }] = await Promise.all([
    supabase.from('profiles').select('id,nome,name,empresa,foto,phone,instagram_url,profissao').eq('id', ref).maybeSingle(),
    supabase.from('catalogo_configs').select('config').eq('user_id', ref).maybeSingle(),
    supabase.from('products').select('id,name,price,discount,photo_uri,photos,data').eq('user_id', ref),
    supabase.from('services').select('id,name,price,discount,photo_uri').eq('user_id', ref),
  ]);

  const profile = profileRow
    ? {
        ...profileRow,
        nome: profileRow.nome || profileRow.name || null,
        telefone: profileRow.phone || null,
        instagram: profileRow.instagram_url || null,
      }
    : { id: ref };

  const config = { ...defaultConfig(), ...(cfgRow?.config || {}) };
  if (!cfgRow?.config) {
    const nome = profile.empresa || profile.nome;
    if (nome) {
      config.titulo = nome;
      config.nomeLoja = nome;
    }
  }
  if (config.lojaPublica === false) return res.status(403).json({ error: 'Esta loja não está pública no momento.' });

  const items = resolvePublicItems(config, products || [], services || []);

  return res.status(200).json({
    ok: true,
    profile: profile || { id: ref },
    config,
    items,
  });
};
