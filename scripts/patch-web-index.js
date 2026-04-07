/**
 * Patches dist/index.html - background e loading inicial.
 * Evita tela branca enquanto o React carrega.
 * Electron: embute Ionicons em data URL (@font-face) para os ícones não dependerem de GET /assets/*.ttf
 * (evita quadrados vazios se o servidor local ou asar falhar nesse pedido).
 */
const fs = require('fs');
const path = require('path');

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
  const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
  let logoDataUri = '';
  if (fs.existsSync(logoPath)) {
    const b64 = fs.readFileSync(logoPath).toString('base64');
    logoDataUri = `data:image/png;base64,${b64}`;
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
  if (!html.includes('id="root-loading"')) {
    const loadingHtml = logoDataUri
      ? `<div id="root"><div id="root-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-family:system-ui,sans-serif;font-size:16px;gap:14px;"><img src="${logoDataUri}" alt="Tudo Certo" style="width:92px;height:92px;object-fit:contain;opacity:0.98;" /><div style="font-size:15px;font-weight:600;color:#d1d5db;">Carregando Tudo Certo...</div></div></div>`
      : '<div id="root"><div id="root-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-family:system-ui,sans-serif;font-size:16px;">Carregando Tudo Certo...</div></div>';
    html = html.replace(
      '<div id="root"></div>',
      loadingHtml
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(indexPath, html);
    console.log('Patched dist/index.html');
  }
}
