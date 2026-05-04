/**
 * Atualiza mobile-version.json (versão Expo mobile).
 * O app.config.js deriva android.versionCode e ios.buildNumber a partir desse semver.
 *
 *   node scripts/set-mobile-version.js           → reescreve mobile-version.json (normaliza JSON)
 *   node scripts/set-mobile-version.js 1.0.11    → define versão (ex.: CI)
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MOBILE = path.join(ROOT, 'mobile-version.json');

function isSemverLike(v) {
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(v);
}

function semverToNativeBuildNumber(semver) {
  const base = String(semver).split('-')[0];
  const m = base.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 1;
  const major = Math.min(999, parseInt(m[1], 10) || 0);
  const minor = Math.min(999, parseInt(m[2], 10) || 0);
  const patch = Math.min(999, parseInt(m[3], 10) || 0);
  return major * 1_000_000 + minor * 1_000 + patch;
}

function main() {
  const arg = (process.argv[2] || '').trim();
  let version = arg;
  if (!version) {
    if (!fs.existsSync(MOBILE)) {
      console.error('Falta mobile-version.json na raiz do projeto.');
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(MOBILE, 'utf8'));
    version = (raw.version || '').trim();
    if (!version) {
      console.error('mobile-version.json precisa de { "version": "x.y.z" }.');
      process.exit(1);
    }
  }
  if (!isSemverLike(version)) {
    console.error(`Versão inválida: "${version}" (use formato semver, ex: 1.0.11)`);
    process.exit(1);
  }

  const prev = fs.existsSync(MOBILE) ? JSON.parse(fs.readFileSync(MOBILE, 'utf8')).version : '(novo)';
  const native = semverToNativeBuildNumber(version);
  fs.writeFileSync(MOBILE, `${JSON.stringify({ version }, null, 2)}\n`, 'utf8');
  console.log(`mobile-version.json: ${prev} → ${version}`);
  console.log(`  → android.versionCode / ios.buildNumber (derivado): ${native}`);
}

main();
