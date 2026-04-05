/**
 * Gera ícones do Electron com fundo transparente para Win/Linux/macOS.
 * - electron/icon.png (512)
 * - electron/icon-256.png
 * - electron/icon.ico (16..256)
 * - electron/icon.icns (macOS)
 * - electron/icons/*.png (múltiplos tamanhos)
 */
const fs = require('fs');
const path = require('path');
const pngToIcoMod = require('png-to-ico');
const pngToIco = pngToIcoMod.default || pngToIcoMod;

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'electron');
const outIconsDir = path.join(outDir, 'icons');
const outPng = path.join(outDir, 'icon.png');
const outPng256 = path.join(outDir, 'icon-256.png');
const outIco = path.join(outDir, 'icon.ico');
const outIcns = path.join(outDir, 'icon.icns');

const BG = { r: 0, g: 0, b: 0, alpha: 0 };
const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

const CANDIDATES = [
  'I:/Meu Drive/logo svg.svg',
  'i:/Meu Drive/logo svg.svg',
  'H:/Meu Drive/logo svg.svg',
  'h:/Meu Drive/logo svg.svg',
  'assets/logo-app.svg',
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/logo.png',
  'assets/favicon.png',
  'assets/logo-pages.png',
  'assets/splash.png',
];

function ensureDirs() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(outIconsDir)) fs.mkdirSync(outIconsDir, { recursive: true });
}

function resolveSource() {
  for (const c of CANDIDATES) {
    const p = path.isAbsolute(c) ? c : path.join(root, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Fundo transparente, logo inteira (sem cortar traços).
 * 1) Rasteriza grande → 2) trim só margens transparentes → 3) encaixa em 1024 com contain
 * para o glifo ocupar o máximo do quadrado (visual próximo de ícones “de mercado” na barra).
 */
async function transparentFromSource(sharp, srcPath) {
  const base = () =>
    sharp(srcPath, { density: 400, limitInputPixels: false })
      .ensureAlpha()
      .resize(2048, 2048, { fit: 'inside', background: BG, kernel: 'lanczos3' });

  try {
    const buf = await base()
      .trim({ threshold: 3 })
      .resize(1024, 1024, { fit: 'contain', background: BG, kernel: 'lanczos3' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    return sharp(buf).ensureAlpha();
  } catch (_) {
    const buf = await base()
      .resize(1024, 1024, { fit: 'contain', background: BG, kernel: 'lanczos3' })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    return sharp(buf).ensureAlpha();
  }
}

async function writeAllSizes(baseSharp) {
  for (const size of ICON_SIZES) {
    const p = path.join(outIconsDir, `icon-${size}.png`);
    await baseSharp
      .clone()
      .resize(size, size, {
        fit: 'contain',
        background: BG,
        // Upscale suave para ficar no padrão visual de ícones de desktop.
        kernel: 'lanczos3',
      })
      .png()
      .toFile(p);
  }
  await baseSharp
    .clone()
    .resize(512, 512, { fit: 'contain', background: BG, kernel: 'lanczos3' })
    .png()
    .toFile(outPng);
  await baseSharp
    .clone()
    .resize(256, 256, { fit: 'contain', background: BG, kernel: 'lanczos3' })
    .png()
    .toFile(outPng256);
}

/**
 * Bordas semi-transparentes no ICO costumam virar preto/cinza na barra do Windows.
 * Força alpha quase 0 → 0 e quase 255 → 255; RGB a 0 onde alpha = 0.
 */
async function pngToIcoFriendlyBuffer(sharp, pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    let a = data[i + 3];
    if (a < 18) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else if (a > 237) {
      data[i + 3] = 255;
    }
  }
  return sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
}

async function writeIcoFromSizes(sharp) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = [];
  for (const s of sizes) {
    const p = path.join(outIconsDir, `icon-${s}.png`);
    buffers.push(await pngToIcoFriendlyBuffer(sharp, p));
  }
  fs.writeFileSync(outIco, await pngToIco(buffers));
}

async function writeIcns() {
  try {
    const png2icons = require('png2icons');
    const png1024 = fs.readFileSync(path.join(outIconsDir, 'icon-1024.png'));
    const icns = png2icons.createICNS(png1024, png2icons.BICUBIC, 0, true);
    if (icns) {
      fs.writeFileSync(outIcns, icns);
      return true;
    }
  } catch (_) {}
  return false;
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (_) {
    console.error('[electron:icon] Falta o sharp. Execute: npm install');
    process.exit(1);
  }

  ensureDirs();
  const src = resolveSource();

  let base;
  if (src) {
    base = await transparentFromSource(sharp, src);
    console.log('[electron:icon] Fonte:', src);
  } else {
    base = sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 16, g: 185, b: 129, alpha: 1 } },
    }).png();
    console.warn('[electron:icon] Fonte não encontrada. Usando placeholder.');
  }

  await writeAllSizes(base);
  await writeIcoFromSizes(sharp);
  const hasIcns = await writeIcns();

  console.log('[electron:icon] Gerados: icon.png, icon-256.png, icon.ico, icons/*');
  if (!hasIcns) {
    console.warn('[electron:icon] icon.icns não foi gerado (instale png2icons para suporte macOS).');
  } else {
    console.log('[electron:icon] Gerado: icon.icns');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
