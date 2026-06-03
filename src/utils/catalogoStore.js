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
  const { schedule, clientName, clientPhone, clientNotes } = extras || {};
  let text = `🛒 *Pedido — ${loja}*\n\n`;
  if (clientName?.trim()) text += `👤 Cliente: ${clientName.trim()}\n`;
  if (clientPhone?.trim()) text += `📱 Telefone: ${clientPhone.trim()}\n`;
  if (clientName || clientPhone) text += '\n';
  let total = 0;
  cart.forEach((line, idx) => {
    const unit = getEffectivePrice(line.item);
    const sub = unit * (line.qty || 1);
    total += sub;
    const tipo = line.item._tipo === 'servico' ? '🔧' : '📦';
    text += `${idx + 1}. ${tipo} ${line.item.name} x${line.qty || 1} — ${formatCurrency(sub)}\n`;
  });
  text += `\n*Total: ${formatCurrency(total)}*`;
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
