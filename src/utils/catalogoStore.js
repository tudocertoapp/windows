import { formatCurrency } from './format';
import { normalizeCategoriasProdutos } from './productCategories';
import { normalizeFontesUsuario, normalizeFontesFavoritas, normalizeFonteEstilos } from './catalogoFonts';
import { normalizeGradientLook, gradientColors, gradientPoints, normalizeGradientStops } from './catalogoGradient';

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
    fundoEstilo: 'solido',
    coresFundo: [t.corFundo],
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

const TEMA_SNAPSHOT_KEYS = [
  'temaEstilo', 'corPrincipal', 'coresTema',
  'gradienteDirecao', 'gradienteAngulo', 'gradienteInverter', 'gradienteForma', 'gradienteStops',
  'corFundo', 'fundoEstilo', 'coresFundo',
  'fundoGradienteDirecao', 'fundoGradienteAngulo', 'fundoGradienteInverter', 'fundoGradienteForma', 'fundoGradienteStops',
  'corCard', 'corTexto',
  'corFonteNome', 'corFonteTitulo', 'corFonteSubtitulo', 'corFonteSlogan',
  'corFonteProduto', 'corFontePreco', 'corFonteSobre',
  'fonteNome', 'fonteTitulo', 'fonteSubtitulo', 'fonteSlogan',
  'fonteEstilos',
];

export const TEMAS_SALVOS_MAX = 16;

export function normalizeTemasSalvos(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, TEMAS_SALVOS_MAX).map((t, i) => {
    if (!t || typeof t !== 'object') return null;
    const id = String(t.id || `usr_${i}`).slice(0, 48);
    const nome = String(t.nome || t.label || `Meu tema ${i + 1}`).trim().slice(0, 40) || `Meu tema ${i + 1}`;
    const patch = {};
    TEMA_SNAPSHOT_KEYS.forEach((k) => {
      if (t[k] !== undefined) patch[k] = t[k];
    });
    return {
      id,
      nome,
      criadoEm: t.criadoEm || Date.now(),
      corPrincipal: t.corPrincipal || t.coresTema?.[0] || '#6366f1',
      corFundo: t.corFundo || '#f8fafc',
      corTexto: t.corTexto || '#0f172a',
      ...patch,
    };
  }).filter(Boolean);
}

export function snapshotTemaAtual(config, nome) {
  const patch = {};
  TEMA_SNAPSHOT_KEYS.forEach((k) => {
    if (config?.[k] !== undefined) patch[k] = config[k];
  });
  return {
    id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    nome: String(nome || 'Meu tema').trim().slice(0, 40) || 'Meu tema',
    criadoEm: Date.now(),
    ...patch,
    corPrincipal: config?.corPrincipal || '#6366f1',
    corFundo: config?.corFundo || '#f8fafc',
    corTexto: config?.corTexto || '#0f172a',
  };
}

export function applyTemaSalvo(tema) {
  if (!tema || typeof tema !== 'object') return {};
  const patch = { temaPronto: tema.id };
  TEMA_SNAPSHOT_KEYS.forEach((k) => {
    if (tema[k] !== undefined) patch[k] = tema[k];
  });
  return patch;
}

export function upsertTemaSalvo(config, tema) {
  const list = normalizeTemasSalvos(config?.temasSalvos);
  const nomeKey = String(tema?.nome || '').trim().toLowerCase();
  const idx = list.findIndex((t) => t.nome.trim().toLowerCase() === nomeKey);
  let next;
  if (idx >= 0) {
    next = list.map((t, i) => (i === idx ? { ...tema, id: t.id } : t));
  } else if (list.length >= TEMAS_SALVOS_MAX) {
    next = [...list.slice(1), tema];
  } else {
    next = [...list, tema];
  }
  return { temasSalvos: next, temaPronto: next[idx >= 0 ? idx : next.length - 1]?.id };
}

export function removeTemaSalvo(config, id) {
  const list = normalizeTemasSalvos(config?.temasSalvos).filter((t) => t.id !== id);
  return {
    temasSalvos: list,
    temaPronto: config?.temaPronto === id ? '' : config?.temaPronto,
  };
}

function hexOr(v, fallback) {
  return HEX_COLOR.test(String(v || '')) ? v : fallback;
}

export function getCatalogoFontColors(config, theme) {
  const t = theme || getCatalogoTheme(config);
  const colors = {
    nome: hexOr(config?.corFonteNome, '#ffffff'),
    titulo: hexOr(config?.corFonteTitulo, '#ffffff'),
    subtitulo: hexOr(config?.corFonteSubtitulo, '#ffffff'),
    slogan: hexOr(config?.corFonteSlogan, '#ffffff'),
    produto: hexOr(config?.corFonteProduto, t.corTexto),
    preco: hexOr(config?.corFontePreco, t.corPrincipal),
    sobre: hexOr(config?.corFonteSobre, t.corTexto),
  };
  getHeroTextos(config).forEach((item) => {
    colors[item.id] = item.cor;
  });
  return colors;
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

export const FUNDO_ESTILOS = [
  { id: 'solido', label: 'Sólido', icon: 'color-fill-outline' },
  { id: 'gradiente', label: 'Gradiente', icon: 'color-filter-outline' },
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
  return Math.min(400, Math.max(15, Math.round(n)));
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeCoresTema(config) {
  const raw = Array.isArray(config?.coresTema) ? config.coresTema : [];
  const list = raw.map((c) => String(c || '').trim()).filter((c) => HEX_COLOR.test(c));
  if (!list.length && HEX_COLOR.test(String(config?.corPrincipal || ''))) list.push(config.corPrincipal);
  if (!list.length) list.push('#6366f1');
  return list.slice(0, 12);
}

export function normalizeCoresFundo(config) {
  const raw = Array.isArray(config?.coresFundo) ? config.coresFundo : [];
  const list = raw.map((c) => String(c || '').trim()).filter((c) => HEX_COLOR.test(c));
  if (!list.length && HEX_COLOR.test(String(config?.corFundo || ''))) list.push(config.corFundo);
  if (!list.length) list.push('#f8fafc');
  return list.slice(0, 12);
}

export function getCatalogoPageBg(config) {
  const estilo = config?.fundoEstilo === 'gradiente' ? 'gradiente' : 'solido';
  const cores = normalizeCoresFundo(config);
  const look = normalizeGradientLook({
    angulo: config?.fundoGradienteAngulo,
    inverter: config?.fundoGradienteInverter,
    forma: config?.fundoGradienteForma,
  }, config?.fundoGradienteDirecao);
  const stops = normalizeGradientStops(config?.fundoGradienteStops, cores);
  const usarGradiente = estilo === 'gradiente' && stops.length >= 2;
  const points = gradientPoints(look.angulo);
  const solid = cores[0];
  const painted = usarGradiente ? gradientColors(cores, look.inverter) : [solid, solid];
  return {
    estilo,
    usarGradiente,
    cores,
    stops,
    look,
    solid,
    colors: painted.length >= 2 ? painted : [solid, solid],
    start: points.start,
    end: points.end,
  };
}

export function getGradientPoints(direcao) {
  return gradientPoints(
    direcao === 'horizontal' ? 90 : direcao === 'vertical' ? 180 : 135,
  );
}

export function getCatalogoTheme(config) {
  let estilo = config?.temaEstilo === 'cores' ? 'gradiente' : config?.temaEstilo;
  if (!['solido', 'gradiente', 'escuro'].includes(estilo)) estilo = 'solido';
  const cores = normalizeCoresTema(config);
  const escuro = estilo === 'escuro';
  const look = normalizeGradientLook({
    angulo: config?.gradienteAngulo,
    inverter: config?.gradienteInverter,
    forma: config?.gradienteForma,
  }, config?.gradienteDirecao);
  const stops = normalizeGradientStops(config?.gradienteStops, cores);
  const usarGradiente = estilo === 'gradiente' && stops.length >= 2;
  const points = gradientPoints(look.angulo);
  const corPrincipal = HEX_COLOR.test(String(config?.corPrincipal || '')) ? config.corPrincipal : cores[0];
  const painted = usarGradiente ? gradientColors(cores, look.inverter) : [corPrincipal, corPrincipal];
  return {
    estilo,
    escuro,
    usarGradiente,
    cores,
    stops,
    look,
    corPrincipal,
    corFundo: config?.corFundo || (escuro ? '#0f172a' : '#f8fafc'),
    corTexto: config?.corTexto || (escuro ? '#f8fafc' : '#0f172a'),
    cardBg: hexOr(config?.corCard, escuro ? '#1e293b' : '#ffffff'),
    heroColors: painted.length >= 2 ? painted : [corPrincipal, corPrincipal],
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
  { id: 'grid', label: 'Grade', icon: 'grid-outline' },
  { id: 'horizontal', label: 'Linha horizontal', icon: 'reorder-two-outline' },
  { id: 'vertical', label: 'Lista', icon: 'list-outline' },
  { id: 'landing', label: 'Landing', icon: 'phone-portrait-outline' },
];

export const CAROUSEL_POSICOES = [
  { id: 'antes-busca', label: 'Antes da busca', icon: 'arrow-up-outline' },
  { id: 'acima', label: 'Depois dos filtros', icon: 'funnel-outline' },
  { id: 'lado', label: 'Metade da página', icon: 'tablet-landscape-outline' },
  { id: 'abaixo', label: 'Abaixo da grade', icon: 'arrow-down-outline' },
  { id: 'mesclado', label: 'Mesclado na grade', icon: 'grid-outline' },
];

export const CAROUSEL_VISIVEIS = [
  { id: '1', label: '1' },
  { id: '2', label: '2' },
  { id: '3', label: '3' },
];

export function getCarouselPosicao(config) {
  const id = config?.carouselPosicao;
  if (CAROUSEL_POSICOES.some((p) => p.id === id)) return id;
  return 'acima';
}

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

export const LOGO_MOLDURAS = [
  { id: 'nenhuma', label: 'Sem moldura', icon: 'image-outline' },
  { id: 'circular', label: 'Circular', icon: 'ellipse-outline' },
  { id: 'quadrada', label: 'Quadrada', icon: 'square-outline' },
  { id: 'suave', label: 'Suave', icon: 'tablet-portrait-outline' },
  { id: 'capsula', label: 'Cápsula', icon: 'phone-portrait-outline' },
  { id: 'losango', label: 'Losango', icon: 'diamond-outline' },
  { id: 'gota', label: 'Gota', icon: 'water-outline' },
  { id: 'hexagono', label: 'Hexágono', icon: 'apps-outline' },
];

export const LOGO_EFEITOS = [
  { id: 'nenhum', label: 'Nenhum', icon: 'remove-outline' },
  { id: 'sombra', label: 'Sombra', icon: 'cloudy-outline' },
  { id: 'brilho', label: 'Brilho', icon: 'sunny-outline' },
  { id: 'relevo', label: 'Relevo', icon: 'layers-outline' },
  { id: 'pb', label: 'P&B', icon: 'contrast-outline' },
  { id: 'suave', label: 'Suave', icon: 'leaf-outline' },
];

export const LOGO_FUNDO_IMG = [
  { id: 'manter', label: 'Manter fundo', icon: 'image-outline' },
  { id: 'sem-branco', label: 'Logo transparente', icon: 'cut-outline' },
  { id: 'sem-preto', label: 'Tirar fundo preto', icon: 'contrast-outline' },
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
  { id: 'nenhuma', label: 'Reto', icon: 'remove-outline' },
  { id: 'onda', label: 'Onda', icon: 'pulse-outline' },
  { id: 'arco', label: 'Arco', icon: 'rainy-outline' },
  { id: 'diagonal', label: 'Corte', icon: 'swap-vertical-outline' },
  { id: 'recorte', label: 'Entalhe', icon: 'crop-outline' },
  { id: 'vale', label: 'Vale', icon: 'git-commit-outline' },
  { id: 'escama', label: 'Escama', icon: 'ellipse-outline' },
  { id: 'zigue', label: 'Zigue', icon: 'analytics-outline' },
  { id: 'serra', label: 'Serra', icon: 'barcode-outline' },
  { id: 'degrau', label: 'Degrau', icon: 'layers-outline' },
  { id: 'petal', label: 'Pétala', icon: 'flower-outline' },
  { id: 'asa', label: 'Asa', icon: 'airplane-outline' },
  { id: 'concha', label: 'Concha', icon: 'moon-outline' },
  { id: 'gota', label: 'Gota', icon: 'water-outline' },
  { id: 'nuvem', label: 'Nuvem', icon: 'cloud-outline' },
];

const HERO_CUT_SHAPES = {
  nenhuma: { shape: null, h: 0 },
  onda: { shape: 'onda', h: 48 },
  arco: { shape: 'arco', h: 46 },
  diagonal: { shape: 'diagonal', h: 40 },
  recorte: { shape: 'entalhe', h: 40 },
  vale: { shape: 'vale', h: 44 },
  escama: { shape: 'escama', h: 42 },
  zigue: { shape: 'zigue', h: 40 },
  serra: { shape: 'serra', h: 38 },
  degrau: { shape: 'degrau', h: 36 },
  petal: { shape: 'petal', h: 44 },
  asa: { shape: 'asa', h: 46 },
  concha: { shape: 'concha', h: 48 },
  gota: { shape: 'gota', h: 46 },
  nuvem: { shape: 'nuvem', h: 44 },
  cartao: { shape: 'ondabaixa', h: 32 },
  vitrine: { shape: 'concha', h: 48 },
  cinta: { shape: 'degrau', h: 36 },
  envelope: { shape: 'asa', h: 46 },
  joia: { shape: 'gota', h: 46 },
  flutuante: { shape: 'nuvem', h: 44 },
};

export const CAROUSEL_SIZES = [
  { id: 'minimo', label: 'Mínimo', imgH: 48 },
  { id: 'fino', label: 'Fino', imgH: 72 },
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
  { id: 'fade', label: 'Fade', icon: 'contrast-outline' },
  { id: 'zoom', label: 'Zoom', icon: 'expand-outline' },
];

export const CAROUSEL_SCOPES = [
  { id: 'escolher', label: 'Escolher itens' },
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
  logo: { x: 50, y: 28 },
  nome: { x: 50, y: 52 },
  slogan: { x: 50, y: 66 },
  titulo: { x: 50, y: 78 },
  subtitulo: { x: 50, y: 88 },
};

export const HERO_ELEMENT_IDS = ['logo', 'nome', 'slogan', 'titulo', 'subtitulo'];

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

export const HERO_EXTRA_TEXT_MAX = 12;

export function isHeroExtraTextId(id) {
  return typeof id === 'string' && id.startsWith('txt_');
}

export function getHeroTextos(config) {
  const raw = Array.isArray(config?.heroTextos) ? config.heroTextos : [];
  const seen = new Set();
  const out = [];
  raw.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const id = isHeroExtraTextId(item.id) ? item.id : `txt_${i}_${String(item.id || 'x').replace(/[^a-z0-9]/gi, '').slice(0, 8)}`;
    if (seen.has(id) || out.length >= HERO_EXTRA_TEXT_MAX) return;
    seen.add(id);
    out.push({
      id,
      texto: typeof item.texto === 'string' ? item.texto : 'Novo texto',
      escala: clampHeroScale(item.escala ?? 100),
      cor: hexOr(item.cor, '#ffffff'),
      fonte: item.fonte || 'system',
    });
  });
  return out;
}

export function addHeroTexto(config) {
  const list = getHeroTextos(config);
  if (list.length >= HERO_EXTRA_TEXT_MAX) return list;
  const id = `txt_${Date.now().toString(36)}${Math.floor(Math.random() * 36).toString(36)}`;
  return [...list, { id, texto: 'Novo texto', escala: 100, cor: '#ffffff', fonte: 'system' }];
}

export function patchHeroTexto(config, id, patch) {
  return getHeroTextos(config).map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeHeroTexto(config, id) {
  return getHeroTextos(config).filter((item) => item.id !== id);
}

export function getHeroItemScale(config, id) {
  const key = HERO_SCALE_KEYS[id];
  if (key) return clampHeroScale(config?.[key] ?? 100);
  const extra = getHeroTextos(config).find((t) => t.id === id);
  return clampHeroScale(extra?.escala ?? 100);
}

export function getHeroExtraPx(config, id) {
  return 18;
}

export function listHeroElementIds(config) {
  return [...HERO_ELEMENT_IDS, ...getHeroTextos(config).map((t) => t.id)];
}

export function clampHeroScale(n) {
  const v = Math.round(Number(n) || 100);
  return Math.min(400, Math.max(15, v));
}

export function getLogoPx(config) {
  const row = LOGO_TAMANHOS.find((t) => t.id === (config?.logoTamanho || 'medio'));
  return row?.px || 72;
}

export function getTituloPx(config) {
  const row = TITULO_TAMANHOS.find((t) => t.id === (config?.tituloTamanho || 'medio'));
  return row?.px || 24;
}

export function getHeroNomePx() {
  return 32;
}

export function getHeroSubtituloPx() {
  return 14;
}

export function getHeroSloganPx() {
  return 12;
}

export function getHeroMinHeight(config) {
  const row = HERO_ALTURAS.find((t) => t.id === (config?.heroAltura || 'normal'));
  const base = row?.px || 200;
  if (config?.layout === 'landing') return Math.max(base, 520);
  return base;
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
  const p = presets[id] || presets.cheia;
  const corner = Math.max(p.tl, p.tr, p.bl, p.br);
  const clip = corner > 12 ? Math.round(corner * 0.32) : 0;
  const overlapOn = config?.heroSobreposicao && config.heroSobreposicao !== 'nenhuma';
  return {
    id,
    mh: p.mh,
    mv: p.mv,
    clip,
    padX: p.mh + clip,
    padY: p.mv + clip,
    active: p.mh > 0 || p.mv > 0 || clip > 0,
    wrap: {
      marginHorizontal: p.mh,
      marginTop: p.mv,
      marginBottom: overlapOn ? 0 : (p.mv ? p.mv + 2 : 0),
    },
    banner: {
      overflow: 'visible',
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
  const raw = config?.heroSobreposicao;
  const id = HERO_CUT_SHAPES[raw] ? raw : 'nenhuma';
  const cut = HERO_CUT_SHAPES[id] || HERO_CUT_SHAPES.nenhuma;
  return {
    id,
    shape: cut.shape,
    cutH: cut.h,
    sheet: {
      marginTop: 0,
      paddingTop: cut.h ? 4 : 16,
      overflow: 'visible',
      zIndex: 1,
    },
  };
}

export function getCarouselVisiveis(config) {
  const n = Math.round(Number(config?.carouselVisiveis) || 1);
  return Math.min(3, Math.max(1, n));
}

export function getCarouselMetrics(config, storeW, pad = 12) {
  const size = CAROUSEL_SIZES.find((s) => s.id === config?.carouselSize) || CAROUSEL_SIZES.find((s) => s.id === 'medio');
  const estilo = CAROUSEL_ESTILOS.some((s) => s.id === config?.carouselEstilo) ? config.carouselEstilo : 'classico';
  const anim = CAROUSEL_ANIMS.some((s) => s.id === config?.carouselAnim) ? config.carouselAnim : 'deslize';
  const speed = CAROUSEL_SPEEDS.find((s) => s.id === config?.carouselSpeed) || CAROUSEL_SPEEDS[1];
  const visiveis = getCarouselVisiveis(config);
  const lado = config?.carouselPosicao === 'lado';
  const inner = Math.max(160, (lado ? storeW * 0.5 : storeW) - pad * 2);
  let gap = visiveis > 1 ? 12 : 0;
  let itemW = visiveis > 1
    ? Math.max(140, Math.floor((inner - gap * (visiveis - 1)) / visiveis))
    : inner;
  let radius = 16;
  if (estilo === 'compacto') radius = 12;
  else if (estilo === 'vitrine') {
    if (visiveis === 1) itemW = Math.round(inner * 0.78);
    gap = Math.max(gap, 12);
    radius = 22;
  } else if (estilo === 'capa') {
    if (visiveis === 1) itemW = Math.round(inner * 0.56);
    gap = Math.max(gap, 14);
    radius = 28;
  } else if (estilo === 'editorial') {
    if (visiveis === 1) itemW = Math.round(inner * 0.72);
    gap = Math.max(gap, 10);
    radius = 8;
  }
  const imgH = size.imgH;
  const imgW = Math.min(
    Math.round(itemW * (visiveis > 1 ? 0.84 : 0.62)),
    Math.max(40, Math.round(imgH / 0.9)),
  );
  const fade = anim === 'fade' || anim === 'zoom';
  return {
    imgH,
    imgW,
    stageH: imgH + (imgH < 80 ? 8 : 20),
    compact: imgH < 90,
    itemW,
    gap,
    visiveis,
    lado,
    paging: anim === 'deslize' && visiveis === 1 && !fade,
    radius,
    interval: speed.ms,
    anim,
    estilo,
    fade,
    step: itemW + gap,
  };
}

export function getCatalogoImageHints(config) {
  const bannerMap = { mini: 320, compacta: 420, normal: 560, alta: 720, cinema: 960 };
  const bannerH = config?.layout === 'landing'
    ? 1400
    : (bannerMap[config?.heroAltura] || 560);
  const logoPx = LOGO_TAMANHOS.find((t) => t.id === (config?.logoTamanho || 'medio'))?.px || 72;
  const logoUp = Math.max(512, logoPx * 8);
  return {
    banner: `1920 × ${bannerH} px (paisagem)`,
    logo: `${logoUp} × ${logoUp} px (quadrada)`,
    produto: '800 × 1000 px (retrato 4:5)',
    produtoAlt: '1000 × 1000 px se quiser quadrada',
  };
}

export function normalizeCarouselItemIds(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const out = [];
  list.forEach((id) => {
    const k = String(id || '').trim();
    if (!k || seen.has(k) || out.length >= 24) return;
    seen.add(k);
    out.push(k);
  });
  return out;
}

export function normalizeCarouselCapas(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  Object.keys(src).slice(0, 40).forEach((key) => {
    out[key] = normalizeCarouselCapa(src[key]);
  });
  return out;
}

export function normalizeCarouselCapa(raw) {
  const x = Math.round(Number(raw?.x));
  const y = Math.round(Number(raw?.y));
  const zoom = Math.round(Number(raw?.zoom));
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
    zoom: Number.isFinite(zoom) ? Math.min(280, Math.max(100, zoom)) : 100,
  };
}

export function getCarouselCapa(config, rowId) {
  return normalizeCarouselCapa(config?.carouselCapas?.[rowId]);
}

export function carouselCapaImageBox(capa, w, h) {
  const c = normalizeCarouselCapa(capa);
  const z = c.zoom / 100;
  const bw = w * z;
  const bh = h * z;
  return {
    width: bw,
    height: bh,
    position: 'absolute',
    left: -((c.x / 100) * (bw - w)),
    top: -((c.y / 100) * (bh - h)),
  };
}

export function resolveCarouselItems(config, filtered) {
  const scope = config?.carouselScope || 'destaque';
  let list = filtered || [];
  if (scope === 'escolher') {
    const map = new Map(list.map((i) => [i._rowId || itemKey(i._tipo || i.tipo, i.id), i]));
    return normalizeCarouselItemIds(config?.carouselItemIds).map((id) => map.get(id)).filter(Boolean);
  }
  if (scope === 'produtos') list = list.filter((i) => i._tipo === 'produto');
  else if (scope === 'servicos') list = list.filter((i) => i._tipo === 'servico');
  return list.slice(0, Math.min(16, list.length));
}

export function isCarouselEnabled(config) {
  return config?.carouselAtivo === true;
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
  return getLogoPresentation(config, logoPx).radius;
}

export function getLogoPresentation(config, logoPx) {
  const size = Math.max(24, logoPx || 72);
  let moldura = config?.logoMoldura;
  if (!LOGO_MOLDURAS.some((m) => m.id === moldura)) {
    if (config?.logoSemMoldura || config?.logoFormato === 'livre') moldura = 'nenhuma';
    else if (config?.logoFormato === 'quadrado') moldura = 'quadrada';
    else moldura = 'circular';
  }
  const placa = config?.logoTemTransparencia
    ? config?.logoPlaca === true
    : (config?.logoPlaca == null
      ? moldura !== 'nenhuma' && !config?.logoSemMoldura
      : !!config.logoPlaca);
  const efeito = LOGO_EFEITOS.some((e) => e.id === config?.logoEfeito) ? config.logoEfeito : 'nenhum';
  const fundoImg = LOGO_FUNDO_IMG.some((e) => e.id === config?.logoFundoImg) ? config.logoFundoImg : 'manter';
  const placaCor = config?.logoPlacaCor || 'rgba(255,255,255,0.22)';
  const bordaCor = config?.logoBordaCor || '#ffffff';
  const tint = config?.logoCor && config.logoCor !== 'none' ? config.logoCor : null;
  const invert = !!config?.logoInverter;
  const semBorda = moldura === 'nenhuma';

  let radius = 0;
  let clipPath = null;
  let extraRadius = null;
  if (moldura === 'circular' || moldura === 'capsula') radius = size / 2;
  else if (moldura === 'quadrada') radius = 6;
  else if (moldura === 'suave') radius = 18;
  else if (moldura === 'gota') {
    extraRadius = {
      borderTopLeftRadius: Math.round(size * 0.52),
      borderTopRightRadius: Math.round(size * 0.52),
      borderBottomLeftRadius: Math.round(size * 0.18),
      borderBottomRightRadius: Math.round(size * 0.78),
    };
  } else if (moldura === 'losango') {
    clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
  } else if (moldura === 'hexagono') {
    clipPath = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
  }

  const clip = {
    width: size,
    height: size,
    overflow: 'hidden',
    borderRadius: extraRadius ? 0 : radius,
    ...(extraRadius || {}),
    backgroundColor: placa ? placaCor : 'transparent',
    borderWidth: semBorda || clipPath || !placa ? 0 : 3,
    borderColor: bordaCor,
    ...(clipPath ? { clipPath, WebkitClipPath: clipPath } : {}),
  };

  let shadow = null;
  if (efeito === 'sombra') {
    shadow = { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 };
  } else if (efeito === 'brilho') {
    shadow = { shadowColor: '#fff', shadowOpacity: 0.85, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 10 };
  } else if (efeito === 'relevo') {
    shadow = { shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 4, shadowOffset: { width: 2, height: 3 }, elevation: 4 };
  }

  const cssFilters = [
    invert ? 'invert(1)' : '',
    efeito === 'pb' ? 'grayscale(1)' : '',
    efeito === 'suave' ? 'brightness(1.08)' : '',
  ].filter(Boolean);
  const imgFilter = [
    ...(invert ? [{ invert: 1 }] : []),
    ...(efeito === 'pb' ? [{ grayscale: 1 }] : []),
    ...(efeito === 'suave' ? [{ opacity: 0.92 }, { brightness: 1.08 }] : []),
  ];

  return {
    size,
    moldura,
    placa: fundoImg !== 'manter' ? false : placa,
    efeito,
    fundoImg,
    cutBg: fundoImg !== 'manter',
    radius: extraRadius ? Math.round(size * 0.5) : radius,
    wrap: { width: size, height: size, ...(shadow || {}) },
    clip: {
      ...clip,
      backgroundColor: (fundoImg !== 'manter' || !placa) ? 'transparent' : (placa ? placaCor : 'transparent'),
      borderWidth: fundoImg !== 'manter' || semBorda || clipPath || !placa ? 0 : 3,
    },
    img: {
      width: size,
      height: size,
      ...(tint ? { tintColor: tint } : {}),
      ...(cssFilters.length ? { filter: cssFilters.join(' ') } : {}),
      ...(efeito === 'suave' ? { opacity: 0.94 } : {}),
    },
    imgFilter: imgFilter.length ? imgFilter : undefined,
    resizeMode: 'contain',
  };
}

export function buildHeroPresentation(config) {
  const landing = config?.layout === 'landing';
  const logoPx = Math.round(getLogoPx(config) * (landing ? 1.18 : 1));
  const logoLook = getLogoPresentation(config, logoPx);
  const disposicao = landing ? 'centro' : (config?.heroDisposicao || 'centro');
  const semMoldura = logoLook.moldura === 'nenhuma' && !logoLook.placa;
  const manual = landing ? false : config?.heroPosicaoManual === true;
  const isRow = !manual && !landing && disposicao === 'lado';
  const contentAlign = landing
    ? 'center'
    : disposicao === 'esquerda'
      ? 'flex-start'
      : disposicao === 'direita'
        ? 'flex-end'
        : 'center';

  return {
    landing,
    logoPx,
    tituloPx: getTituloPx(config),
    nomePx: getHeroNomePx(config),
    subtituloPx: getHeroSubtituloPx(config),
    sloganPx: getHeroSloganPx(config),
    minHeight: getHeroMinHeight(config),
    frame: landing ? getHeroFrame({ ...config, heroMoldura: config?.heroMoldura || 'cheia' }) : getHeroFrame(config),
    textAlign: landing ? 'center' : getHeroTextAlign(config),
    flexAlign: landing ? 'center' : getHeroFlexAlign(config),
    disposicao,
    semMoldura,
    manual,
    isRow,
    contentAlign,
    posicoes: getHeroPosicoes(config),
    logoLook,
    logoStyle: {
      width: logoPx,
      height: logoPx,
      borderRadius: logoLook.radius,
      borderWidth: logoLook.moldura === 'nenhuma' ? 0 : 3,
      borderColor: config?.logoBordaCor || '#fff',
    },
    logoResizeMode: logoLook.resizeMode,
  };
}

export function getHeroPosicoes(config) {
  const raw = config?.heroPosicoes || {};
  const extras = getHeroTextos(config);
  const ids = [...HERO_ELEMENT_IDS, ...extras.map((t) => t.id)];
  return ids.reduce((acc, id) => {
    const extraIdx = extras.findIndex((t) => t.id === id);
    const fallbackY = extraIdx >= 0 ? Math.min(90, 38 + extraIdx * 9) : 50;
    acc[id] = {
      x: clampPercent(raw[id]?.x ?? DEFAULT_HERO_POSICOES[id]?.x ?? 50),
      y: clampPercent(raw[id]?.y ?? DEFAULT_HERO_POSICOES[id]?.y ?? fallbackY),
    };
    return acc;
  }, {});
}

function clampPercent(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 50;
  return Math.min(96, Math.max(4, n));
}

export function getHeroSafePadPercent(config, w, h) {
  const frame = getHeroFrame(config);
  const overlap = getHeroOverlap(config);
  const px = Math.max(w || 0, 1);
  const py = Math.max(h || 0, 1);
  const x = frame.active ? Math.min(26, Math.max(8, (frame.padX / px) * 100 + 3)) : 4;
  const yTop = frame.active ? Math.min(26, Math.max(8, (frame.padY / py) * 100 + 3)) : 4;
  const yBottom = overlap.cutH
    ? Math.max(yTop, Math.min(36, (overlap.cutH / py) * 100 + 8))
    : yTop;
  return {
    x,
    y: yTop,
    top: yTop,
    bottom: yBottom,
    active: !!(frame.active || overlap.cutH),
  };
}

export function clampHeroPosToSafe(pos, safe) {
  const minX = safe?.x ?? 4;
  const minTop = safe?.top ?? safe?.y ?? 4;
  const minBottom = safe?.bottom ?? safe?.y ?? 4;
  return {
    x: Math.min(100 - minX, Math.max(minX, Number(pos?.x) || 50)),
    y: Math.min(100 - minBottom, Math.max(minTop, Number(pos?.y) || 50)),
  };
}

export function isHeroElementVisible(config, id) {
  switch (id) {
    case 'logo':
      return config?.usaLogo !== false;
    case 'nome':
      return config?.usaNomeProfissional === true;
    case 'titulo':
      return config?.mostrarTitulo === true;
    case 'subtitulo':
      return config?.mostrarSubtitulo === true;
    case 'slogan':
      return config?.mostrarSlogan === true;
    default:
      return getHeroTextos(config).some((t) => t.id === id);
  }
}

export const DEFAULT_CATALOGO_CONFIG = {
  tipo: 'ambos',
  layout: 'vitrine',
  tema: 'moderno',
  temaEstilo: 'solido',
  coresTema: ['#6366f1'],
  gradienteDirecao: 'diagonal',
  gradienteAngulo: 135,
  gradienteInverter: false,
  gradienteForma: 'linear',
  gradienteStops: [],
  rotuloVitrine: 'catalogo',
  logoEscala: 100,
  nomeEscala: 100,
  tituloEscala: 100,
  subtituloEscala: 100,
  sloganEscala: 100,
  corPrincipal: '#6366f1',
  corFundo: '#f8fafc',
  fundoEstilo: 'solido',
  coresFundo: ['#f8fafc'],
  fundoGradienteDirecao: 'diagonal',
  fundoGradienteAngulo: 135,
  fundoGradienteInverter: false,
  fundoGradienteForma: 'linear',
  fundoGradienteStops: [],
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
  fontesUsuario: [],
  fontesFavoritas: [],
  fonteEstilos: {},
  temasSalvos: [],
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
  mostrarWhatsApp: true,
  carouselAuto: true,
  carouselAtivo: false,
  carouselSize: 'medio',
  carouselEstilo: 'classico',
  carouselAnim: 'deslize',
  carouselScope: 'destaque',
  carouselSpeed: 'normal',
  carouselPosicao: 'acima',
  carouselVisiveis: '1',
  carouselItemIds: [],
  carouselCapas: {},
  carouselMostrarPreco: true,
  carouselMostrarEstoque: false,
  carouselCliqueDetalhe: true,
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
  logoMoldura: 'circular',
  logoPlaca: true,
  logoPlacaCor: 'rgba(255,255,255,0.22)',
  logoBordaCor: '#ffffff',
  logoEfeito: 'nenhum',
  logoFundoImg: 'manter',
  logoCor: '',
  logoInverter: false,
  logoTemTransparencia: false,
  heroDisposicao: 'centro',
  heroAlinhamentoTexto: 'centro',
  tituloTamanho: 'medio',
  heroAltura: 'normal',
  mostrarTitulo: false,
  mostrarSubtitulo: false,
  mostrarSlogan: true,
  mostrarSobre: true,
  heroPosicaoManual: true,
  heroPosicoes: { ...DEFAULT_HERO_POSICOES },
  heroTextos: [],
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
  base.heroTextos = getHeroTextos(base);
  base.heroPosicoes = getHeroPosicoes(base);
  base.temasSalvos = normalizeTemasSalvos(base.temasSalvos);
  base.coresTema = normalizeCoresTema(base);
  base.coresFundo = normalizeCoresFundo(base);
  if (base.fundoEstilo !== 'gradiente') base.fundoEstilo = 'solido';
  if (!['diagonal', 'horizontal', 'vertical'].includes(base.fundoGradienteDirecao)) {
    base.fundoGradienteDirecao = 'diagonal';
  }
  const fundoLook = normalizeGradientLook({
    angulo: base.fundoGradienteAngulo,
    inverter: base.fundoGradienteInverter,
    forma: base.fundoGradienteForma,
  }, base.fundoGradienteDirecao);
  base.fundoGradienteAngulo = fundoLook.angulo;
  base.fundoGradienteInverter = fundoLook.inverter;
  base.fundoGradienteForma = fundoLook.forma;
  base.fundoGradienteStops = normalizeGradientStops(base.fundoGradienteStops, base.coresFundo);
  if (base.fundoEstilo === 'gradiente') {
    base.coresFundo = base.fundoGradienteStops.map((s) => s.cor);
    if (base.coresFundo[0]) base.corFundo = base.coresFundo[0];
  }
  if (base.temaEstilo === 'cores') base.temaEstilo = 'gradiente';
  if (!['solido', 'gradiente', 'escuro'].includes(base.temaEstilo)) base.temaEstilo = 'solido';
  const temaLook = normalizeGradientLook({
    angulo: base.gradienteAngulo,
    inverter: base.gradienteInverter,
    forma: base.gradienteForma,
  }, base.gradienteDirecao);
  base.gradienteAngulo = temaLook.angulo;
  base.gradienteInverter = temaLook.inverter;
  base.gradienteForma = temaLook.forma;
  base.gradienteStops = normalizeGradientStops(base.gradienteStops, base.coresTema);
  if (base.temaEstilo === 'gradiente') {
    base.coresTema = base.gradienteStops.map((s) => s.cor);
    if (base.coresTema[0]) base.corPrincipal = base.coresTema[0];
  }
  if (base.rotuloVitrine !== 'loja' && base.rotuloVitrine !== 'catalogo') base.rotuloVitrine = 'catalogo';
  if (!['ambos', 'produtos', 'servicos'].includes(base.tipo)) base.tipo = 'ambos';
  if (base.layout === 'carrossel') {
    base.carouselAtivo = true;
    base.layout = 'vitrine';
  }
  if (!['vitrine', 'grid', 'horizontal', 'vertical', 'landing'].includes(base.layout)) base.layout = 'vitrine';
  if (!CAROUSEL_POSICOES.some((m) => m.id === base.carouselPosicao)) base.carouselPosicao = 'acima';
  if (!HERO_MOLDURAS.some((m) => m.id === base.heroMoldura)) base.heroMoldura = 'cheia';
  const legacyCut = { cartao: 'onda', vitrine: 'concha', cinta: 'degrau', envelope: 'asa', joia: 'gota', flutuante: 'nuvem' };
  if (legacyCut[base.heroSobreposicao]) base.heroSobreposicao = legacyCut[base.heroSobreposicao];
  if (!HERO_SOBREPOSICOES.some((m) => m.id === base.heroSobreposicao)) base.heroSobreposicao = 'nenhuma';
  if (!HERO_ALTURAS.some((m) => m.id === base.heroAltura)) base.heroAltura = 'normal';
  if (!CAROUSEL_SIZES.some((m) => m.id === base.carouselSize)) base.carouselSize = 'medio';
  if (!CAROUSEL_ESTILOS.some((m) => m.id === base.carouselEstilo)) base.carouselEstilo = 'classico';
  if (!CAROUSEL_ANIMS.some((m) => m.id === base.carouselAnim)) base.carouselAnim = 'deslize';
  if (!CAROUSEL_SCOPES.some((m) => m.id === base.carouselScope)) base.carouselScope = 'destaque';
  if (!CAROUSEL_SPEEDS.some((m) => m.id === base.carouselSpeed)) base.carouselSpeed = 'normal';
  if (!['1', '2', '3'].includes(String(base.carouselVisiveis))) base.carouselVisiveis = '1';
  else base.carouselVisiveis = String(base.carouselVisiveis);
  base.carouselItemIds = normalizeCarouselItemIds(base.carouselItemIds);
  base.carouselCapas = normalizeCarouselCapas(base.carouselCapas);
  if (base.carouselMostrarPreco == null) base.carouselMostrarPreco = true;
  else base.carouselMostrarPreco = !!base.carouselMostrarPreco;
  base.carouselMostrarEstoque = !!base.carouselMostrarEstoque;
  if (base.carouselCliqueDetalhe == null) base.carouselCliqueDetalhe = true;
  else base.carouselCliqueDetalhe = !!base.carouselCliqueDetalhe;
  base.logoInverter = !!base.logoInverter;
  if (base.mostrarWhatsApp == null) base.mostrarWhatsApp = true;
  if (base.carouselAtivo == null) base.carouselAtivo = false;
  else base.carouselAtivo = !!base.carouselAtivo;
  if (!LOGO_MOLDURAS.some((m) => m.id === raw?.logoMoldura)) {
    if (raw?.logoSemMoldura || raw?.logoFormato === 'livre') base.logoMoldura = 'nenhuma';
    else if (raw?.logoFormato === 'quadrado') base.logoMoldura = 'quadrada';
    else base.logoMoldura = 'circular';
  }
  if (raw?.logoPlaca == null) base.logoPlaca = base.logoMoldura !== 'nenhuma' && !raw?.logoSemMoldura;
  else base.logoPlaca = !!base.logoPlaca;
  if (!LOGO_EFEITOS.some((m) => m.id === base.logoEfeito)) base.logoEfeito = 'nenhum';
  if (!LOGO_FUNDO_IMG.some((m) => m.id === base.logoFundoImg)) base.logoFundoImg = 'manter';
  base.logoSemMoldura = base.logoMoldura === 'nenhuma' && !base.logoPlaca;
  base.logoEscala = scalePercent(base, 'logoEscala', 100);
  base.nomeEscala = scalePercent(base, 'nomeEscala', 100);
  base.tituloEscala = scalePercent(base, 'tituloEscala', 100);
  base.subtituloEscala = scalePercent(base, 'subtituloEscala', 100);
  base.sloganEscala = scalePercent(base, 'sloganEscala', 100);
  base.categoriasProdutos = normalizeCategoriasProdutos(base.categoriasProdutos);
  base.usaDominioProprio = !!base.usaDominioProprio;
  base.dominioPublico = typeof base.dominioPublico === 'string' ? base.dominioPublico.trim().toLowerCase() : '';
  base.slugPublico = typeof base.slugPublico === 'string' ? base.slugPublico.trim().toLowerCase() : '';
  base.fontesUsuario = normalizeFontesUsuario(base.fontesUsuario);
  base.fontesFavoritas = normalizeFontesFavoritas(base.fontesFavoritas, base);
  base.fonteEstilos = normalizeFonteEstilos(base);
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
      ? {
        ...d,
        visible: prev.visible !== false,
        order: typeof prev.order === 'number' ? prev.order : idx,
        descricao: prev.descricao || '',
      }
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
      return {
        ...src,
        _tipo: row.tipo,
        _order: row.order,
        _rowId: itemKey(row.tipo, row.id),
        description: src.description || src.descricao || row.descricao || '',
      };
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
  if (config?.logoTemTransparencia) return original;
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
