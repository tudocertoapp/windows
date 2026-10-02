import { DEFAULT_SECTIONS_WEB, DEFAULT_SECTIONS } from './dashboardCards';
import { DEFAULT_CARDS_PER_ROW } from '../utils/inicioDesktopLayout';

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
