const { ALIASES, dictSet } = require('./lexicon');

function foldToken(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function dist(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[m][n];
}

let DICT = null;
function getDict() {
  if (!DICT) DICT = [...dictSet()].filter((w) => w.length >= 3);
  return DICT;
}

const KEEP = new Set([
  'quantos', 'quanto', 'quais', 'qual', 'tenho', 'tem', 'tinha',
  'cadastrado', 'cadastrados', 'cadastro', 'cadastrar',
  'esse', 'essa', 'isso', 'aqui', 'com', 'por', 'para', 'uma', 'uns',
  'mais', 'menos', 'vende', 'vendi', 'vendeu', 'lucas', 'voce', 'dock',
  'detalhe', 'detalha', 'detalhar', 'fecha', 'fechar', 'abre', 'abrir',
]);

function closest(token) {
  const t = foldToken(token);
  if (!t) return t;
  if (ALIASES[t]) return ALIASES[t];
  if (KEEP.has(t)) return t;
  if (t.length < 3) return t;
  const dict = getDict();
  if (dict.includes(t)) return t;
  let best = t;
  let bestD = 3;
  const maxD = t.length <= 4 ? 1 : 2;
  for (const w of dict) {
    if (Math.abs(w.length - t.length) > maxD) continue;
    const d = dist(t, w);
    if (d < bestD && d <= maxD) {
      bestD = d;
      best = w;
      if (d === 1) break;
    }
  }
  return best;
}

/** Corrige digitação e devolve texto canônico para o raciocínio. */
function correctQuery(raw) {
  const original = String(raw || '').trim();
  if (!original) return { text: '', corrected: original, changes: [] };
  const parts = original.split(/(\s+)/);
  const changes = [];
  const out = parts.map((p) => {
    if (!p.trim() || /^\s+$/.test(p) || /[0-9]/.test(p)) return p;
    const trimmed = p.trim();
    const folded = foldToken(trimmed.replace(/[^\p{L}]/gu, ''));
    if (!folded) return p;
    if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÀ]/.test(trimmed) && folded.length >= 2) return folded;
    if (folded.length < 2 && !ALIASES[folded]) return p;
    const next = closest(folded);
    if (next !== folded) changes.push({ from: folded, to: next });
    return next;
  });
  return { text: foldToken(out.join('')).replace(/\s+/g, ' ').trim(), corrected: out.join(''), changes };
}

module.exports = { correctQuery, closest, foldToken };
