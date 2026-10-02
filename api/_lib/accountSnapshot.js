function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function brl(n) {
  return money(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthKeyFrom(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function shortTx(r) {
  return {
    tipo: r.type === 'income' || r.type === 'receita' ? 'entrada' : 'saida',
    valor: money(r.amount),
    desc: String(r.description || '').slice(0, 80),
    categoria: r.category || '',
    data: r.date || '',
    ambito: r.tipo_venda || r.tipoVenda || '',
  };
}

function productName(p) {
  const data = p?.data && typeof p.data === 'object' ? p.data : {};
  return String(p?.name || data.name || '').slice(0, 80);
}

async function safeSelect(supabase, table, columns, userId, order) {
  try {
    let q = supabase.from(table).select(columns).eq('user_id', userId);
    if (order) q = q.order(order.col, { ascending: !!order.asc, nullsFirst: false });
    const { data, error } = await q.limit(order?.limit || 400);
    if (error) return [];
    return data || [];
  } catch (_) {
    return [];
  }
}

/**
 * Resumo só da conta autenticada. Sem telefone, e-mail, CPF ou documentos.
 */
async function buildAccountSnapshot(supabase, userId) {
  const month = currentMonthKey();
  const since30 = daysAgoIso(30);
  const today = new Date().toISOString().slice(0, 10);

  const [txs, products, vendas, aReceber, boletos, agenda, clients, orcamentos, fluxo] = await Promise.all([
    safeSelect(supabase, 'transactions', 'type,amount,description,category,date,tipo_venda', userId, { col: 'date', asc: false, limit: 250 }),
    safeSelect(supabase, 'products', 'name,price,cost_price,data', userId, { col: 'name', asc: true, limit: 200 }),
    safeSelect(supabase, 'empresa_vendas', 'produto,quantidade,valor_total,data', userId, { col: 'data', asc: false, limit: 250 }),
    safeSelect(supabase, 'a_receber', 'description,amount,due_date,status', userId, { col: 'due_date', asc: true, limit: 80 }),
    safeSelect(supabase, 'boletos', 'data', userId, null),
    safeSelect(supabase, 'agenda_events', 'title,date,time,amount,status,tipo', userId, { col: 'date', asc: true, limit: 80 }),
    safeSelect(supabase, 'clients', 'name,tipo', userId, null),
    safeSelect(supabase, 'orcamentos', 'numero,status,total,created_at', userId, { col: 'created_at', asc: false, limit: 40 }),
    safeSelect(supabase, 'empresa_fluxo', 'tipo,valor,data,descricao', userId, { col: 'data', asc: false, limit: 80 }),
  ]);

  let entradasMes = 0;
  let saidasMes = 0;
  let entradas30 = 0;
  let saidas30 = 0;
  const byCatIn = {};
  const byCatOut = {};

  txs.forEach((t) => {
    const amt = money(t.amount);
    const isIn = t.type === 'income' || t.type === 'receita';
    const mk = monthKeyFrom(t.date);
    const in30 = String(t.date || '') >= since30;
    if (mk === month) {
      if (isIn) entradasMes += amt;
      else saidasMes += amt;
    }
    if (in30) {
      if (isIn) entradas30 += amt;
      else saidas30 += amt;
    }
    const cat = String(t.category || 'outros');
    if (isIn) byCatIn[cat] = money((byCatIn[cat] || 0) + amt);
    else byCatOut[cat] = money((byCatOut[cat] || 0) + amt);
  });

  const topOut = Object.entries(byCatOut)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([categoria, total]) => ({ categoria, total }));
  const topIn = Object.entries(byCatIn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([categoria, total]) => ({ categoria, total }));

  const sold = {};
  let vendasMesQtd = 0;
  let vendasMesTotal = 0;
  vendas.forEach((v) => {
    const name = String(v.produto || 'item').slice(0, 80);
    const qtd = money(v.quantidade) || 1;
    const total = money(v.valor_total);
    sold[name] = sold[name] || { qtd: 0, total: 0 };
    sold[name].qtd += qtd;
    sold[name].total += total;
    if (monthKeyFrom(v.data) === month) {
      vendasMesQtd += qtd;
      vendasMesTotal += total;
    }
  });
  const maisVendidos = Object.entries(sold)
    .map(([produto, s]) => ({ produto, quantidade: money(s.qtd), total: money(s.total) }))
    .sort((a, b) => b.quantidade - a.quantidade || b.total - a.total)
    .slice(0, 8);

  const estoqueBaixo = products
    .map((p) => {
      const data = p.data && typeof p.data === 'object' ? p.data : {};
      const stock = Number(data.stock ?? 0);
      const min = Number(data.min_stock ?? 0);
      return {
        nome: productName(p),
        preco: money(p.price),
        estoque: Number.isFinite(stock) ? stock : 0,
        minimo: Number.isFinite(min) ? min : 0,
      };
    })
    .filter((p) => p.nome && (p.minimo > 0 ? p.estoque <= p.minimo : p.estoque <= 2))
    .slice(0, 10);

  const receberAberto = aReceber.filter((r) => String(r.status || '').toLowerCase() !== 'pago' && String(r.status || '').toLowerCase() !== 'recebido');
  const receberTotal = receberAberto.reduce((s, r) => s + money(r.amount), 0);

  const boletosResumo = boletos.slice(0, 60).map((b) => {
    const d = b.data && typeof b.data === 'object' ? b.data : {};
    return {
      desc: String(d.description || d.descricao || d.title || 'fatura').slice(0, 60),
      valor: money(d.amount || d.valor),
      vencimento: d.dueDate || d.due_date || d.vencimento || '',
      pago: !!(d.paid || d.pago || d.status === 'pago'),
    };
  });
  const boletosAbertos = boletosResumo.filter((b) => !b.pago);
  const boletosTotal = boletosAbertos.reduce((s, b) => s + b.valor, 0);

  const agendaProximos = agenda
    .filter((e) => String(e.date || '') >= today)
    .slice(0, 8)
    .map((e) => ({
      titulo: String(e.title || 'evento').slice(0, 60),
      data: e.date,
      hora: e.time || '',
      valor: money(e.amount),
      status: e.status || '',
    }));

  const fluxoMes = fluxo.filter((f) => monthKeyFrom(f.data) === month);
  const fluxoIn = fluxoMes.filter((f) => String(f.tipo || '').toLowerCase().includes('entrad') || f.tipo === 'in').reduce((s, f) => s + money(f.valor), 0);
  const fluxoOut = fluxoMes.filter((f) => String(f.tipo || '').toLowerCase().includes('said') || f.tipo === 'out').reduce((s, f) => s + money(f.valor), 0);

  return {
    geradoEm: new Date().toISOString(),
    mesAtual: month,
    financeiro: {
      entradasMes: money(entradasMes),
      saidasMes: money(saidasMes),
      saldoMes: money(entradasMes - saidasMes),
      entradas30d: money(entradas30),
      saidas30d: money(saidas30),
      saldo30d: money(entradas30 - saidas30),
      entradasMesFmt: brl(entradasMes),
      saidasMesFmt: brl(saidasMes),
      saldoMesFmt: brl(entradasMes - saidasMes),
      topCategoriasSaida: topOut,
      topCategoriasEntrada: topIn,
      ultimosLancamentos: txs.slice(0, 18).map(shortTx),
    },
    vendas: {
      quantidadeMes: money(vendasMesQtd),
      totalMes: money(vendasMesTotal),
      totalMesFmt: brl(vendasMesTotal),
      produtosCadastrados: products.length,
      maisVendidos,
      estoqueBaixo,
    },
    pessoas: {
      clientes: clients.length,
    },
    aReceber: {
      abertos: receberAberto.length,
      total: money(receberTotal),
      totalFmt: brl(receberTotal),
    },
    faturas: {
      abertas: boletosAbertos.length,
      total: money(boletosTotal),
      totalFmt: brl(boletosTotal),
    },
    agendaProximos,
    orcamentosRecentes: orcamentos.slice(0, 6).map((o) => ({
      numero: o.numero,
      status: o.status,
      total: money(o.total),
    })),
    fluxoCaixaMes: {
      entradas: money(fluxoIn),
      saidas: money(fluxoOut),
    },
  };
}

module.exports = { buildAccountSnapshot, brl };
