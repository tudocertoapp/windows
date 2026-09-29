export async function detectLogoTransparency(uri) {
  if (!uri || typeof document === 'undefined') {
    return looksLikePng(uri);
  }
  try {
    let img;
    try {
      img = await loadViaFetch(uri);
    } catch {
      img = await loadHtmlImage(uri);
    }
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return looksLikePng(uri);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    const total = w * h;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) transparent += 1;
    }
    return transparent > Math.max(8, total * 0.015);
  } catch {
    return looksLikePng(uri);
  }
}

export function looksLikePng(value) {
  const s = String(value || '');
  if (/image\/png/i.test(s) || /\.png(\?|$)/i.test(s)) return true;
  const b64 = s.includes(',') ? s.split(',')[1] : s;
  return /^iVBORw0KGgo/.test(b64 || '');
}

const cache = new Map();

function idx(x, y, w) {
  return (y * w + x) * 4;
}

function sampleCorners(data, w, h) {
  const pts = [
    idx(2, 2, w),
    idx(w - 3, 2, w),
    idx(2, h - 3, w),
    idx(w - 3, h - 3, w),
    idx(Math.floor(w / 2), 2, w),
    idx(2, Math.floor(h / 2), w),
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  pts.forEach((i) => {
    if (i < 0 || i + 3 >= data.length) return;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  });
  if (!n) return { r: 255, g: 255, b: 255 };
  return { r: r / n, g: g / n, b: b / n };
}

function isBackground(r, g, b, a, mode, bg) {
  if (a < 12) return true;
  const dr = r - bg.r;
  const dg = g - bg.g;
  const db = b - bg.b;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (mode === 'sem-preto') {
    return lum < 48 || dist < 56;
  }
  return lum > 228 || dist < 52;
}

function loadHtmlImage(uri) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('logo'));
    img.src = uri;
  });
}

async function loadViaFetch(uri) {
  const res = await fetch(uri, { mode: 'cors' });
  if (!res.ok) throw new Error('fetch');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadHtmlImage(url);
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function processCanvas(img, mode) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const bg = mode === 'sem-preto' ? { r: 8, g: 8, b: 8 } : sampleCorners(data, w, h);

  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    const x = p % w;
    const y = (p - x) / w;
    if (!isBackground(data[i], data[i + 1], data[i + 2], data[i + 3], mode, bg)) continue;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = idx(x, y, w);
      if (data[i + 3] < 8) continue;
      if (!isBackground(data[i], data[i + 1], data[i + 2], data[i + 3], mode, bg)) continue;
      let empty = 0;
      if (data[idx(x - 1, y, w) + 3] < 8) empty += 1;
      if (data[idx(x + 1, y, w) + 3] < 8) empty += 1;
      if (data[idx(x, y - 1, w) + 3] < 8) empty += 1;
      if (data[idx(x, y + 1, w) + 3] < 8) empty += 1;
      if (empty >= 1) data[i + 3] = Math.round(data[i + 3] * 0.15);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function makeLogoTransparent(uri, mode) {
  if (!uri || mode === 'manter' || typeof document === 'undefined') return uri;
  const key = `${mode}::${uri}`;
  if (cache.has(key)) return cache.get(key);
  let out = uri;
  try {
    let img;
    try {
      img = await loadViaFetch(uri);
    } catch {
      img = await loadHtmlImage(uri);
    }
    const png = processCanvas(img, mode);
    if (png) out = png;
  } catch {
    out = uri;
  }
  cache.set(key, out);
  return out;
}
