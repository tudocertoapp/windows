const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2];
const OUT_DIR = path.join(__dirname, '..', 'assets', 'dock', 'page');

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaOf(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function isOuterBg(r, g, b) {
  return lum(r, g, b) <= 10 && chromaOf(r, g, b) < 12;
}

function isVisorDark(r, g, b) {
  const l = lum(r, g, b);
  const c = chromaOf(r, g, b);
  if (l > 46) return false;
  if (c > 55 && b > r + 18 && b > g + 8) return false;
  return true;
}

function flood(data, w, h, test) {
  const mark = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (mark[p]) return;
    const i = p * 4;
    if (!test(data[i], data[i + 1], data[i + 2], p)) return;
    mark[p] = 1;
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
  return mark;
}

function floodFrom(data, w, h, seeds, test) {
  const mark = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (mark[p]) return;
    const i = p * 4;
    if (!test(data[i], data[i + 1], data[i + 2], p)) return;
    mark[p] = 1;
    stack.push(x, y);
  };
  seeds.forEach(([x, y]) => push(x, y));
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return mark;
}

function dilate(src, w, h, times) {
  let cur = src;
  for (let n = 0; n < times; n += 1) {
    const next = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p = y * w + x;
        if (
          cur[p] ||
          cur[p - 1] ||
          cur[p + 1] ||
          cur[p - w] ||
          cur[p + w]
        ) {
          next[p] = 1;
        }
      }
    }
    cur = next;
  }
  return cur;
}

function bboxFrom(mark, w, h) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let p = 0; p < w * h; p += 1) {
    if (!mark[p]) continue;
    const x = p % w;
    const y = Math.floor(p / w);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pad = Math.round(Math.max(w, h) * 0.012);
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(w, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(h, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

async function writeRaw(data, w, h, file) {
  const buf = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(buf).toFile(file);
}

async function main() {
  if (!SRC || !fs.existsSync(SRC)) throw new Error(`Fonte não encontrada: ${SRC}`);
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const outer = flood(data, w, h, (r, g, b) => isOuterBg(r, g, b));

  const figure = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    if (!outer[p]) figure[p] = 1;
  }
  const boxFig = bboxFrom(figure, w, h);
  const visorSeeds = [];
  const seedY0 = boxFig.top + Math.round(boxFig.height * 0.16);
  const seedY1 = boxFig.top + Math.round(boxFig.height * 0.42);
  const seedX0 = boxFig.left + Math.round(boxFig.width * 0.32);
  const seedX1 = boxFig.left + Math.round(boxFig.width * 0.68);
  for (let y = seedY0; y <= seedY1; y += Math.max(2, Math.round((seedY1 - seedY0) / 18))) {
    for (let x = seedX0; x <= seedX1; x += Math.max(2, Math.round((seedX1 - seedX0) / 18))) {
      const p = y * w + x;
      const i = p * 4;
      if (outer[p]) continue;
      if (isVisorDark(data[i], data[i + 1], data[i + 2])) visorSeeds.push([x, y]);
    }
  }
  const visor = floodFrom(data, w, h, visorSeeds, (r, g, b, p) => !outer[p] && isVisorDark(r, g, b));
  const visorSoft = dilate(visor, w, h, 1);

  const character = Buffer.from(data);
  const silhouette = Buffer.alloc(w * h * 4);
  const visorMask = Buffer.alloc(w * h * 4);

  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    if (outer[p]) {
      character[i] = 0;
      character[i + 1] = 0;
      character[i + 2] = 0;
      character[i + 3] = 0;
      continue;
    }
    silhouette[i] = 0;
    silhouette[i + 1] = 0;
    silhouette[i + 2] = 0;
    silhouette[i + 3] = 255;
    if (visorSoft[p]) {
      character[i + 3] = 0;
      visorMask[i] = 255;
      visorMask[i + 1] = 255;
      visorMask[i + 2] = 255;
      visorMask[i + 3] = 255;
    } else {
      character[i + 3] = 255;
    }
  }

  const box = bboxFrom(figure, w, h);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const crop = async (buf, file) => {
    await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .extract(box)
      .png({ compressionLevel: 9 })
      .toFile(file);
  };
  await crop(character, path.join(OUT_DIR, 'character.png'));
  await crop(silhouette, path.join(OUT_DIR, 'silhouette.png'));
  await crop(visorMask, path.join(OUT_DIR, 'visor.png'));
  fs.copyFileSync(SRC, path.join(__dirname, '..', 'assets', 'dock', 'src', 'page-character.jpg'));
  const meta = await sharp(path.join(OUT_DIR, 'character.png')).metadata();
  console.log('ok', meta.width, 'x', meta.height, 'visorSeeds', visorSeeds.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
