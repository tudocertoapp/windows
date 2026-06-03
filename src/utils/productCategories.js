/** Categorias e subcategorias opcionais de produtos (loja + cadastro). */

export const DEFAULT_CATEGORIAS_PRODUTOS = {
  enabled: false,
  items: [],
};

export function newCategoryId() {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newSubcategoryId() {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSub(s) {
  if (!s?.name?.trim()) return null;
  return {
    id: s.id || newSubcategoryId(),
    name: String(s.name).trim(),
  };
}

function normalizeCategory(c) {
  if (!c?.name?.trim()) return null;
  return {
    id: c.id || newCategoryId(),
    name: String(c.name).trim(),
    subcategorias: Array.isArray(c.subcategorias)
      ? c.subcategorias.map(normalizeSub).filter(Boolean)
      : [],
  };
}

export function normalizeCategoriasProdutos(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: base.enabled === true,
    items: Array.isArray(base.items) ? base.items.map(normalizeCategory).filter(Boolean) : [],
  };
}

export function findCategory(categorias, categoryId) {
  return (categorias?.items || []).find((c) => String(c.id) === String(categoryId)) || null;
}

export function findSubcategory(categorias, categoryId, subcategoryId) {
  const cat = findCategory(categorias, categoryId);
  if (!cat) return null;
  return (cat.subcategorias || []).find((s) => String(s.id) === String(subcategoryId)) || null;
}

export function getProductCategoryLabel(categorias, categoryId, subcategoryId) {
  const cat = findCategory(categorias, categoryId);
  if (!cat) return '';
  const sub = findSubcategory(categorias, categoryId, subcategoryId);
  return sub ? `${cat.name} › ${sub.name}` : cat.name;
}

export function addCategory(categorias, name) {
  const next = normalizeCategoriasProdutos(categorias);
  const trimmed = String(name || '').trim();
  if (!trimmed) return next;
  next.items.push({ id: newCategoryId(), name: trimmed, subcategorias: [] });
  return next;
}

export function removeCategory(categorias, categoryId) {
  const next = normalizeCategoriasProdutos(categorias);
  next.items = next.items.filter((c) => String(c.id) !== String(categoryId));
  return next;
}

export function updateCategoryName(categorias, categoryId, name) {
  const next = normalizeCategoriasProdutos(categorias);
  next.items = next.items.map((c) => (
    String(c.id) === String(categoryId) ? { ...c, name: String(name || '').trim() } : c
  ));
  return normalizeCategoriasProdutos(next);
}

export function addSubcategory(categorias, categoryId, name) {
  const next = normalizeCategoriasProdutos(categorias);
  const trimmed = String(name || '').trim();
  if (!trimmed) return next;
  next.items = next.items.map((c) => {
    if (String(c.id) !== String(categoryId)) return c;
    return {
      ...c,
      subcategorias: [...(c.subcategorias || []), { id: newSubcategoryId(), name: trimmed }],
    };
  });
  return next;
}

export function removeSubcategory(categorias, categoryId, subcategoryId) {
  const next = normalizeCategoriasProdutos(categorias);
  next.items = next.items.map((c) => {
    if (String(c.id) !== String(categoryId)) return c;
    return {
      ...c,
      subcategorias: (c.subcategorias || []).filter((s) => String(s.id) !== String(subcategoryId)),
    };
  });
  return next;
}

export function updateSubcategoryName(categorias, categoryId, subcategoryId, name) {
  const next = normalizeCategoriasProdutos(categorias);
  next.items = next.items.map((c) => {
    if (String(c.id) !== String(categoryId)) return c;
    return {
      ...c,
      subcategorias: (c.subcategorias || []).map((s) => (
        String(s.id) === String(subcategoryId) ? { ...s, name: String(name || '').trim() } : s
      )),
    };
  });
  return normalizeCategoriasProdutos(next);
}
