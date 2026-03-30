/**
 * Gera electron/icon-256.png (256×256) a partir de assets/icon.png ou assets/logo.png.
 * Executar: npm run electron:icon
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'electron');
const outFile = path.join(outDir, 'icon-256.png');

const candidates = ['assets/icon.png', 'assets/adaptive-icon.png', 'assets/logo.png'];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (_) {
    console.warn('[electron:icon] sharp não disponível; copie manualmente um PNG 256×256 para electron/icon-256.png');
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

  await sharp(src)
    .resize(256, 256, { fit: 'contain', background: { r: 17, g: 24, b: 39, alpha: 1 } })
    .png()
    .toFile(outFile);

  console.log('[electron:icon] Gerado:', outFile, 'a partir de', path.relative(root, src));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
