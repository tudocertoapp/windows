/**
 * Prepara logo do app: backup original, remove fundo, otimiza para carregamento rápido.
 * Uso: node scripts/prepare-logo.js
 */
const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets');
const LOGO_PATH = path.join(ASSETS, 'logo.png');
const LOGO_ORIGINAL_PATH = path.join(ASSETS, 'logo-original.png');
const BLACK_THRESHOLD = 45;

async function main() {
  // 1. Backup original
  if (!fs.existsSync(LOGO_PATH)) {
    console.error('Logo não encontrada em assets/logo.png');
    process.exit(1);
  }
  fs.copyFileSync(LOGO_PATH, LOGO_ORIGINAL_PATH);
  console.log('Original guardada em assets/logo-original.png');

  // 2. Remove fundo preto e otimiza com Jimp
  const image = await Jimp.read(LOGO_PATH);
  const { width, height } = image.bitmap;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = image.getPixelColor(x, y);
      const { r, g, b } = intToRGBA(color);
      const isBlack = r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
      if (isBlack) {
        image.setPixelColor(rgbaToInt(r, g, b, 0), x, y);
      }
    }
  }

  const tempPath = path.join(ASSETS, 'logo-temp.png');
  await image.write(tempPath);

  // 3. Otimiza com Sharp (PNG leve, compressão máxima)
  const maxSize = 512;
  let pipeline = sharp(tempPath);
  if (width > maxSize || height > maxSize) {
    pipeline = pipeline.resize(
      Math.min(width, maxSize),
      Math.min(height, maxSize),
      { fit: 'inside', withoutEnlargement: true }
    );
  }
  await pipeline
    .png({ compressionLevel: 9 })
    .toFile(LOGO_PATH);

  try { fs.unlinkSync(tempPath); } catch (_) {}
  console.log('Logo atualizada: sem fundo, otimizada em assets/logo.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
