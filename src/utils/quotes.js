export const QUOTES_MOTIVACIONAIS = [
  'O sucesso é a soma de pequenos esforços repetidos dia após dia.',
  'Acredite que você pode, assim você já está no meio do caminho.',
  'Não é o mais forte que sobrevive, nem o mais inteligente. Quem sobrevive é o mais disposto à mudança.',
  'O único lugar onde o sucesso vem antes do trabalho é no dicionário.',
  'O futuro pertence àqueles que acreditam na beleza de seus sonhos.',
  'Não espere por oportunidades extraordinárias. Aproveite as ocasiões comuns e as torne grandes.',
  'A persistência é o caminho do êxito.',
  'Você não precisa ser grande para começar, mas precisa começar para ser grande.',
  'O segredo de progredir é começar.',
  'Grandes mentes discutem ideias; mentes medianas discutem eventos; mentes pequenas discutem pessoas.',
];

export const VERSICULOS = [
  'Filipenses 4:13 - Tudo posso naquele que me fortalece.',
  'Josué 1:9 - Sê forte e corajoso. Não temas, porque o Senhor teu Deus é contigo.',
  'Isaías 41:10 - Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus.',
  'Romanos 8:31 - Se Deus é por nós, quem será contra nós?',
  'Salmo 23:1 - O Senhor é o meu pastor; nada me faltará.',
  'Salmo 46:1 - Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
  'Provérbios 3:5-6 - Confia no Senhor de todo o teu coração e Ele endireitará as tuas veredas.',
  'Isaías 40:31 - Os que esperam no Senhor renovarão as suas forças.',
  'Jeremias 29:11 - Eu é que sei os planos que tenho para vocês: planos de paz e não de mal.',
  'João 16:33 - No mundo tereis aflições, mas tende bom ânimo; eu venci o mundo.',
  '2 Timóteo 1:7 - Deus não nos deu espírito de medo, mas de poder, amor e equilíbrio.',
  'Salmo 121:1-2 - Elevo os meus olhos para os montes: de onde me virá o socorro? O meu socorro vem do Senhor.',
  'Mateus 11:28 - Vinde a mim todos os que estais cansados e sobrecarregados, e eu vos aliviarei.',
  'Hebreus 13:8 - Jesus Cristo é o mesmo ontem, hoje e eternamente.',
  'Lamentações 3:22-23 - As misericórdias do Senhor se renovam a cada manhã.',
  'Romanos 12:12 - Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.',
  'Salmo 37:5 - Entrega o teu caminho ao Senhor, confia nele, e o mais Ele fará.',
  'Deuteronômio 31:6 - Sede fortes e corajosos; o Senhor vai adiante de vocês.',
  'Isaías 26:3 - Tu conservarás em paz aquele cuja mente está firme em ti.',
  'João 14:27 - Deixo-vos a paz, a minha paz vos dou.',
];

export function getQuoteOfDay(tipo = 'motivacional') {
  const hoje = new Date();
  const dia = hoje.getDate() + hoje.getMonth() * 31 + hoje.getFullYear() * 365;
  if (tipo === 'verso') {
    return VERSICULOS[dia % VERSICULOS.length];
  }
  return QUOTES_MOTIVACIONAIS[dia % QUOTES_MOTIVACIONAIS.length];
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const FINANCE_PROMPTS = {
  madrugada: [
    'Madrugada produtiva? Vamos organizar suas finanças rapidinho.',
    'Que tal adiantar e deixar as contas em dia agora?',
    'Bora registrar o que entrou e saiu hoje?',
    'Vamos fechar os gastos da noite com clareza.',
    'Se quiser, comecamos por uma despesa ou receita.',
  ],
  manha: [
    'Bom ritmo de manha. Bora organizar suas financas?',
    'Vamos comecar o dia registrando receitas e despesas?',
    'Que tal planejar os gastos de hoje em poucos toques?',
    'Bora deixar suas contas organizadas logo cedo?',
    'Comece leve: registre uma movimentacao agora.',
  ],
  tarde: [
    'Boa tarde! Bora atualizar suas financas?',
    'Quer revisar os gastos da manha e seguir tranquilo?',
    'Vamos cadastrar uma despesa rapidinho?',
    'Bora conferir o saldo e manter tudo no controle?',
    'Que tal registrar as movimentacoes da tarde?',
  ],
  noite: [
    'Boa noite! Vamos fechar o dia com as contas em ordem?',
    'Bora registrar o que rolou hoje nas financas?',
    'Quer atualizar os gastos antes de encerrar o dia?',
    'Vamos deixar tudo organizado para amanha?',
    'Hora de revisar receitas e despesas com calma.',
  ],
};

export function getFinancePromptByTime() {
  const h = new Date().getHours();
  const period = h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
  const list = FINANCE_PROMPTS[period] || FINANCE_PROMPTS.manha;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
