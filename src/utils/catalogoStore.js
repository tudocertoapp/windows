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

export const TEMAS_PRONTOS = [
  {
    id: 'claro',
    label: 'Claro',
    hint: 'Apple',
    temaEstilo: 'solido',
    corPrincipal: '#007AFF',
    corFundo: '#F5F5F7',
    corCard: '#FFFFFF',
    corTexto: '#1D1D1F',
    fonts: {
      nome: '#FFFFFF',
      titulo: '#FFFFFF',
      subtitulo: '#F5F5F7',
      slogan: '#E8E8ED',
      produto: '#1D1D1F',
      preco: '#007AFF',
      sobre: '#424245',
    },
  },
  {
    id: 'escuro',
    label: 'Escuro',
    hint: 'Apple',
    temaEstilo: 'escuro',
    corPrincipal: '#0A84FF',
    corFundo: '#000000',
    corCard: '#1C1C1E',
    corTexto: '#F5F5F7',
    fonts: {
      nome: '#FFFFFF',
      titulo: '#FFFFFF',
      subtitulo: '#EBEBF5',
      slogan: '#C7C7CC',
      produto: '#F5F5F7',
      preco: '#0A84FF',
      sobre: '#D1D1D6',
    },
  },
  {
    id: 'cinza',
    label: 'Cinza',
    hint: 'Graphite',
    temaEstilo: 'solido',
    corPrincipal: '#636366',
    corFundo: '#E5E5EA',
    corCard: '#F2F2F7',
    corTexto: '#1C1C1E',
    fonts: {
      nome: '#FFFFFF',
      titulo: '#FFFFFF',
      subtitulo: '#E5E5EA',
      slogan: '#D1D1D6',
      produto: '#1C1C1E',
      preco: '#3A3A3C',
      sobre: '#3A3A3C',
    },
  },
  {
    id: 'material',
    label: 'Material',
    hint: 'Google',
    temaEstilo: 'solido',
    corPrincipal: '#6750A4',
    corFundo: '#FFFBFE',
    corCard: '#FFFFFF',
    corTexto: '#1C1B1F',
    fonts: {
      nome: '#FFFFFF',
      titulo: '#FFFFFF',
      subtitulo: '#E8DEF8',
      slogan: '#D0BCFF',
      produto: '#1C1B1F',
      preco: '#6750A4',
      sobre: '#49454F',
    },
  },
  {
    id: 'fluent',
    label: 'Fluent',
    hint: 'Microsoft',
    temaEstilo: 'solido',
    corPrincipal: '#0078D4',
    corFundo: '#F3F2F1',
    corCard: '#FFFFFF',
    corTexto: '#201F1E',
    fonts: {
      nome: '#FFFFFF',
      titulo: '#FFFFFF',
      subtitulo: '#EDEBE9',
      slogan: '#D2D0CE',
      produto: '#201F1E',
      preco: '#0078D4',
      sobre: '#605E5C',
    },
  },
  {
    id: 'commerce',
    label: 'Commerce',
    hint: 'Shopify',
    temaEstilo: 'solido',
    corPrincipal: '#008060',
    corFundo: '#F6F6F7',
    corCard: '#FFFFFF',
    corTexto: '#202223',
    fonts: {
      nome: '#FFFFFF',
      titulo: '#FFFFFF',
      subtitulo: '#E3F1DF',
      slogan: '#B4E1CE',
      produto: '#202223',
      preco: '#008060',
      sobre: '#6D7175',
    },
  },
];

export function applyTemaPronto(config, id) {
  const t = TEMAS_PRONTOS.find((x) => x.id === id);
  if (!t) return config || {};
  return {
    temaPronto: t.id,
    temaEstilo: t.temaEstilo,
    corPrincipal: t.corPrincipal,
    coresTema: [t.corPrincipal],
    corFundo: t.corFundo,
    corCard: t.corCard,
    corTexto: t.corTexto,
    corFonteNome: t.fonts.nome,
    corFonteTitulo: t.fonts.titulo,
    corFonteSubtitulo: t.fonts.subtitulo,
    corFonteSlogan: t.fonts.slogan,
    corFonteProduto: t.fonts.produto,
    corFontePreco: t.fonts.preco,
    corFonteSobre: t.fonts.sobre,
  };
}

function hexOr(v, fallback) {
  return HEX_COLOR.test(String(v || '')) ? v : fallback;
}

export function getCatalogoFontColors(config, theme) {
  const t = theme || getCatalogoTheme(config);
  return {
    nome: hexOr(config?.corFonteNome, '#ffffff'),
    titulo: hexOr(config?.corFonteTitulo, '#ffffff'),
    subtitulo: hexOr(config?.corFonteSubtitulo, '#ffffff'),
    slogan: hexOr(config?.corFonteSlogan, '#ffffff'),
    produto: hexOr(config?.corFonteProduto, t.corTexto),
    preco: hexOr(config?.corFontePreco, t.corPrincipal),
    sobre: hexOr(config?.corFonteSobre, t.corTexto),
  };
}

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
];

export const ROTULO_VITRINE_OPTS = [
  { id: 'catalogo', label: 'Catálogo', icon: 'albums-outline' },
  { id: 'loja', label: 'Loja', icon: 'storefront-outline' },
];

export function getCatalogoRotulos(config) {
  const loja = config?.rotuloVitrine === 'loja';
  const cap = loja ? 'Loja' : 'Catálogo';
  const min = loja ? 'loja' : 'catálogo';
  return {
    cap,
    min,
    tituloPadrao: loja ? 'Minha Loja' : 'Meu Catálogo',
    menuLabel: loja ? 'Minha Loja' : 'Meu Catálogo',
    salvar: loja ? 'Salvar loja' : 'Salvar catálogo',
    buscar: loja ? 'Buscar na loja...' : 'Buscar no catálogo...',
    vazio: loja ? 'Nenhum item visível na loja.' : 'Nenhum item visível no catálogo.',
    publicoAtivo: loja ? 'Loja pública ativa' : 'Catálogo público ativo',
    linkHint: loja ? 'Salve a loja para gerar o link' : 'Salve o catálogo para gerar o link',
    sobre: loja ? 'Sobre a loja' : 'Sobre o catálogo',
    nomeCampo: loja ? 'Nome da loja' : 'Nome do catálogo',
    apresentacao: loja ? 'Apresente sua loja em poucas linhas' : 'Apresente seu catálogo em poucas linhas',
    dicaEdicao: loja
      ? 'Toque no lápis para editar foto, nome e preço. Salva no app e na loja.'
      : 'Toque no lápis para editar foto, nome e preço. Salva no app e no catálogo.',
  };
}

function scalePercent(config, key, fallback = 100) {
  const n = Number(config?.[key]);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(200, Math.max(50, Math.round(n)));
}

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
  let estilo = config?.temaEstilo === 'cores' ? 'gradiente' : config?.temaEstilo;
  if (!['solido', 'gradiente', 'escuro'].includes(estilo)) estilo = 'solido';
  const cores = normalizeCoresTema(config);
  const escuro = estilo === 'escuro';
  const usarGradiente = estilo === 'gradiente' && cores.length >= 2;
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
    cardBg: hexOr(config?.corCard, escuro ? '#1e293b' : '#ffffff'),
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

export function nudgeHeroItems(config, ids, dx, dy) {
  let next = getHeroPosicoes(config);
  (ids || []).forEach((id) => {
    next = nudgeHeroPos({ heroPosicoes: next }, id, dx, dy);
  });
  return next;
}

/** Alinha o centro dos itens no banner: esquerda, centro ou direita. */
export function alignHeroItems(config, ids, align) {
  const next = { ...getHeroPosicoes(config) };
  const x = align === 'esquerda' ? 18 : align === 'direita' ? 82 : 50;
  (ids || []).forEach((id) => {
    const cur = next[id] || { x: 50, y: 50 };
    next[id] = { ...cur, x };
  });
  return next;
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
  { id: 'mini', label: 'Mini', px: 88 },
  { id: 'compacta', label: 'Compacta', px: 132 },
  { id: 'normal', label: 'Normal', px: 200 },
  { id: 'alta', label: 'Alta', px: 260 },
  { id: 'cinema', label: 'Cinema', px: 340 },
];

export const HERO_MOLDURAS = [
  { id: 'cheia', label: 'Cheia', icon: 'square-outline' },
  { id: 'suave', label: 'Suave', icon: 'tablet-portrait-outline' },
  { id: 'arredondada', label: 'Redonda', icon: 'ellipse-outline' },
  { id: 'capsula', label: 'Cápsula', icon: 'phone-portrait-outline' },
  { id: 'arco', label: 'Arco', icon: 'ribbon-outline' },
  { id: 'gota', label: 'Gota', icon: 'water-outline' },
  { id: 'onda', label: 'Onda', icon: 'pulse-outline' },
  { id: 'cartao', label: 'Cartão', icon: 'card-outline' },
  { id: 'editorial', label: 'Editorial', icon: 'newspaper-outline' },
  { id: 'joia', label: 'Joia', icon: 'diamond-outline' },
];

export const HERO_SOBREPOSICOES = [
  { id: 'nenhuma', label: 'Separado', icon: 'remove-outline' },
  { id: 'recorte', label: 'Recorte', icon: 'crop-outline' },
  { id: 'cartao', label: 'Cartão', icon: 'card-outline' },
  { id: 'onda', label: 'Onda', icon: 'pulse-outline' },
  { id: 'arco', label: 'Arco', icon: 'rainy-outline' },
  { id: 'vitrine', label: 'Vitrine', icon: 'storefront-outline' },
  { id: 'cinta', label: 'Cinta', icon: 'reorder-two-outline' },
  { id: 'envelope', label: 'Envelope', icon: 'mail-outline' },
  { id: 'joia', label: 'Joia', icon: 'diamond-outline' },
  { id: 'flutuante', label: 'Flutuante', icon: 'layers-outline' },
  { id: 'diagonal', label: 'Corte', icon: 'swap-vertical-outline' },
];

export const CAROUSEL_SIZES = [
  { id: 'pequeno', label: 'Pequeno', imgH: 118 },
  { id: 'medio', label: 'Médio', imgH: 200 },
  { id: 'grande', label: 'Grande', imgH: 286 },
];

export const CAROUSEL_ESTILOS = [
  { id: 'classico', label: 'Clássico', icon: 'albums-outline' },
  { id: 'compacto', label: 'Compacto', icon: 'remove-outline' },
  { id: 'vitrine', label: 'Vitrine', icon: 'images-outline' },
  { id: 'capa', label: 'Capa', icon: 'book-outline' },
  { id: 'editorial', label: 'Editorial', icon: 'sparkles-outline' },
];

export const CAROUSEL_ANIMS = [
  { id: 'deslize', label: 'Deslize', icon: 'swap-horizontal-outline' },
  { id: 'suave', label: 'Suave', icon: 'leaf-outline' },
  { id: 'destaque', label: 'Destaque', icon: 'color-filter-outline' },
];

export const CAROUSEL_SCOPES = [
  { id: 'destaque', label: 'Destaques' },
  { id: 'produtos', label: 'Só produtos' },
  { id: 'servicos', label: 'Só serviços' },
  { id: 'ambos', label: 'Produtos e serviços' },
];

export const CAROUSEL_SPEEDS = [
  { id: 'lento', label: 'Lento', ms: 6500 },
  { id: 'normal', label: 'Normal', ms: 4200 },
  { id: 'rapido', label: 'Rápido', ms: 2600 },
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

export const HERO_SCALE_KEYS = {
  logo: 'logoEscala',
  nome: 'nomeEscala',
  titulo: 'tituloEscala',
  subtitulo: 'subtituloEscala',
  slogan: 'sloganEscala',
};

export function clampHeroScale(n) {
  const v = Math.round(Number(n) || 100);
  return Math.min(200, Math.max(50, v));
}

export function getLogoPx(config) {
  const row = LOGO_TAMANHOS.find((t) => t.id === (config?.logoTamanho || 'medio'));
  const base = row?.px || 72;
  return Math.round(base * scalePercent(config, 'logoEscala', 100) / 100);
}

export function getTituloPx(config) {
  const row = TITULO_TAMANHOS.find((t) => t.id === (config?.tituloTamanho || 'medio'));
  const base = row?.px || 24;
  return Math.round(base * scalePercent(config, 'tituloEscala', 100) / 100);
}

export function getHeroNomePx(config) {
  return Math.round(32 * scalePercent(config, 'nomeEscala', 100) / 100);
}

export function getHeroSubtituloPx(config) {
  return Math.round(14 * scalePercent(config, 'subtituloEscala', 100) / 100);
}

export function getHeroSloganPx(config) {
  return Math.round(12 * scalePercent(config, 'sloganEscala', 100) / 100);
}

export function getHeroMinHeight(config) {
  const row = HERO_ALTURAS.find((t) => t.id === (config?.heroAltura || 'normal'));
  return row?.px || 200;
}

export function getHeroFrame(config) {
  const id = HERO_MOLDURAS.some((m) => m.id === config?.heroMoldura) ? config.heroMoldura : 'cheia';
  const presets = {
    cheia: { mh: 0, mv: 0, tl: 0, tr: 0, bl: 0, br: 0 },
    suave: { mh: 10, mv: 8, tl: 20, tr: 20, bl: 20, br: 20 },
    arredondada: { mh: 12, mv: 10, tl: 36, tr: 36, bl: 36, br: 36 },
    capsula: { mh: 14, mv: 10, tl: 56, tr: 56, bl: 56, br: 56 },
    arco: { mh: 10, mv: 8, tl: 64, tr: 64, bl: 14, br: 14 },
    gota: { mh: 12, mv: 10, tl: 72, tr: 18, bl: 28, br: 78 },
    onda: { mh: 8, mv: 6, tl: 10, tr: 10, bl: 80, br: 80 },
    cartao: { mh: 16, mv: 12, tl: 28, tr: 28, bl: 28, br: 28, shadow: true },
    editorial: { mh: 22, mv: 8, tl: 4, tr: 4, bl: 44, br: 44 },
    joia: { mh: 14, mv: 10, tl: 86, tr: 14, bl: 14, br: 86 },
  };
  const overlapOn = config?.heroSobreposicao && config.heroSobreposicao !== 'nenhuma';
  const p = presets[id] || presets.cheia;
  return {
    id,
    wrap: {
      marginHorizontal: p.mh,
      marginTop: p.mv,
      marginBottom: overlapOn ? 0 : (p.mv ? p.mv + 2 : 0),
    },
    banner: {
      overflow: 'hidden',
      borderTopLeftRadius: p.tl,
      borderTopRightRadius: p.tr,
      borderBottomLeftRadius: p.bl,
      borderBottomRightRadius: p.br,
    },
    shadow: p.shadow
      ? {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }
      : null,
  };
}

export function getHeroOverlap(config) {
  const id = HERO_SOBREPOSICOES.some((m) => m.id === config?.heroSobreposicao)
    ? config.heroSobreposicao
    : 'nenhuma';
  const frame = getHeroFrame({ ...config, heroSobreposicao: 'nenhuma' });
  const bl = frame.banner.borderBottomLeftRadius || 0;
  const br = frame.banner.borderBottomRightRadius || 0;
  const insetFrame = frame.wrap.marginHorizontal || 0;
  const presets = {
    nenhuma: { pull: 0, padTop: 16, tl: 0, tr: 0, inset: 0, shape: null, shadow: false },
    recorte: { pull: 38, padTop: 22, tl: Math.max(18, bl), tr: Math.max(18, br), inset: insetFrame, shape: null, shadow: false },
    cartao: { pull: 46, padTop: 20, tl: 28, tr: 28, inset: Math.max(12, insetFrame), shape: null, shadow: true },
    onda: { pull: 34, padTop: 8, tl: 0, tr: 0, inset: 0, shape: 'onda', shadow: false },
    arco: { pull: 42, padTop: 8, tl: 0, tr: 0, inset: 8, shape: 'arco', shadow: false },
    vitrine: { pull: 58, padTop: 22, tl: 32, tr: 32, inset: 16, shape: null, shadow: true },
    cinta: { pull: 24, padTop: 16, tl: 18, tr: 18, inset: 28, shape: null, shadow: true },
    envelope: { pull: 50, padTop: 20, tl: 6, tr: 6, inset: 20, shape: null, shadow: true },
    joia: { pull: 44, padTop: 22, tl: 52, tr: 14, inset: Math.max(12, insetFrame), shape: null, shadow: true },
    flutuante: { pull: 54, padTop: 20, tl: 24, tr: 24, inset: 18, shape: null, shadow: true },
    diagonal: { pull: 36, padTop: 10, tl: 0, tr: 0, inset: 0, shape: 'diagonal', shadow: false },
  };
  const p = presets[id] || presets.nenhuma;
  return {
    id,
    shape: p.shape,
    sheet: {
      marginTop: p.pull ? -p.pull : 0,
      marginHorizontal: p.inset,
      paddingTop: p.padTop,
      borderTopLeftRadius: p.tl,
      borderTopRightRadius: p.tr,
      overflow: p.shape ? 'visible' : 'hidden',
      zIndex: 4,
      ...(p.shadow
        ? {
          shadowColor: '#000',
          shadowOpacity: 0.16,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        }
        : null),
    },
  };
}

export function getCarouselMetrics(config, storeW, pad = 12) {
  const size = CAROUSEL_SIZES.find((s) => s.id === config?.carouselSize) || CAROUSEL_SIZES[1];
  const estilo = CAROUSEL_ESTILOS.some((s) => s.id === config?.carouselEstilo) ? config.carouselEstilo : 'classico';
  const anim = CAROUSEL_ANIMS.some((s) => s.id === config?.carouselAnim) ? config.carouselAnim : 'deslize';
  const speed = CAROUSEL_SPEEDS.find((s) => s.id === config?.carouselSpeed) || CAROUSEL_SPEEDS[1];
  const inner = Math.max(160, storeW - pad * 2);
  let imgH = size.imgH;
  let itemW = inner;
  let gap = 0;
  let paging = true;
  let radius = 16;
  if (estilo === 'compacto') {
    imgH = Math.round(size.imgH * 0.7);
    radius = 12;
  } else if (estilo === 'vitrine') {
    itemW = Math.round(inner * 0.78);
    gap = 12;
    paging = false;
    radius = 22;
  } else if (estilo === 'capa') {
    imgH = Math.round(size.imgH * 1.28);
    itemW = Math.round(inner * 0.58);
    gap = 14;
    paging = false;
    radius = 28;
  } else if (estilo === 'editorial') {
    imgH = Math.round(size.imgH * 0.92);
    itemW = Math.round(inner * 0.86);
    gap = 10;
    paging = false;
    radius = 8;
  }
  if (anim === 'suave') paging = false;
  return {
    imgH,
    itemW,
    gap,
    paging: anim === 'deslize' ? paging : false,
    radius,
    interval: speed.ms,
    anim,
    estilo,
    step: itemW + gap,
  };
}

export function resolveCarouselItems(config, filtered) {
  const scope = config?.carouselScope || 'destaque';
  let list = filtered || [];
  if (scope === 'produtos') list = list.filter((i) => i._tipo === 'produto');
  else if (scope === 'servicos') list = list.filter((i) => i._tipo === 'servico');
  return list.slice(0, Math.min(16, list.length));
}

export function isCarouselEnabled(config) {
  return config?.layout === 'carrossel' || config?.carouselAtivo === true;
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
    nomePx: getHeroNomePx(config),
    subtituloPx: getHeroSubtituloPx(config),
    sloganPx: getHeroSloganPx(config),
    minHeight: getHeroMinHeight(config),
    frame: getHeroFrame(config),
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
      return config?.usaNomeProfissional === true;
    case 'titulo':
      return config?.mostrarTitulo !== false;
    case 'subtitulo':
      return config?.mostrarSubtitulo !== false;
    case 'slogan':
      return config?.mostrarSlogan === true;
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
  rotuloVitrine: 'catalogo',
  logoEscala: 100,
  nomeEscala: 100,
  tituloEscala: 100,
  subtituloEscala: 100,
  sloganEscala: 100,
  corPrincipal: '#6366f1',
  corFundo: '#f8fafc',
  corCard: '#ffffff',
  corTexto: '#0f172a',
  temaPronto: 'claro',
  corFonteNome: '#ffffff',
  corFonteTitulo: '#ffffff',
  corFonteSubtitulo: '#ffffff',
  corFonteSlogan: '#ffffff',
  corFonteProduto: '#0f172a',
  corFontePreco: '#6366f1',
  corFonteSobre: '#0f172a',
  fonteNome: 'system',
  fonteTitulo: 'system',
  fonteSubtitulo: 'system',
  fonteSlogan: 'system',
  titulo: 'Minha Loja',
  subtitulo: 'Confira nossos produtos e serviços',
  slogan: 'Qualidade e atendimento que você merece',
  sobreTexto: '',
  nomeLoja: '',
  usaLogo: true,
  usaNomeProfissional: false,
  usaFotoFundo: false,
  mostrarPrecos: true,
  mostrarPromocao: true,
  mostrarCarrinho: true,
  carouselAuto: true,
  carouselAtivo: false,
  carouselSize: 'medio',
  carouselEstilo: 'classico',
  carouselAnim: 'deslize',
  carouselScope: 'destaque',
  carouselSpeed: 'normal',
  heroMoldura: 'cheia',
  heroSobreposicao: 'nenhuma',
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
  mostrarSlogan: false,
  heroPosicaoManual: true,
  heroPosicoes: { ...DEFAULT_HERO_POSICOES },
  categoriasProdutos: { enabled: false, items: [] },
  itens: [],
  lojaPublica: true,
  slugPublico: '',
  usaDominioProprio: false,
  dominioPublico: '',
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
  if (base.temaEstilo === 'cores') base.temaEstilo = 'gradiente';
  if (!['solido', 'gradiente', 'escuro'].includes(base.temaEstilo)) base.temaEstilo = 'solido';
  if (base.rotuloVitrine !== 'loja' && base.rotuloVitrine !== 'catalogo') base.rotuloVitrine = 'catalogo';
  if (!['ambos', 'produtos', 'servicos'].includes(base.tipo)) base.tipo = 'ambos';
  if (!['vitrine', 'carrossel', 'grid', 'horizontal', 'vertical'].includes(base.layout)) base.layout = 'vitrine';
  if (!HERO_MOLDURAS.some((m) => m.id === base.heroMoldura)) base.heroMoldura = 'cheia';
  if (!HERO_SOBREPOSICOES.some((m) => m.id === base.heroSobreposicao)) base.heroSobreposicao = 'nenhuma';
  if (!HERO_ALTURAS.some((m) => m.id === base.heroAltura)) base.heroAltura = 'normal';
  if (!CAROUSEL_SIZES.some((m) => m.id === base.carouselSize)) base.carouselSize = 'medio';
  if (!CAROUSEL_ESTILOS.some((m) => m.id === base.carouselEstilo)) base.carouselEstilo = 'classico';
  if (!CAROUSEL_ANIMS.some((m) => m.id === base.carouselAnim)) base.carouselAnim = 'deslize';
  if (!CAROUSEL_SCOPES.some((m) => m.id === base.carouselScope)) base.carouselScope = 'destaque';
  if (!CAROUSEL_SPEEDS.some((m) => m.id === base.carouselSpeed)) base.carouselSpeed = 'normal';
  if (base.carouselAtivo == null) base.carouselAtivo = base.layout === 'carrossel';
  else base.carouselAtivo = !!base.carouselAtivo;
  base.logoEscala = scalePercent(base, 'logoEscala', 100);
  base.nomeEscala = scalePercent(base, 'nomeEscala', 100);
  base.tituloEscala = scalePercent(base, 'tituloEscala', 100);
  base.subtituloEscala = scalePercent(base, 'subtituloEscala', 100);
  base.sloganEscala = scalePercent(base, 'sloganEscala', 100);
  base.categoriasProdutos = normalizeCategoriasProdutos(base.categoriasProdutos);
  base.usaDominioProprio = !!base.usaDominioProprio;
  base.dominioPublico = typeof base.dominioPublico === 'string' ? base.dominioPublico.trim().toLowerCase() : '';
  base.slugPublico = typeof base.slugPublico === 'string' ? base.slugPublico.trim().toLowerCase() : '';
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
      const src = row.tipo === 'servico' ? servMap.get(String(row.id)) : prodMap.get(String(row.id));
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

/** Colunas da vitrine: preenche a largura, de 1 no celular até 6 no desktop. */
export function getResponsiveGridColumns(width) {
  const usable = Math.max(1, Number(width) || 0);
  const minCard = 148;
  const gap = 10;
  const pad = 24;
  const inner = Math.max(minCard, usable - pad);
  const cols = Math.floor((inner + gap) / (minCard + gap));
  return Math.max(1, Math.min(6, cols || 1));
}

export function getLojaDisplayName(config, profile) {
  return (
    config.nomeLoja?.trim()
    || config.nomeProfissional?.trim()
    || profile?.empresa?.trim()
    || profile?.nome?.trim()
    || getCatalogoRotulos(config).tituloPadrao
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
