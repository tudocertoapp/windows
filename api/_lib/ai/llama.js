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

function needsAccountData(text) {
  return /\b(saldo|vend|gastei|gasto|despesa|receita|cliente|agenda|produto|servico|lucro|entrada|saida|boleto|receber|fatur|compromisso|orcament|caixa|quanto|quantos|hoje tem|este mes|esse mes|aniv|meta)\b/.test(String(text || ''));
}

async function accountSnapshot(db, userId, message) {
  try {
    const period = parsePeriodFromText(fold(message)) || currentMonth();
    const [summary, sales, salesDetail, clients, products, services, agenda, receivables] = await Promise.all([
      runTool('get_financial_summary', db, userId, period),
      runTool('get_sales_by_month', db, userId, {}),
      runTool('get_sales', db, userId, period),
      runTool('get_clients', db, userId, { limit: 20 }),
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
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\b(emoji|foguete|foguetes|palmas|coracaozinho|coracao|joinha|carinha|sorriso|piscadela|marcador de selecao|marca de selecao|selecao branca|selecao|check mark|white check|verificado)\b/gi, ' ')
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
  if (pendingAction.tool === 'create_client') {
    return {
      message: `Cliente ${result.name} cadastrado.`,
      intent: 'create_client',
      uiAction: { type: 'open', target: 'clients' },
    };
  }
  if (pendingAction.tool === 'create_appointment') {
    const extra = result.createdClient ? ' Cadastrei o cliente também.' : '';
    return {
      message: `Agendado: ${result.title} em ${result.date} às ${result.time}.${extra}`,
      intent: 'create_appointment',
      uiAction: { type: 'open', target: 'agenda' },
    };
  }
  if (pendingAction.tool === 'create_product') return { message: `Produto ${result.name} cadastrado.`, intent: 'create_product' };
  if (pendingAction.tool === 'create_service') return { message: `Serviço ${result.name} cadastrado.`, intent: 'create_service' };
  return { message: 'Pronto, registrei.', intent: pendingAction.tool };
}

function wantsWrite(text) {
  return /\b(cadastre|cadastrar|cadastra|agende|agendar|agendamento|registre|registrar|crie|criar|marca|marcar|lance|lancar|lanca|novo cliente|nova despesa|nova entrada)\b/.test(String(text || ''));
}

function parseJsonBlob(raw) {
  const s = String(raw || '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

const WRITE_TOOLS = /^(create_expense|create_income|create_client|create_appointment|create_product|create_service)$/;

async function extractWrite(message, history) {
  if (!llmStatus().configured) return null;
  const out = await chatWithAccountLlm({
    system: [
      'Extraia pedido de cadastro ou agendamento do Tudo Certo.',
      'Responda SÓ JSON, sem texto.',
      '{"tool":"create_client"|"create_appointment"|"create_product"|"create_service"|"create_expense"|"create_income","args":{}}',
      'args: name, title, clientName, date (YYYY-MM-DD), time (HH:MM), amount, service, category, description, price.',
      'Se faltar dado essencial: {"need":"pergunta curta em português"}',
      'Não invente que já salvou. Data de hoje se o usuário não disser o dia.',
    ].join(' '),
    messages: [
      ...(Array.isArray(history) ? history.slice(-4) : []),
      { role: 'user', content: String(message || '').slice(0, 400) },
    ],
  });
  const json = parseJsonBlob(out?.text);
  if (!json || typeof json !== 'object') return null;
  if (json.need) return { need: String(json.need).slice(0, 180) };
  if (!WRITE_TOOLS.test(String(json.tool || ''))) return null;
  return { tool: json.tool, args: json.args && typeof json.args === 'object' ? json.args : {} };
}

function fakeSavedSpeech(msg) {
  return /\b(cadastrei|agendei|agendou|agendado|marquei|registrei|lancei|salvei|gravei|ja esta na agenda|ja cadastrei|cancelei|cancelou|exclui|excluiu|apaguei)\b/.test(fold(msg));
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
  if (pendingAction?.tool) {
    const extra = detectMutation(text, original);
    if (extra?.tool) {
      let merged = extra.args || {};
      if (pendingAction.tool === 'create_client' && extra.tool === 'create_appointment') {
        merged = {
          ...extra.args,
          clientName: extra.args.clientName || pendingAction.args?.name,
          title: extra.args.title || pendingAction.args?.name,
        };
      } else if (extra.tool === pendingAction.tool) {
        merged = { ...pendingAction.args, ...extra.args };
      }
      const args = sanitizeCreateArgs(extra.tool, merged);
      if (args) {
        return {
          message: pendingSummary(extra.tool, args),
          intent: extra.tool,
          pendingAction: { tool: extra.tool, args },
        };
      }
    }
    const keep = sanitizeCreateArgs(pendingAction.tool, pendingAction.args) || pendingAction.args;
    return {
      message: pendingSummary(pendingAction.tool, keep),
      intent: pendingAction.tool,
      pendingAction: { tool: pendingAction.tool, args: keep },
    };
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
      return { message: 'Para cadastrar, diga o nome e, se for agenda, o dia e a hora.', intent: 'need_params' };
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

  if (wantsWrite(text)) {
    const extracted = await extractWrite(original, history);
    if (extracted?.need) return { message: extracted.need, intent: 'need_params' };
    if (extracted?.tool) {
      const args = sanitizeCreateArgs(extracted.tool, extracted.args);
      if (!args) {
        return { message: 'Faltou um dado para salvar. Diga o nome e, na agenda, o dia e a hora.', intent: 'need_params' };
      }
      if (confirm) return applyMutation(db, userId, { tool: extracted.tool, args });
      return {
        message: pendingSummary(extracted.tool, args),
        intent: extracted.tool,
        pendingAction: { tool: extracted.tool, args },
      };
    }
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
  const snap = needsAccountData(text) ? await accountSnapshot(db, userId, message) : null;
  const system = [
    SYSTEM_PROMPT,
    tonePrompt(voiceTone),
    `Agora no Brasil: ${nowSaoPaulo().date}, ${nowSaoPaulo().time}. Use isso se perguntarem hora ou data.`,
    'Se usar o nome, só no começo da primeira frase desta resposta, uma vez. Nunca no fim. Não repita o nome em toda frase.',
    'Sem emoji e sem falar foguete, palmas, seleção branca, check ou nome de símbolo.',
    'Ao salvar, só confirme o que foi salvo. Não narre clique, seleção, campo branco nem tela.',
    'Responda já, em uma ou duas frases. Sem rodeio.',
    'Use o JSON: clientes.nomes, vendas.porProduto, vendas.porServico, vendas.porCliente, vendas.recentes, agenda.quemAgendou, agenda.quemCancelou.',
    'Se pedirem detalhe, responda com esses campos. Não invente.',
    'Não invente que abriu tela: o app abre sozinho.',
    'Nunca diga que agendou, salvou ou cadastrou se a ferramenta não rodou. Peça nome, dia e hora.',
    snap ? `Dados reais da conta (não invente fora disso): ${JSON.stringify(snap)}` : 'Se faltar dado da conta e precisou, diga que não encontrou. Para conversa comum, não invente números.',
    Array.isArray(memory) && memory.length
      ? `O usuário ensinou isto. Use sempre que fizer sentido: ${JSON.stringify(memory.slice(-24))}`
      : '',
    'Histórico: o que já foi feito de verdade vem marcado como FEITO. Não diga que fez se não estiver FEITO.',
    'Use o histórico. Interprete respostas curtas no contexto. Não repita o pedido do usuário.',
    'Respostas curtas e humanas, em português. Sem markdown.',
  ].join(' ');
  const messages = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-16)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 280) }));
  messages.push({ role: 'user', content: original.slice(0, 400) });
  const out = await chatWithAccountLlm({ system, messages });
  let msg = cleanSpeak(out?.text) || 'Não consegui montar a resposta agora.';
  if (fakeSavedSpeech(msg)) {
    msg = 'Ainda não gravei isso. Diga o que cadastrar ou agendar, com nome, e eu peço confirmação antes de salvar.';
  }
  return { message: msg, intent: 'llama' };
}

module.exports = { answerLlama };
