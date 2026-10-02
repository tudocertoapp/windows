export const MIN_CARDS_PER_ROW = 1;
export const MAX_CARDS_PER_ROW = 4;
export const DEFAULT_CARDS_PER_ROW = 3;

export function clampCardsPerRow(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return DEFAULT_CARDS_PER_ROW;
  return Math.min(MAX_CARDS_PER_ROW, Math.max(MIN_CARDS_PER_ROW, Math.round(v)));
}

/** Grupos visuais: agenda pode empilhar eventos/tarefas à direita se vierem juntos na ordem. */
export function buildInicioDesktopRows(order, cardsPerRow = DEFAULT_CARDS_PER_ROW) {
  const cols = clampCardsPerRow(cardsPerRow);
  const list = Array.isArray(order) ? order.filter(Boolean) : [];
  const rows = [];
  let i = 0;
  while (i < list.length) {
    if (list[i] === 'agenda' && cols > 1) {
      const ids = [list[i]];
      i += 1;
      while (i < list.length && (list[i] === 'agendamentos' || list[i] === 'proximos') && ids.length < cols) {
        ids.push(list[i]);
        i += 1;
      }
      rows.push({ ids, kind: ids.length > 1 ? 'agenda' : 'flow' });
      continue;
    }
    const ids = list.slice(i, Math.min(i + cols, list.length));
    i += ids.length;
    rows.push({ ids, kind: 'flow' });
  }
  return rows;
}

export function applyAdjacentResize(weights, leftId, rightId, frac) {
  const next = { ...(weights || {}) };
  const a = Number(next[leftId] > 0 ? next[leftId] : 1);
  const b = Number(next[rightId] > 0 ? next[rightId] : 1);
  const pair = a + b;
  const min = pair * 0.22;
  let left = a + frac * pair;
  if (left < min) left = min;
  if (left > pair - min) left = pair - min;
  next[leftId] = left;
  next[rightId] = pair - left;
  return next;
}

export function flexForId(weights, id) {
  const n = Number(weights?.[id]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export const GRID_TRACKS = 12;

export function tracksPerCard(cols) {
  return GRID_TRACKS / clampCardsPerRow(cols);
}

export function gridColumnCss(colIndex, cols) {
  const span = tracksPerCard(cols);
  return `${colIndex * span + 1} / span ${span}`;
}

export function slotKey(rowIndex, colIndex) {
  return `s:${rowIndex}:${colIndex}`;
}

export function rowHeightKey(rowIndex) {
  return `h:${rowIndex}`;
}

export function stackKey(rowIndex, stackIndex) {
  return `v:${rowIndex}:${stackIndex}`;
}

function swapInOrder(order, a, b) {
  const next = [...order];
  const i = next.indexOf(a);
  const j = next.indexOf(b);
  if (i < 0 || j < 0 || i === j) return order;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function visualOf(row) {
  if (row.kind === 'agenda' && row.ids.includes('agenda')) {
    return { mode: 'agenda', left: 'agenda', stack: row.ids.filter((id) => id !== 'agenda') };
  }
  return { mode: 'flow', cells: row.ids };
}

function pickFromRow(row, colHint) {
  if (!row) return null;
  const v = visualOf(row);
  if (v.mode === 'flow') return v.cells[Math.min(Math.max(0, colHint), v.cells.length - 1)] || null;
  if (colHint <= 0) return v.left;
  if (!v.stack.length) return v.left;
  return v.stack[Math.min(colHint - 1, v.stack.length - 1)] || v.left;
}

export function getCardNeighbors(rows, id) {
  const empty = { left: null, right: null, up: null, down: null };
  const rowIdx = (rows || []).findIndex((r) => r.ids.includes(id));
  if (rowIdx < 0) return empty;
  const row = rows[rowIdx];
  const vis = visualOf(row);
  const prev = rows[rowIdx - 1];
  const next = rows[rowIdx + 1];

  if (vis.mode === 'flow') {
    const i = vis.cells.indexOf(id);
    return {
      left: vis.cells[i - 1] || null,
      right: vis.cells[i + 1] || null,
      up: pickFromRow(prev, i),
      down: pickFromRow(next, i),
    };
  }
  if (id === vis.left) {
    return {
      left: null,
      right: vis.stack[0] || null,
      up: pickFromRow(prev, 0),
      down: pickFromRow(next, 0),
    };
  }
  const si = vis.stack.indexOf(id);
  if (si < 0) return empty;
  return {
    left: vis.left || null,
    right: null,
    up: si > 0 ? vis.stack[si - 1] : pickFromRow(prev, 1),
    down: si < vis.stack.length - 1 ? vis.stack[si + 1] : pickFromRow(next, 1),
  };
}

export const MIN_ROW_SPAN = 1;
export const MAX_ROW_SPAN = 3;

export function clampRowSpan(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return MIN_ROW_SPAN;
  return Math.min(MAX_ROW_SPAN, Math.max(MIN_ROW_SPAN, Math.round(v)));
}

export function normalizeSpanSide(side) {
  return side === 'right' ? 'right' : 'left';
}

function colsOfRow(rowCols, rowIndex, defaultCols) {
  const raw = rowCols && (rowCols[rowIndex] ?? rowCols[String(rowIndex)]);
  return clampCardsPerRow(raw != null ? raw : defaultCols);
}

function uniqueOrigins(tracks) {
  const seen = [];
  (tracks || []).forEach((s) => {
    if (s?.origin && s.id && !seen.includes(s.id)) seen.push(s.id);
  });
  return seen;
}

function emptyRunAt(tracks, start, width) {
  if (start < 0 || start + width > GRID_TRACKS) return false;
  for (let i = 0; i < width; i += 1) {
    if (tracks[start + i]) return false;
  }
  return true;
}

function canUseRange(rows, startRow, start, width, span) {
  for (let k = 0; k < span; k += 1) {
    const row = rows[startRow + k];
    if (!row || !emptyRunAt(row.tracks, start, width)) return false;
  }
  return true;
}

/**
 * 12 trilhas. Card alto reserva as mesmas trilhas nas linhas de baixo;
 * os outros da linha dividem só o espaço que sobrou.
 */
export function packInicioDesktop({
  order,
  defaultCols = DEFAULT_CARDS_PER_ROW,
  rowCols = {},
  rowSpans = {},
  spanSide = {},
}) {
  const ids = Array.isArray(order) ? order.filter(Boolean) : [];
  const rows = [];

  const ensure = (r) => {
    while (rows.length <= r) {
      const i = rows.length;
      rows.push({
        cols: colsOfRow(rowCols, i, defaultCols),
        kind: 'flow',
        tracks: Array.from({ length: GRID_TRACKS }, () => null),
        slots: [],
        ids: [],
      });
    }
    return rows[r];
  };

  const paint = (id, startRow, start, width, span, side) => {
    for (let k = 0; k < span; k += 1) {
      const row = ensure(startRow + k);
      const slot = {
        kind: k === 0 ? 'card' : 'continue',
        id,
        origin: k === 0,
        rowSpan: span,
        originRow: startRow,
        trackStart: start,
        trackWidth: width,
        col: start,
        side,
      };
      for (let t = 0; t < width; t += 1) row.tracks[start + t] = slot;
      if (k === 0 && !row.ids.includes(id)) row.ids.push(id);
    }
  };

  const widthFor = (row, span) => {
    const free = row.tracks.filter((s) => !s).length;
    const already = uniqueOrigins(row.tracks).length;
    const remain = Math.max(1, row.cols - already);
    const share = Math.max(1, Math.floor(free / remain));
    if (span > 1) return Math.max(share, Math.floor(GRID_TRACKS / Math.max(2, row.cols)));
    return share;
  };

  let cursor = 0;
  ids.forEach((id) => {
    const span = clampRowSpan(rowSpans[id] || 1);
    const side = normalizeSpanSide(spanSide[id]);
    let placed = false;
    for (let r = cursor; r < cursor + 80 && !placed; r += 1) {
      const row = ensure(r);
      if (uniqueOrigins(row.tracks).length >= row.cols && row.tracks.every(Boolean)) continue;
      if (uniqueOrigins(row.tracks).length >= row.cols) continue;
      for (let k = 1; k < span; k += 1) ensure(r + k);
      const width = widthFor(row, span);
      const starts = [];
      for (let s = 0; s + width <= GRID_TRACKS; s += 1) starts.push(s);
      const ordered = side === 'right' ? starts.slice().reverse() : starts;
      for (const start of ordered) {
        if (!canUseRange(rows, r, start, width, span)) continue;
        paint(id, r, start, width, span, side);
        placed = true;
        break;
      }
    }
    while (cursor < rows.length && uniqueOrigins(rows[cursor].tracks).length >= rows[cursor].cols && rows[cursor].tracks.every(Boolean)) {
      cursor += 1;
    }
    if (cursor < rows.length && uniqueOrigins(rows[cursor].tracks).length >= rows[cursor].cols) cursor += 1;
  });

  rows.forEach((row, ri) => {
    const taken = row.tracks.map((s) => !!(s && !s.origin));
    const origins = [];
    row.tracks.forEach((s) => {
      if (s?.origin && !origins.find((o) => o.id === s.id)) origins.push(s);
    });
    const free = [];
    for (let i = 0; i < GRID_TRACKS; i += 1) if (!taken[i]) free.push(i);
    if (!origins.length || !free.length) {
      row.slots = origins.map((s, i) => ({ ...s, col: i }));
      return;
    }
    const w = Math.max(1, Math.floor(free.length / origins.length));
    origins.forEach((slot, k) => {
      const slice = k === origins.length - 1 ? free.slice(k * w) : free.slice(k * w, (k + 1) * w);
      if (!slice.length) return;
      const start = slice[0];
      const width = slice.length;
      const span = clampRowSpan(slot.rowSpan || 1);
      for (let t = 0; t < GRID_TRACKS; t += 1) {
        if (row.tracks[t]?.id === slot.id && row.tracks[t]?.origin) row.tracks[t] = null;
      }
      for (let k2 = 1; k2 < span; k2 += 1) {
        const below = rows[ri + k2];
        if (!below) continue;
        for (let t = 0; t < GRID_TRACKS; t += 1) {
          if (below.tracks[t]?.id === slot.id && !below.tracks[t]?.origin) below.tracks[t] = null;
        }
      }
      paint(slot.id, ri, start, width, span, slot.side);
    });
    row.slots = uniqueOrigins(row.tracks).map((id, i) => {
      const s = row.tracks.find((t) => t?.origin && t.id === id);
      return { ...s, col: i };
    });
  });

  return rows.filter((row) => row.tracks.some(Boolean));
}

export function originGridCells(packed) {
  const cells = [];
  (packed || []).forEach((row, index) => {
    const seen = new Set();
    (row.tracks || []).forEach((slot) => {
      if (!slot?.origin || seen.has(slot.id)) return;
      seen.add(slot.id);
      cells.push({
        id: slot.id,
        index,
        span: clampRowSpan(slot.rowSpan || 1),
        trackStart: slot.trackStart || 0,
        trackWidth: slot.trackWidth || Math.floor(GRID_TRACKS / Math.max(1, row.cols || 1)),
        cols: row.cols,
      });
    });
  });
  return cells;
}

export function getPackedNeighbors(packed, id) {
  const empty = { left: null, right: null, up: null, down: null };
  let found = null;
  (packed || []).forEach((row, ri) => {
    const slot = (row.tracks || []).find((s) => s?.origin && s.id === id);
    if (slot) found = { ri, slot, row };
  });
  if (!found) return empty;
  const { ri, slot, row } = found;
  const origins = uniqueOrigins(row.tracks)
    .map((oid) => (row.tracks || []).find((s) => s?.origin && s.id === oid))
    .filter(Boolean)
    .sort((a, b) => (a.trackStart || 0) - (b.trackStart || 0));
  const i = origins.findIndex((s) => s.id === id);
  const pickRow = (r) => {
    if (!r?.tracks) return null;
    const start = slot.trackStart || 0;
    const s = r.tracks[start] || r.tracks.find((x) => x?.id);
    return s?.id && s.id !== id ? s.id : null;
  };
  return {
    left: i > 0 ? origins[i - 1].id : null,
    right: i >= 0 && i < origins.length - 1 ? origins[i + 1].id : null,
    up: pickRow(packed[ri - 1]),
    down: pickRow(packed[ri + (slot.rowSpan || 1)]),
  };
}

export function moveCardByArrowPacked(order, dir, id, packed) {
  const n = getPackedNeighbors(packed, id);
  const target = n?.[dir] || null;
  if (!target || target === id) return order;
  return swapInOrder(order, id, target);
}

export function moveCardByArrow(order, dir, id, cardsPerRow = DEFAULT_CARDS_PER_ROW, extras = {}) {
  const packed = extras.packed || packInicioDesktop({
    order,
    defaultCols: cardsPerRow,
    rowCols: extras.rowCols,
    rowSpans: extras.rowSpans,
    spanSide: extras.spanSide,
  });
  return moveCardByArrowPacked(order, dir, id, packed);
}
