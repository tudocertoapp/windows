export const DOCK_POSES = ['feliz'];

export const DOCK_TONES = [
  { id: 'neutra', label: 'Neutra' },
  { id: 'formal', label: 'Formal' },
  { id: 'giria', label: 'Gírias' },
  { id: 'palavrao', label: 'Gírias e palavrão' },
];

export function tonePrompt(tone) {
  if (tone === 'formal') {
    return 'Linguagem formal, clara e educada. Não use gírias nem palavrão. Trate pelo nome quando souber.';
  }
  if (tone === 'giria') {
    return 'Fale como amigo brasileiro: e aí, bora, fechou, suave, mano. Sem palavrão pesado. Sempre prestativo.';
  }
  if (tone === 'palavrao') {
    return 'Fale solto, com gíria e palavrão leve só de ênfase (porra, merda, caralho). Nunca ofenda o usuário. Continue útil e simpático.';
  }
  return 'Fale natural, simpático e direto, em português do Brasil. Sem palavrão.';
}

function pick(list, seed) {
  if (!list?.length) return null;
  return list[Math.abs(Number(seed) || 0) % list.length];
}

function daySeed() {
  const d = new Date();
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}

export function financeMood(transactions) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let income = 0;
  let expense = 0;
  (transactions || []).forEach((tx) => {
    const raw = tx?.date || tx?.created_at;
    const dt = raw ? new Date(raw) : null;
    if (!dt || Number.isNaN(dt.getTime()) || dt.getFullYear() !== y || dt.getMonth() !== m) return;
    const amt = Math.abs(Number(tx.amount) || 0);
    const type = String(tx.type || '');
    if (type === 'income' || type === 'receita') income += amt;
    else if (type === 'expense' || type === 'despesa') expense += amt;
  });
  const saldo = income - expense;
  const hour = now.getHours();
  if (saldo < 0) return { id: 'vermelho', expression: 'pensativo', income, expense, saldo };
  if (expense > 0 && expense >= income * 0.8) return { id: 'saidas', expression: 'surpreso', income, expense, saldo };
  if (hour >= 21 || hour < 6) return { id: 'noite', expression: 'tranquilo', income, expense, saldo };
  if (hour < 12) return { id: 'manha', expression: 'animado', income, expense, saldo };
  return { id: 'ok', expression: 'feliz', income, expense, saldo };
}

function linesFor(moodId, tone, name) {
  const n = name ? ` ${name}` : '';
  const who = name || 'você';
  if (moodId === 'vermelho') {
    if (tone === 'formal') {
      return [
        { expression: 'pensativo', text: `${who}, o mês está negativo. Vamos revisar as saídas?`, cta: { label: 'Revisar', action: 'despesa' } },
        { expression: 'surpreso', text: 'O saldo ficou no vermelho. Posso abrir o lançamento agora.', cta: { label: 'Abrir', action: 'despesa' } },
      ];
    }
    if (tone === 'palavrao') {
      return [
        { expression: 'pensativo', text: `Eita${n}, o mês tá no vermelho. Bora segurar essas saídas?`, cta: { label: 'Bora!', action: 'despesa' } },
        { expression: 'surpreso', text: `Porra${n}, saiu mais do que entrou. Bora organizar isso?`, cta: { label: 'Bora!', action: 'dinheiro' } },
      ];
    }
    return [
      { expression: 'pensativo', text: `Ei${n}, o mês tá no vermelho. Bora olhar as saídas?`, cta: { label: 'Bora!', action: 'despesa' } },
      { expression: 'surpreso', text: `Saídas altas demais. Vamos colocar isso no eixo?`, cta: { label: 'Vamos', action: 'dinheiro' } },
    ];
  }
  if (moodId === 'saidas') {
    return tone === 'formal'
      ? [{ expression: 'surpreso', text: `${who}, as saídas estão elevadas. Vamos conferir?`, cta: { label: 'Conferir', action: 'despesa' } }]
      : [{ expression: 'surpreso', text: `Ei${n}, saídas subindo. Bora dar uma olhada?`, cta: { label: 'Bora!', action: 'despesa' } }];
  }
  const organize = [
    { expression: 'ola', text: tone === 'formal' ? `${who}, vamos começar a organizar o dia?` : `E aí${n}, bora começar a organizar?`, cta: { label: tone === 'formal' ? 'Vamos' : 'Bora!', action: 'dock' } },
    { expression: 'ideia', text: tone === 'formal' ? 'Podemos agendar um cliente agora.' : `E aí${n}, bora agendar um cliente?`, cta: { label: tone === 'formal' ? 'Agendar' : 'Bora!', action: 'agenda' } },
    { expression: 'ola', text: tone === 'formal' ? 'Vamos cadastrar um cliente?' : `Bora cadastrar um cliente${n}?`, cta: { label: tone === 'formal' ? 'Cadastrar' : 'Bora!', action: 'cliente' } },
    { expression: 'dinheiro', text: tone === 'formal' ? 'Quando quiser, registramos uma receita.' : `Fechou${n}? Bora lançar uma entrada.`, cta: { label: tone === 'formal' ? 'Lançar' : 'Bora!', action: 'receita' } },
    { expression: 'feliz', text: tone === 'formal' ? 'Vamos deixar a agenda em ordem.' : `Vamos começar a organizar a agenda?`, cta: { label: tone === 'formal' ? 'Abrir' : 'Bora!', action: 'agenda' } },
    { expression: 'espera', text: tone === 'formal' ? 'Estou por aqui se quiser revisar os números.' : `Tô aqui${n}. Bora olhar os números?`, cta: { label: tone === 'formal' ? 'Abrir' : 'Bora!', action: 'dinheiro' } },
  ];
  if (moodId === 'noite') {
    return [
      { expression: 'tranquilo', text: tone === 'formal' ? 'Boa noite. Encerramos o dia com as contas em ordem?' : `Boa noite${n}. Fecha o dia comigo?`, cta: { label: tone === 'formal' ? 'Revisar' : 'Bora!', action: 'dinheiro' } },
      ...organize,
    ];
  }
  if (moodId === 'manha') {
    return [
      { expression: 'ola', text: tone === 'formal' ? 'Bom dia. Vamos começar a organizar?' : `Bom dia${n}! Bora começar a organizar?`, cta: { label: tone === 'formal' ? 'Vamos' : 'Bora!', action: 'dock' } },
      ...organize,
    ];
  }
  return organize;
}

export function headerCue({ transactions, tone = 'neutra', name = '', seed }) {
  const mood = financeMood(transactions);
  const list = linesFor(mood.id, tone, String(name || '').trim().split(/\s+/)[0]);
  const cue = pick(list, seed ?? daySeed()) || list[0];
  return { ...cue, mood: mood.id, expression: cue.expression || mood.expression };
}

export function introByTone(tone, name) {
  const n = String(name || '').trim();
  if (tone === 'formal') {
    return n
      ? `Olá, ${n}. Eu sou o Dock, seu assessor no Tudo Certo. Como posso ajudar hoje?`
      : 'Olá. Eu sou o Dock, assessor do Tudo Certo. Como prefere que eu o(a) chame?';
  }
  if (tone === 'giria') {
    return n
      ? `E aí, ${n}! Sou o Dock. Manda aí: número, agenda, cadastro...`
      : 'E aí! Sou o Dock, teu parceiro no Tudo Certo. Como eu te chamo?';
  }
  if (tone === 'palavrao') {
    return n
      ? `E aí, ${n}! Dock na área. Manda o que precisa que eu resolvo.`
      : 'E aí! Sou o Dock. Como eu te chamo, cara?';
  }
  return n
    ? `Olá, ${n}! Meu nome é Dock. O que posso te ajudar hoje?`
    : 'Olá! Meu nome é Dock. Sou seu assessor no Tudo Certo: olho seus números, abro telas e só mudo algo se você confirmar. Como você quer que eu te chame?';
}
