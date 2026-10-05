const { chatWithAccountLlm, llmStatus } = require('../llmChat');
const { SYSTEM_PROMPT, tonePrompt } = require('./prompt');
const { detectNav, extractCallName, fold } = require('./dockTalk');
const { detectMutation, isConfirm, isCancel } = require('./intent');
const { runTool, fmtEvent, sanitizeCreateArgs, brl } = require('./tools');
const { currentMonth, parsePeriodFromText } = require('./periods');

function pendingSummary(tool, args) {
  if (tool === 'create_expense') return `Posso registrar uma despesa de ${brl(args.amount)}${args.category ? ` em ${args.category}` : ''}. Confirmar?`;
  if (tool === 'create_income') return `Posso registrar uma entrada de ${brl(args.amount)}. Confirmar?`;
  if (tool === 'create_client') return `Posso cadastrar o cliente ${args.name}. Confirmar?`;
  if (tool === 'create_appointment') return `Posso agendar ${args.title} para ${args.date}${args.time ? ` às ${args.time}` : ''}. Confirmar?`;
  if (tool === 'create_product') return `Posso cadastrar o produto ${args.name}${args.price ? ` a ${brl(args.price)}` : ''}. Confirmar?`;
  if (tool === 'create_service') return `Posso cadastrar o serviço ${args.name}${args.price ? ` a ${brl(args.price)}` : ''}. Confirmar?`;
  return 'Posso fazer essa alteração. Confirmar?';
}

function compactAgenda(agenda) {
  if (!agenda || agenda.error) return { total: 0 };
  const pack = (list) => (list || []).slice(0, 10).map((e) => {
    const st = String(e.status || '');
    return `${fmtEvent(e) || e.titulo}${st ? ` (${st})` : ''}`;
  });
  const all = [...(agenda.passados || []), ...(agenda.hojeLista || []), ...(agenda.futuros || [])];
  const cancelados = all.filter((e) => /cancel/i.test(String(e.status || '')));
  const ativos = all.filter((e) => !/cancel/i.test(String(e.status || '')));
  const names = (list) => [...new Set(list.map((e) => e.titulo).filter(Boolean))].slice(0, 12);
  return {
    total: Number(agenda.quantidade) || 0,
    hoje: pack(agenda.hojeLista),
    ultimo: agenda.ultimo ? fmtEvent(agenda.ultimo) : null,
    proximo: agenda.proximo ? fmtEvent(agenda.proximo) : null,
    recentes: pack(agenda.passados),
    proximos: pack(agenda.futuros),
    quemAgendou: names(ativos),
    quemCancelou: names(cancelados),
    cancelados: cancelados.length,
  };
}

async function accountSnapshot(db, userId, message) {
  try {
    const period = parsePeriodFromText(fold(message)) || currentMonth();
    const [summary, sales, salesDetail, clients, products, services, agenda, receivables] = await Promise.all([
      runTool('get_financial_summary', db, userId, period),
      runTool('get_sales_by_month', db, userId, {}),
      runTool('get_sales', db, userId, period),
      runTool('get_clients', db, userId, { limit: 40 }),
      runTool('get_products', db, userId, {}),
      runTool('get_services', db, userId, {}),
      runTool('get_appointments', db, userId, { mode: 'all' }),
      runTool('get_receivables', db, userId, {}),
    ]);
    return {
      periodoPergunta: period?.label,
      entradas: summary?.entradasFmt,
      despesas: summary?.despesasFmt,
      saldo: summary?.saldoFmt,
      vendasMeses: (sales?.meses || []).slice(0, 12).map((m) => ({
        mes: m.label,
        total: m.totalFmt,
        qtd: m.quantidade,
      })),
      vendas: {
        total: salesDetail?.totalFmt,
        qtd: salesDetail?.quantidade,
        produtoMaisVende: salesDetail?.melhorProduto,
        servicoMaisVende: salesDetail?.melhorServico,
        clienteMaisCompra: salesDetail?.melhorCliente,
        porProduto: (salesDetail?.maisVendidos || []).slice(0, 8),
        porServico: (salesDetail?.maisServicos || []).slice(0, 8),
        porCliente: (salesDetail?.clientesMaisCompram || []).slice(0, 8),
        porOperador: (salesDetail?.operadores || []).slice(0, 6),
        recentes: (salesDetail?.recentes || []).slice(0, 10),
      },
      clientes: { total: clients?.total || 0, nomes: (clients?.nomes || []).slice(0, 20) },
      produtos: { cadastrados: products?.cadastrados || 0, nomes: (products?.nomes || []).slice(0, 12) },
      servicos: { cadastrados: services?.cadastrados || 0, nomes: (services?.nomes || []).slice(0, 12) },
      agenda: compactAgenda(agenda),
      aReceber: receivables?.totalFmt || receivables?.total,
    };
  } catch (_) {
    return null;
  }
}

function nowSaoPaulo() {
  const tz = 'America/Sao_Paulo';
  const d = new Date();
  return {
    date: d.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }),
  };
}

function clockReply(text) {
  const t = String(text || '');
  const { date, time } = nowSaoPaulo();
  if (/\b(que horas|hora agora|horario agora|que horas sao|que horas são)\b/.test(t)) {
    return `Agora são ${time}.`;
  }
  if (/\b(que dia|data (de )?hoje|qual (e|é) a data|qual o dia)\b/.test(t)) {
    return `Hoje é ${date}.`;
  }
  if (/\b(data e hora|hora e data)\b/.test(t)) {
    return `Hoje é ${date}. São ${time}.`;
  }
  return null;
}

function cleanSpeak(s) {
  return String(s || '')
    .replace(/[#*_`>~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function applyMutation(db, userId, pendingAction) {
  const args = sanitizeCreateArgs(pendingAction.tool, pendingAction.args);
  if (!args) return { message: 'Faltou algum dado para confirmar. Pode repetir o pedido?', intent: 'confirm_invalid' };
  const result = await runTool(pendingAction.tool, db, userId, args);
  if (!result?.ok) return { message: result?.error || 'Não consegui concluir. Tente pelo cadastro do app.', intent: pendingAction.tool };
  if (pendingAction.tool === 'create_expense') return { message: `Pronto. Despesa de ${result.amountFmt} lançada.`, intent: 'create_expense' };
  if (pendingAction.tool === 'create_income') return { message: `Pronto. Entrada de ${result.amountFmt} lançada.`, intent: 'create_income' };
  if (pendingAction.tool === 'create_client') return { message: `Cliente ${result.name} cadastrado.`, intent: 'create_client' };
  if (pendingAction.tool === 'create_appointment') {
    const extra = result.createdClient ? ' Cadastrei o cliente também.' : '';
    return { message: `Agendado: ${result.title} em ${result.date} às ${result.time}.${extra}`, intent: 'create_appointment' };
  }
  if (pendingAction.tool === 'create_product') return { message: `Produto ${result.name} cadastrado.`, intent: 'create_product' };
  if (pendingAction.tool === 'create_service') return { message: `Serviço ${result.name} cadastrado.`, intent: 'create_service' };
  return { message: 'Pronto, registrei.', intent: pendingAction.tool };
}

async function answerLlama({ db, userId, firstName, preferredName, message, history, pendingAction, confirm, voiceTone, autoConfirm, memory }) {
  const original = String(message || '').trim();
  const text = fold(original);

  if (confirm && pendingAction?.tool) {
    return applyMutation(db, userId, pendingAction);
  }
  if (pendingAction?.tool && isCancel(text)) {
    return { message: 'Ok, não alterei nada.', intent: 'cancelled' };
  }
  if (pendingAction?.tool && isConfirm(text)) {
    return applyMutation(db, userId, pendingAction);
  }

  const clock = clockReply(text);
  if (clock) return { message: clock, intent: 'time' };

  const callName = extractCallName(message);
  if (callName) {
    return {
      message: `Combinado. Pode me chamar de Dock. Em que posso ajudar?`,
      intent: 'set_name',
      callName,
    };
  }

  const mutation = detectMutation(text, original);
  if (mutation?.tool) {
    const args = sanitizeCreateArgs(mutation.tool, mutation.args);
    if (!args) {
      return { message: 'Para cadastrar, diga o nome e o valor, se tiver. Exemplo: registre o produto shampoo a 20 reais.', intent: 'need_params' };
    }
    if (confirm) {
      return applyMutation(db, userId, { tool: mutation.tool, args });
    }
    return {
      message: pendingSummary(mutation.tool, args),
      intent: mutation.tool,
      pendingAction: { tool: mutation.tool, args },
    };
  }

  const nav = detectNav(message);
  if (nav?.target) {
    if (nav.action === 'scroll') {
      return {
        message: nav.dir === 'up' ? 'Indo para o topo.' : 'Rolando a página.',
        intent: 'scroll',
        uiAction: { type: 'scroll', target: 'page', dir: nav.dir || 'down' },
      };
    }
    const closing = nav.action === 'close';
    return {
      message: closing ? 'Fechei.' : 'Pronto. Já está na tela.',
      intent: closing ? 'close_screen' : 'open_screen',
      uiAction: { type: closing ? 'close' : 'open', target: nav.target },
    };
  }
  if (!llmStatus().configured) {
    return { message: 'O assistente remoto não está configurado no servidor.', intent: 'error' };
  }
  const snap = await accountSnapshot(db, userId, message);
  const system = [
    SYSTEM_PROMPT,
    tonePrompt(voiceTone),
    `Agora no Brasil: ${nowSaoPaulo().date}, ${nowSaoPaulo().time}. Use isso se perguntarem hora ou data.`,
    'Não chame o usuário pelo nome. Palavras completas, sem gíria.',
    'Você é o Dock. Não diga nomes de modelos nem leia símbolos.',
    'Use o JSON: clientes.nomes, vendas.porProduto, vendas.porServico, vendas.porCliente, vendas.recentes, agenda.quemAgendou, agenda.quemCancelou.',
    'Se pedirem detalhe, responda com esses campos. Não invente.',
    'Não invente que abriu tela: o app abre sozinho.',
    snap ? `Dados reais da conta (não invente fora disso): ${JSON.stringify(snap)}` : 'Se faltar dado, diga que não encontrou.',
    Array.isArray(memory) && memory.length
      ? `O usuário ensinou isto. Use sempre que fizer sentido: ${JSON.stringify(memory.slice(-48))}`
      : '',
    'Use o histórico. Interprete respostas curtas no contexto. Não repita o pedido do usuário.',
    'Respostas curtas e humanas, em português. Sem markdown.',
  ].join(' ');
  const messages = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-16)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 600) }));
  messages.push({ role: 'user', content: original.slice(0, 800) });
  const out = await chatWithAccountLlm({ system, messages });
  return { message: cleanSpeak(out?.text) || 'Não consegui montar a resposta agora.', intent: 'llama' };
}

module.exports = { answerLlama };
