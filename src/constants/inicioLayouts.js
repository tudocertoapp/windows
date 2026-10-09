import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SECTIONS_WEB, DEFAULT_SECTIONS } from './dashboardCards';
import { DEFAULT_CARDS_PER_ROW } from '../utils/inicioDesktopLayout';
import { getLayoutStorageKey } from '../utils/platformLayout';

export const SAVED_LAYOUT_KEY = '@tudocerto_inicio_saved_layout';
export const FAVORITE_LAYOUT_KEY = '@tudocerto_inicio_favorite_layout';
export const SECTIONS_ORDER_KEY = '@tudocerto_dashboard_order';
export const DESKTOP_WEIGHTS_KEY = '@tudocerto_inicio_desktop_weights';
export const COMPACT_BUTTONS_KEY = '@tudocerto_inicio_compact_buttons';

const layoutListeners = new Set();

export function subscribeInicioLayout(fn) {
  layoutListeners.add(fn);
  return () => layoutListeners.delete(fn);
}

export function notifyInicioLayout(layout, meta) {
  layoutListeners.forEach((fn) => {
    try { fn(layout, meta || {}); } catch (_) {}
  });
}

export function cloneInicioLayout(layout) {
  return captureInicioLayout(layout || {});
}

export async function persistInicioLayoutParts(keys, snap) {
  if (!keys || !snap) return;
  const toSave = (Array.isArray(snap.order) ? snap.order : []).filter((id) => id !== 'tarefas');
  const payload = [
    [keys.sections, JSON.stringify(toSave.length ? toSave : snap.order || [])],
    [keys.weights, JSON.stringify({
      weights: snap.weights || {},
      heights: snap.heights || {},
      cols: snap.cols,
      rowCols: snap.rowCols || {},
      rowSpans: snap.rowSpans || {},
      spanSide: snap.spanSide || {},
    })],
    [keys.compact, snap.compactButtons ? '1' : '0'],
    [keys.saved, JSON.stringify(snap)],
  ];
  await AsyncStorage.multiSet(payload);
}

export async function persistInicioFavorite(favoriteKey, snap) {
  if (!favoriteKey || !snap) return;
  await AsyncStorage.setItem(favoriteKey, JSON.stringify(snap));
}

export function getInicioLayoutStorageKeys() {
  return {
    sections: getLayoutStorageKey(SECTIONS_ORDER_KEY),
    weights: getLayoutStorageKey(DESKTOP_WEIGHTS_KEY),
    compact: getLayoutStorageKey(COMPACT_BUTTONS_KEY),
    saved: getLayoutStorageKey(SAVED_LAYOUT_KEY),
    favorite: getLayoutStorageKey(FAVORITE_LAYOUT_KEY),
  };
}

export async function commitInicioLayoutToAccount(layout, { updateProfile, asFavorite = false } = {}) {
  const keys = getInicioLayoutStorageKeys();
  if (asFavorite) {
    await persistInicioFavorite(keys.favorite, layout);
    await updateProfile?.({ inicio_layout_favorite: layout }).catch(() => {});
    notifyInicioLayout(layout, { favorite: true });
    return;
  }
  await persistInicioLayoutParts(keys, layout);
  await updateProfile?.({ inicio_layout: layout }).catch(() => {});
  notifyInicioLayout(layout, { committed: true });
}

export function emptyLayoutExtras() {
  return {
    weights: {},
    heights: {},
    cols: DEFAULT_CARDS_PER_ROW,
    rowCols: {},
    rowSpans: {},
    spanSide: {},
  };
}

export function captureInicioLayout({
  order,
  weights,
  heights,
  cols,
  rowCols,
  rowSpans,
  spanSide,
  compactButtons,
}) {
  return {
    order: Array.isArray(order) ? [...order] : [],
    weights: { ...(weights || {}) },
    heights: { ...(heights || {}) },
    cols: Number(cols) || DEFAULT_CARDS_PER_ROW,
    rowCols: { ...(rowCols || {}) },
    rowSpans: { ...(rowSpans || {}) },
    spanSide: { ...(spanSide || {}) },
    compactButtons: !!compactButtons,
  };
}

/** 5 layouts prontos do Início (web). */
export const INICIO_READY_LAYOUTS = [
  {
    id: 'padrao',
    name: 'Padrão',
    desc: 'Três cards por linha, ordem usual.',
    layout: {
      order: [...DEFAULT_SECTIONS_WEB],
      ...emptyLayoutExtras(),
      compactButtons: false,
    },
  },
  {
    id: 'agenda',
    name: 'Agenda em destaque',
    desc: 'Agenda alta à esquerda; tarefas e eventos ao lado.',
    layout: {
      order: ['agenda', 'proximos', 'agendamentos', 'proximasfaturas', 'quote', 'anotacoes', 'listacompras', 'aniversariantes'],
      ...emptyLayoutExtras(),
      cols: 3,
      rowSpans: { agenda: 2 },
      spanSide: { agenda: 'left' },
      compactButtons: false,
    },
  },
  {
    id: 'compacto',
    name: 'Compacto',
    desc: 'Quatro cards por linha para ver mais de uma vez.',
    layout: {
      order: [...DEFAULT_SECTIONS_WEB],
      ...emptyLayoutExtras(),
      cols: 4,
      compactButtons: false,
    },
  },
  {
    id: 'foco',
    name: 'Foco no dia',
    desc: 'Tarefas, agenda, frase e faturas.',
    layout: {
      order: ['proximos', 'agenda', 'quote', 'proximasfaturas', 'agendamentos'],
      ...emptyLayoutExtras(),
      cols: 2,
      rowSpans: { agenda: 2 },
      compactButtons: false,
    },
  },
  {
    id: 'botoes',
    name: 'Só botões',
    desc: 'Ícones que abrem cada card em tela cheia.',
    layout: {
      order: [...DEFAULT_SECTIONS],
      ...emptyLayoutExtras(),
      cols: 4,
      compactButtons: true,
    },
  },
];
