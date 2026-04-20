import { useEffect, useRef, useCallback } from 'react';
import {
  tabRouteNameToWebPathname,
  firstPathSegment,
  isWebCadastroPathSlug,
  webPathSegmentToTabRouteName,
} from './webNavigationLinking';

const MODAL_QUERY_KEYS = ['eid', 't', 'nid', 'new', 'qt', 'q'];

const MODAL_TO_PATH_SEGMENTS = {
  calc_menu: ['menu', 'calculadora'],
  calc: ['calculadora'],
  calc_float: ['calculadora-flutuante'],
  pdv: ['pdv'],
  orcamentos: ['orcamentos'],
  os: ['ordem-servico'],
  empresa: ['empresa'],
  colaboradores: ['colaboradores'],
  aniversariantes: ['aniversariantes'],
  metas: ['metas'],
  lista: ['lista-compras'],
  scanner: ['scanner'],
  anotacoes: ['menu', 'anotacoes'],
  orcamento: ['menu', 'orcamento'],
  bancos: ['menu', 'bancos'],
  termos: ['menu', 'termos'],
  temas: ['menu', 'temas'],
  image: ['imagem'],
  assistant: ['assistente'],
  a_receber: ['menu', 'a-receber'],
  indique: ['menu', 'indique'],
  assinatura: ['menu', 'assinatura'],
  perfil: ['menu', 'perfil'],
  cadastro: ['cadastros'],
  produto: ['produto'],
  agenda: ['adicionar', 'agenda'],
  add: ['adicionar'],
  menu: ['menu'],
  fab: ['acoes'],
};

function removeModalQueryParams(search) {
  const sp = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  MODAL_QUERY_KEYS.forEach((k) => sp.delete(k));
  return sp;
}

function getModalPathSegmentsFromSnapshot(snapshot) {
  if (!snapshot?.m) return [];
  const base = MODAL_TO_PATH_SEGMENTS[snapshot.m];
  if (!base) return [];
  if (snapshot.m === 'cadastro') {
    return snapshot.sec ? ['cadastros', String(snapshot.sec)] : ['cadastros'];
  }
  if (snapshot.m === 'add' && snapshot.t) {
    return ['adicionar', String(snapshot.t)];
  }
  return base;
}

function buildSearchForSnapshot(snapshot, currentSearch) {
  const sp = removeModalQueryParams(currentSearch);
  if (!snapshot?.m) return sp.toString();
  if (snapshot.eid) sp.set('eid', String(snapshot.eid));
  if (snapshot.t) sp.set('t', String(snapshot.t));
  if (snapshot.nid) sp.set('nid', String(snapshot.nid));
  if (snapshot.newNote) sp.set('new', '1');
  if (snapshot.qt) sp.set('qt', String(snapshot.qt));
  if (snapshot.q) sp.set('q', String(snapshot.q));
  return sp.toString();
}

function buildDesiredUrl({ tabRouteName, snapshot, currentSearch }) {
  const basePath = tabRouteNameToWebPathname(tabRouteName) || '/inicio';
  const modalSegments = getModalPathSegmentsFromSnapshot(snapshot);
  const modalPath = modalSegments.length > 0 ? `/${modalSegments.join('/')}` : '';
  const search = buildSearchForSnapshot(snapshot, currentSearch);
  const fullPath = `${basePath}${modalPath}`.replace(/\/{2,}/g, '/');
  return search ? `${fullPath}?${search}` : fullPath;
}

function parseSnapshotFromPathAndSearch(pathname, search) {
  const normalized = String(pathname || '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  const root = parts[0] || 'inicio';
  const modalParts = parts.slice(1);
  const joined = modalParts.join('/');
  const sp = new URLSearchParams(String(search || '').replace(/^\?/, ''));

  if (modalParts[0] === 'cadastros') {
    return {
      m: 'cadastro',
      sec: modalParts[1] || undefined,
      eid: sp.get('eid') || undefined,
    };
  }

  const lookup = {
    menu: { m: 'menu' },
    'menu/perfil': { m: 'perfil' },
    'menu/assinatura': { m: 'assinatura' },
    'menu/indique': { m: 'indique' },
    'menu/a-receber': { m: 'a_receber' },
    'menu/temas': { m: 'temas' },
    'menu/termos': { m: 'termos' },
    'menu/bancos': { m: 'bancos' },
    'menu/orcamento': { m: 'orcamento' },
    'menu/anotacoes': {
      m: 'anotacoes',
      nid: sp.get('nid') || undefined,
      newNote: sp.get('new') === '1',
    },
    calculadora: { m: 'calc' },
    'menu/calculadora': { m: 'calc_menu' },
    'calculadora-flutuante': { m: 'calc_float' },
    pdv: { m: 'pdv' },
    orcamentos: { m: 'orcamentos' },
    'ordem-servico': { m: 'os' },
    empresa: { m: 'empresa' },
    colaboradores: { m: 'colaboradores' },
    aniversariantes: { m: 'aniversariantes' },
    metas: { m: 'metas' },
    'lista-compras': { m: 'lista' },
    scanner: { m: 'scanner' },
    imagem: { m: 'image', qt: sp.get('qt') || undefined, q: sp.get('q') || undefined },
    assistente: { m: 'assistant' },
    produto: { m: 'produto' },
    'adicionar/agenda': { m: 'agenda' },
    adicionar: { m: 'add', t: sp.get('t') || undefined },
    acoes: { m: 'fab' },
  };

  if (lookup[joined]) return lookup[joined];
  if (modalParts[0] === 'adicionar' && modalParts[1]) {
    return { m: 'add', t: modalParts[1] };
  }

  const legacyM = sp.get('m');
  if (legacyM) {
    return {
      m: legacyM,
      sec: sp.get('sec') || undefined,
      eid: sp.get('eid') || undefined,
      t: sp.get('t') || undefined,
      nid: sp.get('nid') || undefined,
      newNote: sp.get('new') === '1',
      qt: sp.get('qt') || undefined,
      q: sp.get('q') || undefined,
    };
  }

  if (isWebCadastroPathSlug(root)) {
    return {
      m: 'cadastro',
      sec: root,
      eid: sp.get('eid') || undefined,
    };
  }

  return null;
}

/**
 * Sincroniza pathname + query com histórico do navegador:
 * - Tabs: `/inicio`, `/dinheiro`, `/agenda`, ...
 * - Modais: `/inicio/menu/perfil`, `/agenda/adicionar/agenda`, ...
 */
export function useWebModalUrlSync({
  isWeb,
  tabRouteName,
  getModalSnapshot,
  applyModalSnapshot,
  onNavigateToTab,
}) {
  const hydratedRef = useRef(false);
  const ignoreNextUrlEffectRef = useRef(false);
  const initialCommitRef = useRef(false);

  const applyFromLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const seg = firstPathSegment(window.location.pathname || '/');
    const tabName = webPathSegmentToTabRouteName(seg) || 'Início';
    onNavigateToTab?.(tabName);
    const snapshot = parseSnapshotFromPathAndSearch(window.location.pathname, window.location.search);
    applyModalSnapshot(snapshot);
  }, [applyModalSnapshot, onNavigateToTab]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined' || hydratedRef.current) return undefined;
    hydratedRef.current = true;
    ignoreNextUrlEffectRef.current = true;
    applyFromLocation();
    return undefined;
  }, [isWeb, applyFromLocation]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;
    const onPop = () => {
      ignoreNextUrlEffectRef.current = true;
      applyFromLocation();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isWeb, applyFromLocation]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return undefined;
    if (ignoreNextUrlEffectRef.current) {
      ignoreNextUrlEffectRef.current = false;
      return undefined;
    }

    const snapshot = getModalSnapshot();
    const desired = buildDesiredUrl({
      tabRouteName,
      snapshot,
      currentSearch: window.location.search || '',
    });
    const current = `${window.location.pathname}${window.location.search || ''}`;
    if (desired === current) {
      initialCommitRef.current = true;
      return undefined;
    }

    if (!initialCommitRef.current) {
      window.history.replaceState(window.history.state, '', desired);
      initialCommitRef.current = true;
      return undefined;
    }

    window.history.pushState(window.history.state, '', desired);
    return undefined;
  }, [isWeb, tabRouteName, getModalSnapshot]);
}
