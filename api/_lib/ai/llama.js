const { chatWithAccountLlm, llmStatus } = require('../llmChat');
const { SYSTEM_PROMPT } = require('./prompt');
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

async function applyMutation(db, userId, pendingAction) {
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
  return { message: 'Pronto, registrei.', intent: pendingAction.tool };
}

async function answerLlama({ db, userId, firstName, preferredName, message, history, pendingAction, confirm }) {
  const name = String(preferredName || firstName || '').trim().split(/\s+/)[0];
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

  const callName = extractCallName(message);
  if (callName) {
    return {
      message: `Combinado, ${callName}. Pode me chamar de Dock. O que posso te ajudar hoje?`,
      intent: 'set_name',
      callName,
    };
  }

  const mutation = detectMutation(text, original);
  if (mutation?.tool) {
    const args = sanitizeCreateArgs(mutation.tool, mutation.args);
    if (!args) {
      return { message: 'Pra cadastrar, me diga o nome (e o valor, se tiver). Ex.: registre o produto shampoo a 20 reais.', intent: 'need_params' };
    }
    return {
      message: pendingSummary(mutation.tool, args),
      intent: mutation.tool,
      pendingAction: { tool: mutation.tool, args },
    };
  }

  const nav = detectNav(message);
  if (nav?.target) {
    const closing = nav.action === 'close';
    return {
      message: closing ? `Fechando ${nav.label}.` : `Beleza. Abrindo ${nav.label}.`,
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
    name ? `O usuário pediu para ser chamado de ${name}.` : 'Se ainda não souber o nome, pergunte como quer ser chamado.',
    'Você é o Dock. Não diga nomes de modelos.',
    'Use o JSON: clientes.nomes, vendas.porProduto, vendas.porServico, vendas.porCliente, vendas.recentes, agenda.quemAgendou, agenda.quemCancelou.',
    'Se pedirem detalhe (quem comprou, o que, quanto, operador, quem agendou/cancelou), responda com esses campos. Não invente.',
    'Não abra tela a menos que a pessoa peça abre/abrir. Cadastro só depois de confirmar.',
    snap ? `Dados reais da conta (não invente fora disso): ${JSON.stringify(snap)}` : 'Se faltar dado, diga que não encontrou.',
    'Lembre a última pergunta do histórico e interprete respostas curtas no contexto.',
    'Respostas curtas, humanas, em português.',
  ].join(' ');
  const messages = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }));
  messages.push({ role: 'user', content: original.slice(0, 2000) });
  const out = await chatWithAccountLlm({ system, messages });
  return { message: String(out?.text || '').trim() || 'Não consegui montar a resposta agora.', intent: 'llama' };
}

module.exports = { answerLlama };
