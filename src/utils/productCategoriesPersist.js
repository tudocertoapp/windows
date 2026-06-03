import { loadCatalogoConfig, saveCatalogoConfig } from './catalogoPersist';
import { normalizeCategoriasProdutos } from './productCategories';

export async function loadProductCategories(user, products = [], services = []) {
  const cfg = await loadCatalogoConfig(user, products, services);
  return normalizeCategoriasProdutos(cfg.categoriasProdutos);
}

export async function saveProductCategories(user, categoriasProdutos, products = [], services = []) {
  const cfg = await loadCatalogoConfig(user, products, services);
  const next = {
    ...cfg,
    categoriasProdutos: normalizeCategoriasProdutos(categoriasProdutos),
  };
  return saveCatalogoConfig(user, next);
}
