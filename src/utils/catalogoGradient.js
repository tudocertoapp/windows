import React from 'react';
import { Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const GRADIENTE_MAX_STOPS = 12;

export function direcaoToAngulo(direcao) {
  if (direcao === 'horizontal') return 90;
  if (direcao === 'vertical') return 180;
  return 135;
}

export function clampAngulo(n, fallback = 135) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return ((v % 360) + 360) % 360;
}

export function clampStopPos(n, fallback = 0) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, v));
}

export function clampPeso(n, fallback = 50) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(90, Math.max(10, v));
}

export function normalizeGradientLook(raw, direcaoLegacy) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const forma = src.forma === 'radial' || src.forma === 'arredondado' ? 'radial' : 'linear';
  const fallback = direcaoToAngulo(direcaoLegacy);
  return {
    forma,
    angulo: src.angulo != null && src.angulo !== '' ? clampAngulo(src.angulo, fallback) : fallback,
    inverter: !!src.inverter,
  };
}

const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX3 = /^#([0-9a-f]{3})$/i;

export function hexStopColor(raw, fallback = '#64748b') {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return fallback;
  if (!s.startsWith('#')) s = `#${s}`;
  if (HEX6.test(s)) return s;
  const m = s.match(HEX3);
  if (m) {
    const h = m[1];
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return fallback;
}

function newStopId() {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function coresFromLegacy(cores) {
  const list = (Array.isArray(cores) ? cores : []).map((c) => hexStopColor(c, '')).filter(Boolean);
  return list;
}

export function stopsFromCores(cores) {
  const list = coresFromLegacy(cores);
  const safe = list.length ? list : ['#0f172a', '#64748b'];
  if (safe.length === 1) return [
    { id: 'st_0', cor: safe[0], pos: 0, peso: 50 },
    { id: 'st_1', cor: safe[0], pos: 100, peso: 50 },
  ];
  return safe.slice(0, GRADIENTE_MAX_STOPS).map((cor, i, arr) => ({
    id: `st_${i}`,
    cor,
    pos: Math.round((i / (arr.length - 1)) * 100),
    peso: 50,
  }));
}

export function normalizeGradientStops(rawStops, coresFallback) {
  const src = Array.isArray(rawStops) ? rawStops : [];
  const parsed = src.map((s, i) => {
    if (typeof s === 'string') {
      return { id: `leg_${i}`, cor: hexStopColor(s, ''), pos: null, peso: 50 };
    }
    if (!s || typeof s !== 'object') return null;
    return {
      id: String(s.id || `leg_${i}`),
      cor: hexStopColor(s.cor || s.color || s.hex, ''),
      pos: s.pos != null && s.pos !== '' ? clampStopPos(s.pos, null) : null,
      peso: clampPeso(s.peso ?? s.mid ?? s.intensity, 50),
    };
  }).filter((s) => s && s.cor);
  if (parsed.length < 2) return stopsFromCores(coresFallback);
  const withPos = parsed.map((s, i, arr) => ({
    ...s,
    id: s.id || newStopId(),
    pos: s.pos == null ? Math.round((i / (arr.length - 1)) * 100) : s.pos,
    peso: clampPeso(s.peso, 50),
  }));
  withPos.sort((a, b) => a.pos - b.pos || a.id.localeCompare(b.id));
  const seen = new Set();
  const unique = withPos.filter((s) => {
    if (seen.has(s.id)) {
      s.id = newStopId();
    }
    seen.add(s.id);
    return true;
  }).slice(0, GRADIENTE_MAX_STOPS);
  if (unique.length && unique[0].pos > 0) unique[0] = { ...unique[0], pos: unique[0].pos };
  return unique;
}

export function invertGradientStops(stops) {
  const list = normalizeGradientStops(stops);
  return list
    .map((s) => ({ ...s, pos: 100 - s.pos, peso: 100 - (s.peso || 50) }))
    .sort((a, b) => a.pos - b.pos);
}

export function mixHex(a, b, t) {
  const pa = hexStopColor(a, '#000000');
  const pb = hexStopColor(b, '#ffffff');
  const k = Math.min(1, Math.max(0, Number(t) || 0));
  const ra = parseInt(pa.slice(1, 3), 16);
  const ga = parseInt(pa.slice(3, 5), 16);
  const ba = parseInt(pa.slice(5, 7), 16);
  const rb = parseInt(pb.slice(1, 3), 16);
  const gb = parseInt(pb.slice(3, 5), 16);
  const bb = parseInt(pb.slice(5, 7), 16);
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(ra + (rb - ra) * k)}${h(ga + (gb - ga) * k)}${h(ba + (bb - ba) * k)}`;
}

export function colorAtStops(stops, pos) {
  const list = normalizeGradientStops(stops);
  const p = clampStopPos(pos, 0);
  if (p <= list[0].pos) return list[0].cor;
  const last = list[list.length - 1];
  if (p >= last.pos) return last.cor;
  for (let i = 0; i < list.length - 1; i += 1) {
    const a = list[i];
    const b = list[i + 1];
    if (p >= a.pos && p <= b.pos) {
      const span = Math.max(1, b.pos - a.pos);
      const t = (p - a.pos) / span;
      const mid = (a.peso || 50) / 100;
      const u = t < mid
        ? (t / Math.max(0.001, mid)) * 0.5
        : 0.5 + ((t - mid) / Math.max(0.001, 1 - mid)) * 0.5;
      return mixHex(a.cor, b.cor, u);
    }
  }
  return last.cor;
}

export function expandStops(stops) {
  const list = normalizeGradientStops(stops);
  const out = [];
  list.forEach((s, i) => {
    out.push({ cor: s.cor, loc: s.pos / 100 });
    if (i < list.length - 1) {
      const n = list[i + 1];
      const span = n.pos - s.pos;
      if (span > 1) {
        const midPos = s.pos + span * ((s.peso || 50) / 100);
        out.push({ cor: mixHex(s.cor, n.cor, 0.5), loc: midPos / 100 });
      }
    }
  });
  out.sort((a, b) => a.loc - b.loc);
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].loc <= out[i - 1].loc) out[i] = { ...out[i], loc: Math.min(1, out[i - 1].loc + 0.0008) };
  }
  return out;
}

export function resolveGradientStops(stops, cores, look) {
  const base = normalizeGradientStops(stops, cores);
  return look?.inverter ? invertGradientStops(base) : base;
}

export function cssFromStops(stops, look) {
  const expanded = expandStops(stops);
  const parts = expanded.map((s) => `${s.cor} ${Math.round(s.loc * 1000) / 10}%`);
  if (look?.forma === 'radial') return `radial-gradient(circle at center, ${parts.join(', ')})`;
  return `linear-gradient(${clampAngulo(look?.angulo, 135)}deg, ${parts.join(', ')})`;
}

export function nativeFromStops(stops) {
  const expanded = expandStops(stops);
  const colors = expanded.map((s) => s.cor);
  const locations = expanded.map((s) => s.loc);
  if (colors.length < 2) {
    const c = colors[0] || '#64748b';
    return { colors: [c, c], locations: [0, 1] };
  }
  return { colors, locations };
}

export function addGradientStop(stops, pos, cor) {
  const list = normalizeGradientStops(stops);
  if (list.length >= GRADIENTE_MAX_STOPS) return list;
  const p = clampStopPos(pos, 50);
  const color = hexStopColor(cor, colorAtStops(list, p));
  return [...list, { id: newStopId(), cor: color, pos: p, peso: 50 }].sort((a, b) => a.pos - b.pos);
}

export function patchGradientStop(stops, id, patch) {
  const list = normalizeGradientStops(stops);
  return list.map((s) => (s.id === id ? {
    ...s,
    ...patch,
    cor: patch.cor != null ? hexStopColor(patch.cor, s.cor) : s.cor,
    pos: patch.pos != null ? clampStopPos(patch.pos, s.pos) : s.pos,
    peso: patch.peso != null ? clampPeso(patch.peso, s.peso) : s.peso,
  } : s)).sort((a, b) => a.pos - b.pos);
}

export function removeGradientStop(stops, id) {
  const list = normalizeGradientStops(stops);
  if (list.length <= 2) return list;
  const next = list.filter((s) => s.id !== id);
  return next.length >= 2 ? next : list;
}

export function gradientColors(cores, inverter) {
  const list = coresFromLegacy(cores);
  const safe = list.length ? list : ['#0f172a', '#64748b'];
  return inverter ? [...safe].reverse() : safe;
}

export function gradientPoints(angulo) {
  const deg = clampAngulo(angulo, 135);
  const rad = (deg * Math.PI) / 180;
  const x = Math.sin(rad);
  const y = -Math.cos(rad);
  return {
    start: { x: 0.5 - x * 0.5, y: 0.5 - y * 0.5 },
    end: { x: 0.5 + x * 0.5, y: 0.5 + y * 0.5 },
  };
}

export function cssGradientImage(cores, look, stops) {
  const resolved = resolveGradientStops(stops, cores, look);
  return cssFromStops(resolved, look);
}

export function CatalogoGradientFill({ cores, stops, look, style, children }) {
  const resolved = resolveGradientStops(stops, cores, look);
  if (Platform.OS === 'web') {
    return (
      <View style={[style, { backgroundImage: cssFromStops(resolved, look) }]}>
        {children}
      </View>
    );
  }
  const pts = gradientPoints(look?.angulo ?? 135);
  const native = nativeFromStops(resolved);
  return (
    <LinearGradient colors={native.colors} locations={native.locations} start={pts.start} end={pts.end} style={style}>
      {children}
    </LinearGradient>
  );
}
