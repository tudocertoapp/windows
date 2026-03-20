function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toBrNumber(token) {
  // Aceita formatos:
  // - 1.234,56
  // - 1234,56
  // - 1234.56
  const t = String(token || '').trim();
  if (!t) return null;

  const hasComma = t.includes(',');
  const hasDot = t.includes('.');

  let normalized = t;
  if (hasComma && hasDot) {
    normalized = t.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    normalized = t.replace(',', '.');
  } else if (!hasComma && hasDot) {
    // considera decimal com ponto
    normalized = t;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function extractFirstDate(text) {
  const t = String(text || '');
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const rxY = /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/;
  const m1 = t.match(rxY);
  if (m1) return `${m1[1]}/${m1[2]}/${m1[3]}`;

  // dd/mm/yy -> 19yy/20yy (heurística simples: assume 20xx se yy <= 60)
  const rx2 = /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/;
  const m2 = t.match(rx2);
  if (m2) {
    const yy = Number(m2[3]);
    const yyyy = yy <= 60 ? 2000 + yy : 1900 + yy;
    return `${m2[1]}/${m2[2]}/${String(yyyy)}`;
  }
  return null;
}

function extractStoreFirstLine(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return '';
  const first = lines[0];
  // remove ruído de OCR
  return stripAccents(first).replace(/[^\p{L}\p{N}\s&.\-]/gu, '').replace(/\s+/g, ' ').trim();
}

function scoreLineForTotal(line) {
  const s = stripAccents(String(line || '')).toLowerCase();
  const keywords = ['total', 'valor total', 'vl total', 'valorfinal', 'valor final', 'vl. total', 'saldo', 'grand total', 'pagamento', 'a pagar'];
  let score = 0;
  for (const k of keywords) {
    const kk = stripAccents(k).toLowerCase();
    if (s.includes(kk)) score += kk.length > 4 ? 6 : 4;
  }
  // linhas com "r$" ganham
  if (s.includes('r$') || s.includes('rs')) score += 3;
  return score;
}

function extractTotalValue(text) {
  const normalized = String(text || '');
  const lines = normalized.split(/\r?\n/);

  // Tokens monetários BR comuns
  const moneyTokenRegex =
    /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:,\d{2})|\d+\.\d{2})/g;

  let best = null; // { value, score }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineScore = scoreLineForTotal(line) + (i / 1000);
    const matches = String(line || '').match(moneyTokenRegex) || [];
    for (const tokenWithMaybeR$ of matches) {
      const token = tokenWithMaybeR$.replace(/^R\$\s*/i, '').replace(/^RS\s*/i, '');
      const v = toBrNumber(token);
      if (v == null) continue;
      if (!(v > 0 && v < 999999)) continue;
      const score = lineScore + v; // favorece valores maiores em linhas relevantes
      if (!best || score > best.score) best = { value: v, score };
    }
  }

  if (best) return best.value;

  // fallback: maior valor no texto inteiro
  const all = String(normalized).match(moneyTokenRegex) || [];
  const values = all
    .map((t) => t.replace(/^R\$\s*/i, '').replace(/^RS\s*/i, ''))
    .map((t) => toBrNumber(t))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 999999);
  if (!values.length) return null;
  return Math.max(...values);
}

/**
 * @returns {{total:number|null,date:string|null,store:string,rawText:string}}
 */
export function extractReceiptData(text) {
  const rawText = normalizeText(text);
  if (!rawText) return { total: null, date: null, store: '', rawText: '' };

  const total = extractTotalValue(rawText);
  const date = extractFirstDate(rawText);
  const store = extractStoreFirstLine(rawText);

  return { total, date, store, rawText };
}

export function isValidReceiptData(d) {
  if (!d) return false;
  return typeof d.total === 'number' && Number.isFinite(d.total) && d.total > 0 && typeof d.date === 'string' && d.date.length > 0;
}

