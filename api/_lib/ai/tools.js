const { sanitizePeriod, todayYmd, shiftDays, monthLabel } = require('./periods');

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function brl(n) {
  return money(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthKey(value) {
  const s = String(value || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${String(br[2]).padStart(2, '0')}`;
  }
  return '';
}

function clip(s, n = 80) {
  return String(s || '').trim().slice(0, n);
}

function isIncome(type) {
  return type === 'income' || type === 'receita';
}

async function rows(db, table, columns, userId, { eq = [], gte, lte, dateCol, order, limit = 200 } = {}) {
  try {
    let q = db.from(table).select(columns).eq('user_id', userId);
    eq.forEach(([col, val]) => {
      if (val != null && val !== '') q = q.eq(col, val);
    });
    if (dateCol && gte) q = q.gte(dateCol, gte);
    if (dateCol && lte) q = q.lte(dateCol, lte);
    if (order) q = q.order(order.col, { ascending: !!order.asc });
    const { data, error } = await q.limit(limit);
    if (error) return [];
    return data || [];
  } catch (_) {
    return [];
  }
}

async function get_income(db, userId, args) {
  const p = sanitizePeriod(args);
  const txs = await rows(db, 'transactions', 'type,amount,description,category,date', userId, {
    dateCol: 'date',
    gte: p.start,
    lte: p.end,
    order: { col: 'date', asc: false },
    limit: 300,
  });
  const list = txs.filter((t) => isIncome(t.type));
  const total = list.reduce((s, t) => s + money(t.amount), 0);
  const top = list.slice(0, 5).map((t) => ({ desc: clip(t.description), valor: money(t.amount), data: t.date }));
  return { period: p.label, total: money(total), totalFmt: brl(total), quantidade: list.length, itens: top };
}

async function get_expenses(db, userId, args) {
  const p = sanitizePeriod(args);
  const txs = await rows(db, 'transactions', 'type,amount,description,category,date', userId, {
    dateCol: 'date',
    gte: p.start,
    lte: p.end,
    order: { col: 'amount', asc: false },
    limit: 300,
  });
  const list = txs.filter((t) => !isIncome(t.type));
  const total = list.reduce((s, t) => s + money(t.amount), 0);
  const byCat = {};
  list.forEach((t) => {
    const c = clip(t.category || 'outros', 40);
    byCat[c] = money((byCat[c] || 0) + money(t.amount));
  });
  const maior = list[0]
    ? { desc: clip(list[0].description), valor: money(list[0].amount), valorFmt: brl(list[0].amount), categoria: clip(list[0].category), data: list[0].date }
    : null;
  const categorias = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoria, valor]) => ({ categoria, valor, valorFmt: brl(valor) }));
  return { period: p.label, total: money(total), totalFmt: brl(total), quantidade: list.length, maior, categorias };
}

async function get_sales(db, userId, args) {
  const p = sanitizePeriod(args);
  const [vendas, txs, services] = await Promise.all([
    rows(db, 'empresa_vendas', '*', userId, {
      dateCol: 'data',
      gte: p.start,
      lte: p.end,
      order: { col: 'data', asc: false },
      limit: 400,
    }),
    rows(db, 'transactions', 'type,amount,description,category,date', userId, {
      dateCol: 'date',
      gte: p.start,
      lte: p.end,
      order: { col: 'date', asc: false },
      limit: 300,
    }),
    rows(db, 'services', 'name', userId, { limit: 200 }),
  ]);
  const serviceNames = new Set((services || []).map((s) => clip(s.name).toLowerCase()).filter(Boolean));
  const bump = (map, key, qtd, total) => {
    const k = clip(key || 'item', 60) || 'item';
    map[k] = map[k] || { qtd: 0, total: 0 };
    map[k].qtd += qtd;
    map[k].total += total;
  };
  const rank = (map, label) =>
    Object.entries(map)
      .map(([nome, s]) => ({ [label]: nome, quantidade: money(s.qtd), total: money(s.total), totalFmt: brl(s.total) }))
      .sort((a, b) => b.total - a.total || b.quantidade - a.quantidade)
      .slice(0, 8);

  const produtos = {};
  const servicos = {};
  const clientes = {};
  const operadores = {};
  let qtd = 0;
  let total = 0;
  const recentes = [];

  vendas.forEach((v) => {
    const name = clip(v.produto || 'item');
    const n = money(v.quantidade) || 1;
    const t = money(v.valor_total);
    const op = clip(v.operador || v.vendedor || v.colaborador_nome || '');
    const cliente = clip(v.cliente_nome || 'cliente');
    if (serviceNames.has(name.toLowerCase())) bump(servicos, name, n, t);
    else bump(produtos, name, n, t);
    bump(clientes, cliente, n, t);
    if (op) bump(operadores, op, n, t);
    qtd += n;
    total += t;
    recentes.push({
      data: v.data,
      cliente,
      item: name,
      tipo: serviceNames.has(name.toLowerCase()) ? 'servico' : 'produto',
      qtd: n,
      valorFmt: brl(t),
      operador: op || null,
    });
  });
  txs.filter((t) => isIncome(t.type)).forEach((t) => {
    const name = clip(t.description || t.category || 'entrada');
    const amt = money(t.amount);
    bump(produtos, name, 1, amt);
    qtd += 1;
    total += amt;
  });

  const maisProdutos = rank(produtos, 'produto');
  const maisServicos = rank(servicos, 'servico');
  return {
    period: p.label,
    quantidade: money(qtd),
    total: money(total),
    totalFmt: brl(total),
    maisVendidos: maisProdutos,
    maisServicos,
    clientesMaisCompram: rank(clientes, 'cliente'),
    operadores: rank(operadores, 'operador'),
    recentes: recentes.slice(0, 12),
    melhorProduto: maisProdutos[0] || null,
    melhorServico: maisServicos[0] || null,
    melhorCliente: rank(clientes, 'cliente')[0] || null,
  };
}

async function get_sales_by_month(db, userId) {
  const [vendas, txs] = await Promise.all([
    rows(db, 'empresa_vendas', 'valor_total,data', userId, { order: { col: 'data', asc: false }, limit: 400 }),
    rows(db, 'transactions', 'type,amount,date', userId, { order: { col: 'date', asc: false }, limit: 400 }),
  ]);
  const by = {};
  const add = (key, amt, fonte) => {
    if (!key || !(amt > 0)) return;
    by[key] = by[key] || { total: 0, qtd: 0, fontes: {} };
    by[key].total = money(by[key].total + amt);
    by[key].qtd += 1;
    by[key].fontes[fonte] = true;
  };
  vendas.forEach((v) => add(monthKey(v.data), money(v.valor_total), 'vendas'));
  txs.forEach((t) => {
    if (isIncome(t.type)) add(monthKey(t.date), money(t.amount), 'entradas');
  });
  const meses = Object.entries(by)
    .map(([key, s]) => {
      const [y, m] = key.split('-').map(Number);
      return {
        key,
        year: y,
        month: m,
        label: monthLabel(y, m),
        total: s.total,
        totalFmt: brl(s.total),
        quantidade: s.qtd,
      };
    })
    .sort((a, b) => b.total - a.total);
  return { meses, melhor: meses[0] || null };
}

async function get_financial_summary(db, userId, args) {
  const [income, expenses, sales] = await Promise.all([
    get_income(db, userId, args),
    get_expenses(db, userId, args),
    get_sales(db, userId, args),
  ]);
  const saldo = money(income.total - expenses.total);
  return {
    period: income.period,
    entradas: income.total,
    entradasFmt: income.totalFmt,
    despesas: expenses.total,
    despesasFmt: expenses.totalFmt,
    saldo,
    saldoFmt: brl(saldo),
    vendas: sales.total,
    vendasFmt: sales.totalFmt,
  };
}

async function get_cash_flow(db, userId, args) {
  const p = sanitizePeriod(args);
  const fluxo = await rows(db, 'empresa_fluxo', 'tipo,valor,data,descricao', userId, {
    dateCol: 'data',
    gte: p.start,
    lte: p.end,
    order: { col: 'data', asc: false },
    limit: 200,
  });
  let entradas = 0;
  let saidas = 0;
  fluxo.forEach((f) => {
    const t = String(f.tipo || '').toLowerCase();
    if (t.includes('entrad') || t === 'in') entradas += money(f.valor);
    else saidas += money(f.valor);
  });
  if (!fluxo.length) {
    const sum = await get_financial_summary(db, userId, args);
    return {
      period: p.label,
      entradas: sum.entradas,
      entradasFmt: sum.entradasFmt,
      saidas: sum.despesas,
      saidasFmt: sum.despesasFmt,
      fonte: 'lancamentos',
    };
  }
  return {
    period: p.label,
    entradas: money(entradas),
    entradasFmt: brl(entradas),
    saidas: money(saidas),
    saidasFmt: brl(saidas),
    fonte: 'fluxo',
  };
}

async function get_clients(db, userId, args) {
  const limit = Math.min(40, Number(args?.limit) || 20);
  let total = 0;
  try {
    const { count, error } = await db.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (!error) total = Number(count) || 0;
  } catch (_) {}
  const clients = await rows(db, 'clients', 'id,name', userId, { order: { col: 'name', asc: true }, limit });
  return {
    total: total || clients.length,
    nomes: clients.slice(0, 12).map((c) => clip(c.name, 60)),
  };
}

async function get_client_details(db, userId, args) {
  const q = clip(args?.name || args?.query, 60).toLowerCase();
  if (q.length < 2) return { found: false, motivo: 'nome' };
  const clients = await rows(db, 'clients', 'id,name,tipo,nivel', userId, { order: { col: 'name', asc: true }, limit: 80 });
  const match = clients.find((c) => String(c.name || '').toLowerCase().includes(q));
  if (!match) return { found: false, query: clip(q, 40) };
  const vendas = await rows(db, 'empresa_vendas', 'valor_total,data,produto,cliente_id,cliente_nome', userId, {
    order: { col: 'data', asc: false },
    limit: 200,
  });
  const mine = vendas.filter(
    (v) => String(v.cliente_id) === String(match.id) || String(v.cliente_nome || '').toLowerCase().includes(String(match.name).toLowerCase())
  );
  const gasto = mine.reduce((s, v) => s + money(v.valor_total), 0);
  return {
    found: true,
    nome: clip(match.name, 60),
    tipo: clip(match.tipo, 20),
    vendas: mine.length,
    gasto: money(gasto),
    gastoFmt: brl(gasto),
    ultima: mine[0] ? { data: mine[0].data, produto: clip(mine[0].produto) } : null,
  };
}

async function get_idle_clients(db, userId) {
  const [clients, agenda] = await Promise.all([
    rows(db, 'clients', 'id,name', userId, { limit: 80 }),
    rows(db, 'agenda_events', 'client_id,title,date', userId, { order: { col: 'date', asc: false }, limit: 200 }),
  ]);
  const last = {};
  agenda.forEach((e) => {
    const id = String(e.client_id || '');
    if (id && !last[id]) last[id] = e.date;
  });
  const today = todayYmd();
  const idle = clients
    .map((c) => {
      const d = last[String(c.id)] || '';
      return { nome: clip(c.name, 50), ultimo: d || null };
    })
    .filter((c) => !c.ultimo || c.ultimo < shiftDays(-45))
    .slice(0, 8);
  return { hoje: today, semAtendimento: idle };
}

function toIsoDate(v) {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${String(br[2]).padStart(2, '0')}-${String(br[1]).padStart(2, '0')}`;
  }
  return '';
}

function toBrDate(v) {
  const iso = toIsoDate(v);
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function addHour(time) {
  const m = String(time || '09:00').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '10:00';
  const h = Math.min(23, Number(m[1]) + 1);
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function fmtEvent(e) {
  if (!e) return '';
  const d = e.dataIso || e.data || '';
  const [y, m, day] = String(d).split('-');
  const br = day && m ? `${day}/${m}${y ? `/${y}` : ''}` : d;
  return `${e.titulo || 'compromisso'} em ${br}${e.hora ? ` às ${e.hora}` : ''}`;
}

async function get_appointments(db, userId, args) {
  const today = todayYmd();
  const day = toIsoDate(args?.date) || today;
  const gte = args?.from || (args?.mode === 'last' ? shiftDays(-120) : day);
  const lte = args?.to || (args?.mode === 'last' ? today : args?.upcoming || args?.mode === 'next' ? shiftDays(60) : day);
  const useRange = args?.mode !== 'all' && args?.mode !== 'context';
  const ev = await rows(db, 'agenda_events', 'title,date,time,amount,status,tipo,client_id,description', userId, {
    dateCol: useRange ? 'date' : undefined,
    gte: useRange ? gte : undefined,
    lte: useRange ? lte : undefined,
    order: { col: 'date', asc: false },
    limit: args?.mode === 'all' ? 400 : 120,
  });
  let clients = [];
  try {
    clients = await rows(db, 'clients', 'id,name', userId, { limit: 120 });
  } catch (_) {
    clients = [];
  }
  const names = {};
  clients.forEach((c) => {
    names[String(c.id)] = clip(c.name, 50);
  });
  const eventos = ev
    .map((e) => {
      const dataIso = toIsoDate(e.date);
      const cliente = e.client_id ? names[String(e.client_id)] : '';
      const titulo = clip(cliente || e.title || e.description || 'compromisso', 50);
      return {
        titulo,
        data: e.date,
        dataIso,
        hora: clip(e.time, 8),
        status: clip(e.status, 20),
      };
    })
    .filter((e) => e.titulo)
    .sort((a, b) => String(a.dataIso || a.data).localeCompare(String(b.dataIso || b.data)) || String(a.hora).localeCompare(String(b.hora)));

  const passados = eventos.filter((e) => e.dataIso && e.dataIso < today).reverse();
  const hoje = eventos.filter((e) => e.dataIso === today);
  const futuros = eventos.filter((e) => e.dataIso && e.dataIso > today);
  const ultimo = passados[0] || null;
  const proximo = (hoje[0] || futuros[0]) || null;

  let atend = [];
  try {
    atend = await rows(db, 'empresa_atendimentos', 'cliente_nome,data,tipo,status', userId, {
      order: { col: 'data', asc: false },
      limit: 20,
    });
  } catch (_) {
    atend = [];
  }

  return {
    data: day,
    hoje: today,
    quantidade: eventos.length,
    eventos: eventos.slice(-20),
    passados: passados.slice(0, 8),
    futuros: futuros.slice(0, 8),
    hojeLista: hoje,
    ultimo,
    proximo,
    ultimoAtendimento: atend[0]
      ? { cliente: clip(atend[0].cliente_nome, 50), data: atend[0].data, tipo: clip(atend[0].tipo, 30) }
      : null,
    horariosOcupados: hoje.map((e) => e.hora).filter(Boolean),
  };
}

async function get_products(db, userId, args) {
  const products = await rows(db, 'products', 'name,price,data', userId, { order: { col: 'name', asc: true }, limit: 120 });
  const nameQ = clip(args?.name, 60).toLowerCase();
  const list = products
    .map((p) => {
      const data = p.data && typeof p.data === 'object' ? p.data : {};
      return {
        nome: clip(p.name || data.name, 60),
        preco: money(p.price),
        precoFmt: brl(p.price),
        estoque: Number(data.stock ?? 0) || 0,
        minimo: Number(data.min_stock ?? 0) || 0,
      };
    })
    .filter((p) => p.nome && (!nameQ || p.nome.toLowerCase().includes(nameQ)));
  const acabando = list.filter((p) => (p.minimo > 0 ? p.estoque <= p.minimo : p.estoque <= 2)).slice(0, 8);
  return {
    cadastrados: nameQ ? list.length : products.length,
    nomes: list.slice(0, 10).map((p) => p.nome),
    acabando,
    encontrado: nameQ ? list[0] || null : null,
  };
}

async function get_services(db, userId, args) {
  const services = await rows(db, 'services', 'name,price', userId, { order: { col: 'name', asc: true }, limit: 120 });
  const nameQ = clip(args?.name, 60).toLowerCase();
  const list = services
    .map((p) => ({ nome: clip(p.name, 60), preco: money(p.price), precoFmt: brl(p.price) }))
    .filter((p) => p.nome && (!nameQ || p.nome.toLowerCase().includes(nameQ)));
  return {
    cadastrados: nameQ ? list.length : services.length,
    nomes: list.slice(0, 12).map((p) => p.nome),
    encontrado: nameQ ? list[0] || null : null,
  };
}

async function get_receivables(db, userId) {
  const rec = await rows(db, 'a_receber', 'description,amount,due_date,status', userId, {
    order: { col: 'due_date', asc: true },
    limit: 80,
  });
  const aberto = rec.filter((r) => {
    const s = String(r.status || '').toLowerCase();
    return s !== 'pago' && s !== 'recebido';
  });
  const total = aberto.reduce((s, r) => s + money(r.amount), 0);
  return { abertos: aberto.length, total: money(total), totalFmt: brl(total) };
}

async function get_payables(db, userId) {
  const boletos = await rows(db, 'boletos', 'data', userId, { limit: 80 });
  const list = boletos.map((b) => {
    const d = b.data && typeof b.data === 'object' ? b.data : {};
    return {
      desc: clip(d.description || d.descricao || d.title || 'fatura', 50),
      valor: money(d.amount || d.valor),
      pago: !!(d.paid || d.pago || d.status === 'pago'),
    };
  });
  const aberto = list.filter((b) => !b.pago);
  const total = aberto.reduce((s, b) => s + b.valor, 0);
  return { abertas: aberto.length, total: money(total), totalFmt: brl(total) };
}

function sanitizeAmount(n) {
  const v = money(n);
  if (!(v >= 0.01 && v <= 1000000)) return null;
  return v;
}

async function insertRow(db, table, row, depth = 0) {
  const { data, error } = await db.from(table).insert(row).select('*').maybeSingle();
  if (!error) return { ok: true, data };
  const msg = String(error.message || error.code || '');
  if (depth >= 6) return { ok: false, error: msg };
  const next = { ...row };
  let changed = false;
  const drop = (col) => {
    if (Object.prototype.hasOwnProperty.call(next, col)) {
      delete next[col];
      changed = true;
    }
  };
  if (/pre_order/i.test(msg)) drop('pre_order_items');
  if (/time_end/i.test(msg)) drop('time_end');
  const cols = [...String(msg).matchAll(/['"`]([a-z_][a-z0-9_]*)['"`]/gi)].map((m) => m[1]);
  cols.forEach((c) => {
    if (c !== 'user_id' && c !== 'name' && c !== 'title' && c !== 'date') drop(c);
  });
  if (!changed) return { ok: false, error: msg };
  return insertRow(db, table, next, depth + 1);
}

function writeFailMessage(msg) {
  const s = String(msg || '');
  if (/row-level security|rls|permission|not authorized|jwt/i.test(s)) {
    return 'Sem permissão para gravar. Entre de novo na conta e confirme o pedido.';
  }
  if (/null value|not-null|required/i.test(s)) return 'Faltou um campo obrigatório para salvar.';
  return 'Não consegui gravar no banco. Tente de novo.';
}

function sanitizeCreateArgs(tool, args) {
  const a = args && typeof args === 'object' ? args : {};
  if (tool === 'create_expense' || tool === 'create_income') {
    const amount = sanitizeAmount(a.amount);
    if (amount == null) return null;
    return {
      amount,
      description: clip(a.description || a.category || (tool === 'create_expense' ? 'Despesa' : 'Entrada'), 80),
      category: clip(a.category || (tool === 'create_expense' ? 'outros' : 'receita'), 40),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) ? a.date : todayYmd(),
    };
  }
  if (tool === 'create_client') {
    const name = clip(a.name || a.title || a.clientName, 80);
    if (name.length < 2) return null;
    return { name, tipo: clip(a.tipo || 'empresa', 20) };
  }
  if (tool === 'create_appointment') {
    const title = clip(a.title || a.name || a.clientName || a.service, 80);
    if (title.length < 2) return null;
    const iso = toIsoDate(a.date) || todayYmd();
    if (!iso) return null;
    const time = clip(a.time || '09:00', 8) || '09:00';
    return {
      title,
      date: toBrDate(iso),
      dateIso: iso,
      time,
      timeEnd: clip(a.timeEnd || addHour(time), 8),
      amount: money(a.amount) || 0,
      clientName: clip(a.clientName || a.name || title, 80),
      service: clip(a.service || '', 80),
      description: clip(a.description || a.service || '', 160),
    };
  }
  if (tool === 'create_product' || tool === 'create_service') {
    const name = clip(a.name, 80);
    if (name.length < 2) return null;
    return { name, price: money(a.price) || 0 };
  }
  return null;
}

async function create_expense(db, userId, args) {
  const a = sanitizeCreateArgs('create_expense', args);
  if (!a) return { ok: false, error: 'Dados incompletos.' };
  const { error } = await db.from('transactions').insert({
    user_id: userId,
    type: 'expense',
    amount: a.amount,
    description: a.description,
    category: a.category,
    date: a.date,
    tipo_venda: 'pessoal',
    desconto: 0,
  });
  if (error) return { ok: false, error: 'Não consegui lançar a despesa.' };
  return { ok: true, amountFmt: brl(a.amount), ...a };
}

async function create_income(db, userId, args) {
  const a = sanitizeCreateArgs('create_income', args);
  if (!a) return { ok: false, error: 'Dados incompletos.' };
  const { error } = await db.from('transactions').insert({
    user_id: userId,
    type: 'income',
    amount: a.amount,
    description: a.description,
    category: a.category,
    date: a.date,
    tipo_venda: 'pessoal',
    desconto: 0,
  });
  if (error) return { ok: false, error: 'Não consegui lançar a entrada.' };
  return { ok: true, amountFmt: brl(a.amount), ...a };
}

async function create_client(db, userId, args) {
  const a = sanitizeCreateArgs('create_client', args);
  if (!a) return { ok: false, error: 'Informe o nome do cliente.' };
  const tries = [
    { user_id: userId, name: a.name, nivel: 'orcamento', tipo: a.tipo || 'empresa', tags: [] },
    { user_id: userId, name: a.name, nivel: 'orcamento', tipo: a.tipo || 'empresa' },
    { user_id: userId, name: a.name, nivel: 'orcamento' },
    { user_id: userId, name: a.name },
  ];
  let lastErr = '';
  for (const row of tries) {
    const r = await insertRow(db, 'clients', row);
    if (r.ok) return { ok: true, name: a.name, id: r.data?.id || null };
    lastErr = r.error || '';
  }
  return { ok: false, error: writeFailMessage(lastErr) };
}

async function create_appointment(db, userId, args) {
  const a = sanitizeCreateArgs('create_appointment', args);
  if (!a) return { ok: false, error: 'Informe data e nome.' };
  let clientId = null;
  let createdClient = false;
  const clientName = a.clientName || (a.title && a.title !== 'Atendimento' ? a.title : '');
  if (clientName) {
    const { data: found } = await db
      .from('clients')
      .select('id,name')
      .eq('user_id', userId)
      .ilike('name', `%${clientName}%`)
      .limit(5);
    const exact = (found || []).find((c) => String(c.name || '').trim().toLowerCase() === clientName.toLowerCase()) || (found || [])[0];
    if (exact?.id) {
      clientId = exact.id;
    } else {
      const created = await create_client(db, userId, { name: clientName });
      if (created?.ok) {
        createdClient = true;
        clientId = created.id || null;
      }
    }
  }
  const title = clientName || a.title;
  const description = a.service || a.description || '';
  const row = {
    user_id: userId,
    title,
    date: a.date,
    time: a.time,
    time_end: a.timeEnd || addHour(a.time),
    amount: a.amount,
    tipo: 'pessoal',
    type: 'meeting',
    status: 'pendente',
    pre_order_items: [],
    description,
  };
  if (clientId) row.client_id = clientId;
  let { error } = await db.from('agenda_events').insert(row);
  if (error && /pre_order_items|time_end|column/i.test(String(error.message || ''))) {
    const retry = { ...row };
    delete retry.pre_order_items;
    if (/time_end/i.test(String(error.message || ''))) delete retry.time_end;
    ({ error } = await db.from('agenda_events').insert(retry));
  }
  if (error) {
    const r = await insertRow(db, 'agenda_events', {
      user_id: userId,
      title,
      date: a.date,
      time: a.time,
      type: 'meeting',
      status: 'pendente',
      description,
      ...(clientId ? { client_id: clientId } : {}),
    });
    if (!r.ok) {
      const r2 = await insertRow(db, 'agenda_events', { user_id: userId, title, date: a.dateIso || a.date, time: a.time });
      if (!r2.ok) return { ok: false, error: writeFailMessage(r2.error || error.message) };
      return { ok: true, ...a, title, createdClient, clientName, id: r2.data?.id || null };
    }
    return { ok: true, ...a, title, createdClient, clientName, id: r.data?.id || null };
  }
  return { ok: true, ...a, title, createdClient, clientName };
}

async function create_product(db, userId, args) {
  const a = sanitizeCreateArgs('create_product', args);
  if (!a) return { ok: false, error: 'Informe o nome do produto.' };
  const { error } = await db.from('products').insert({
    user_id: userId,
    name: a.name,
    price: a.price || 0,
    cost_price: 0,
    discount: 0,
    unit: 'un',
  });
  if (error) return { ok: false, error: 'Não consegui cadastrar o produto.' };
  return { ok: true, name: a.name, priceFmt: brl(a.price) };
}

async function create_service(db, userId, args) {
  const a = sanitizeCreateArgs('create_service', args);
  if (!a) return { ok: false, error: 'Informe o nome do serviço.' };
  const { error } = await db.from('services').insert({
    user_id: userId,
    name: a.name,
    price: a.price || 0,
    discount: 0,
  });
  if (error) return { ok: false, error: 'Não consegui cadastrar o serviço.' };
  return { ok: true, name: a.name, priceFmt: brl(a.price) };
}

const READ_TOOLS = {
  get_financial_summary,
  get_income,
  get_expenses,
  get_sales,
  get_sales_by_month,
  get_clients,
  get_client_details,
  get_appointments,
  get_products,
  get_services,
  get_cash_flow,
  get_idle_clients,
  get_receivables,
  get_payables,
};

const WRITE_TOOLS = {
  create_expense,
  create_income,
  create_client,
  create_appointment,
  create_product,
  create_service,
};

async function runTool(name, db, userId, args) {
  const fn = READ_TOOLS[name] || WRITE_TOOLS[name];
  if (!fn) return { error: 'Ferramenta indisponível.' };
  const clean = { ...(args && typeof args === 'object' ? args : {}) };
  delete clean.user_id;
  delete clean.userId;
  delete clean.id;
  return fn(db, userId, clean);
}

module.exports = {
  brl,
  money,
  fmtEvent,
  runTool,
  sanitizeCreateArgs,
  READ_TOOLS,
  WRITE_TOOLS,
};
