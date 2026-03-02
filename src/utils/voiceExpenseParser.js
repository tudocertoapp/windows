import { CATEGORIAS_DESPESA } from '../constants/categories';

/**
 * Mapeia palavras faladas para categoria e subcategoria.
 * Ex: "padaria" ou "na padaria com pão" -> { catId: 'alimentacao', sub: 'Padaria' }
 */
function findCategoryFromText(text) {
  const t = (text || '').toLowerCase().trim();
  const words = t.split(/\s+/);
  for (const cat of CATEGORIAS_DESPESA) {
    for (const sub of cat.sub || []) {
      const subLow = sub.toLowerCase();
      if (t.includes(subLow) || words.some((w) => subLow.includes(w) || w.includes(subLow))) return { catId: cat.id, sub };
    }
    const labelLow = cat.label.toLowerCase();
    if (t.includes(labelLow) || words.some((w) => labelLow.includes(w))) {
      return { catId: cat.id, sub: cat.sub?.[0] || cat.label };
    }
  }
  return null;
}

/**
 * Extrai valor monetário do texto. Aceita "50", "50,00", "50.00", "50 reais"
 */
function extractAmount(text) {
  const t = (text || '').replace(/\s/g, '');
  const match = t.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/);
  if (match) {
    const numStr = match[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(numStr);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Parseia transcrição de voz para despesa.
 * Ex: "gastei 50,00 na padaria com pão gasto empresa"
 * -> { amount: 50, categoryDesp: 'alimentacao', subcategoryDesp: 'Padaria', description: 'Pão', tipoVenda: 'empresa' }
 */
export function parseExpenseVoice(transcript) {
  const t = (transcript || '').trim();
  if (!t) return {};

  const result = {};
  const words = t.split(/\s+/).map((w) => w.toLowerCase());

  if (/empresa|empresarial/.test(t)) result.tipoVenda = 'empresa';
  else if (/pessoal/.test(t)) result.tipoVenda = 'pessoal';

  const amount = extractAmount(t);
  if (amount != null) result.amount = amount.toFixed(2).replace('.', ',');

  const catResult = findCategoryFromText(t);
  if (catResult) {
    result.categoryDesp = catResult.catId;
    result.subcategoryDesp = catResult.sub;
    result.category = catResult.sub;
  }

  const descParts = [];
  const stopWords = ['gastei', 'gasto', 'paguei', 'paguei', 'na', 'no', 'com', 'de', 'da', 'do', 'empresa', 'pessoal', 'reais', 'real'];
  const numPattern = /[\d,\.]+/;
  for (const w of words) {
    const clean = w.replace(/[,\.]/g, '');
    if (stopWords.includes(clean)) continue;
    if (numPattern.test(w)) continue;
    const cat = CATEGORIAS_DESPESA.flatMap((c) => (c.sub || []).map((s) => s.toLowerCase()));
    if (cat.some((s) => s.includes(clean) || clean.includes(s))) continue;
    descParts.push(w);
  }
  const description = descParts.join(' ').trim();
  if (description) result.description = description.charAt(0).toUpperCase() + description.slice(1);

  return result;
}
