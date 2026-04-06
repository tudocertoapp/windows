/**
 * Garante que arquivos referenciados como /assets/... no bundle web existam em dist/assets.
 * Sem isso, Ionicons e outras fontes 404 no Electron empacotado (quadrados vazios).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');

const HASH_SUFFIX_RE = /^(.+)\.([a-f0-9]{32})$/i;

function collectRefs(js) {
  const refs = new Set();
  const patterns = [
    /"(\/assets\/[^"]+)"/g,
    /'(\/assets\/[^']+)'/g,
    /uri:"(\/assets\/[^"]+)"/g,
    /uri:'(\/assets\/[^']+)'/g,
    // Metro: m.exports="/assets/node_modules/.../Font.ttf"
    /m\.exports="(\/assets\/[^"]+)"/g,
    /m\.exports='(\/assets\/[^']+)'/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(js))) refs.add(m[1]);
  }
  return refs;
}

/** /assets/node_modules/.../File.<hash>.ext -> caminho fonte em node_modules/.../File.ext */
function resolveProjectSource(assetUrl) {
  const rel = assetUrl.replace(/^\/assets\//, '').replace(/\\/g, '/');
  const parsed = path.posix.parse(rel);
  const dir = path.posix.dirname(rel);
  const ext = parsed.ext.slice(1);
  const nameWithPossibleHash = parsed.name;
  const hm = nameWithPossibleHash.match(HASH_SUFFIX_RE);
  const cleanBase = hm ? `${hm[1]}.${ext}` : `${nameWithPossibleHash}.${ext}`;
  const primary = path.join(root, dir, cleanBase);
  if (fs.existsSync(primary)) return primary;

  /* O pacote npm @expo/vector-icons muitas vezes não inclui build/vendor/*.ttf; o bundle ainda referencia esses caminhos.
     react-native-vector-icons traz a pasta Fonts/ com os mesmos nomes (Ionicons.ttf, etc.). */
  const lower = rel.toLowerCase();
  if (lower.includes('/fonts/') && ['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
    const rnv = path.join(root, 'node_modules', 'react-native-vector-icons', 'Fonts', cleanBase);
    if (fs.existsSync(rnv)) return rnv;
  }
  return primary;
}

function ensureAsset(assetUrl) {
  const rel = assetUrl.replace(/^\/assets\//, '');
  const dest = path.join(distDir, 'assets', rel);
  if (fs.existsSync(dest)) return;

  const src = resolveProjectSource(assetUrl);
  if (!fs.existsSync(src)) {
    console.warn('[ensure-dist-assets] Fonte não encontrada:', src, '←', assetUrl);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('[ensure-dist-assets]', rel);
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.warn('[ensure-dist-assets] dist/ inexistente; rode expo export antes.');
    return;
  }
  const webJsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
  if (!fs.existsSync(webJsDir)) {
    console.warn('[ensure-dist-assets] dist/_expo/static/js/web não encontrado.');
    return;
  }
  const files = fs.readdirSync(webJsDir).filter((f) => f.endsWith('.js'));
  const allRefs = new Set();
  for (const f of files) {
    const js = fs.readFileSync(path.join(webJsDir, f), 'utf8');
    for (const r of collectRefs(js)) allRefs.add(r);
  }
  for (const url of allRefs) {
    if (url.startsWith('/assets/')) ensureAsset(url);
  }
  console.log('[ensure-dist-assets] OK —', allRefs.size, 'referências analisadas.');
}

main();
