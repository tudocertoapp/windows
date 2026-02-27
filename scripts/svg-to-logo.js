/**
 * Converte SVG/SVGZ para PNG e salva como logo do app.
 * Uso: node scripts/svg-to-logo.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const LOGO_PATH = 'F:\\Meu Drive\\logo_sem_fundo.svg';
const OUT_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

async function main() {
  let svgBuffer = fs.readFileSync(LOGO_PATH);
  if (path.extname(LOGO_PATH).toLowerCase() === '.svgz') {
    svgBuffer = zlib.gunzipSync(svgBuffer);
  }
  await sharp(svgBuffer)
    .png()
    .toFile(OUT_PATH);
  console.log('Logomarca atualizada: convertida para assets/logo.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
