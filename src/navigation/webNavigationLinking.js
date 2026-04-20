import * as Linking from 'expo-linking';
import {
  getStateFromPath as getStateFromPathDefault,
  getPathFromState as getPathFromStateDefault,
} from '@react-navigation/native';

/** Slugs na URL (sem barra inicial) — tabs principais. */
export const WEB_TAB_PATH_BY_ROUTE = {
  Início: 'inicio',
  Dinheiro: 'dinheiro',
  Agenda: 'agenda',
  MeusGastos: 'meus-gastos',
  WhatsApp: 'whatsapp',
};

/** Secções do ecrã de cadastros (paths curtos: /produtos, /clientes, …). */
export const WEB_CADASTRO_SECTION_SLUGS = [
  'clientes',
  'produtos',
  'servicos',
  'tarefas',
  'boletos',
  'fornecedores',
];

const TAB_SLUG_SET = new Set(
  Object.values(WEB_TAB_PATH_BY_ROUTE).filter((s) => s && s.length > 0)
);

const WEB_PATH_TO_TAB = {
  '': 'Início',
  inicio: 'Início',
  dinheiro: 'Dinheiro',
  agenda: 'Agenda',
  'meus-gastos': 'MeusGastos',
  whatsapp: 'WhatsApp',
};

/**
 * 1.º segmento (path da tab nas URLs) → route name, ou `null` se for cadastro/inválido.
 * `''` ou 'inicio' → Início.
 */
export function webPathSegmentToTabRouteName(firstSegment) {
  const s = (firstSegment === undefined || firstSegment === null) ? '' : String(firstSegment);
  if (s === '' || s === 'inicio') {
    return 'Início';
  }
  if (isWebCadastroPathSlug(s)) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(WEB_PATH_TO_TAB, s)) {
    return WEB_PATH_TO_TAB[s];
  }
  return null;
}

export function isWebMainTabPathSegment(firstSegment) {
  if (isWebCadastroPathSlug(firstSegment)) {
    return false;
  }
  return webPathSegmentToTabRouteName(firstSegment) != null;
}

export function isWebCadastroPathSlug(slug) {
  return !!slug && WEB_CADASTRO_SECTION_SLUGS.includes(slug) && !TAB_SLUG_SET.has(slug);
}

/** Primeiro segmento do pathname, sem barra (ex.: `/produtos` → `produtos`). */
export function firstPathSegment(pathname) {
  const p = String(pathname || '').split('?')[0].replace(/^\/+/, '');
  const seg = p.split('/')[0] || '';
  return seg;
}

export function tabRouteNameToWebPathname(routeName) {
  const slug = WEB_TAB_PATH_BY_ROUTE[routeName];
  if (slug === undefined) return '/';
  return slug ? `/${slug}` : '/';
}

/**
 * Linking só para web: cada tab com path próprio; cadastro usa `/clientes`, `/produtos`, etc.
 * Tab "Adicionar" não entra no mapa.
 *
 * `cadastroUrlRef.current` — quando o modal de cadastro deve “donar” o path:
 * `{ section: 'produtos', eid?: string } | null` (null se outro overlay tem prioridade na URL).
 */
export function createAppWebLinking({ isWeb, showEmpresaFeatures, cadastroUrlRef }) {
  if (!isWeb) return undefined;

  const screens = {
    Início: 'inicio',
    Dinheiro: 'dinheiro',
    Agenda: 'agenda',
    MeusGastos: 'meus-gastos',
  };
  if (showEmpresaFeatures) screens.WhatsApp = 'whatsapp';

  return {
    prefixes: [Linking.createURL('/'), typeof window !== 'undefined' ? `${window.location.origin}/` : ''],
    config: { screens },
    getPathFromState(state, options) {
      const cad = cadastroUrlRef?.current;
      if (cad?.section && isWebCadastroPathSlug(cad.section)) {
        let path = `/${cad.section}`;
        if (cad.eid) path += `?eid=${encodeURIComponent(String(cad.eid))}`;
        return path;
      }
      return getPathFromStateDefault(state, options);
    },
    getStateFromPath(path, options) {
      const raw = String(path || '');
      const pathOnly = raw.split('?')[0] || '/';
      const normalized = pathOnly.replace(/^\/+/, '') || '';
      const first = normalized.split('/')[0] || '';
      const second = normalized.split('/')[1] || '';

      // Raiz "/" ou "" → mesma tab que /inicio (bookmarks e servidor estático)
      if (!first) {
        return getStateFromPathDefault('/inicio', options);
      }

      // URLs aninhadas de modal/cadastro (ex.: /inicio/menu/perfil, /agenda/cadastros/clientes)
      if (isWebCadastroPathSlug(second)) {
        return getStateFromPathDefault('/inicio', options);
      }
      if (webPathSegmentToTabRouteName(first)) {
        if (first === 'whatsapp' && !showEmpresaFeatures) {
          return getStateFromPathDefault('/inicio', options);
        }
        return getStateFromPathDefault(`/${first}`, options);
      }

      if (first && isWebCadastroPathSlug(first)) {
        return getStateFromPathDefault('/inicio', options);
      }
      if (normalized === 'whatsapp' && !showEmpresaFeatures) {
        return getStateFromPathDefault('/inicio', options);
      }
      return getStateFromPathDefault(pathOnly, options);
    },
  };
}
