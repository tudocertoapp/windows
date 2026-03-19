function normalizeSpaces(s) {
  return String(s || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseBrMoneyToken(token) {
  if (!token) return null;
  const t = String(token)
    .replace(/[^\d.,]/g, '')
    .trim();
  if (!t) return null;
  // suporta "1.234,56" e "1234,56" e "1234.56"
  const hasComma = t.includes(',');
  const hasDot = t.includes('.');
  let normalized = t;
  if (hasComma && hasDot) {
    // assume . milhar e , decimal
    normalized = t.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    normalized = t.replace(/\./g, '').replace(',', '.');
  } else {
    // só ponto ou só dígitos
    // se houver mais de um ponto, assume milhar
    const parts = t.split('.');
    if (parts.length > 2) normalized = parts.join('');
  }
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickBestValue(values) {
  if (!values?.length) return null;
  // recibo costuma ter TOTAL como maior; escolhemos o maior plausível
  const filtered = values.filter((v) => Number.isFinite(v) && v > 0 && v < 999999);
  if (!filtered.length) return null;
  return Math.max(...filtered);
}

function extractFirstDate(text) {
  const t = String(text || '');
  const rx = /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/;
  const m = t.match(rx);
  if (!m) return null;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function extractStoreNameFirstLine(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return '';
  const first = lines[0];
  // remove caracteres muito estranhos
  return first.replace(/[^\p{L}\p{N}\s&.\-]/gu, '').replace(/\s+/g, ' ').trim();
}

function extractBrCurrencyValues(text) {
  const t = String(text || '');
  // aceita "R$ 12,34", "R$12,34", "12,34"
  const tokens = [];
  const moneyRx = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})|\d+\.\d{2})/g;
  let m;
  while ((m = moneyRx.exec(t)) !== null) {
    const n = parseBrMoneyToken(m[1]);
    if (n != null) tokens.push(n);
  }
  return tokens;
}

/**
 * Extrai dados principais do texto OCR de um recibo.
 * - store: primeira linha do OCR
 * - value: maior valor monetário encontrado (R$ 00,00)
 * - date: primeira data dd/mm/aaaa encontrada
 * - rawText: texto original
 */
export function parseReceipt(rawText) {
  const cleaned = normalizeSpaces(rawText);
  const store = extractStoreNameFirstLine(cleaned);
  const date = extractFirstDate(cleaned);
  const values = extractBrCurrencyValues(cleaned);
  const value = pickBestValue(values);

  return {
    store: store || null,
    value: value != null ? value : null,
    date: date || null,
    rawText: cleaned,
  };
}

