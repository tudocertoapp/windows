/**
 * Remove fundo preto da logo: torna pixels pretos (ou quase) transparentes.
 * Uso: node scripts/remove-black-bg.js
 */
const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');
const BLACK_THRESHOLD = 45; // abaixo disso (R,G,B) considera preto e torna transparente

async function main() {
  const image = await Jimp.read(LOGO_PATH);
  const { width, height } = image.bitmap;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = image.getPixelColor(x, y);
      const { r, g, b, a } = intToRGBA(color);
      const isBlack = r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
      if (isBlack) {
        image.setPixelColor(rgbaToInt(r, g, b, 0), x, y);
      }
    }
  }

  await image.write(LOGO_PATH);
  console.log('Logo atualizada: fundo preto removido (transparente).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
