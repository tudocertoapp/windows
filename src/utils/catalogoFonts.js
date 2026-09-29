import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { direcaoToAngulo, clampAngulo, cssGradientImage, normalizeGradientStops } from './catalogoGradient';

export const HERO_COLOR_KEYS = {
  nome: 'corFonteNome',
  titulo: 'corFonteTitulo',
  subtitulo: 'corFonteSubtitulo',
  slogan: 'corFonteSlogan',
};

export const HERO_FONT_KEYS = {
  nome: 'fonteNome',
  titulo: 'fonteTitulo',
  subtitulo: 'fonteSubtitulo',
  slogan: 'fonteSlogan',
};

export const HERO_TEXT_IDS = ['nome', 'titulo', 'subtitulo', 'slogan'];
export const HERO_FX_IDS = ['nome', 'titulo', 'subtitulo', 'slogan', 'logo'];

export const FX_DIR_IDS = [
  'cima-esq', 'cima', 'cima-dir',
  'esquerda', 'centro', 'direita',
  'baixo-esq', 'baixo', 'baixo-dir',
];

export const FONTE_FILL_OPTS = [
  { id: 'solido', label: 'Sólido', icon: 'color-fill-outline' },
  { id: 'gradiente', label: 'Gradiente', icon: 'color-filter-outline' },
  { id: 'vazado', label: 'Vazado', icon: 'ellipse-outline' },
];

const HEX_OK = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function hexOk(v, fallback) {
  return HEX_OK.test(String(v || '')) ? String(v).toLowerCase() : fallback;
}

function companionColor(hex) {
  const h = hexOk(hex, '#ffffff');
  if (h === '#ffffff' || h === '#fff') return '#60a5fa';
  if (h === '#000000' || h === '#000') return '#fbbf24';
  return '#ffffff';
}

function clampInt(n, min, max, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function normalizeFonteEstilo(raw, solidColor) {
  const fill = ['solido', 'gradiente', 'vazado'].includes(raw?.fill) ? raw.fill : 'solido';
  const solid = hexOk(solidColor, '#ffffff');
  const coresRaw = Array.isArray(raw?.cores) ? raw.cores.map((c) => hexOk(c, '')).filter(Boolean) : [];
  const cores = coresRaw.length >= 2
    ? coresRaw.slice(0, 12)
    : [solid, companionColor(solid)];
  const stops = normalizeGradientStops(raw?.stops, cores);
  const strokeW = Math.min(8, Math.max(1, Math.round(Number(raw?.strokeW) || 2)));
  return {
    fill,
    cores: stops.map((s) => s.cor),
    stops,
    direcao: ['horizontal', 'vertical', 'diagonal'].includes(raw?.direcao) ? raw.direcao : 'horizontal',
    angulo: raw?.angulo != null ? clampAngulo(raw.angulo, direcaoToAngulo(raw?.direcao)) : direcaoToAngulo(raw?.direcao),
    inverter: !!raw?.inverter,
    forma: raw?.forma === 'radial' || raw?.forma === 'arredondado' ? 'radial' : 'linear',
    sombra: !!raw?.sombra,
    sombraCor: hexOk(raw?.sombraCor, '#000000'),
    luz: !!raw?.luz,
    contorno: fill === 'vazado' ? true : !!raw?.contorno,
    neon: !!raw?.neon,
    relevo: !!raw?.relevo,
    halo: !!raw?.halo,
    brilho: !!raw?.brilho,
    extrude: !!raw?.extrude,
    reflexo: !!raw?.reflexo,
    desfoque: !!raw?.desfoque,
    vidro: !!raw?.vidro,
    intensidade: clampInt(raw?.intensidade, 1, 10, 5),
    fxTamanho: clampInt(raw?.fxTamanho ?? raw?.tamanho, 1, 10, 5),
    fxDir: FX_DIR_IDS.includes(raw?.fxDir) ? raw.fxDir : 'centro',
    fxPos: FX_DIR_IDS.includes(raw?.fxPos) ? raw.fxPos : 'centro',
    fxCor: hexOk(raw?.fxCor, solid),
    stroke: hexOk(raw?.stroke, solid),
    strokeW,
  };
}

function extraTextEntries(config) {
  return Array.isArray(config?.heroTextos)
    ? config.heroTextos.filter((t) => t && typeof t.id === 'string' && t.id.startsWith('txt_'))
    : [];
}

function heroFillColor(config, id) {
  if (id === 'logo') return config?.logoCor || '#ffffff';
  if (HERO_COLOR_KEYS[id]) return config?.[HERO_COLOR_KEYS[id]] || '#ffffff';
  const extra = extraTextEntries(config).find((t) => t.id === id);
  return extra?.cor || '#ffffff';
}

export function normalizeFonteEstilos(config) {
  const raw = config?.fonteEstilos && typeof config.fonteEstilos === 'object' ? config.fonteEstilos : {};
  const out = {};
  const ids = [...HERO_FX_IDS, ...extraTextEntries(config).map((t) => t.id)];
  ids.forEach((id) => {
    out[id] = normalizeFonteEstilo(raw[id], heroFillColor(config, id));
  });
  return out;
}

function cssGradient(cores, fx) {
  return cssGradientImage(cores, {
    forma: fx?.forma,
    angulo: fx?.angulo,
    inverter: fx?.inverter,
  }, fx?.stops);
}

export function fxDirVec(id) {
  switch (id) {
    case 'cima': return { x: 0, y: -1 };
    case 'baixo': return { x: 0, y: 1 };
    case 'esquerda': return { x: -1, y: 0 };
    case 'direita': return { x: 1, y: 0 };
    case 'cima-esq': return { x: -1, y: -1 };
    case 'cima-dir': return { x: 1, y: -1 };
    case 'baixo-esq': return { x: -1, y: 1 };
    case 'baixo-dir': return { x: 1, y: 1 };
    default: return { x: 0, y: 0 };
  }
}

function hexToRgba(hex, alpha) {
  const h = hexOk(hex, '#ffffff').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, Number(alpha) || 0));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
}

export function fxMetrics(fx) {
  const i = clampInt(fx?.intensidade, 1, 10, 5);
  const size = clampInt(fx?.fxTamanho, 1, 10, 5);
  const sizeMul = size / 5;
  const intMul = i / 5;
  const d = fxDirVec(fx?.fxDir);
  const p = fxDirVec(fx?.fxPos);
  const dx = Math.round((d.x || (fx?.sombra || fx?.relevo || fx?.extrude ? 0.35 : 0)) * 7 * sizeMul);
  const dy = Math.round((d.y || (fx?.sombra || fx?.relevo || fx?.extrude ? 0.7 : 0)) * 7 * sizeMul);
  return {
    i,
    size,
    mul: sizeMul,
    intMul,
    dx,
    dy,
    posX: Math.round(p.x * 12 * sizeMul),
    posY: Math.round(p.y * 12 * sizeMul),
    blur: Math.round((fx?.desfoque ? 28 : 12) * sizeMul),
    glow: Math.round(16 * sizeMul),
  };
}

function fxPadStyle(fx, sw) {
  const m = fxMetrics(fx);
  const pad = Math.max(
    sw + 6,
    8 + Math.abs(m.dx) + Math.abs(m.posX) + Math.round(m.glow * 0.4),
    8 + Math.abs(m.dy) + Math.abs(m.posY) + Math.round(m.glow * 0.4),
    fx.fill === 'vazado' ? 12 : 0,
    fx.reflexo ? 18 : 0,
  );
  const style = {
    paddingHorizontal: pad,
    paddingVertical: Math.max(6, Math.round(pad * 0.55)),
    overflow: 'visible',
  };
  if (Platform.OS === 'web') {
    style.boxDecorationBreak = 'clone';
    style.WebkitBoxDecorationBreak = 'clone';
  }
  return style;
}

function hasBehindFx(fx) {
  return !!(fx.luz || fx.neon || fx.sombra || fx.relevo || fx.halo || fx.brilho || fx.extrude || fx.desfoque);
}

export function getHeroTextFxLayers(config, id, fillColor) {
  const fx = normalizeFonteEstilos(config)[id] || normalizeFonteEstilo(null, fillColor);
  const solid = hexOk(fillColor, '#ffffff');
  const cores = fx.cores?.length >= 2 ? fx.cores : [solid, companionColor(solid)];
  const stroke = fx.stroke || solid;
  const glowC = fx.fxCor || solid;
  const sw = fx.strokeW || 2;
  const pad = fxPadStyle(fx, sw);
  const m = fxMetrics(fx);

  const front = { ...pad, color: solid };
  if (fx.fill === 'vazado') {
    front.color = 'transparent';
    if (Platform.OS === 'web') {
      front.WebkitTextFillColor = 'transparent';
      front.WebkitTextStroke = `${sw}px ${stroke}`;
      front.paintOrder = 'stroke fill';
    }
  } else if (fx.fill === 'gradiente') {
    if (Platform.OS === 'web') {
      front.backgroundImage = cssGradient(cores, fx);
      front.backgroundClip = 'text';
      front.WebkitBackgroundClip = 'text';
      front.WebkitTextFillColor = 'transparent';
      front.color = 'transparent';
    } else {
      front.color = cores[0];
    }
  } else if (fx.vidro && Platform.OS === 'web') {
    front.WebkitTextFillColor = `${solid}99`;
    front.color = `${solid}99`;
  } else if (Platform.OS === 'web') {
    front.WebkitTextFillColor = solid;
  }

  const outlineBehind = fx.contorno && fx.fill !== 'vazado';
  const glow = hasBehindFx(fx);
  let reflect = null;
  if (fx.reflexo) {
    reflect = {
      ...pad,
      color: solid,
      opacity: 0.28,
      transform: [{ translateY: Math.round(10 + m.i) }, { scaleY: -0.72 }],
    };
    if (Platform.OS === 'web') {
      reflect.WebkitTextFillColor = `${solid}66`;
      reflect.maskImage = 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)';
      reflect.WebkitMaskImage = 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)';
    }
  }

  if (!glow && !outlineBehind) {
    return { front, back: null, reflect };
  }

  const back = { ...pad, color: fx.neon ? glowC : (fx.luz || fx.halo ? '#ffffff' : solid) };
  if (m.posX || m.posY) {
    back.transform = [{ translateX: m.posX }, { translateY: m.posY }];
  }
  const shadows = [];
  const a = m.intMul;
  if (fx.sombra) {
    shadows.push(`${m.dx || 3}px ${m.dy || 6}px ${m.blur}px ${hexToRgba(fx.sombraCor || '#000000', 0.22 + a * 0.45)}`);
  }
  if (fx.luz) {
    shadows.push(
      `${m.dx}px ${m.dy}px ${Math.round(8 * m.mul)}px rgba(255,255,255,${0.4 + a * 0.55})`,
      `${m.dx}px ${m.dy}px ${Math.round(20 * m.mul)}px rgba(255,255,255,${0.22 + a * 0.48})`,
      `${m.dx}px ${m.dy}px ${Math.round(36 * m.mul)}px rgba(255,255,255,${0.1 + a * 0.28})`,
    );
  }
  if (fx.neon) {
    shadows.push(
      `${m.dx}px ${m.dy}px ${Math.round(8 * m.mul)}px ${hexToRgba(glowC, 0.4 + a * 0.6)}`,
      `${m.dx}px ${m.dy}px ${Math.round(18 * m.mul)}px ${hexToRgba(glowC, 0.28 + a * 0.5)}`,
      `${m.dx}px ${m.dy}px ${Math.round(32 * m.mul)}px ${hexToRgba(stroke, 0.2 + a * 0.4)}`,
      `${m.dx}px ${m.dy}px ${Math.round(48 * m.mul)}px ${hexToRgba(stroke, 0.1 + a * 0.28)}`,
    );
  }
  if (fx.halo) {
    shadows.push(
      `0 0 ${Math.round(14 * m.mul)}px ${hexToRgba(glowC, 0.4 + a * 0.55)}`,
      `0 0 ${Math.round(28 * m.mul)}px ${hexToRgba(glowC, 0.22 + a * 0.4)}`,
      `0 0 ${Math.round(44 * m.mul)}px ${hexToRgba(glowC, 0.1 + a * 0.25)}`,
    );
  }
  if (fx.brilho) {
    shadows.push(
      `${-m.dx}px ${-m.dy}px ${Math.round(6 * m.mul)}px rgba(255,255,255,${0.45 + a * 0.5})`,
      `${-(m.dx || 2)}px ${-(m.dy || 2)}px ${Math.round(14 * m.mul)}px rgba(255,255,255,${0.2 + a * 0.4})`,
    );
  }
  if (fx.relevo) shadows.push(`${m.dx || 2}px ${m.dy || 3}px 4px rgba(0,0,0,${0.25 + a * 0.35})`);
  if (fx.extrude) {
    const steps = Math.max(3, Math.round(m.size * 0.7));
    const sx = m.dx || 2;
    const sy = m.dy || 2;
    for (let s = 1; s <= steps; s += 1) {
      shadows.push(`${Math.round((sx * s) / 2)}px ${Math.round((sy * s) / 2)}px 0 rgba(0,0,0,${0.12 + a * 0.22 + s * 0.02})`);
    }
  }
  if (fx.desfoque && !shadows.length) {
    shadows.push(`0 0 ${m.blur}px ${hexToRgba(glowC, 0.25 + a * 0.45)}`);
  }

  if (Platform.OS === 'web') {
    if (fx.fill === 'vazado' || fx.luz || fx.neon || fx.halo || fx.brilho) {
      back.WebkitTextFillColor = fx.luz || fx.halo ? 'rgba(255,255,255,0.32)' : (fx.neon ? `${glowC}55` : 'transparent');
      back.color = 'transparent';
    }
    if (outlineBehind) {
      back.WebkitTextStroke = `${sw + 1}px ${stroke}`;
      back.paintOrder = 'stroke fill';
    }
    if (fx.fill === 'vazado') {
      back.WebkitTextStroke = `${Math.max(sw, 2) + 2}px ${stroke}`;
    }
    if (shadows.length) back.textShadow = shadows.join(', ');
    if (fx.desfoque) back.filter = `blur(${Math.max(0.4, m.mul)}px)`;
  } else {
    back.textShadowColor = fx.luz || fx.neon || fx.halo ? glowC : (fx.sombraCor || 'rgba(0,0,0,0.55)');
    back.textShadowOffset = { width: m.dx || 0, height: m.dy || 0 };
    back.textShadowRadius = fx.luz || fx.neon || fx.halo ? m.glow : m.blur;
  }

  return { front, back, reflect };
}

export function getHeroObjectFx(config, id = 'logo') {
  const fx = normalizeFonteEstilos(config)[id] || normalizeFonteEstilo(null, config?.logoCor || '#ffffff');
  const m = fxMetrics(fx);
  const color = fx.fxCor || '#ffffff';
  const filters = [];
  if (fx.sombra) filters.push(`drop-shadow(${m.dx || 3}px ${m.dy || 6}px ${m.blur}px ${hexToRgba(fx.sombraCor || '#000000', 0.5)})`);
  if (fx.luz) {
    filters.push(`drop-shadow(${m.dx}px ${m.dy}px ${Math.round(10 * m.mul)}px rgba(255,255,255,0.95))`);
    filters.push(`drop-shadow(${m.dx}px ${m.dy}px ${Math.round(24 * m.mul)}px rgba(255,255,255,0.55))`);
  }
  if (fx.neon) {
    filters.push(`drop-shadow(${m.dx}px ${m.dy}px ${Math.round(8 * m.mul)}px ${color})`);
    filters.push(`drop-shadow(${m.dx}px ${m.dy}px ${Math.round(22 * m.mul)}px ${color})`);
  }
  if (fx.halo) filters.push(`drop-shadow(0 0 ${Math.round(18 * m.mul)}px ${color})`);
  if (fx.brilho) filters.push(`drop-shadow(${-m.dx}px ${-m.dy}px ${Math.round(8 * m.mul)}px #ffffff)`);
  if (fx.relevo || fx.extrude) filters.push(`drop-shadow(${m.dx || 3}px ${m.dy || 3}px 0 rgba(0,0,0,0.4))`);
  const has = hasBehindFx(fx) || fx.reflexo;
  return {
    has,
    glow: filters.length ? {
      position: 'absolute',
      left: m.posX,
      top: m.posY,
      zIndex: 0,
      filter: `${filters.join(' ')}${fx.desfoque ? ` blur(${Math.max(0.6, m.mul)}px)` : ''}`,
      opacity: Math.max(0.18, Math.min(1, 0.2 + 0.8 * m.intMul)),
      pointerEvents: 'none',
    } : null,
    front: { position: 'relative', zIndex: 1, overflow: 'visible' },
    reflect: fx.reflexo ? { transform: [{ scaleY: -0.7 }, { translateY: -8 }], opacity: 0.28 } : null,
  };
}

export function getHeroTextFxStyle(config, id, fillColor) {
  const { front, back } = getHeroTextFxLayers(config, id, fillColor);
  if (!back) return front;
  return { ...front, ...(back.textShadow ? { textShadow: back.textShadow } : null) };
}

export const CATALOGO_FONT_GROUPS = [
  { id: 'manuscrito', label: 'Manuscrito' },
  { id: 'estetica', label: 'Estética' },
  { id: 'seria', label: 'Sérias' },
];

export const CATALOGO_FONTES = [
  { id: 'system', label: 'Padrão do sistema', family: undefined, group: 'seria' },

  { id: 'dancing', label: 'Dancing Script', family: 'Dancing Script', google: 'Dancing+Script:wght@400;700', group: 'manuscrito' },
  { id: 'great-vibes', label: 'Great Vibes', family: 'Great Vibes', google: 'Great+Vibes', group: 'manuscrito' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico', google: 'Pacifico', group: 'manuscrito' },
  { id: 'satisfy', label: 'Satisfy', family: 'Satisfy', google: 'Satisfy', group: 'manuscrito' },
  { id: 'allura', label: 'Allura', family: 'Allura', google: 'Allura', group: 'manuscrito' },
  { id: 'sacramento', label: 'Sacramento', family: 'Sacramento', google: 'Sacramento', group: 'manuscrito' },
  { id: 'alex-brush', label: 'Alex Brush', family: 'Alex Brush', google: 'Alex+Brush', group: 'manuscrito' },
  { id: 'caveat', label: 'Caveat', family: 'Caveat', google: 'Caveat:wght@400;700', group: 'manuscrito' },
  { id: 'homemade', label: 'Homemade Apple', family: 'Homemade Apple', google: 'Homemade+Apple', group: 'manuscrito' },
  { id: 'indie', label: 'Indie Flower', family: 'Indie Flower', google: 'Indie+Flower', group: 'manuscrito' },
  { id: 'shadows', label: 'Shadows Into Light', family: 'Shadows Into Light', google: 'Shadows+Into+Light', group: 'manuscrito' },
  { id: 'marck', label: 'Marck Script', family: 'Marck Script', google: 'Marck+Script', group: 'manuscrito' },
  { id: 'amatic', label: 'Amatic SC', family: 'Amatic SC', google: 'Amatic+SC:wght@400;700', group: 'manuscrito' },

  { id: 'playfair', label: 'Playfair Display', family: 'Playfair Display', google: 'Playfair+Display:wght@400;700', group: 'estetica' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: 'Cormorant Garamond', google: 'Cormorant+Garamond:wght@400;700', group: 'estetica' },
  { id: 'cinzel', label: 'Cinzel', family: 'Cinzel', google: 'Cinzel:wght@400;700', group: 'estetica' },
  { id: 'italiana', label: 'Italiana', family: 'Italiana', google: 'Italiana', group: 'estetica' },
  { id: 'poiret', label: 'Poiret One', family: 'Poiret One', google: 'Poiret+One', group: 'estetica' },
  { id: 'josefin', label: 'Josefin Sans', family: 'Josefin Sans', google: 'Josefin+Sans:wght@400;700', group: 'estetica' },
  { id: 'tenor', label: 'Tenor Sans', family: 'Tenor Sans', google: 'Tenor+Sans', group: 'estetica' },
  { id: 'yeseva', label: 'Yeseva One', family: 'Yeseva One', google: 'Yeseva+One', group: 'estetica' },
  { id: 'abril', label: 'Abril Fatface', family: 'Abril Fatface', google: 'Abril+Fatface', group: 'estetica' },
  { id: 'unna', label: 'Unna', family: 'Unna', google: 'Unna:wght@400;700', group: 'estetica' },
  { id: 'cardo', label: 'Cardo', family: 'Cardo', google: 'Cardo:wght@400;700', group: 'estetica' },
  { id: 'parisienne', label: 'Parisienne', family: 'Parisienne', google: 'Parisienne', group: 'estetica' },
  { id: 'philosopher', label: 'Philosopher', family: 'Philosopher', google: 'Philosopher:wght@400;700', group: 'estetica' },

  { id: 'inter', label: 'Inter', family: 'Inter', google: 'Inter:wght@400;700', group: 'seria' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto', google: 'Roboto:wght@400;700', group: 'seria' },
  { id: 'open-sans', label: 'Open Sans', family: 'Open Sans', google: 'Open+Sans:wght@400;700', group: 'seria' },
  { id: 'lato', label: 'Lato', family: 'Lato', google: 'Lato:wght@400;700', group: 'seria' },
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', google: 'Montserrat:wght@400;700', group: 'seria' },
  { id: 'merriweather', label: 'Merriweather', family: 'Merriweather', google: 'Merriweather:wght@400;700', group: 'seria' },
  { id: 'libre', label: 'Libre Baskerville', family: 'Libre Baskerville', google: 'Libre+Baskerville:wght@400;700', group: 'seria' },
  { id: 'ibm-plex', label: 'IBM Plex Sans', family: 'IBM Plex Sans', google: 'IBM+Plex+Sans:wght@400;700', group: 'seria' },
  { id: 'work-sans', label: 'Work Sans', family: 'Work Sans', google: 'Work+Sans:wght@400;700', group: 'seria' },
  { id: 'nunito', label: 'Nunito', family: 'Nunito', google: 'Nunito:wght@400;700', group: 'seria' },
  { id: 'pt-serif', label: 'PT Serif', family: 'PT Serif', google: 'PT+Serif:wght@400;700', group: 'seria' },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', google: 'Oswald:wght@400;700', group: 'seria' },
  { id: 'raleway', label: 'Raleway', family: 'Raleway', google: 'Raleway:wght@400;700', group: 'seria' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', google: 'Poppins:wght@400;700', group: 'seria' },
];

export const MAX_FONTES_USUARIO = 5;
const FONT_EXTS = {
  ttf: { mime: 'font/ttf', format: 'truetype' },
  otf: { mime: 'font/otf', format: 'opentype' },
  woff: { mime: 'font/woff', format: 'woff' },
  woff2: { mime: 'font/woff2', format: 'woff2' },
};

export function normalizeFontesUsuario(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const list = [];
  for (const item of raw) {
    const id = String(item?.id || '').trim();
    const family = String(item?.family || '').trim();
    const url = String(item?.url || '').trim();
    if (!id || !family || !url || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      label: String(item.label || 'Fonte enviada').trim().slice(0, 40) || 'Fonte enviada',
      family,
      url,
      format: String(item.format || '').trim() || undefined,
      createdAt: item.createdAt || null,
    });
    if (list.length >= MAX_FONTES_USUARIO) break;
  }
  return list;
}

export function normalizeFontesFavoritas(raw, config) {
  if (!Array.isArray(raw)) return [];
  const userIds = new Set(normalizeFontesUsuario(config?.fontesUsuario).map((f) => f.id));
  const appIds = new Set(CATALOGO_FONTES.map((f) => f.id));
  const seen = new Set();
  const list = [];
  for (const id of raw) {
    const key = String(id || '').trim();
    if (!key || seen.has(key)) continue;
    if (!appIds.has(key) && !userIds.has(key)) continue;
    seen.add(key);
    list.push(key);
  }
  return list;
}

export function getCatalogoFonte(id, config) {
  const user = normalizeFontesUsuario(config?.fontesUsuario).find((f) => f.id === id);
  if (user) return { ...user, group: 'usuario' };
  return CATALOGO_FONTES.find((f) => f.id === id) || CATALOGO_FONTES[0];
}

export function getHeroFontFamily(config, id, previewFontId) {
  const extra = extraTextEntries(config).find((t) => t.id === id);
  const chosen = previewFontId || (extra ? extra.fonte : config?.[HERO_FONT_KEYS[id]]);
  if (!chosen && !previewFontId) return undefined;
  return getCatalogoFonte(chosen, config).family;
}

export function remapHeroFontsAfterDelete(config, removedId) {
  if (!removedId) return {};
  const patch = {};
  Object.values(HERO_FONT_KEYS).forEach((key) => {
    if (config?.[key] === removedId) patch[key] = 'system';
  });
  const textos = extraTextEntries(config);
  if (textos.some((t) => t.fonte === removedId)) {
    patch.heroTextos = textos.map((t) => (t.fonte === removedId ? { ...t, fonte: 'system' } : t));
  }
  return patch;
}

export function ensureCatalogoGoogleFonts() {
  if (typeof document === 'undefined') return;
  const families = CATALOGO_FONTES.filter((f) => f.google).map((f) => `family=${f.google}`).join('&');
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  let link = document.getElementById('catalogo-google-fonts');
  if (!link) {
    link = document.createElement('link');
    link.id = 'catalogo-google-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
}

function cssFormat(format) {
  if (format === 'ttf' || format === 'truetype') return 'truetype';
  if (format === 'otf' || format === 'opentype') return 'opentype';
  if (format === 'woff') return 'woff';
  if (format === 'woff2') return 'woff2';
  return '';
}

export function ensureCatalogoUserFonts(fontesUsuario) {
  if (typeof document === 'undefined') return;
  const fonts = normalizeFontesUsuario(fontesUsuario);
  let style = document.getElementById('catalogo-user-fonts');
  if (!fonts.length) {
    if (style) style.textContent = '';
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = 'catalogo-user-fonts';
    document.head.appendChild(style);
  }
  style.textContent = fonts.map((f) => {
    const fmt = cssFormat(f.format);
    const src = fmt ? `url('${f.url}') format('${fmt}')` : `url('${f.url}')`;
    return `@font-face{font-family:'${f.family}';src:${src};font-display:swap;font-weight:100 900;}`;
  }).join('\n');
}

export function ensureCatalogoFonts(config) {
  ensureCatalogoGoogleFonts();
  ensureCatalogoUserFonts(config?.fontesUsuario);
}

function extFromName(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function fontFileMeta(file) {
  const name = file?.name || 'fonte';
  const ext = extFromName(name);
  const spec = FONT_EXTS[ext];
  if (!spec) return null;
  if (file?.size && file.size > 2.5 * 1024 * 1024) return null;
  const label = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'Fonte enviada';
  return { ext, mime: spec.mime, format: spec.format, label };
}

export async function uploadCatalogoUserFont(file, userId) {
  if (!userId) throw new Error('Entre na conta para enviar uma fonte.');
  const meta = fontFileMeta(file);
  if (!meta) throw new Error('Use um arquivo .ttf, .otf, .woff ou .woff2 de até 2,5 MB.');
  const stamp = Date.now();
  const id = `user-${stamp}`;
  const family = `TCUserFont_${stamp}`;
  const path = `${userId}/catalogo-fonts/${id}.${meta.ext}`;
  const buf = await file.arrayBuffer();
  const { error } = await supabase.storage.from('avatars').upload(path, buf, {
    contentType: meta.mime,
    upsert: true,
  });
  if (error) {
    const retry = await supabase.storage.from('avatars').upload(path, buf, {
      contentType: 'application/octet-stream',
      upsert: true,
    });
    if (retry.error) throw retry.error;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return {
    id,
    label: meta.label,
    family,
    url: data.publicUrl,
    format: meta.format,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteCatalogoUserFontFile(font, userId) {
  if (!userId || !font?.url) return;
  try {
    const marker = `/${userId}/catalogo-fonts/`;
    const idx = String(font.url).indexOf(marker);
    if (idx < 0) return;
    const path = `${userId}/catalogo-fonts/${decodeURIComponent(String(font.url).slice(idx + marker.length).split('?')[0])}`;
    await supabase.storage.from('avatars').remove([path]);
  } catch (_) {}
}
