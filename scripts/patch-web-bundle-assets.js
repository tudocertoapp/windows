/**
 * Corrige URIs de assets no bundle web para o Electron.
 * "./assets/..." resolve em relação ao JS em /_expo/static/js/web/ → caminho errado (404).
 * "/assets/..." resolve a partir da raiz do origin (http://127.0.0.1:porta/) → correto.
 */
const fs = require('fs');
const path = require('path');

const distRoot = path.join(__dirname, '..', 'dist');

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkJsFiles(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

function patchFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  const next = s
    .replace(/"\.\/assets\//g, '"/assets/')
    .replace(/'\.\/assets\//g, "'/assets/");
  if (next !== s) {
    fs.writeFileSync(filePath, next, 'utf8');
    return true;
  }
  return false;
}

const roots = [path.join(distRoot, '_expo')];
let n = 0;
for (const r of roots) {
  for (const f of walkJsFiles(r)) {
    if (patchFile(f)) n++;
  }
}

if (n) {
  console.log(`Patched asset paths in ${n} JS file(s) under dist/`);
}
