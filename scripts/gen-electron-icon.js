/**
 * Gera ícones do Electron em alta qualidade:
 * - electron/icon-256.png (uso geral)
 * - electron/icon.ico (Windows/NSIS, multi-resolução)
 * Executar: npm run electron:icon
 */
const fs = require('fs');
const path = require('path');
const pngToIcoMod = require('png-to-ico');
const pngToIco = pngToIcoMod.default || pngToIcoMod;

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'electron');
const outFile = path.join(outDir, 'icon-256.png');
const outIco = path.join(outDir, 'icon.ico');

const candidates = ['assets/icon.png', 'assets/adaptive-icon.png', 'assets/logo.png'];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (_) {
    console.warn('[electron:icon] sharp não disponível; copie manualmente PNG/ICO para pasta electron/');
    process.exit(0);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let src = null;
  for (const c of candidates) {
    const p = path.join(root, c);
    if (fs.existsSync(p)) {
      src = p;
      break;
    }
  }

  if (!src) {
    await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 16, g: 185, b: 129, alpha: 1 },
      },
    })
      .png()
      .toFile(outFile);
    console.warn('[electron:icon] Placeholder 256×256 (verde) em', outFile, '— substitua por ícone real quando tiver assets.');
    return;
  }

  const base = sharp(src).flatten({ background: { r: 17, g: 24, b: 39, alpha: 1 } });

  await base
    .clone()
    .resize(256, 256, { fit: 'contain', background: { r: 17, g: 24, b: 39, alpha: 1 } })
    .png()
    .toFile(outFile);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await base
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 17, g: 24, b: 39, alpha: 1 } })
      .png()
      .toBuffer();
    pngBuffers.push(buf);
  }
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(outIco, icoBuffer);

  console.log('[electron:icon] Gerados:', outFile, 'e', outIco, 'a partir de', path.relative(root, src));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
