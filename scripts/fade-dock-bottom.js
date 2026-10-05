const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'assets', 'dock');
const FILES = ['feliz.png', 'pensativo.png', 'animado.png', 'surpreso.png', 'tranquilo.png'];

function fadeBottom(data, w, h) {
  const y0 = Math.floor(h * 0.74);
  const span = Math.max(1, h - y0);
  for (let y = y0; y < h; y += 1) {
    const t = (y - y0) / span;
    const keep = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, t)));
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      data[i + 3] = Math.round(data[i + 3] * keep);
      if (data[i + 3] < 6) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
  }
}

(async () => {
  for (const name of FILES) {
    const file = path.join(DIR, name);
    if (!fs.existsSync(file)) continue;
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    fadeBottom(data, info.width, info.height);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(file);
    console.log('faded', name, info.width, 'x', info.height);
  }
})();
