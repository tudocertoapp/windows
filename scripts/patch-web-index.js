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
  if (!html.includes('background-color: #111827')) {
    html = html.replace(
      /(body\s*\{\s*overflow:\s*hidden;)/,
      '$1\n        background-color: #111827;'
    );
    changed = true;
  }
  if (!html.includes('id="root-loading"')) {
    html = html.replace(
      '<div id="root"></div>',
      '<div id="root"><div id="root-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-family:system-ui,sans-serif;font-size:16px;">Carregando Tudo Certo...</div></div>'
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(indexPath, html);
    console.log('Patched dist/index.html');
  }
}
