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

function normalizeTimeToken(token) {
  if (!token) return null;
  const raw = String(token).trim().toLowerCase().replace('h', ':');
  if (!/^\d{1,2}(:\d{1,2})?$/.test(raw)) return null;
  const [hPart, mPart] = raw.split(':');
  const h = parseInt(hPart, 10);
  const m = mPart != null ? parseInt(mPart, 10) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function extractTimeRange(text) {
  const t = String(text || '');
  const patterns = [
    /(?:às|as)\s*(\d{1,2}(?::\d{1,2})?)\s*(?:até|ate|a)\s*(?:às|as)?\s*(\d{1,2}(?::\d{1,2})?)/i,
    /(\d{1,2}(?::\d{1,2})?)\s*(?:até|ate|a)\s*(\d{1,2}(?::\d{1,2})?)/i,
  ];
  for (const rx of patterns) {
    const m = t.match(rx);
    if (!m) continue;
    const start = normalizeTimeToken(m[1]);
    const end = normalizeTimeToken(m[2]);
    if (start && end) return { start, end };
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
  const stopWords = ['gastei', 'gasto', 'paguei', 'paguei', 'na', 'no', 'em', 'com', 'de', 'da', 'do', 'empresa', 'pessoal', 'reais', 'real', 'fui', 'foi', 'estava', 'estive', 'em', 'total'];
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

/**
 * Detecta intenção da fala e extrai dados para abrir o formulário correto.
 * Ex: "gastei 50 reais com pão na padaria, gasto pessoal" -> { type: 'despesa', params: { amount: '50,00', description: 'Pão', categoryDesp: 'alimentacao', subcategoryDesp: 'Padaria', tipoVenda: 'pessoal' } }
 * Ex: "receita de 200 vendi produto empresa" -> { type: 'receita', params: { amount: '200,00', tipoVenda: 'empresa' } }
 */
export function parseVoiceIntent(transcript) {
  const t = (transcript || '').trim().toLowerCase();
  if (!t) return null;

  const result = { type: null, params: {} };
  const timeRange = extractTimeRange(transcript);

  if (timeRange && /\b(cliente|atendimento|agenda|agendamento|evento|compromisso|reunião|reuniao|consulta)\b/.test(t)) {
    result.type = 'agenda';
    const isEmpresa = /\b(cliente|atendimento)\b/.test(t);
    const cleaned = t
      .replace(/(?:às|as)\s*\d{1,2}(?::\d{1,2})?\s*(?:até|ate|a)\s*(?:às|as)?\s*\d{1,2}(?::\d{1,2})?/gi, '')
      .replace(/\b(tenho|marcar|marque|agendar|agendamento|agenda|evento|compromisso|reunião|reuniao|consulta|cliente|atendimento|um|uma|de|das|dos|para|pro|pra)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    result.params = {
      tipo: isEmpresa ? 'empresa' : 'pessoal',
      type: isEmpresa ? 'venda' : 'evento',
      time: timeRange.start,
      timeEnd: timeRange.end,
      description: cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '',
      title: cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : (isEmpresa ? 'Atendimento' : 'Evento'),
    };
    return result;
  }

  if (/\b(receita|entrada|entrou|ganhei|recebi|vendi|venda)\b/.test(t)) {
    result.type = 'receita';
    const amount = extractAmount(transcript);
    if (amount != null) result.params.amount = amount.toFixed(2).replace('.', ',');
    if (/empresa|empresarial/.test(t)) result.params.tipoVenda = 'empresa';
    else if (/pessoal/.test(t)) result.params.tipoVenda = 'pessoal';
    const descParts = t.replace(/\b(receita|entrada|ganhei|recebi|vendi|venda|empresa|pessoal|reais|real)\b/gi, '').replace(/[\d,\.]+/g, '').trim().split(/\s+/).filter(Boolean);
    if (descParts.length) result.params.description = descParts.join(' ').replace(/\s+/g, ' ').trim();
    if (result.params.description) result.params.description = result.params.description.charAt(0).toUpperCase() + result.params.description.slice(1);
    return result;
  }

  if (/\b(despesa|saída|saida|gastei|paguei|gasto|fui|foi em|estava na|estava no)\b/.test(t)) {
    result.type = 'despesa';
    const parsed = parseExpenseVoice(transcript);
    if (parsed.amount) result.params.amount = parsed.amount;
    if (parsed.description) result.params.description = parsed.description;
    if (parsed.categoryDesp) result.params.categoryDesp = parsed.categoryDesp;
    if (parsed.subcategoryDesp) result.params.subcategoryDesp = parsed.subcategoryDesp;
    if (parsed.tipoVenda) result.params.tipoVenda = parsed.tipoVenda;
    return result;
  }

  if (/\b(novo\s+)?cliente\b/.test(t)) {
    result.type = 'cliente';
    return result;
  }
  if (/\b(evento|agenda|compromisso|reunião|reuniao|agendamento)\b/.test(t)) {
    result.type = 'agenda';
    return result;
  }
  if (/\b(novo\s+)?produto\b/.test(t)) {
    result.type = 'produto';
    return result;
  }
  if (/\b(novo\s+)?servi[çc]o\b/.test(t)) {
    result.type = 'servico';
    return result;
  }
  if (/\b(novo\s+)?fornecedor\b/.test(t)) {
    result.type = 'fornecedor';
    return result;
  }
  if (/\b(fatura|boleto|boletos)\b/.test(t)) {
    result.type = 'fatura';
    return result;
  }
  if (/\btarefa\b/.test(t)) {
    result.type = 'tarefa';
    return result;
  }

  const amount = extractAmount(transcript);
  if (amount != null && amount > 0) {
    if (/\b(gastei|paguei|gasto|despesa|fui|foi em|estava na|estava no)\b/.test(t)) {
      result.type = 'despesa';
      const parsed = parseExpenseVoice(transcript);
      result.params = { amount: parsed.amount || amount.toFixed(2).replace('.', ','), description: parsed.description, categoryDesp: parsed.categoryDesp, subcategoryDesp: parsed.subcategoryDesp, tipoVenda: parsed.tipoVenda };
    } else if (/\b(recebi|ganhei|receita|vendi)\b/.test(t)) {
      result.type = 'receita';
      result.params = { amount: amount.toFixed(2).replace('.', ',') };
    } else {
      result.type = 'despesa';
      const parsed = parseExpenseVoice(transcript);
      result.params = { amount: amount.toFixed(2).replace('.', ','), description: parsed.description, categoryDesp: parsed.categoryDesp, subcategoryDesp: parsed.subcategoryDesp, tipoVenda: parsed.tipoVenda || 'pessoal' };
    }
    return result;
  }

  return null;
}
