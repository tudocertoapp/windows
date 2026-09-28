const { normalizeLojaSlug } = require('./lojaSlug');

const PUBLIC_STORE_PLAN_IDS = [
  'pe_pro',
  'pe_business',
  'emp_medium',
  'emp_enterprise',
  'pe_teste_real',
];

const ACTIVE_PLAN_STATUSES = new Set(['ativo', 'active', 'trialing']);

async function findOwnerBySlug(supabase, slugNorm) {
  const slug = normalizeLojaSlug(slugNorm);
  if (!slug) return '';

  const { data: byCol } = await supabase
    .from('catalogo_configs')
    .select('user_id')
    .eq('loja_slug', slug)
    .maybeSingle();
  if (byCol?.user_id) return byCol.user_id;

  const { data: byJson, error: jsonErr } = await supabase
    .from('catalogo_configs')
    .select('user_id')
    .eq('config->>slugPublico', slug)
    .maybeSingle();
  if (!jsonErr && byJson?.user_id) return byJson.user_id;

  const { data: rows } = await supabase.from('catalogo_configs').select('user_id,config').limit(800);
  const hit = (rows || []).find((r) => normalizeLojaSlug(r?.config?.slugPublico) === slug);
  return hit?.user_id || '';
}

async function userCanPublishPublicStore(supabase, userId) {
  if (!userId) return false;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan,status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return true;
  if (!data?.plan) return true;
  return ACTIVE_PLAN_STATUSES.has(String(data.status || '').toLowerCase())
    && PUBLIC_STORE_PLAN_IDS.includes(data.plan);
}

module.exports = {
  PUBLIC_STORE_PLAN_IDS,
  findOwnerBySlug,
  userCanPublishPublicStore,
};
