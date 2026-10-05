const sharp = require('sharp');
const path = require('path');
const out = path.join(__dirname, '..', 'assets', 'dock');
const files = ['feliz.png', 'pensativo.png', 'animado.png', 'surpreso.png', 'tranquilo.png'];

(async () => {
  for (const f of files) {
    const p = path.join(out, f);
    const m = await sharp(p).metadata();
    const h = Math.min(520, m.height);
    const w = Math.round(m.width * (h / m.height));
    const fg = await sharp(p).resize(w, h).png().toBuffer();
    await sharp({ create: { width: w, height: h, channels: 3, background: '#6cba16' } })
      .composite([{ input: fg, blend: 'over' }])
      .png()
      .toFile(path.join(out, `_preview-green-${f}`));
    await sharp({ create: { width: w, height: h, channels: 3, background: '#111111' } })
      .composite([{ input: fg, blend: 'over' }])
      .png()
      .toFile(path.join(out, `_preview-dark-${f}`));
  }
  const { data, info } = await sharp(path.join(out, 'feliz.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let a0 = 0;
  let aLow = 0;
  let aMid = 0;
  let aHi = 0;
  for (let p = 0; p < info.width * info.height; p += 1) {
    const a = data[p * 4 + 3];
    if (a === 0) a0 += 1;
    else if (a < 200) aLow += 1;
    else if (a < 250) aMid += 1;
    else aHi += 1;
  }
  console.log({ a0, aLow, aMid, aHi });
})();
