/**
 * Define o campo "version" do package.json para o build Electron / electron-builder.
 * Uso:
 *   node scripts/set-desktop-version.js              → lê desktop-version.json
 *   node scripts/set-desktop-version.js 1.0.14       → força versão (ex.: CI workflow_dispatch)
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');
const DESKTOP = path.join(ROOT, 'desktop-version.json');

function isSemverLike(v) {
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(v);
}

function main() {
  const arg = (process.argv[2] || '').trim();
  let version = arg;
  if (!version) {
    if (!fs.existsSync(DESKTOP)) {
      console.error('Falta desktop-version.json na raiz do projeto.');
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(DESKTOP, 'utf8'));
    version = (raw.version || '').trim();
    if (!version) {
      console.error('desktop-version.json precisa de { "version": "x.y.z" }.');
      process.exit(1);
    }
  }
  if (!isSemverLike(version)) {
    console.error(`Versão inválida: "${version}" (use formato semver, ex: 1.0.12)`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const prev = pkg.version;
  pkg.version = version;
  fs.writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`package.json version: ${prev} → ${version}`);
}

main();
