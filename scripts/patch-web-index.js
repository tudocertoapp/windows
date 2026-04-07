/**
 * Patches dist/index.html - background e loading inicial.
 * Evita tela branca enquanto o React carrega.
 * Electron: embute Ionicons em data URL (@font-face) para os ícones não dependerem de GET /assets/*.ttf
 * (evita quadrados vazios se o servidor local ou asar falhar nesse pedido).
 */
const fs = require('fs');
const path = require('path');

const splashLayout = require('../src/constants/splashLayout.json');

function findIoniconsTtfUnderAssets(assetsDir) {
  if (!fs.existsSync(assetsDir)) return null;
  const stack = [assetsDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (/^Ionicons\..+\.ttf$/i.test(ent.name)) return p;
    }
  }
  return null;
}

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  let changed = false;
  const assetsDir = path.join(__dirname, '..', 'assets');
  const splashPng = path.join(assetsDir, 'logo-splash.png');
  const splashFallback = path.join(assetsDir, 'logo.png');
  const splashFile = fs.existsSync(splashPng) ? splashPng : splashFallback;
  let splashDataUri = '';
  if (fs.existsSync(splashFile)) {
    splashDataUri = `data:image/png;base64,${fs.readFileSync(splashFile).toString('base64')}`;
  }

  // Electron (file://): caminhos absolutos quebram; converte para relativos.
  const patchedPaths = html
    .replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"')
    .replace(/src="\/_expo\//g, 'src="./_expo/');
  if (patchedPaths !== html) {
    html = patchedPaths;
    changed = true;
  }

  // Nome da família = segundo argumento de createIconSet em @expo/vector-icons (Ionicons.js): "ionicons"
  if (!html.includes('tc-ionicons-inline-face')) {
    const distDir = path.join(__dirname, '..', 'dist');
    const ttfAbs = findIoniconsTtfUnderAssets(path.join(distDir, 'assets'));
    if (ttfAbs) {
      const fontB64 = fs.readFileSync(ttfAbs).toString('base64');
      const style = `<style id="tc-ionicons-inline-face">@font-face{font-family:ionicons;font-style:normal;font-weight:400;font-display:swap;src:url(data:font/ttf;base64,${fontB64}) format("truetype");}</style>`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n    ${style}`);
        changed = true;
        console.log('[patch-web-index] Ionicons embutido (data URL) a partir de', path.relative(distDir, ttfAbs));
      }
    } else {
      console.warn('[patch-web-index] Ionicons .ttf não encontrado em dist/assets; ícones podem falhar no Electron.');
    }
  }

  if (!html.includes('background-color: #111827')) {
    html = html.replace(
      /(body\s*\{\s*overflow:\s*hidden;)/,
      '$1\n        background-color: #111827;'
    );
    changed = true;
  }
  // Mesmo tamanho que SplashScreen (splashLayout.js) — evita “duas logos” com tamanhos diferentes.
  const { SPLASH_BACKGROUND, SPLASH_LOGO_WIDTH, SPLASH_LOGO_HEIGHT } = splashLayout;
  const rootSplashHtml = splashDataUri
    ? `<div id="root"><div id="root-loading" style="display:flex;align-items:center;justify-content:center;min-height:100vh;width:100%;background-color:${SPLASH_BACKGROUND};"><img src="${splashDataUri}" alt="" width="${SPLASH_LOGO_WIDTH}" height="${SPLASH_LOGO_HEIGHT}" style="width:${SPLASH_LOGO_WIDTH}px;height:${SPLASH_LOGO_HEIGHT}px;max-width:min(${SPLASH_LOGO_WIDTH}px,92vw);max-height:min(${SPLASH_LOGO_HEIGHT}px,28vh);object-fit:contain;" /></div></div>`
    : `<div id="root"><div id="root-loading" style="min-height:100vh;width:100%;background-color:${SPLASH_BACKGROUND};"></div></div>`;

  if (!html.includes('id="root-loading"')) {
    html = html.replace('<div id="root"></div>', rootSplashHtml);
    changed = true;
  } else if (html.includes('Carregando Tudo Certo')) {
    const reOldRoot = /<div id="root">\s*<div id="root-loading"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
    if (reOldRoot.test(html)) {
      html = html.replace(reOldRoot, rootSplashHtml);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(indexPath, html);
    console.log('Patched dist/index.html');
  }
}
