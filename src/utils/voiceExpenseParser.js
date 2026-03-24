import { CATEGORIAS_DESPESA } from '../constants/categories';

/** Prefer o match mais longo (ex.: "supermercado" antes de "mercado"). */
function findLongestCategoryMatch(text) {
  const t = (text || '').toLowerCase();
  let best = null;
  let bestLen = 0;
  for (const cat of CATEGORIAS_DESPESA) {
    for (const sub of cat.sub || []) {
      const sl = (sub || '').toLowerCase();
      if (!sl) continue;
      if (t.includes(sl) && sl.length > bestLen) {
        best = { catId: cat.id, sub };
        bestLen = sl.length;
      }
    }
    const ll = (cat.label || '').toLowerCase();
    if (ll && t.includes(ll) && ll.length > bestLen) {
      best = { catId: cat.id, sub: cat.sub?.[0] || cat.label };
      bestLen = ll.length;
    }
  }
  return best;
}

/** @deprecated use findLongestCategoryMatch */
function findCategoryFromText(text) {
  return findLongestCategoryMatch(text);
}

/** Local após na/no/em (para subcategoria), até valor ou fim da frase. */
function extractPlaceRaw(text) {
  const s = String(text || '');
  const m = s.match(/\b(?:na|no|nem|em)\s+([^\d,]+?)(?=\s*[\d]{1,4}(?:[.,]\d{2})?|\s*,\s*gasto|\s+gasto\s|\s+gastei\b|\s+pessoal\b|\s+empresa\b|$)/i);
  if (!m) return '';
  return m[1].replace(/\s+/g, ' ').trim();
}

/** Mapeia trecho do lugar (ex.: "padaria", "loja de roupas") para categoria/sub do app. */
function matchPlaceToCategory(placeStr) {
  const p = (placeStr || '').toLowerCase().trim();
  if (!p) return null;

  if (/^loja\b/.test(p) || p === 'loja') {
    return { catId: 'compras', sub: 'Loja' };
  }

  let best = null;
  let bestLen = 0;
  for (const cat of CATEGORIAS_DESPESA) {
    for (const sub of cat.sub || []) {
      const sl = (sub || '').toLowerCase();
      if (!sl) continue;
      if (p.includes(sl) || sl.includes(p.split(/\s+/)[0])) {
        if (sl.length >= bestLen) {
          best = { catId: cat.id, sub };
          bestLen = sl.length;
        }
      }
    }
  }
  return best;
}

/** Dicas por produto quando o texto não cita padaria/mercado etc. */
function matchItemKeywordToCategory(itemLower) {
  const t = (itemLower || '').toLowerCase();
  if (!t) return null;
  const hints = [
    { re: /\b(celular|smartphone|iphone|galaxy|tablet|notebook|monitor|mouse|teclado|fone|headphone|carregador)\b/i, catId: 'compras', sub: 'Eletrônicos' },
    { re: /\b(p[aã]o|sandu[íi]che|manteiga|leite|caf[ée]|a[cç][uú]car)\b/i, catId: 'alimentacao', sub: 'Padaria' },
    { re: /\b(uber|99|t[aá]xi|carro por app)\b/i, catId: 'transporte', sub: 'Uber/99' },
    { re: /\b(combust[ií]vel|gasolina|etanol)\b/i, catId: 'transporte', sub: 'Combustível' },
    { re: /\b([ôo]nibus|metr[ôo]|passe)\b/i, catId: 'transporte', sub: 'Ônibus/Metrô' },
    { re: /\b(rem[eé]dio|farm[aá]cia|vitamina)\b/i, catId: 'saude', sub: 'Farmácia' },
  ];
  for (const h of hints) {
    if (h.re.test(t)) return { catId: h.catId, sub: h.sub };
  }
  return null;
}

/**
 * Prioridade: lugar explícito (na padaria > na loja); depois palavras-chave do item; depois maior match no texto.
 */
function inferExpenseCategory(fullText, itemDescription, placeRaw) {
  const t = (fullText || '').toLowerCase();
  const place = (placeRaw || '').toLowerCase().trim();
  const item = (itemDescription || '').toLowerCase();

  const fromPlace = matchPlaceToCategory(place);
  const fromText = findLongestCategoryMatch(t);
  const fromItem = matchItemKeywordToCategory(item);

  if (fromPlace) {
    return { categoryDesp: fromPlace.catId, subcategoryDesp: fromPlace.sub, category: fromPlace.sub };
  }

  if (fromItem) {
    return { categoryDesp: fromItem.catId, subcategoryDesp: fromItem.sub, category: fromItem.sub };
  }

  if (fromText) {
    return { categoryDesp: fromText.catId, subcategoryDesp: fromText.sub, category: fromText.sub };
  }

  return null;
}

function stripNoiseForItem(text) {
  return String(text || '')
    .replace(/\bR\$\s*[\d.,]+|[\d]{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanItemPhrase(phrase) {
  let p = String(phrase || '').trim().replace(/\s+/g, ' ');
  if (!p) return '';
  const lead =
    /^(comprando|comprar|comprei|compro|compramos|um|uma|uns|umas|o|a|os|as|de|da|do|dizendo|tipo)\s+/i;
  while (lead.test(p)) p = p.replace(lead, '').trim();
  p = p.replace(/\s+(gasto|gastei|pessoal|empresa|reais|real|despesa)$/i, '').trim();
  const stop = new Set([
    'comprando',
    'comprar',
    'gastei',
    'gasto',
    'pessoal',
    'empresa',
    'reais',
    'real',
    'despesa',
    'na',
    'no',
    'em',
    'com',
    'foi',
    'fui',
  ]);
  const words = p.split(/\s+/).filter((w) => {
    const c = w.replace(/[.,]/g, '').toLowerCase();
    return c && !stop.has(c);
  });
  if (!words.length) return '';
  return words.slice(0, 6).join(' ');
}

/**
 * Extrai o nome do gasto (o que foi comprado/pago), sem gerúndios tipo "comprando".
 * Ex.: "gastei 10,00 comprando pão" -> "Pão"; "compre um celular na loja 1000" -> "Celular"
 */
export function extractMainExpenseDescription(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();

  let m = low.match(
    /\bcomprando\s+(?:um|uma|uns|umas|o|a|os|as)?\s*([^,;]+?)(?=\s*[,;]|\s+gasto\s|\s+gastei\b|\s+pessoal\b|\s+empresa\b|$)/i,
  );
  if (m) {
    const item = cleanItemPhrase(m[1]);
    if (item) return capitalizeWords(item);
  }

  const beforePlace = raw.split(/\s+(?:na|no|nem|em)\s+/i)[0];
  let clause = stripNoiseForItem(beforePlace);
  clause = clause
    .replace(/\b(gasto|gastei|gastar|despesa)\s+(pessoal|empresa|empresarial)\b/gi, ' ')
    .replace(/\b(pessoal|empresa|empresarial)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  m = clause.match(/\b(?:comprei|compre|compramos)\s+(?:um|uma|uns|umas)?\s*(.+)$/i);
  if (m) {
    const item = cleanItemPhrase(m[1]);
    if (item) return capitalizeWords(item);
  }

  m = clause.match(/\b(?:gastei|paguei)\s+(?:de\s+)?(?:com|comprando)\s+(.+)$/i);
  if (m) {
    const item = cleanItemPhrase(m[1]);
    if (item) return capitalizeWords(item);
  }

  m = clause.match(/\bcom\s+(.+)$/i);
  if (m) {
    const item = cleanItemPhrase(m[1]);
    if (item) return capitalizeWords(item);
  }

  let tail = clause
    .replace(/\b(gastei|paguei|acabei|fui|foi|despesa)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const item = cleanItemPhrase(tail);
  if (item) return capitalizeWords(item);

  return '';
}

/**
 * Extrai valor monetário do texto (maior valor plausível). Aceita "50", "50,00", "1.234,56"
 */
function extractAmount(text) {
  const matches = String(text || '').match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})?/g) || [];
  const nums = matches
    .map((v) => Number(v.replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 1e9);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function capitalizeWords(s) {
  if (!s) return '';
  return String(s)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
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

  if (/empresa|empresarial/.test(t)) result.tipoVenda = 'empresa';
  else if (/pessoal/.test(t)) result.tipoVenda = 'pessoal';

  const amount = extractAmount(t);
  if (amount != null) result.amount = amount.toFixed(2).replace('.', ',');

  const placeRaw = extractPlaceRaw(t);
  const itemDesc = extractMainExpenseDescription(t);
  if (itemDesc) result.description = itemDesc;

  const cat = inferExpenseCategory(t, itemDesc, placeRaw);
  if (cat) {
    result.categoryDesp = cat.categoryDesp;
    result.subcategoryDesp = cat.subcategoryDesp;
    result.category = cat.category;
  }

  return result;
}

/**
 * Monta resumo + parâmetros para o formulário de despesa (voz/texto), com data/hora da gravação.
 * Ex.: "acabei de gastar 50,00 na padaria comprei pão gasto pessoal"
 */
export function buildExpenseVoicePreview(transcript, recordedAt = new Date()) {
  const t = (transcript || '').trim();
  if (!t) return null;

  const parsed = parseExpenseVoice(t);
  const amountNum = extractAmount(t);
  if (!amountNum) return null;
  const amountStr = amountNum.toFixed(2).replace('.', ',');

  const placeRaw = extractPlaceRaw(t);
  const placeLabel = placeRaw ? capitalizeWords(placeRaw) : '';
  const itemLabel = extractMainExpenseDescription(t) || parsed.description || '';

  const description =
    itemLabel ||
    parsed.description ||
    (placeLabel ? `Gasto em ${placeLabel}` : 'Gasto por voz');

  const tipoVenda = parsed.tipoVenda || (/\bempresa|empresarial\b/i.test(t) ? 'empresa' : 'pessoal');

  const d = recordedAt instanceof Date ? recordedAt : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const dateBr = `${dd}/${mm}/${yyyy}`;
  const timeBr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let categoryDesp = parsed.categoryDesp;
  let subcategoryDesp = parsed.subcategoryDesp;
  if (!categoryDesp) {
    const cat = findLongestCategoryMatch(t);
    if (cat) {
      categoryDesp = cat.catId;
      subcategoryDesp = cat.sub;
    }
  }

  const summaryLines = [
    `• Valor: R$ ${amountStr}`,
    itemLabel ? `• Descrição (produto/serviço): ${itemLabel}` : null,
    placeLabel ? `• Onde / subcategoria: ${placeLabel}` : null,
    subcategoryDesp ? `• Categoria no app: ${subcategoryDesp}` : null,
    `• Tipo: ${tipoVenda === 'empresa' ? 'Empresa' : 'Pessoal'}`,
    `• Gravação: ${dateBr} às ${timeBr}`,
  ].filter(Boolean);

  const modalParams = {
    amount: amountStr,
    description,
    tipoVenda,
    date: dateBr,
    ...(categoryDesp ? { categoryDesp } : {}),
    ...(subcategoryDesp ? { subcategoryDesp } : {}),
  };

  return {
    amountStr,
    description,
    categoryDesp,
    subcategoryDesp,
    tipoVenda,
    dateBr,
    timeBr,
    placeLabel,
    itemLabel,
    summaryLines,
    summaryText: `Entendi o gasto:\n${summaryLines.join('\n')}\n\nToque em CADASTRAR para abrir o formulário já preenchido.`,
    modalParams,
  };
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

  if (/\b(despesa|saída|saida|gastei|gastar|gasto|paguei|pagamento|fui|foi em|estava na|estava no|compr[ea][iu]?|compra|acabei)\b/.test(t)) {
    result.type = 'despesa';
    const parsed = parseExpenseVoice(transcript);
    const amt = extractAmount(transcript);
    if (amt != null) result.params.amount = amt.toFixed(2).replace('.', ',');
    else if (parsed.amount) result.params.amount = parsed.amount;
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
    if (/\b(gastei|gastar|paguei|gasto|despesa|fui|foi em|estava na|estava no|compr[ea][iu]?|compra|acabei)\b/.test(t)) {
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
