/**
 * Patches dist/index.html - background e loading inicial.
 * Evita tela branca enquanto o React carrega.
 */
const fs = require('fs');
const path = require('path');
const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  let changed = false;

  // Garante que /assets e @font-face usem a raiz do app (evita resolução relativa ao path do bundle).
  if (!html.includes('<base ')) {
    html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n    <base href="/" />`);
    changed = true;
  }
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
