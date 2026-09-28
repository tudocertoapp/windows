import { formatCurrency } from './format';
import { normalizeCategoriasProdutos } from './productCategories';

export const CATALOGO_CONFIG_KEY = '@tudocerto_catalogo_config';

export const CATALOGO_TEMAS = [
  { id: 'moderno', label: 'Moderno', cor: '#6366f1' },
  { id: 'minimal', label: 'Minimal', cor: '#0f172a' },
  { id: 'bold', label: 'Vibrante', cor: '#ec4899' },
  { id: 'nature', label: 'Natural', cor: '#10b981' },
  { id: 'sunset', label: 'Sunset', cor: '#f59e0b' },
];

export const TEMAS_GRADIENTE = [
  { id: 'aurora', label: 'Aurora', cores: ['#6366f1', '#a855f7', '#ec4899'] },
  { id: 'sunset', label: 'Pôr do sol', cores: ['#f59e0b', '#ef4444', '#ec4899'] },
  { id: 'oceano', label: 'Oceano', cores: ['#06b6d4', '#2563eb'] },
  { id: 'floresta', label: 'Floresta', cores: ['#34d399', '#0f766e'] },
  { id: 'noite-azul', label: 'Noite azul', cores: ['#1e3a8a', '#7c3aed'] },
];

export const TEMAS_ESCUROS = [
  { id: 'noite', label: 'Noite', corPrincipal: '#818cf8', corFundo: '#0f172a', corTexto: '#f8fafc' },
  { id: 'carvao', label: 'Carvão', corPrincipal: '#e2e8f0', corFundo: '#111827', corTexto: '#f1f5f9' },
  { id: 'vinho', label: 'Vinho', corPrincipal: '#fb7185', corFundo: '#1c1014', corTexto: '#fff1f2' },
  { id: 'esmeralda', label: 'Esmeralda', corPrincipal: '#34d399', corFundo: '#052e24', corTexto: '#ecfdf5' },
];

export const GRADIENTE_DIRECOES = [
  { id: 'diagonal', label: 'Diagonal', icon: 'resize-outline' },
  { id: 'horizontal', label: 'Horizontal', icon: 'swap-horizontal-outline' },
  { id: 'vertical', label: 'Vertical', icon: 'swap-vertical-outline' },
];

export const TEMA_ESTILOS = [
  { id: 'solido', label: 'Sólido', icon: 'color-fill-outline' },
  { id: 'gradiente', label: 'Gradiente', icon: 'color-filter-outline' },
  { id: 'escuro', label: 'Escuro', icon: 'moon-outline' },
  { id: 'cores', label: 'Várias cores', icon: 'aperture-outline' },
];

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeCoresTema(config) {
  const raw = Array.isArray(config?.coresTema) ? config.coresTema : [];
  const list = raw.map((c) => String(c || '').trim()).filter((c) => HEX_COLOR.test(c));
  if (!list.length && HEX_COLOR.test(String(config?.corPrincipal || ''))) list.push(config.corPrincipal);
  if (!list.length) list.push('#6366f1');
  return list.slice(0, 4);
}

export function getGradientPoints(direcao) {
  if (direcao === 'horizontal') return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
  if (direcao === 'vertical') return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
  return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
}

export function getCatalogoTheme(config) {
  const estilo = ['solido', 'gradiente', 'escuro', 'cores'].includes(config?.temaEstilo) ? config.temaEstilo : 'solido';
  const cores = normalizeCoresTema(config);
  const escuro = estilo === 'escuro';
  const usarGradiente = (estilo === 'gradiente' || estilo === 'cores') && cores.length >= 2;
  const points = getGradientPoints(config?.gradienteDirecao);
  const corPrincipal = HEX_COLOR.test(String(config?.corPrincipal || '')) ? config.corPrincipal : cores[0];
  return {
    estilo,
    escuro,
    usarGradiente,
    cores,
    corPrincipal,
    corFundo: config?.corFundo || (escuro ? '#0f172a' : '#f8fafc'),
    corTexto: config?.corTexto || (escuro ? '#f8fafc' : '#0f172a'),
    cardBg: escuro ? '#1e293b' : '#ffffff',
    heroColors: usarGradiente ? cores : [corPrincipal, corPrincipal],
    start: points.start,
    end: points.end,
  };
}

export function nudgeHeroPos(config, id, dx, dy) {
  const atual = getHeroPosicoes(config)[id] || { x: 50, y: 50 };
  return {
    ...getHeroPosicoes(config),
    [id]: {
      x: clampPercent((atual.x || 50) + dx),
      y: clampPercent((atual.y || 50) + dy),
    },
  };
}

export const CATALOGO_LAYOUTS = [
  { id: 'vitrine', label: 'Vitrine', icon: 'sparkles-outline' },
  { id: 'carrossel', label: 'Carrossel + grade', icon: 'albums-outline' },
  { id: 'grid', label: 'Grade', icon: 'grid-outline' },
  { id: 'horizontal', label: 'Horizontal', icon: 'reorder-two-outline' },
  { id: 'vertical', label: 'Lista', icon: 'list-outline' },
];

export const CATALOGO_TIPOS = [
  { id: 'ambos', label: 'Produtos e serviços', icon: 'apps-outline' },
  { id: 'produtos', label: 'Apenas produtos', icon: 'cube-outline' },
  { id: 'servicos', label: 'Apenas serviços', icon: 'construct-outline' },
];

export const CATALOGO_CARD_SIZES = [
  { id: 'pequeno', label: 'Pequeno', cols: 4 },
  { id: 'medio', label: 'Médio', cols: 3 },
  { id: 'grande', label: 'Grande', cols: 2 },
];

export const CORES_CATALOGO = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#0ea5e9', '#ef4444', '#84cc16', '#0f172a'];
export const CORES_FUNDO = ['#ffffff', '#f8fafc', '#f1f5f9', '#0f172a', '#fef3c7', '#dbeafe', '#fce7f3'];

export const LOGO_TAMANHOS = [
  { id: 'pequeno', label: 'Pequeno', px: 48 },
  { id: 'medio', label: 'Médio', px: 72 },
  { id: 'grande', label: 'Grande', px: 96 },
  { id: 'extra', label: 'Extra', px: 128 },
];

export const LOGO_FORMATOS = [
  { id: 'livre', label: 'Livre', icon: 'scan-outline' },
  { id: 'quadrado', label: 'Quadrado', icon: 'square-outline' },
  { id: 'circular', label: 'Circular', icon: 'ellipse-outline' },
];

export const HERO_DISPOSICOES = [
  { id: 'centro', label: 'Centro', icon: 'align-vertical-middle-outline' },
  { id: 'esquerda', label: 'Esquerda', icon: 'arrow-back-outline' },
  { id: 'direita', label: 'Direita', icon: 'arrow-forward-outline' },
  { id: 'lado', label: 'Lado a lado', icon: 'reorder-four-outline' },
];

export const HERO_ALINHAMENTOS = [
  { id: 'centro', label: 'Centro' },
  { id: 'esquerda', label: 'Esquerda' },
  { id: 'direita', label: 'Direita' },
];

export const TITULO_TAMANHOS = [
  { id: 'pequeno', label: 'Pequeno', px: 18 },
  { id: 'medio', label: 'Médio', px: 24 },
  { id: 'grande', label: 'Grande', px: 32 },
];

export const HERO_ALTURAS = [
  { id: 'compacta', label: 'Compacta', px: 160 },
  { id: 'normal', label: 'Normal', px: 200 },
  { id: 'alta', label: 'Alta', px: 260 },
];

export const DEFAULT_HERO_POSICOES = {
  logo: { x: 50, y: 30 },
  nome: { x: 50, y: 50 },
  titulo: { x: 50, y: 62 },
  subtitulo: { x: 50, y: 74 },
  slogan: { x: 50, y: 86 },
};

export const HERO_ELEMENT_IDS = ['logo', 'nome', 'titulo', 'subtitulo', 'slogan'];

export const HERO_ELEMENTOS = [
  { id: 'logo', label: 'Logo', icon: 'image-outline' },
  { id: 'nome', label: 'Nome', icon: 'text-outline' },
  { id: 'titulo', label: 'Título', icon: 'text' },
  { id: 'subtitulo', label: 'Subtítulo', icon: 'remove-outline' },
  { id: 'slogan', label: 'Slogan', icon: 'chatbox-ellipses-outline' },
];

export function getLogoPx(config) {
  const row = LOGO_TAMANHOS.find((t) => t.id === (config?.logoTamanho || 'medio'));
  return row?.px || 72;
}

export function getTituloPx(config) {
  const row = TITULO_TAMANHOS.find((t) => t.id === (config?.tituloTamanho || 'medio'));
  return row?.px || 24;
}

export function getHeroMinHeight(config) {
  const row = HERO_ALTURAS.find((t) => t.id === (config?.heroAltura || 'normal'));
  return row?.px || 200;
}

export function getHeroTextAlign(config) {
  const a = config?.heroAlinhamentoTexto || 'centro';
  if (a === 'esquerda') return 'left';
  if (a === 'direita') return 'right';
  return 'center';
}

export function getHeroFlexAlign(config) {
  const a = config?.heroAlinhamentoTexto || 'centro';
  if (a === 'esquerda') return 'flex-start';
  if (a === 'direita') return 'flex-end';
  return 'center';
}

export function getLogoBorderRadius(config, logoPx) {
  const formato = config?.logoFormato || 'livre';
  if (config?.logoSemMoldura) {
    if (formato === 'circular') return logoPx / 2;
    if (formato === 'quadrado') return 10;
    return 0;
  }
  return logoPx / 2;
}

export function buildHeroPresentation(config) {
  const logoPx = getLogoPx(config);
  const disposicao = config?.heroDisposicao || 'centro';
  const semMoldura = config?.logoSemMoldura === true;
  const manual = config?.heroPosicaoManual === true;
  const isRow = !manual && disposicao === 'lado';
  const contentAlign = disposicao === 'esquerda'
    ? 'flex-start'
    : disposicao === 'direita'
      ? 'flex-end'
      : 'center';

  return {
    logoPx,
    tituloPx: getTituloPx(config),
    minHeight: getHeroMinHeight(config),
    textAlign: getHeroTextAlign(config),
    flexAlign: getHeroFlexAlign(config),
    disposicao,
    semMoldura,
    manual,
    isRow,
    contentAlign,
    posicoes: getHeroPosicoes(config),
    logoStyle: {
      width: logoPx,
      height: logoPx,
      borderRadius: getLogoBorderRadius(config, logoPx),
      borderWidth: semMoldura ? 0 : 3,
      borderColor: '#fff',
    },
    logoResizeMode: semMoldura ? 'contain' : 'cover',
  };
}

export function getHeroPosicoes(config) {
  const raw = config?.heroPosicoes || {};
  return HERO_ELEMENT_IDS.reduce((acc, id) => {
    acc[id] = {
      x: clampPercent(raw[id]?.x ?? DEFAULT_HERO_POSICOES[id]?.x ?? 50),
      y: clampPercent(raw[id]?.y ?? DEFAULT_HERO_POSICOES[id]?.y ?? 50),
    };
    return acc;
  }, {});
}

function clampPercent(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 50;
  return Math.min(96, Math.max(4, n));
}

export function isHeroElementVisible(config, id) {
  switch (id) {
    case 'logo':
      return config?.usaLogo !== false;
    case 'nome':
      return config?.usaNomeProfissional !== false;
    case 'titulo':
      return config?.mostrarTitulo !== false;
    case 'subtitulo':
      return config?.mostrarSubtitulo !== false && !!String(config?.subtitulo || '').trim();
    case 'slogan':
      return config?.mostrarSlogan !== false && !!String(config?.slogan || '').trim();
    default:
      return false;
  }
}

export const DEFAULT_CATALOGO_CONFIG = {
  tipo: 'ambos',
  layout: 'vitrine',
  tema: 'moderno',
  temaEstilo: 'solido',
  coresTema: ['#6366f1'],
  gradienteDirecao: 'diagonal',
  corPrincipal: '#6366f1',
  corFundo: '#f8fafc',
  corTexto: '#0f172a',
  titulo: 'Minha Loja',
  subtitulo: 'Confira nossos produtos e serviços',
  slogan: 'Qualidade e atendimento que você merece',
  sobreTexto: '',
  nomeLoja: '',
  usaLogo: true,
  usaNomeProfissional: true,
  usaFotoFundo: false,
  mostrarPrecos: true,
  mostrarPromocao: true,
  mostrarCarrinho: true,
  carouselAuto: true,
  cardSize: 'medio',
  colunasGrid: 3,
  maxItensVisiveis: 0,
  whatsappPedido: '',
  fotoCatalogo: null,
  fotoCatalogoPreview: null,
  fotoFundo: null,
  nomeProfissional: '',
  logoSemMoldura: false,
  logoTamanho: 'medio',
  logoFormato: 'livre',
  heroDisposicao: 'centro',
  heroAlinhamentoTexto: 'centro',
  tituloTamanho: 'medio',
  heroAltura: 'normal',
  mostrarTitulo: true,
  mostrarSubtitulo: true,
  mostrarSlogan: true,
  heroPosicaoManual: false,
  heroPosicoes: { ...DEFAULT_HERO_POSICOES },
  categoriasProdutos: { enabled: false, items: [] },
  itens: [],
  lojaPublica: true,
  agendamentoOnline: true,
  agendaHoraInicio: '08:00',
  agendaHoraFim: '18:00',
  agendaIntervaloMin: 30,
  agendaDuracaoMin: 60,
  agendaDiasSemana: [1, 2, 3, 4, 5],
  agendaAntecedenciaDias: 30,
};

export function mergeCatalogoConfig(raw) {
  const base = { ...DEFAULT_CATALOGO_CONFIG, ...(raw || {}) };
  if (!Array.isArray(base.itens)) base.itens = [];
  base.heroPosicoes = getHeroPosicoes(base);
  base.coresTema = normalizeCoresTema(base);
  if (!['solido', 'gradiente', 'escuro', 'cores'].includes(base.temaEstilo)) base.temaEstilo = 'solido';
  base.categoriasProdutos = normalizeCategoriasProdutos(base.categoriasProdutos);
  return base;
}

export function itemKey(tipo, id) {
  return `${tipo}:${id}`;
}

export function buildDefaultItemList(products = [], services = [], tipo = 'ambos') {
  const list = [];
  let order = 0;
  if (tipo === 'produtos' || tipo === 'ambos') {
    (products || []).forEach((p) => {
      list.push({ id: String(p.id), tipo: 'produto', visible: true, order: order++ });
    });
  }
  if (tipo === 'servicos' || tipo === 'ambos') {
    (services || []).forEach((s) => {
      list.push({ id: String(s.id), tipo: 'servico', visible: true, order: order++ });
    });
  }
  return list;
}

export function syncCatalogoItens(config, products, services) {
  const tipo = config.tipo || 'ambos';
  const defaults = buildDefaultItemList(products, services, tipo);
  const map = new Map((config.itens || []).map((i) => [itemKey(i.tipo, i.id), i]));
  return defaults.map((d, idx) => {
    const prev = map.get(itemKey(d.tipo, d.id));
    return prev
      ? { ...d, visible: prev.visible !== false, order: typeof prev.order === 'number' ? prev.order : idx }
      : { ...d, order: idx };
  }).sort((a, b) => a.order - b.order);
}

export function getEffectivePrice(item) {
  const price = Number(item?.price) || 0;
  const discount = Number(item?.discount) || 0;
  if (discount > 0) return Math.max(0, price - discount);
  return price;
}

export function resolveCatalogoItems(config, products, services, search = '') {
  const synced = syncCatalogoItens(config, products, services);
  const q = String(search || '').trim().toLowerCase();
  const prodMap = new Map((products || []).map((p) => [String(p.id), p]));
  const servMap = new Map((services || []).map((s) => [String(s.id), s]));

  let rows = synced
    .filter((row) => row.visible !== false)
    .map((row) => {
      const src = row.tipo === 'servico' ? servMap.get(row.id) : prodMap.get(row.id);
      if (!src) return null;
      return { ...src, _tipo: row.tipo, _order: row.order, _rowId: itemKey(row.tipo, row.id) };
    })
    .filter(Boolean);

  if (q) {
    rows = rows.filter((i) => String(i.name || '').toLowerCase().includes(q));
  }

  const max = Number(config.maxItensVisiveis) || 0;
  if (max > 0) rows = rows.slice(0, max);
  return rows;
}

export function getGridColumns(config) {
  const size = CATALOGO_CARD_SIZES.find((c) => c.id === config.cardSize) || CATALOGO_CARD_SIZES[1];
  return config.colunasGrid || size.cols || 3;
}

/** Colunas da vitrine conforme a largura: 2 no celular e até 6 em tela larga. */
export function getResponsiveGridColumns(width) {
  const inner = Math.max(0, (Number(width) || 0) - 32);
  if (inner < 300) return 1;
  if (inner < 640) return 2;
  if (inner < 900) return 3;
  if (inner < 1160) return 4;
  if (inner < 1420) return 5;
  return 6;
}

export function getLojaDisplayName(config, profile) {
  return (
    config.nomeLoja?.trim()
    || config.nomeProfissional?.trim()
    || profile?.empresa?.trim()
    || profile?.nome?.trim()
    || 'Minha Loja'
  );
}

/** Logo na loja: preview leve durante edição do dono; original na vitrine pública. */
export function getLojaLogoUri(config, profile, options = {}) {
  const { forEdit = false } = options;
  const original = config?.fotoCatalogo || profile?.fotoLocal || profile?.foto || null;
  if (forEdit && config?.fotoCatalogoPreview) return config.fotoCatalogoPreview;
  return original;
}

export function buildCartWhatsAppMessage(cart, config, profile, extras = {}) {
  const loja = getLojaDisplayName(config, profile);
  const logo = getLojaLogoUri(config, profile);
  const { schedule, clientName, clientPhone, clientNotes } = extras || {};
  let text = `*Pedido — ${loja}*\n`;
  if (logo && /^https?:\/\//i.test(String(logo))) text += `${logo}\n`;
  text += '\n';
  if (clientName?.trim()) text += `Cliente: ${clientName.trim()}\n`;
  if (clientPhone?.trim()) text += `Telefone: ${clientPhone.trim()}\n`;
  if (clientName || clientPhone) text += '\n';
  let total = 0;
  cart.forEach((line, idx) => {
    const qty = line.qty || 1;
    const unit = getEffectivePrice(line.item);
    const sub = unit * qty;
    total += sub;
    text += `${idx + 1}. *${line.item.name}*\n`;
    text += `Qtd: ${qty}\n`;
    text += `Unidade: ${formatCurrency(unit)}\n`;
    text += `Total: ${formatCurrency(sub)}\n\n`;
  });
  text += `*Total do pedido: ${formatCurrency(total)}*`;
  if (schedule?.date && schedule?.time) {
    text += `\n\n📅 *Agendamento:* ${schedule.date} às ${schedule.time}`;
    text += '\n_Produtos e serviços serão atendidos na data agendada._';
  }
  if (clientNotes?.trim()) text += `\n\n📝 Observações: ${clientNotes.trim()}`;
  if (config.slogan?.trim()) text += `\n\n_${config.slogan.trim()}_`;
  return text;
}

export function moveCatalogoItem(itens, rowId, dir) {
  const list = [...(itens || [])].sort((a, b) => a.order - b.order);
  const idx = list.findIndex((i) => itemKey(i.tipo, i.id) === rowId);
  if (idx < 0) return list;
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= list.length) return list;
  const a = list[idx];
  const b = list[swap];
  list[idx] = { ...b, order: a.order };
  list[swap] = { ...a, order: b.order };
  return list.sort((x, y) => x.order - y.order);
}

export function toggleCatalogoItemVisible(itens, rowId) {
  return (itens || []).map((i) => (
    itemKey(i.tipo, i.id) === rowId ? { ...i, visible: i.visible === false } : i
  ));
}
