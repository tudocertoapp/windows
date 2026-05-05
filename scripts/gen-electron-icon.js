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
const outInstallerWizardIco = path.join(outDir, 'installer-wizard.ico');
const outIcns = path.join(outDir, 'icon.icns');
const buildDir = path.join(root, 'build');
const outNsisSidebarBmp = path.join(buildDir, 'installer-sidebar.bmp');
const outNsisHeaderBmp = path.join(buildDir, 'installer-header.bmp');
const outNsisFinishBmp = path.join(buildDir, 'installer-finish.bmp');

const BG = { r: 0, g: 0, b: 0, alpha: 0 };
const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

const CANDIDATES = [
  'H:/Meu Drive/logo svg.svg',
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/logo.png',
  'assets/favicon.png',
  'assets/logo-pages.png',
  'assets/splash.png',
];
const INSTALLER_PHOTO_CANDIDATES = [
  'assets/installer-photo.png',
];

function ensureDirs() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(outIconsDir)) fs.mkdirSync(outIconsDir, { recursive: true });
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
}

function resolveSource() {
  for (const c of CANDIDATES) {
    const p = path.isAbsolute(c) ? c : path.join(root, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveInstallerPhoto() {
  for (const c of INSTALLER_PHOTO_CANDIDATES) {
    const p = path.isAbsolute(c) ? c : path.join(root, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function transparentFromSource(sharp, srcPath) {
  const { data, info } = await sharp(srcPath, { density: 256, limitInputPixels: false })
    .resize(1024, 1024, { fit: 'contain', background: BG })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Remove fundo quase preto/cinza escuro (comum em SVG exportado com fundo).
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    if (max <= 26 && chroma <= 10) {
      data[i + 3] = 0;
    }
  }

  // Remove áreas transparentes/margens para aumentar presença visual do símbolo.
  return sharp(data, { raw: info })
    .trim({ threshold: 8 })
    .png();
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

async function writeIcoFromSizes() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = [];
  for (const s of sizes) {
    const p = path.join(outIconsDir, `icon-${s}.png`);
    buffers.push(fs.readFileSync(p));
  }
  fs.writeFileSync(outIco, await pngToIco(buffers));
}

/** ICO opaco para o assistente NSIS (transparência no .ico aparece como preto / “furado”). */
async function writeInstallerWizardIco(baseSharp) {
  const sidebarBg = { r: 10, g: 17, b: 28, alpha: 1 };
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = [];
  for (const s of sizes) {
    const buf = await baseSharp
      .clone()
      .resize(s, s, { fit: 'contain', background: sidebarBg, kernel: 'lanczos3' })
      .png()
      .toBuffer();
    buffers.push(buf);
  }
  fs.writeFileSync(outInstallerWizardIco, await pngToIco(buffers));
}

async function writeNsisBitmaps(baseSharp, sharp) {
  let Jimp;
  try {
    ({ Jimp } = require('jimp'));
  } catch (_) {
    throw new Error('Dependência jimp não encontrada para gerar bitmaps do instalador.');
  }

  // Tamanhos recomendados pelo NSIS (MUI2).
  const sidebarW = 164;
  const sidebarH = 314;
  const headerW = 150;
  const headerH = 57;
  const sidebarBg = { r: 10, g: 17, b: 28, alpha: 1 };
  const headerBg = { r: 10, g: 17, b: 28, alpha: 1 };
  const installerPhoto = resolveInstallerPhoto();

  // Boas-vindas + páginas internas: só logo (sem foto no canto durante "Instalando").
  const sidebarLogo = await baseSharp
    .clone()
    .resize(112, 112, { fit: 'contain', background: BG, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const sidebarPng = await sharp({
    create: { width: sidebarW, height: sidebarH, channels: 4, background: sidebarBg },
  })
    .composite([{ input: sidebarLogo, gravity: 'north' }])
    .flatten({ background: sidebarBg })
    .png()
    .toBuffer();

  const headerLogo = await baseSharp
    .clone()
    .resize(40, 40, { fit: 'contain', background: BG, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const headerPng = await sharp({
    create: { width: headerW, height: headerH, channels: 4, background: headerBg },
  })
    .composite([{ input: headerLogo, left: 8, top: 8 }])
    .flatten({ background: headerBg })
    .png()
    .toBuffer();

  const sidebarBmp = await Jimp.read(sidebarPng);
  await sidebarBmp.write(outNsisSidebarBmp);
  const headerBmp = await Jimp.read(headerPng);
  await headerBmp.write(outNsisHeaderBmp);

  // Página "Concluir" apenas: foto em melhor nitidez (superamostragem 2x → tamanho final).
  let finishPng;
  if (installerPhoto) {
    const w2 = sidebarW * 2;
    const h2 = sidebarH * 2;
    finishPng = await sharp(installerPhoto)
      .resize(w2, h2, { fit: 'cover', position: 'center', kernel: 'lanczos3' })
      .modulate({ brightness: 0.9, saturation: 1.03 })
      .resize(sidebarW, sidebarH, { fit: 'fill', kernel: 'lanczos3' })
      .composite([{
        input: Buffer.from(
          `<svg width="${sidebarW}" height="${sidebarH}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="rgba(6,12,20,0.28)"/>
          </svg>`
        ),
      }])
      .png()
      .toBuffer();
  } else {
    finishPng = sidebarPng;
  }
  const finishBmp = await Jimp.read(finishPng);
  await finishBmp.write(outNsisFinishBmp);
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
  await writeIcoFromSizes();
  await writeInstallerWizardIco(base);
  await writeNsisBitmaps(base, sharp);
  const hasIcns = await writeIcns();

  console.log('[electron:icon] Gerados: icon.png, icon-256.png, icon.ico, installer-wizard.ico, icons/*, installer-sidebar.bmp, installer-header.bmp, installer-finish.bmp');
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
