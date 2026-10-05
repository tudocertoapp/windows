const { parsePeriodFromText, addMonths, currentMonth, todayYmd, shiftDays } = require('./periods');

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, words) {
  return words.some((w) => {
    if (!w) return false;
    if (w.includes(' ')) return text.includes(w);
    return new RegExp(`(?:^|\\s)${w}`, 'i').test(text);
  });
}

function parseMoney(raw) {
  const t = String(raw || '');
  const m = t.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)?/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseTime(raw) {
  const m = String(raw || '').match(/\b(\d{1,2})(?::(\d{2}))?\s*(h|hrs|horas)?\b/i);
  if (!m) return '09:00';
  const h = Math.min(23, Number(m[1]));
  const min = m[2] ? m[2] : '00';
  return `${String(h).padStart(2, '0')}:${min}`;
}

function parseBrDate(text) {
  const t = fold(text);
  if (/\bhoje\b/.test(t)) return todayYmd();
  if (/\bamanha\b/.test(t)) return shiftDays(1);
  const br = String(text).match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (br) {
    const d = String(br[1]).padStart(2, '0');
    const m = String(br[2]).padStart(2, '0');
    const y = br[3] ? (br[3].length === 2 ? `20${br[3]}` : br[3]) : String(new Date().getFullYear());
    return `${y}-${m}-${d}`;
  }
  return null;
}

function lastAssistantIntent(history) {
  if (!Array.isArray(history)) return '';
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m?.role === 'assistant' && m.intent) return m.intent;
  }
  return '';
}

function isConfirm(text) {
  return /^(sim|s|ok|pode|confirmo|confirmar|isso|pode registrar|pode lancar|pode lançar|yes)\b/.test(text);
}

function isCancel(text) {
  return /^(nao|não|cancela|cancelar|deixa|melhor nao)\b/.test(text);
}

function detectMutation(text, original) {
  const amount = parseMoney(original);
  if (hasAny(text, ['despesa', 'gastei', 'paguei', 'gasto', 'saida', 'saída']) && hasAny(text, ['cadastre', 'cadastrar', 'registre', 'registrar', 'lance', 'lancar', 'lanca'])) {
    const cat = (original.match(/(?:de|em)\s+([a-zA-ZÀ-ÿ\s]{3,40})$/i) || [])[1];
    return {
      tool: 'create_expense',
      args: { amount, description: (cat || 'despesa').trim(), category: (cat || 'outros').trim() },
    };
  }
  if (hasAny(text, ['venda', 'entrada', 'receita', 'recebi']) && hasAny(text, ['cadastre', 'cadastrar', 'registre', 'registrar', 'lance', 'lancar'])) {
    return { tool: 'create_income', args: { amount, description: 'Entrada', category: 'receita' } };
  }
  const clientM = original.match(/(?:cliente|chama(?:do|da)?)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\s]{1,40})/i);
  if (
    hasAny(text, ['cliente']) &&
    hasAny(text, ['cadastre', 'cadastrar', 'crie', 'criar', 'registre', 'registrar', 'agende', 'agendar', 'marca', 'agenda']) &&
    (hasAny(text, ['agenda', 'agende', 'agendar', 'marca', 'marcar', 'horario', 'hora']) || /\b\d{1,2}:\d{2}\b/.test(original))
  ) {
    const named = original.match(/nome(?:\s+do\s+cliente)?(?:\s+e|\s+é|:)?\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,4})/i);
    const afterClient = original.match(/(?:cliente)\s+(.+?)(?:\s+(?:na\s+minha\s+agenda|hoje|amanh[aã]|as|às|para\s+fazer)|$)/i);
    const whoRaw = ((named && named[1]) || (afterClient && afterClient[1]) || '').trim();
    const whoParts = whoRaw.split(/\s+/).filter((w) => !/^(um|uma|o|a|na|no|da|do|de|minha|meu|sua|seu)$/i.test(w));
    const clientName = whoParts.join(' ').trim();
    const svc = (original.match(/para(?:\s+fazer)?(?:\s+uma|\s+um)?\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\s]{2,40}?)(?:\.|$)/i) || [])[1];
    const date = parseBrDate(original) || todayYmd();
    const timeRaw = String(original).match(/\b(?:as|às|eas|es)\s*(\d{1,2})(?::(\d{2}))?\b/i) || String(original).match(/\b(\d{1,2}):(\d{2})\b/);
    let time = '09:00';
    if (timeRaw) {
      const h = Math.min(23, Number(timeRaw[1]));
      const min = timeRaw[2] || '00';
      time = `${String(h).padStart(2, '0')}:${min}`;
    }
    return {
      tool: 'create_appointment',
      args: { title: clientName || svc || 'Atendimento', date, time, clientName, service: (svc || '').trim() },
    };
  }
  if (hasAny(text, ['cliente']) && hasAny(text, ['cadastre', 'cadastrar', 'crie', 'criar', 'registre', 'registrar']) && clientM) {
    return { tool: 'create_client', args: { name: clientM[1].trim() } };
  }
  if (hasAny(text, ['produto']) && hasAny(text, ['cadastre', 'cadastrar', 'registre', 'registrar', 'crie', 'criar'])) {
    const name = (original.match(/produto(?:\s+chamado)?\s+([A-Za-zÀ-ÿ0-9][\wÀ-ÿ\s]{1,40}?)(?:\s+(?:de|por|r\$)|$)/i) || [])[1];
    return { tool: 'create_product', args: { name: (name || '').trim(), price: amount || 0 } };
  }
  if (hasAny(text, ['servico', 'serviço']) && hasAny(text, ['cadastre', 'cadastrar', 'registre', 'registrar', 'crie', 'criar'])) {
    const name = (original.match(/servi[cç]o(?:\s+chamado)?\s+([A-Za-zÀ-ÿ0-9][\wÀ-ÿ\s]{1,40}?)(?:\s+(?:de|por|r\$)|$)/i) || [])[1];
    return { tool: 'create_service', args: { name: (name || '').trim(), price: amount || 0 } };
  }
  if (hasAny(text, ['agende', 'agendar', 'marca', 'marcar', 'agenda'])) {
    const named = original.match(/nome(?:\s+do\s+cliente)?(?:\s+e|\s+é|:)?\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,4})/i);
    const who =
      (named && named[1]) ||
      (original.match(/(?:cliente)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]+){0,3}?)(?:\s+(?:para|as|às|hoje|amanh)|$)/i) || [])[1] ||
      (original.match(/(?:agende|marcar|marca)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\s]{1,40}?)(?:\s+para|\s+amanh|\s+hoje|\s+as|\s+às)/i) || [])[1];
    const svc = (original.match(/para(?:\s+fazer)?(?:\s+uma|\s+um)?\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\s]{2,40}?)(?:\.|$)/i) || [])[1];
    const date = parseBrDate(original) || todayYmd();
    const timeRaw = String(original).match(/\b(?:as|às|eas|es)\s*(\d{1,2})(?::(\d{2}))?\b/i) || String(original).match(/\b(\d{1,2}):(\d{2})\b/);
    let time = '09:00';
    if (timeRaw) {
      const h = Math.min(23, Number(timeRaw[1]));
      const min = timeRaw[2] || '00';
      time = `${String(h).padStart(2, '0')}:${min}`;
    } else if (hasAny(text, ['amanha', 'hoje']) || parseBrDate(original)) {
      time = parseTime(original);
    }
    const title = (who || svc || 'Atendimento').trim();
    if (who || svc || hasAny(text, ['agende', 'agendar', 'marca', 'marcar'])) {
      return {
        tool: 'create_appointment',
        args: { title, date, time, clientName: (who || '').trim(), service: (svc || '').trim() },
      };
    }
  }
  return null;
}

function scoreIntent(text, history) {
  const scores = {};
  const bump = (k, n) => {
    scores[k] = (scores[k] || 0) + n;
  };
  if (/\b(que horas|hora agora|horario agora|que horas sao)\b/.test(text)) bump('time', 20);
  if (/\b(que dia|data (de )?hoje|qual a data|qual o dia)\b/.test(text)) bump('date', 20);
  if (hasAny(text, ['oi', 'ola', 'oie', 'eae', 'eai', 'hey', 'opa', 'bom dia', 'boa tarde', 'boa noite'])) bump('greeting', 4);
  if (hasAny(text, ['obrigado', 'obrigada', 'valeu', 'vlw', 'obg'])) bump('thanks', 8);
  if (hasAny(text, ['quem e voce', 'seu nome', 'quem e dock', 'o que e dock', 'voce e quem'])) bump('who', 10);
  if (hasAny(text, ['ajuda', 'o que voce faz', 'o que consegue', 'o que posso', 'me ajuda'])) bump('help', 6);
  if (/\b(como (voce|vc) (esta|ta)|tudo bem|td bem|beleza e voce|estou bem|to bem)\b/.test(text) || /^(tudo bem|td bem|blz|beleza)[\s?]*$/.test(text)) bump('how_are_you', 14);
  if (/\b(me chama|me chame|pode me chamar|meu nome e|como quer que eu te chame)\b/.test(text)) bump('set_name', 18);
  if (/\b(calculadora|calculador)\b/.test(text) && /\b(abre|abrir|mostra|mostrar|quero|usa|usar|abre a)\b/.test(text)) bump('open_calculator', 22);
  if (/\bcalculadora\b/.test(text) && text.split(' ').length <= 5) bump('open_calculator', 18);
  if (/\b(abre|abrir|mostra)\b/.test(text) && /\b(agenda|produtos?|clientes?|pdv|caixa|catalogo|anotaco|compras|receber)\b/.test(text)) bump('open_screen', 16);
  if (/\b(quantos|quais|lista|tenho|cadastrad)\b/.test(text) && /\bprodutos?\b/.test(text)) bump('products_count', 18);
  if (/\bprodutos?\b/.test(text) && /\b(mais vende|mais vendido|top)\b/.test(text)) bump('product_sales', 16);
  if (hasAny(text, ['financ', 'saldo', 'como estou', 'como estao', 'resumo', 'situacao', 'organiz', 'controle', 'controlar'])) bump('financial_summary', 7);
  if (hasAny(text, ['empresa']) && hasAny(text, ['como', 'resumo', 'andamento', 'situacao'])) bump('financial_summary', 8);
  if (hasAny(text, ['despesa', 'gastei', 'gasto', 'gastos', 'paguei', 'saida'])) bump('expenses', 8);
  if (hasAny(text, ['maior gasto', 'maior despesa'])) bump('biggest_expense', 10);
  if (hasAny(text, ['entrada', 'entrou', 'receita', 'faturei', 'faturamento'])) bump('income', 8);
  if (hasAny(text, ['vendeu', 'vendas', 'venda', 'vendi', 'faturamento', 'faturou', 'mais vende'])) bump('sales', 8);
  if (hasAny(text, ['qual mes', 'que mes', 'em qual mes', 'em que mes', 'quando vendi', 'quando vendeu', 'qual foi o mes'])) bump('sales_which_month', 16);
  if (hasAny(text, ['compar'])) bump('compare_sales', 9);
  if (hasAny(text, ['estoque', 'acabando', 'acabou'])) bump('products_low', 8);
  if (hasAny(text, ['produto']) && hasAny(text, ['vendeu', 'vendi'])) bump('product_sales', 8);
  if (hasAny(text, ['receber', 'me devem', 'a receber'])) bump('receivables', 9);
  if (hasAny(text, ['pagar', 'boleto', 'fatura', 'contas a pagar'])) bump('payables', 8);
  if (hasAny(text, ['fluxo'])) bump('cash_flow', 8);
  const asksClientList = /\b(quantos?|quais|lista|tenho|cadastrad)\b/.test(text) && /\bclientes?\b/.test(text);
  if (asksClientList || hasAny(text, ['clientes tenho', 'quais clientes', 'lista de cliente', 'clientes cadastrad'])) bump('clients', 18);
  if (hasAny(text, ['sem atendimento', 'sumiu', 'inativo'])) bump('idle_clients', 9);
  if (hasAny(text, ['ultimo atendimento', 'ultima consulta', 'ultima agenda', 'ultimo compromisso', 'ultima marcacao', 'ultima marcaçao', 'ultimo agendamento', 'ultima vez'])) bump('last_appointment', 12);
  if (/\bcliente\b/.test(text) && hasAny(text, ['gastou', 'desse', 'dessa']) && !asksClientList) bump('client_details', 10);
  if (hasAny(text, ['agenda', 'quem eu tenho', 'proximo atendimento', 'horario livre', 'compromisso'])) bump('appointments', 7);
  if (hasAny(text, ['hoje']) && hasAny(text, ['quem', 'cliente', 'atendimento', 'agenda'])) bump('appointments', 8);

  const prev = lastAssistantIntent(history);
  if (/mes passado|e no mes|e no mês|e ontem|e hoje/.test(text) && prev) {
    bump(prev === 'compare_sales' ? 'sales' : prev, 12);
  }
  if (prev === 'clarify_sales') {
    if (hasAny(text, ['qual mes', 'que mes', 'quando vendi', 'quando vendeu', 'em qual'])) bump('sales_which_month', 18);
    else bump('sales', 12);
  }
  if (prev === 'clarify_agenda' || prev === 'last_appointment' || prev === 'appointments') {
    if (/\b(esse|essa|sim|aquele|aquela|isso|o do dia|dia )\b/.test(text) || /\b\d{1,2}\b/.test(text)) {
      bump('last_appointment', 14);
    }
  }

  let best = 'unknown';
  let n = 0;
  Object.entries(scores).forEach(([k, v]) => {
    if (v > n) {
      best = k;
      n = v;
    }
  });
  if (n < 3) return { intent: 'unknown', scores };
  return { intent: best, scores };
}

function periodArgs(text, history) {
  const t = fold(text);
  if (/qual mes|que mes|em qual|em que mes|quando vend/.test(t) && !/janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|passado|este mes|esse mes/.test(t)) {
    return { kind: 'all', label: 'todos os meses' };
  }
  const prev = lastAssistantIntent(history);
  if (/mes passado|e no mes|e no mês/.test(t) || (prev && /e no/.test(t))) {
    const p = parsePeriodFromText('mes passado');
    return p;
  }
  return parsePeriodFromText(t);
}

module.exports = {
  fold,
  parseMoney,
  detectMutation,
  isConfirm,
  isCancel,
  scoreIntent,
  periodArgs,
  lastAssistantIntent,
};
