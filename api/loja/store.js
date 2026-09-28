const {
  getSupabaseAdmin,
  cors,
  validateOwnerRef,
  UUID_RE,
} = require('../_lib/supabaseAdmin');
const { normalizeLojaSlug } = require('../_lib/lojaSlug');
const { findOwnerBySlug } = require('../_lib/lojaPublic');

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

function isRemotePhoto(uri) {
  if (typeof uri !== 'string' || !uri.trim()) return false;
  const u = uri.trim();
  if (
    u.startsWith('blob:')
    || u.startsWith('file:')
    || u.startsWith('data:')
    || u.startsWith('content:')
    || u.startsWith('ph:')
  ) return false;
  return true;
}

function photoList(src) {
  if (!src) return [];
  const data = src.data && typeof src.data === 'object' ? src.data : {};
  const lists = [data.photo_uris, data.photoUris, src.photo_uris, src.photoUris, src.photos];
  const singles = [data.photo_uri, src.photoUri, src.photo_uri];
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    const u = typeof raw === 'string' ? raw.trim() : (raw && raw.uri ? String(raw.uri).trim() : '');
    if (!isRemotePhoto(u) || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  lists.forEach((list) => {
    if (Array.isArray(list)) list.forEach(push);
  });
  singles.forEach(push);
  return out;
}

function syncPublicItens(config, products, services) {
  const tipo = config?.tipo || 'ambos';
  const defaults = [];
  let order = 0;
  if (tipo === 'produtos' || tipo === 'ambos') {
    (products || []).forEach((p) => {
      defaults.push({ id: String(p.id), tipo: 'produto', visible: true, order: order++ });
    });
  }
  if (tipo === 'servicos' || tipo === 'ambos') {
    (services || []).forEach((s) => {
      defaults.push({ id: String(s.id), tipo: 'servico', visible: true, order: order++ });
    });
  }
  const map = new Map((config?.itens || []).map((i) => [`${i.tipo}:${String(i.id)}`, i]));
  return defaults
    .map((d, idx) => {
      const prev = map.get(`${d.tipo}:${d.id}`);
      return prev
        ? { ...d, visible: prev.visible !== false, order: typeof prev.order === 'number' ? prev.order : idx }
        : { ...d, order: idx };
    })
    .sort((a, b) => a.order - b.order);
}

function resolvePublicItems(config, products, services) {
  const tipo = config?.tipo || 'ambos';
  const itens = syncPublicItens(config, products, services);
  const prodMap = new Map((products || []).map((p) => [String(p.id), p]));
  const servMap = new Map((services || []).map((s) => [String(s.id), s]));

  let rows = itens
    .filter((row) => row.visible !== false)
    .map((row) => {
      const src = row.tipo === 'servico' ? servMap.get(String(row.id)) : prodMap.get(String(row.id));
      if (!src) return null;
      const cats = row.tipo === 'produto' ? productCategoryIds(src) : {};
      const photos = photoList(src);
      return {
        id: src.id,
        name: src.name,
        price: Number(src.price) || 0,
        discount: Number(src.discount) || 0,
        photoUri: photos[0] || null,
        photoUris: photos,
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

async function loadUserRows(supabase, table, userId, selects) {
  for (const sel of selects) {
    const { data, error } = await supabase.from(table).select(sel).eq('user_id', userId);
    if (!error && Array.isArray(data)) return data;
  }
  return [];
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

  const slug = String(req.query?.slug || '').trim();
  let ref = String(req.query?.ref || req.query?.ownerUserId || '').trim();
  const slugNorm = normalizeLojaSlug(slug);

  if (slugNorm) {
    const bySlug = await findOwnerBySlug(supabase, slugNorm);
    if (bySlug) ref = bySlug;
  } else if (!ref || !UUID_RE.test(ref)) {
    return res.status(400).json({ error: 'Link da loja inválido.' });
  }

  if (!ref || !UUID_RE.test(ref)) return res.status(400).json({ error: 'Link da loja inválido.' });
  if (!(await validateOwnerRef(supabase, ref))) return res.status(404).json({ error: 'Loja não encontrada.' });

  const [{ data: profileRow }, { data: cfgRow }, products, services] = await Promise.all([
    supabase.from('profiles').select('id,nome,name,empresa,foto,phone,instagram_url,profissao').eq('id', ref).maybeSingle(),
    supabase.from('catalogo_configs').select('config').eq('user_id', ref).maybeSingle(),
    loadUserRows(supabase, 'products', ref, [
      'id,name,price,discount,photo_uri,data',
      'id,name,price,discount,photo_uri',
      '*',
    ]),
    loadUserRows(supabase, 'services', ref, [
      'id,name,price,discount,photo_uri',
      '*',
    ]),
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

  const productRows = products || [];
  const serviceRows = services || [];
  const items = resolvePublicItems(config, productRows, serviceRows);

  return res.status(200).json({
    ok: true,
    profile: profile || { id: ref },
    config,
    items,
    products: productRows.map((p) => {
      const photos = photoList(p);
      const cats = productCategoryIds(p);
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        discount: Number(p.discount) || 0,
        photoUri: photos[0] || null,
        photoUris: photos,
        categoryId: cats.categoryId,
        subcategoryId: cats.subcategoryId,
      };
    }),
    services: serviceRows.map((s) => {
      const photos = photoList(s);
      return {
        id: s.id,
        name: s.name,
        price: Number(s.price) || 0,
        discount: Number(s.discount) || 0,
        photoUri: photos[0] || null,
        photoUris: photos,
      };
    }),
  });
};
