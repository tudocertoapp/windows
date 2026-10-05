const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'assets', 'dock');
const ROBOT = path.join(ROOT, 'src', 'robot.jpg');
const LOGO = path.join(ROOT, 'src', 'logo.png');

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaOf(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
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

function dilateMask(mask, w, h, radius) {
  const d = distField(mask, w, h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i += 1) out[i] = d[i] <= radius ? 1 : 0;
  return out;
}

function flood(data, w, h, blocked, test) {
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (bg[p] || (blocked && blocked[p])) return;
    const i = p * 4;
    if (!test(data[i], data[i + 1], data[i + 2])) return;
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

function applyFlood(data, w, h, bg) {
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
}

function largestBlob(mask, w, h, minCount) {
  const seen = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let best = null;
  let bestCount = minCount || 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = y * w + x;
      if (seen[s] || !mask[s]) continue;
      const cells = [];
      let head = 0;
      let tail = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      qx[tail] = x;
      qy[tail] = y;
      tail += 1;
      seen[s] = 1;
      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head += 1;
        cells.push(cy * w + cx);
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ns = ny * w + nx;
            if (seen[ns] || !mask[ns]) continue;
            seen[ns] = 1;
            qx[tail] = nx;
            qy[tail] = ny;
            tail += 1;
          }
        }
      }
      if (cells.length > bestCount) {
        bestCount = cells.length;
        best = { cells, minX, minY, maxX, maxY, count: cells.length };
      }
    }
  }
  return best;
}

function isOldGreen(r, g, b) {
  return g > 70 && g > r + 18 && g > b + 18;
}

function cutBlack(data, w, h) {
  const fg0 = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    const L = lum(data[i], data[i + 1], data[i + 2]);
    const c = chromaOf(data[i], data[i + 1], data[i + 2]);
    if (c > 10 || L >= 22) fg0[p] = 1;
  }
  const blocked = dilateMask(fg0, w, h, 8);
  const bg = flood(data, w, h, blocked, (r, g, b) => lum(r, g, b) <= 6 && chromaOf(r, g, b) < 8);
  applyFlood(data, w, h, bg);
}

function cutWhite(data, w, h) {
  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    const L = lum(data[i], data[i + 1], data[i + 2]);
    const c = chromaOf(data[i], data[i + 1], data[i + 2]);
    if (L > 244 && c < 18) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
    }
  }
}

function bboxOfOpaque(data, w, h, pad) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let p = 0; p < w * h; p += 1) {
    if (data[p * 4 + 3] < 24) continue;
    const x = p % w;
    const y = Math.floor(p / w);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (maxX < minX) return null;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  return {
    left,
    top,
    width: Math.min(w, maxX + pad + 1) - left,
    height: Math.min(h, maxY + pad + 1) - top,
  };
}

async function loadScale(file, scale) {
  const meta = await sharp(file).metadata();
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const { data } = await sharp(file)
    .resize({ width: w, height: h, kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w, h };
}

function overlay(dst, dw, dh, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y += 1) {
    const ty = dy + y;
    if (ty < 0 || ty >= dh) continue;
    for (let x = 0; x < sw; x += 1) {
      const tx = dx + x;
      if (tx < 0 || tx >= dw) continue;
      const si = (y * sw + x) * 4;
      const a = src[si + 3] / 255;
      if (a < 0.04) continue;
      const di = (ty * dw + tx) * 4;
      const ia = 1 - a;
      dst[di] = Math.round(src[si] * a + dst[di] * ia);
      dst[di + 1] = Math.round(src[si + 1] * a + dst[di + 1] * ia);
      dst[di + 2] = Math.round(src[si + 2] * a + dst[di + 2] * ia);
      dst[di + 3] = Math.max(dst[di + 3], src[si + 3]);
    }
  }
}

async function savePng(data, w, h, box, file, maxSide) {
  const { data: raw, info } = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const padded = await sharp(raw, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extend({
      top: 24,
      bottom: 24,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const meta = await sharp(padded).metadata();
  const srcW = meta.width || 1;
  const srcH = meta.height || 1;
  const scale = maxSide / Math.max(srcW, srcH);
  const tw = Math.round(srcW * scale);
  const th = Math.round(srcH * scale);
  await sharp(padded)
    .resize({ width: tw, height: th, kernel: sharp.kernel.lanczos3, fit: 'fill' })
    .png({ compressionLevel: maxSide >= 4000 ? 4 : 9 })
    .toFile(file);
  const out = await sharp(file).metadata();
  console.log(path.basename(file), out.width, 'x', out.height);
}

async function main() {
  if (!fs.existsSync(ROBOT)) throw new Error(`Fonte não encontrada: ${ROBOT}`);
  if (!fs.existsSync(LOGO)) throw new Error(`Logo não encontrada: ${LOGO}`);

  const robot = await loadScale(ROBOT, 2);
  cutBlack(robot.data, robot.w, robot.h);

  const green = new Uint8Array(robot.w * robot.h);
  for (let p = 0; p < green.length; p += 1) {
    const i = p * 4;
    if (robot.data[i + 3] < 24) continue;
    if (isOldGreen(robot.data[i], robot.data[i + 1], robot.data[i + 2])) green[p] = 1;
  }
  const held = largestBlob(green, robot.w, robot.h, 800);
  if (!held) throw new Error('logo antiga não encontrada');
  const wipe = new Uint8Array(robot.w * robot.h);
  held.cells.forEach((p) => {
    wipe[p] = 1;
  });
  const wipeD = dilateMask(wipe, robot.w, robot.h, 18);
  const handKeep = Buffer.from(robot.data);
  for (let p = 0; p < wipeD.length; p += 1) {
    if (!wipeD[p]) continue;
    const i = p * 4;
    robot.data[i] = 0;
    robot.data[i + 1] = 0;
    robot.data[i + 2] = 0;
    robot.data[i + 3] = 0;
  }

  const logo = await loadScale(LOGO, 2);
  cutWhite(logo.data, logo.w, logo.h);
  const logoBox = bboxOfOpaque(logo.data, logo.w, logo.h, 8);
  const logoCrop = await sharp(Buffer.from(logo.data), {
    raw: { width: logo.w, height: logo.h, channels: 4 },
  })
    .extract(logoBox)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const boxW = held.maxX - held.minX + 1;
  const boxH = held.maxY - held.minY + 1;
  const side = Math.round(Math.max(boxW, boxH) * 1.18);
  const logoFit = await sharp(logoCrop.data, {
    raw: { width: logoCrop.info.width, height: logoCrop.info.height, channels: 4 },
  })
    .resize({ width: side, height: side, fit: 'inside', kernel: sharp.kernel.lanczos3, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cx = Math.round((held.minX + held.maxX) / 2);
  const cy = Math.round((held.minY + held.maxY) / 2);
  const dx = cx - Math.round(logoFit.info.width / 2);
  const dy = cy - Math.round(logoFit.info.height / 2) - Math.round(side * 0.04);
  overlay(robot.data, robot.w, robot.h, logoFit.data, logoFit.info.width, logoFit.info.height, dx, dy);

  const midY = (held.minY + held.maxY) / 2;
  for (let p = 0; p < wipeD.length; p += 1) {
    if (!wipeD[p]) continue;
    const i = p * 4;
    if (handKeep[i + 3] < 40) continue;
    if (isOldGreen(handKeep[i], handKeep[i + 1], handKeep[i + 2])) continue;
    const y = Math.floor(p / robot.w);
    const x = p % robot.w;
    const L = lum(handKeep[i], handKeep[i + 1], handKeep[i + 2]);
    const c = chromaOf(handKeep[i], handKeep[i + 1], handKeep[i + 2]);
    const glove = L > 165 && c < 60 && y > midY - 8;
    const joint = L < 48 && c < 28 && y > midY && x > cx - 8;
    if (!glove && !joint) continue;
    robot.data[i] = handKeep[i];
    robot.data[i + 1] = handKeep[i + 1];
    robot.data[i + 2] = handKeep[i + 2];
    robot.data[i + 3] = handKeep[i + 3];
  }

  const box = bboxOfOpaque(robot.data, robot.w, robot.h, 22);
  if (!box) throw new Error('sem personagem');
  await savePng(robot.data, robot.w, robot.h, box, path.join(ROOT, 'feliz.png'), 2200);
  await savePng(robot.data, robot.w, robot.h, box, path.join(ROOT, 'dock-8k.png'), 7680);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
