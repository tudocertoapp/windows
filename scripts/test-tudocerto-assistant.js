const { answerNative } = require('../api/_lib/ai/native');
const { scoreIntent } = require('../api/_lib/ai/intent');

function fakeDb(tables) {
  return {
    from(table) {
      const all = tables[table] || [];
      const run = (opts) => {
        let data = all.slice();
        if (opts.gte && opts.dateCol) data = data.filter((r) => String(r[opts.dateCol] || '') >= opts.gte);
        if (opts.lte && opts.dateCol) data = data.filter((r) => String(r[opts.dateCol] || '') <= opts.lte);
        return { data, error: null };
      };
      const state = { gte: null, lte: null, dateCol: null };
      const chain = {
        eq() { return chain; },
        gte(col, val) { state.dateCol = col; state.gte = val; return chain; },
        lte(col, val) { state.dateCol = col; state.lte = val; return chain; },
        order() { return chain; },
        limit() { return Promise.resolve(run(state)); },
        then(resolve) { return Promise.resolve(run(state)).then(resolve); },
      };
      return {
        select() { return chain; },
        insert() { return Promise.resolve({ error: null }); },
      };
    },
  };
}

const db = fakeDb({
  transactions: [
    { type: 'income', amount: 12450, description: 'vendas', category: 'vendas', date: '2026-10-01' },
    { type: 'expense', amount: 7320, description: 'mercado', category: 'mercado', date: '2026-10-01' },
  ],
  empresa_vendas: [{ produto: 'bolo', quantidade: 8, valor_total: 12450, data: '2026-10-01', cliente_nome: 'Ana' }],
  empresa_fluxo: [],
  clients: [{ id: '1', name: 'Ana', tipo: 'empresa', nivel: 'orcamento' }],
  agenda_events: [{ title: 'Cliente Ana', date: '2026-10-03', time: '14:00', amount: 0, status: '', tipo: 'pessoal' }],
  products: [],
  a_receber: [],
  boletos: [],
  empresa_atendimentos: [],
});

function assert(cond, msg) {
  if (!cond) {
    console.error('FALHOU:', msg);
    process.exit(1);
  }
}

async function main() {
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const fin = await answerNative({ db, userId: 'u1', firstName: 'Ana', message: 'Como estão minhas finanças?', history: [] });
  assert(fin.intent === 'financial_summary', `intent ${fin.intent}`);
  assert(digits(fin.message).includes('12450'), `entradas ${fin.message}`);
  assert(digits(fin.message).includes('7320'), `despesas ${fin.message}`);
  assert(Array.isArray(fin.cards) && fin.cards.some((c) => c.title === 'Saldo'), 'card saldo');
  assert(!/llama|groq|gemini|chatgpt/i.test(fin.message), 'sem nome de modelo');

  const hi = await answerNative({ db, userId: 'u1', firstName: 'Ana', message: 'oi', history: [] });
  assert(hi.intent === 'greeting', `greeting ${hi.intent}`);
  assert(/Ana/.test(hi.message), 'usa o nome');

  const sales = await answerNative({ db, userId: 'u1', firstName: 'Ana', message: 'o que mais vende?', history: [] });
  assert(sales.intent === 'sales', `sales ${sales.intent}`);
  assert(/bolo/i.test(sales.message), sales.message);

  const unk = await answerNative({ db, userId: 'u1', firstName: 'Ana', message: 'qual a capital da frança?', history: [] });
  assert(unk.intent === 'unknown', `unknown ${unk.intent}`);
  assert(!/paris/i.test(unk.message), 'não inventa');

  assert(scoreIntent('gastei muito esse mes').intent === 'expenses', 'expenses intent');
  console.log('OK: assistente nativo com dados reais, sem Llama.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
