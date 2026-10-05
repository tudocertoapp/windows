const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2];
const ROOT = path.join(__dirname, '..', 'assets', 'dock');
const OUT_HD = path.join(ROOT, 'feliz.png');
const OUT_8K = path.join(ROOT, 'dock-8k.png');

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaOf(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function isBg(r, g, b) {
  return lum(r, g, b) <= 8 && chromaOf(r, g, b) < 10;
}

function floodBg(data, w, h) {
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (bg[p]) return;
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
  }
  return bg;
}

function bbox(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let p = 0; p < w * h; p += 1) {
    if (data[p * 4 + 3] < 16) continue;
    const x = p % w;
    const y = Math.floor(p / w);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pad = Math.round(Math.max(w, h) * 0.02);
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(w, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(h, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

async function main() {
  if (!SRC || !fs.existsSync(SRC)) throw new Error(`Fonte não encontrada: ${SRC}`);
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const bg = floodBg(data, w, h);
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
  const box = bbox(data, w, h);
  const cut = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .extract(box)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const srcCopy = path.join(ROOT, 'src', 'nova.jpg');
  fs.mkdirSync(path.dirname(srcCopy), { recursive: true });
  fs.copyFileSync(SRC, srcCopy);
  await sharp(cut).png({ compressionLevel: 9 }).toFile(OUT_HD);
  await sharp(cut).png({ compressionLevel: 6 }).toFile(OUT_8K);
  const m = await sharp(OUT_8K).metadata();
  console.log('ok', m.width, 'x', m.height, 'hasAlpha', m.hasAlpha);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
