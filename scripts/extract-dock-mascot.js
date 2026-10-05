const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'assets', 'dock');
const SRC = path.join(ROOT, 'src', 'hold.jpg');

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaOf(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function isBg(r, g, b) {
  return lum(r, g, b) <= 6 && chromaOf(r, g, b) < 8;
}

function isFg(r, g, b) {
  const L = lum(r, g, b);
  const c = chromaOf(r, g, b);
  if (c > 10) return true;
  if (L >= 22) return true;
  return false;
}

function dilateMask(mask, w, h, radius) {
  const d = distField(mask, w, h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i += 1) out[i] = d[i] <= radius ? 1 : 0;
  return out;
}

function distField(seed, w, h) {
  const INF = 1e8;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i += 1) d[i] = seed[i] ? 0 : INF;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (d[p] === 0) continue;
      let best = d[p];
      if (x > 0) best = Math.min(best, d[p - 1] + 1);
      if (y > 0) best = Math.min(best, d[p - w] + 1);
      if (x > 0 && y > 0) best = Math.min(best, d[p - w - 1] + 1.414);
      if (x + 1 < w && y > 0) best = Math.min(best, d[p - w + 1] + 1.414);
      d[p] = best;
    }
  }
  for (let y = h - 1; y >= 0; y -= 1) {
    for (let x = w - 1; x >= 0; x -= 1) {
      const p = y * w + x;
      let best = d[p];
      if (x + 1 < w) best = Math.min(best, d[p + 1] + 1);
      if (y + 1 < h) best = Math.min(best, d[p + w] + 1);
      if (x + 1 < w && y + 1 < h) best = Math.min(best, d[p + w + 1] + 1.414);
      if (x > 0 && y + 1 < h) best = Math.min(best, d[p + w - 1] + 1.414);
      d[p] = best;
    }
  }
  return d;
}

function floodBg(data, w, h, blocked) {
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (bg[p] || (blocked && blocked[p])) return;
    const i = p * 4;
    if (!isBg(data[i], data[i + 1], data[i + 2])) return;
    bg[p] = 1;
    stack.push(x, y);
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
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
    push(x + 1, y + 1);
    push(x - 1, y - 1);
    push(x + 1, y - 1);
    push(x - 1, y + 1);
  }
  return bg;
}

function fillInteriorHoles(raw, w, h) {
  const open = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (open[p]) return;
    if (raw[p * 4 + 3] > 24) return;
    open[p] = 1;
    stack.push(x, y);
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
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let p = 0; p < w * h; p += 1) {
    if (open[p] || raw[p * 4 + 3] > 24) continue;
    const x = p % w;
    const y = Math.floor(p / w);
    let sr = 18;
    let sg = 16;
    let sb = 18;
    let found = false;
    for (let rad = 1; rad <= 12 && !found; rad += 1) {
      for (let dy = -rad; dy <= rad && !found; dy += 1) {
        for (let dx = -rad; dx <= rad && !found; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (raw[q * 4 + 3] < 80) continue;
          sr = raw[q * 4];
          sg = raw[q * 4 + 1];
          sb = raw[q * 4 + 2];
          found = true;
        }
      }
    }
    raw[p * 4] = sr;
    raw[p * 4 + 1] = sg;
    raw[p * 4 + 2] = sb;
    raw[p * 4 + 3] = 255;
  }
}

function cutout(data, w, h) {
  const fg0 = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    if (isFg(data[i], data[i + 1], data[i + 2])) fg0[p] = 1;
  }
  const blocked = dilateMask(fg0, w, h, 8);
  const bg = floodBg(data, w, h, blocked);
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    if (bg[p]) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
    }
  }
  fillInteriorHoles(data, w, h);
}

function keepMain(data, w, h) {
  const seen = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let best = null;
  let bestCount = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = y * w + x;
      if (seen[s] || data[s * 4 + 3] < 24) continue;
      const cells = [];
      let head = 0;
      let tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail += 1;
      seen[s] = 1;
      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head += 1;
        cells.push(cy * w + cx);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ns = ny * w + nx;
            if (seen[ns] || data[ns * 4 + 3] < 24) continue;
            seen[ns] = 1;
            qx[tail] = nx;
            qy[tail] = ny;
            tail += 1;
          }
        }
      }
      if (cells.length > bestCount) {
        bestCount = cells.length;
        best = cells;
      }
    }
  }
  if (!best) return null;
  const kept = new Uint8Array(w * h);
  best.forEach((p) => {
    kept[p] = 1;
  });
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    if (!kept[p]) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }
    const x = p % w;
    const y = Math.floor(p / w);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pad = 20;
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(w, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(h, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Fonte não encontrada: ${SRC}`);
  const srcMeta = await sharp(SRC).metadata();
  const scale = 2;
  const w = srcMeta.width * scale;
  const h = srcMeta.height * scale;
  const { data } = await sharp(SRC)
    .resize({ width: w, height: h, kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  cutout(data, w, h);
  const box = keepMain(data, w, h);
  if (!box) throw new Error('sem personagem');
  const { data: raw, info } = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const padded = await sharp(raw, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extend({
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const meta = await sharp(padded).metadata();
  const targetH = Math.max(2200, meta.height || 2200);
  const targetW = Math.round(((meta.width || targetH) / (meta.height || targetH)) * targetH);
  const out = path.join(ROOT, 'feliz.png');
  await sharp(padded)
    .resize({ width: targetW, height: targetH, kernel: sharp.kernel.lanczos3, fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const outMeta = await sharp(out).metadata();
  console.log('feliz.png', outMeta.width, 'x', outMeta.height);
  const kH = 7680;
  const kW = Math.round((targetW / targetH) * kH);
  const kOut = path.join(ROOT, 'dock-8k.png');
  await sharp(padded)
    .resize({ width: kW, height: kH, kernel: sharp.kernel.lanczos3, fit: 'fill' })
    .png({ compressionLevel: 4 })
    .toFile(kOut);
  const kMeta = await sharp(kOut).metadata();
  console.log('dock-8k.png', kMeta.width, 'x', kMeta.height);
  ['ola', 'espera', 'ideia', 'dinheiro', 'animado', 'pensativo', 'surpreso', 'tranquilo', 'feliz-mini'].forEach((name) => {
    const f = path.join(ROOT, `${name}.png`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
