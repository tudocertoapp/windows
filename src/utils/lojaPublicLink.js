import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getApiOrigin } from '../lib/subscription';
import { openWhatsAppShareText } from './clientRegistrationLink';

export const LOJA_PUBLIC_PATH = '/loja';
export const LOJA_DEFAULT_HOST = 'tudocerto-web.vercel.app';
const DEFAULT_SITE = `https://${LOJA_DEFAULT_HOST}`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RESERVED = new Set([
  'api', 'loja', 'inicio', 'dinheiro', 'agenda', 'whatsapp', 'meus-gastos',
  'clientes', 'produtos', 'servicos', 'tarefas', 'boletos', 'fornecedores',
  'cadastro', 'cadastro-cliente', 'sucesso', 'cancelado', 'login', 'catalogo',
  'admin', 'app', 'www', 'static', 'assets', 'index', 'home',
  'menu', 'pdv', 'orcamentos', 'orcamento', 'ordem-servico', 'empresa',
  'colaboradores', 'aniversariantes', 'metas', 'lista-compras', 'scanner',
  'calculadora', 'calculadora-flutuante', 'adicionar', 'acoes', 'imagem',
  'assistente', 'indique', 'assinatura', 'perfil', 'cadastros', 'produto',
  'bancos', 'termos', 'privacidade', 'temas', 'anotacoes', 'a-receber',
  'favicon', 'robots', 'sitemap',
]);

export function getLojaPublicBaseUrl() {
  return getApiOrigin() || DEFAULT_SITE;
}

export function getLojaVercelOrigin() {
  return getLojaPublicBaseUrl().replace(/\/$/, '');
}

/** Apelido na raiz. Ex.: ballcher → tudocerto-web.vercel.app/ballcher */
export function normalizeLojaSlug(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/^https?:\/\//i, '');
  s = s.replace(/^[^/]*tudocerto-web\.vercel\.app/i, '');
  s = s.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
  const parts = s.split('/').filter(Boolean);
  if (parts[0] === 'loja') s = parts[1] || '';
  else s = parts[0] || '';
  s = s.replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (s.length < 3 || s.length > 40) return '';
  if (SLUG_RESERVED.has(s)) return '';
  if (UUID_RE.test(s)) return '';
  return s;
}

/** @deprecated use normalizeLojaSlug — domínio próprio não é mais o link principal */
export function normalizeLojaDomain(raw) {
  return normalizeLojaSlug(raw);
}

export function getLojaSlug(config) {
  return normalizeLojaSlug(config?.slugPublico);
}

export function getPublicLojaRoute() {
  if (typeof window === 'undefined') return null;
  const path = (window.location.pathname || '').replace(/\/$/, '') || '/';
  const refRaw = new URLSearchParams(window.location.search).get('ref') || '';
  const ownerUserId = UUID_RE.test(refRaw) ? refRaw : '';
  const parts = path.split('/').filter(Boolean);
  const first = parts[0] ? decodeURIComponent(parts[0]) : '';
  const firstLower = first.toLowerCase();

  if (firstLower === 'loja') {
    const slugPart = parts[1] ? decodeURIComponent(parts[1]) : '';
    if (!slugPart && !ownerUserId) return null;
    return { ownerUserId, slug: slugPart };
  }

  if (parts.length === 1 && !SLUG_RESERVED.has(firstLower)) {
    const slug = normalizeLojaSlug(first);
    if (slug) return { ownerUserId, slug };
  }

  return null;
}

export function buildLojaPublicUrl(ownerUserId, config) {
  const origin = getLojaVercelOrigin();
  const slug = getLojaSlug(config);
  if (slug) return `${origin}/${encodeURIComponent(slug)}`;
  if (!ownerUserId) return origin;
  return `${origin}${LOJA_PUBLIC_PATH}?ref=${encodeURIComponent(String(ownerUserId))}`;
}

export function buildLojaVercelUrl(ownerUserId, config) {
  return buildLojaPublicUrl(ownerUserId, config);
}

export function parseLojaRefFromInput(input) {
  const parsed = parseLojaPublicInput(input);
  return parsed.ref || '';
}

export function parseLojaPublicInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ref: '', slug: '' };
  if (UUID_RE.test(raw)) return { ref: raw, slug: '' };
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw.replace(/^\/+/, '')}`);
    const ref = u.searchParams.get('ref') || '';
    if (UUID_RE.test(ref)) return { ref, slug: '' };
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0]?.toLowerCase() === 'loja' && parts[1]) {
      const next = decodeURIComponent(parts[1]);
      if (UUID_RE.test(next)) return { ref: next, slug: '' };
      return { ref: '', slug: normalizeLojaSlug(next) };
    }
    if (parts.length === 1) {
      const slug = normalizeLojaSlug(decodeURIComponent(parts[0]));
      if (slug) return { ref: '', slug };
    }
  } catch (_) {}
  const slug = normalizeLojaSlug(raw);
  return { ref: '', slug };
}

export function getLojaPublicWhatsAppMessage(url, lojaNome) {
  const nome = lojaNome?.trim() || 'nossa loja';
  return `Olá! Conheça ${nome}, escolha produtos e serviços e agende online: ${url}`;
}

export async function copyLojaPublicLink(ownerUserId, lojaNome, config) {
  const url = buildLojaPublicUrl(ownerUserId, config);
  try {
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copiado', 'O link da sua loja foi copiado. Compartilhe com seus clientes!');
  } catch (_) {
    Alert.alert('Erro', 'Não foi possível copiar o link.');
  }
  return url;
}

export async function shareLojaPublicLink(ownerUserId, lojaNome, config) {
  const url = buildLojaPublicUrl(ownerUserId, config);
  const message = getLojaPublicWhatsAppMessage(url, lojaNome);
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: lojaNome || 'Meu Catálogo', text: message, url });
      return url;
    }
    await Share.share({ message, title: 'Link da loja' });
  } catch (_) {
    openWhatsAppShareText(message);
  }
  return url;
}
