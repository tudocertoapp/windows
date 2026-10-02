const { fold, detectMutation, isConfirm, isCancel, scoreIntent, periodArgs } = require('./intent');
const { correctQuery } = require('./correct');
const { runTool, sanitizeCreateArgs, brl, fmtEvent } = require('./tools');
const { addMonths, currentMonth } = require('./periods');
const { extractCallName, detectNav, isHowAreYou, isAffirmativeFollowUp, followUpFromAssistantText, MONTHS } = require('./dockTalk');

function firstNameSafe(name) {
  const n = String(name || '').trim().split(/\s+/)[0];
  if (!n || n.length < 2) return '';
  if (/@/.test(n)) return n.split('@')[0];
  return n;
}

function hourSP() {
  try {
    return Number(
      new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }).format(new Date())
    );
  } catch (_) {
    return new Date().getHours();
  }
}

function greet(name) {
  const h = hourSP();
  const w = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return name ? `${w}, ${name}` : w;
}

function cardsFromSummary(s) {
  if (!s) return [];
  return [
    { title: 'Entradas', value: s.entradasFmt },
    { title: 'Despesas', value: s.despesasFmt },
    { title: 'Saldo', value: s.saldoFmt },
  ];
}

function lastFollowUp(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m?.role !== 'assistant') continue;
    if (m.followUp) return m.followUp;
    const inferred = followUpFromAssistantText(m.content);
    if (inferred && /detalh|quer que|qual mes|movimento/.test(fold(m.content))) return inferred;
  }
  return null;
}

function pickFromFollowUp(text, followUp) {
  if (!followUp || !Array.isArray(followUp.options) || !followUp.options.length) return null;
  const t = fold(text);
  if (followUp.type === 'dock_name') {
    const n = extractCallName(text) || (t.split(/\s+/)[0] || '');
    if (/^(sim|nao|nao|ok|oi|ola|valeu|estou|bem|voce|dock|calculadora|agenda)$/.test(n)) return null;
    if (n.length >= 2 && n.length <= 20) return { titulo: n };
    return null;
  }
  if (followUp.type === 'sales_month') {
    const named = MONTHS.find((m) => t.includes(m));
    if (named) {
      const byName = followUp.options.find((o) => fold(o.titulo || '').includes(named));
      if (byName) return byName;
    }
    if (isAffirmativeFollowUp(t)) return followUp.options[0];
    return null;
  }
  if (/^(sim|s|ok|esse|essa|isso|aquele|aquela)\b/.test(t)) return followUp.options[0];
  const day = t.match(/\b(\d{1,2})\b/);
  if (day) {
    const d = String(day[1]).padStart(2, '0');
    const hit = followUp.options.find((o) => String(o.dataIso || o.data || '').includes(`-${d}`) || String(o.data || '').startsWith(d));
    if (hit) return hit;
  }
  const name = followUp.options.find((o) => t && fold(o.titulo).includes(t.replace(/dia|\d+/g, '').trim()) && t.replace(/dia|\d+/g, '').trim().length > 2);
  return name || null;
}

function replyAgendaReasoning(text, ctx) {
  const wantsLast = /ultima|ultimo|passad/.test(text);
  const wantsNext = /proxima|proximo|amanha/.test(text);
  const wantsToday = /\bhoje\b/.test(text);
  const wantsFree = /livre/.test(text);
  const options = []
    .concat(ctx.ultimo ? [ctx.ultimo] : [])
    .concat(ctx.proximo && ctx.proximo !== ctx.ultimo ? [ctx.proximo] : [])
    .concat((ctx.futuros || []).slice(0, 3))
    .filter((e, i, arr) => e && arr.findIndex((x) => x.dataIso === e.dataIso && x.titulo === e.titulo) === i)
    .slice(0, 4);

  if (wantsFree) {
    const busy = ctx.horariosOcupados?.length ? `Ocupado hoje: ${ctx.horariosOcupados.join(', ')}.` : 'Não vi horários marcados hoje.';
    const extra = ctx.proximo ? ` O próximo compromisso que achei: ${fmtEvent(ctx.proximo)}.` : '';
    return { message: `${busy}${extra}`, intent: 'appointments' };
  }

  if (wantsToday) {
    if (ctx.hojeLista?.length) {
      const linhas = ctx.hojeLista.map(fmtEvent).join('; ');
      return { message: `Hoje na agenda: ${linhas}.`, intent: 'appointments' };
    }
    const extra = ctx.proximo ? ` O mais próximo que achei é ${fmtEvent(ctx.proximo)}. Era esse?` : ' Quer que eu busque outro dia?';
    return {
      message: `Hoje não tem compromisso cadastrado.${extra}`,
      intent: 'clarify_agenda',
      followUp: { type: 'agenda', options },
    };
  }

  if (wantsLast) {
    if (ctx.ultimo && !ctx.proximo) {
      return { message: `A última agenda que já passou: ${fmtEvent(ctx.ultimo)}.`, intent: 'last_appointment' };
    }
    if (ctx.ultimo && ctx.proximo) {
      return {
        message: `A última que já passou foi ${fmtEvent(ctx.ultimo)}. Tem outra marcada: ${fmtEvent(ctx.proximo)}. Você quer a que já passou ou a próxima?`,
        intent: 'clarify_agenda',
        followUp: { type: 'agenda', options },
      };
    }
    if (!ctx.ultimo && ctx.proximo) {
      return {
        message: `Não achei compromisso que já tenha passado neste recorte. O que está marcado mais perto é ${fmtEvent(ctx.proximo)}. Era esse, ou me fala a data (por exemplo, dia 18)?`,
        intent: 'clarify_agenda',
        followUp: { type: 'agenda', options },
      };
    }
    return {
      message: 'Não achei eventos na agenda. Pode me dizer a data ou o nome do cliente que eu procuro de novo?',
      intent: 'clarify_agenda',
    };
  }

  if (wantsNext || (!wantsLast && ctx.proximo)) {
    if (ctx.proximo) return { message: `O próximo na agenda: ${fmtEvent(ctx.proximo)}.`, intent: 'appointments' };
  }

  if (ctx.quantidade) {
    const linhas = (ctx.futuros?.length ? ctx.futuros : ctx.passados).slice(0, 3).map(fmtEvent).join('; ');
    return {
      message: `Achei estes na agenda: ${linhas}. Qual deles você quer?`,
      intent: 'clarify_agenda',
      followUp: { type: 'agenda', options },
    };
  }
  return {
    message: 'Não achei compromisso nesse período. Me fala se é o último que já passou, o próximo, ou uma data (ex.: dia 18).',
    intent: 'clarify_agenda',
  };
}

function pendingSummary(tool, args) {
  if (tool === 'create_expense') return `Posso registrar uma despesa de ${brl(args.amount)}${args.category ? ` em ${args.category}` : ''}. Confirmar?`;
  if (tool === 'create_income') return `Posso registrar uma entrada de ${brl(args.amount)}. Confirmar?`;
  if (tool === 'create_client') return `Posso cadastrar o cliente ${args.name}. Confirmar?`;
  if (tool === 'create_appointment') return `Posso agendar ${args.title} para ${args.date}${args.time ? ` às ${args.time}` : ''}. Confirmar?`;
  if (tool === 'create_product') return `Posso cadastrar o produto ${args.name}${args.price ? ` a ${brl(args.price)}` : ''}. Confirmar?`;
  if (tool === 'create_service') return `Posso cadastrar o serviço ${args.name}${args.price ? ` a ${brl(args.price)}` : ''}. Confirmar?`;
  return 'Posso fazer essa alteração. Confirmar?';
}

async function answerNative({ db, userId, firstName, preferredName, message, history, pendingAction, confirm }) {
  const name = firstNameSafe(preferredName) || firstNameSafe(firstName);
  const original = String(message || '').trim();
  const fixed = correctQuery(original);
  const text = fold(fixed.text || original);

  if (confirm && pendingAction?.tool) {
    const args = sanitizeCreateArgs(pendingAction.tool, pendingAction.args);
    if (!args) return { message: 'Faltou algum dado para confirmar. Pode repetir o pedido?', intent: 'confirm_invalid' };
    const result = await runTool(pendingAction.tool, db, userId, args);
    if (!result?.ok) return { message: result?.error || 'Não consegui concluir. Tente pelo cadastro do app.', intent: pendingAction.tool };
    if (pendingAction.tool === 'create_expense') return { message: `Pronto. Despesa de ${result.amountFmt} lançada.`, intent: 'create_expense' };
    if (pendingAction.tool === 'create_income') return { message: `Pronto. Entrada de ${result.amountFmt} lançada.`, intent: 'create_income' };
    if (pendingAction.tool === 'create_client') return { message: `Cliente ${result.name} cadastrado.`, intent: 'create_client' };
    if (pendingAction.tool === 'create_appointment') return { message: `Agendado: ${result.title} em ${result.date} às ${result.time}.`, intent: 'create_appointment' };
    if (pendingAction.tool === 'create_product') return { message: `Produto ${result.name} cadastrado.`, intent: 'create_product' };
    if (pendingAction.tool === 'create_service') return { message: `Serviço ${result.name} cadastrado.`, intent: 'create_service' };
  }

  if (pendingAction?.tool && isCancel(text)) {
    return { message: 'Ok, não alterei nada.', intent: 'cancelled' };
  }
  if (pendingAction?.tool && isConfirm(text)) {
    return answerNative({ db, userId, firstName, message: 'sim', history, pendingAction, confirm: true });
  }

  const followEarly = lastFollowUp(history);
  const pickedEarly = pickFromFollowUp(text, followEarly);
  if (pickedEarly) {
    if (followEarly?.type === 'dock_name') {
      const callName = firstNameSafe(pickedEarly.titulo);
      return {
        message: callName
          ? `Combinado, ${callName}. Pode me chamar de Dock. O que posso te ajudar hoje?`
          : 'Me fala um nome curto, tipo Lucas?',
        intent: 'set_name',
        callName,
      };
    }
    if (followEarly?.type === 'sales_month') {
      const [y, m] = String(pickedEarly.key || '').split('-').map(Number);
      if (y && m) {
        const s = await runTool('get_sales', db, userId, { year: y, month: m });
        const extra = s.maisVendidos?.[0] ? ` O que mais moveu: ${s.maisVendidos[0].produto} (${s.maisVendidos[0].totalFmt}).` : '';
        return {
          message: `Olhei ${s.period}: vendas e entradas somam ${s.totalFmt}.${extra}`,
          intent: 'sales',
          cards: [{ title: s.period, value: s.totalFmt }],
        };
      }
      return { message: `Em ${pickedEarly.titulo} o movimento foi ${pickedEarly.totalFmt}.`, intent: 'sales' };
    }
    return { message: `É este: ${fmtEvent(pickedEarly)}.`, intent: 'last_appointment' };
  }

  const mutation = detectMutation(text, original);
  if (mutation?.tool) {
    const args = sanitizeCreateArgs(mutation.tool, mutation.args);
    if (!args || ((mutation.tool === 'create_expense' || mutation.tool === 'create_income') && args.amount == null)) {
      return { message: 'Para lançar, me diga o valor. Ex.: registre uma despesa de 50 reais em combustível.', intent: 'need_params' };
    }
    return {
      message: pendingSummary(mutation.tool, args),
      intent: mutation.tool,
      pendingAction: { tool: mutation.tool, args },
    };
  }

  let { intent } = scoreIntent(text, history);
  const period = periodArgs(text, history);
  if (intent === 'client_details' && /\b(quantos?|quais)\b/.test(text) && /\bclientes?\b/.test(text)) {
    intent = 'clients';
  }

  const named = extractCallName(original);
  if (intent === 'set_name' || named) {
    const callName = firstNameSafe(named);
    if (callName) {
      return {
        message: `Show, ${callName}. Guardei aqui. Pode me chamar de Dock. Em que te ajudo?`,
        intent: 'set_name',
        callName,
      };
    }
    return {
      message: name
        ? `Hoje te chamo de ${name}. Se quiser outro nome, é só falar: me chama de Lucas.`
        : 'Como você quer que eu te chame? Pode ser só o primeiro nome.',
      intent: 'set_name',
      followUp: { type: 'dock_name', options: [{ titulo: 'lucas' }, { titulo: 'ana' }] },
    };
  }

  if (intent === 'how_are_you' || isHowAreYou(text)) {
    return {
      message: name
        ? `Tô bem, ${name}, valeu por perguntar. E você? Enquanto isso posso olhar vendas, produtos, agenda ou abrir a calculadora.`
        : 'Tô bem, e você? Se quiser, olho seus números ou abro uma tela do app.',
      intent: 'how_are_you',
    };
  }

  const nav = detectNav(text);
  if (nav?.target) {
    const closing = nav.action === 'close';
    return {
      message: closing
        ? `Fechando ${nav.label}.`
        : name
          ? `Beleza, ${name}. Abrindo ${nav.label}.`
          : `Beleza. Abrindo ${nav.label}.`,
      intent: closing ? 'close_screen' : 'open_screen',
      uiAction: { type: closing ? 'close' : 'open', target: nav.target },
    };
  }

  if (intent === 'greeting') {
    return {
      message: name
        ? `${greet(name)}! Eu sou o Dock. O que posso te ajudar hoje?`
        : 'Olá! Meu nome é Dock. Como você quer que eu te chame?',
      intent,
      followUp: name ? undefined : { type: 'dock_name', options: [{ titulo: 'lucas' }, { titulo: 'ana' }] },
    };
  }
  if (intent === 'thanks') {
    return { message: name ? `Disponha, ${name}. Qualquer coisa é só chamar.` : 'Disponha. Qualquer coisa é só chamar.', intent };
  }
  if (intent === 'who') {
    return {
      message: name
        ? `Sou o Dock, ${name}. Seu assessor aqui no Tudo Certo: leio seus dados, abro telas e só mudo algo se você confirmar.`
        : 'Sou o Dock, seu assessor no Tudo Certo. Leio os dados da sua conta, abro o que você pedir e não gravo nada sem permissão.',
      intent,
    };
  }
  if (intent === 'help') {
    return {
      message: 'Pode pedir de boa: quantos produtos tenho, o que mais vendeu, abre a calculadora, como estão as vendas. Lançamento eu monto e você confirma.',
      intent,
    };
  }

  if (intent === 'financial_summary') {
    const s = await runTool('get_financial_summary', db, userId, period);
    return {
      message: `Neste período (${s.period}) você teve ${s.entradasFmt} em entradas e ${s.despesasFmt} em despesas. Seu saldo líquido até agora é de ${s.saldoFmt}.`,
      intent,
      cards: cardsFromSummary(s),
    };
  }
  if (intent === 'income') {
    const s = await runTool('get_income', db, userId, period);
    return { message: `Em ${s.period} entrou ${s.totalFmt}${s.quantidade ? ` em ${s.quantidade} lançamento(s)` : ''}.`, intent, cards: [{ title: 'Entradas', value: s.totalFmt }] };
  }
  if (intent === 'expenses' || intent === 'biggest_expense') {
    const s = await runTool('get_expenses', db, userId, period);
    const extra = s.maior ? ` O maior gasto foi ${s.maior.desc || s.maior.categoria} (${s.maior.valorFmt}).` : '';
    return { message: `Em ${s.period} as despesas somam ${s.totalFmt}.${extra}`, intent, cards: [{ title: 'Despesas', value: s.totalFmt }] };
  }
  if (intent === 'sales_which_month' || ((intent === 'sales' || intent === 'product_sales') && period?.kind === 'all')) {
    const t = await runTool('get_sales_by_month', db, userId, {});
    if (!t.meses?.length) {
      return {
        message: 'Não achei venda nem entrada em nenhum mês. Você lança em Vendas da empresa ou em Entradas? Se quiser, posso olhar despesas ou agenda.',
        intent: 'clarify_sales',
      };
    }
    const top = t.melhor;
    const outros = t.meses.slice(1, 4).map((m) => `${m.label} (${m.totalFmt})`).join('; ');
    return {
      message: `O mês com mais movimento de venda/entrada foi ${top.label}: ${top.totalFmt}.${outros ? ` Também tem: ${outros}.` : ''} Qual mês você quer que eu detalhe?`,
      intent: 'clarify_sales',
      followUp: { type: 'sales_month', options: t.meses.slice(0, 6).map((m) => ({ titulo: m.label, key: m.key, totalFmt: m.totalFmt })) },
      cards: [{ title: top.label, value: top.totalFmt }],
    };
  }
  if (intent === 'sales' || intent === 'product_sales') {
    const s = await runTool('get_sales', db, userId, period);
    const top = s.maisVendidos?.[0];
    const extra = top ? ` O que mais vendeu: ${top.produto} (${top.quantidade} un., ${top.totalFmt}).` : '';
    if (!s.total && !top) {
      const t = await runTool('get_sales_by_month', db, userId, {});
      if (t.melhor) {
        return {
          message: `Em ${s.period} não achei venda. O mês com movimento foi ${t.melhor.label} (${t.melhor.totalFmt}). Quer que eu detalhe esse?`,
          intent: 'clarify_sales',
          followUp: { type: 'sales_month', options: t.meses.slice(0, 6).map((m) => ({ titulo: m.label, key: m.key, totalFmt: m.totalFmt })) },
        };
      }
      return { message: `Não achei vendas lançadas em ${s.period}. Você registra em Vendas da empresa ou nas Entradas?`, intent: 'clarify_sales' };
    }
    return { message: `Olhei as vendas em ${s.period}: somam ${s.totalFmt}.${extra}`, intent, cards: [{ title: 'Vendas', value: s.totalFmt }] };
  }
  if (intent === 'compare_sales') {
    const now = currentMonth();
    const prev = addMonths(now.year, now.month, -1);
    const [a, b] = await Promise.all([
      runTool('get_sales', db, userId, now),
      runTool('get_sales', db, userId, prev),
    ]);
    return {
      message: `Este mês (${a.period}) você vendeu ${a.totalFmt}. No mês passado (${b.period}) foram ${b.totalFmt}.`,
      intent,
      cards: [
        { title: 'Este mês', value: a.totalFmt },
        { title: 'Mês passado', value: b.totalFmt },
      ],
    };
  }
  if (intent === 'cash_flow') {
    const s = await runTool('get_cash_flow', db, userId, period);
    return { message: `Fluxo de caixa em ${s.period}: entradas ${s.entradasFmt} e saídas ${s.saidasFmt}.`, intent };
  }
  if (intent === 'receivables') {
    const s = await runTool('get_receivables', db, userId, {});
    if (!s.abertos) return { message: 'Não tem valor em aberto em a receber agora.', intent };
    return { message: `Você tem ${s.abertos} título(s) a receber, somando ${s.totalFmt}.`, intent, cards: [{ title: 'A receber', value: s.totalFmt }] };
  }
  if (intent === 'payables') {
    const s = await runTool('get_payables', db, userId, {});
    if (!s.abertas) return { message: 'Não achei contas a pagar em aberto.', intent };
    return { message: `Há ${s.abertas} fatura(s) em aberto, total ${s.totalFmt}.`, intent, cards: [{ title: 'A pagar', value: s.totalFmt }] };
  }
  if (intent === 'clients') {
    const s = await runTool('get_clients', db, userId, {});
    const lista = s.nomes?.length ? ` Alguns nomes: ${s.nomes.slice(0, 6).join(', ')}.` : '';
    return {
      message: s.total
        ? `Você tem ${s.total} cliente${s.total === 1 ? '' : 's'} cadastrado${s.total === 1 ? '' : 's'}.${lista}`
        : 'Ainda não achei cliente cadastrado nesta conta.',
      intent,
    };
  }
  if (intent === 'idle_clients') {
    const s = await runTool('get_idle_clients', db, userId, {});
    if (!s.semAtendimento?.length) return { message: 'Não achei clientes parados há muito tempo neste recorte.', intent };
    return { message: `Sem atendimento recente: ${s.semAtendimento.map((c) => c.nome).join(', ')}.`, intent };
  }
  if (intent === 'client_details') {
    const q = original.replace(/quanto|esse|esta|cliente|ja|já|gastou|gasto/gi, ' ').trim();
    const s = await runTool('get_client_details', db, userId, { name: q || text });
    if (!s.found) return { message: 'Não encontrei esse cliente no cadastro.', intent };
    return { message: `${s.nome} já soma ${s.gastoFmt} em vendas cadastradas.`, intent };
  }
  if (intent === 'appointments' || intent === 'last_appointment' || intent === 'clarify_agenda') {
    const ctx = await runTool('get_appointments', db, userId, { mode: 'context' });
    const follow = lastFollowUp(history);
    const picked = pickFromFollowUp(text, follow);
    if (picked) {
      return { message: `É este: ${fmtEvent(picked)}.`, intent: 'last_appointment' };
    }
    if (/\b\d{1,2}\b/.test(text) && ctx.eventos?.length) {
      const d = String(text.match(/\d{1,2}/)[0]).padStart(2, '0');
      const hits = ctx.eventos.filter((e) => String(e.dataIso || '').slice(8, 10) === d || String(e.data || '').startsWith(d) || String(e.data || '').includes(`/${d}/`) || String(e.dataIso || '').includes(`-${d}`));
      if (hits.length === 1) return { message: `Achei: ${fmtEvent(hits[0])}.`, intent: 'last_appointment' };
      if (hits.length > 1) {
        return {
          message: `No dia ${d} achei ${hits.length}: ${hits.map(fmtEvent).join('; ')}. Qual deles?`,
          intent: 'clarify_agenda',
          followUp: { type: 'agenda', options: hits.slice(0, 4) },
        };
      }
    }
    return replyAgendaReasoning(text, ctx);
  }
  if (intent === 'products_low' || intent === 'products_count') {
    const s = await runTool('get_products', db, userId, {});
    const amostra = s.nomes?.length ? ` Tipo: ${s.nomes.slice(0, 6).join(', ')}.` : '';
    if (intent === 'products_count' || !s.acabando?.length) {
      return {
        message: s.cadastrados
          ? `Olhei sua lista: ${s.cadastrados} produto${s.cadastrados === 1 ? '' : 's'} cadastrado${s.cadastrados === 1 ? '' : 's'}.${amostra}`
          : 'Ainda não achei produto cadastrado nesta conta.',
        intent: 'products_count',
      };
    }
    return { message: `Você tem ${s.cadastrados} produtos. Acabando: ${s.acabando.map((p) => `${p.nome} (${p.estoque})`).join(', ')}.`, intent };
  }

  return {
    message: name
      ? `${name}, não peguei direito. Posso olhar agenda, gastos, vendas, produtos ou abrir a calculadora. Como te ajudo?`
      : 'Não peguei direito. É sobre agenda, gastos, vendas, produtos — ou quer que eu abra alguma tela?',
    intent: 'clarify',
  };
}

module.exports = { answerNative };
