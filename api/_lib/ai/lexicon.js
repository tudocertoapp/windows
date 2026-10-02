/**
 * Vocabulário do domínio + espaço combinatório de situações
 * (verbos × temas × tempos × prefixos ≈ dezenas de milhares de frases,
 * sem gravar 15 mil linhas).
 */

const VERBOS = [
  'vender', 'vendi', 'vendeu', 'vendemos', 'vende', 'faturar', 'faturei', 'faturou', 'entrar', 'entrou', 'entrar',
  'gastar', 'gastei', 'gastou', 'pagar', 'paguei', 'pagou', 'receber', 'recebi', 'recebeu',
  'agendar', 'agendei', 'agendou', 'marcar', 'marquei', 'consultar', 'organizar', 'controlar',
  'lancar', 'lancei', 'cadastrar', 'cadastrei', 'comparar', 'comparou', 'lucrar', 'lucrei',
  'abrir', 'abre', 'mostra',
];

const TEMAS = [
  'venda', 'vendas', 'faturamento', 'receita', 'entrada', 'entradas', 'despesa', 'despesas', 'gasto', 'gastos',
  'saldo', 'caixa', 'fluxo', 'lucro', 'prejuizo', 'boleto', 'fatura', 'faturas', 'receber',
  'agenda', 'agendamento', 'compromisso', 'atendimento', 'cliente', 'clientes', 'produto', 'produtos',
  'estoque', 'empresa', 'pessoal', 'orcamento', 'proposta', 'servico', 'horario', 'consulta',
  'calculadora', 'dock',
];

const TEMPOS = [
  'hoje', 'ontem', 'amanha', 'semana', 'mes', 'ano', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro', 'passado', 'atual', 'proximo',
];

const PREFIXOS = ['quanto', 'qual', 'quais', 'quando', 'quem', 'como', 'onde', 'em', 'no', 'na', 'do', 'da'];

function situationSpaceSize() {
  return VERBOS.length * TEMAS.length * TEMPOS.length * PREFIXOS.length;
}

const CANON = [
  'oi', 'ola', 'obrigado', 'ajuda',
  'venda', 'vendas', 'vendeu', 'vendi', 'vender', 'vende', 'faturamento', 'faturei', 'faturou',
  'entrada', 'entradas', 'entrou', 'receita', 'receitas',
  'despesa', 'despesas', 'gasto', 'gastos', 'gastei', 'paguei', 'saida', 'saidas',
  'saldo', 'caixa', 'fluxo', 'lucro', 'prejuizo', 'financeiro', 'financas', 'organizacao', 'controle',
  'mes', 'meses', 'hoje', 'ontem', 'amanha', 'semana', 'ano',
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'passado', 'passada', 'atual', 'proximo', 'proxima', 'ultimo', 'ultima',
  'agenda', 'agendamento', 'compromisso', 'atendimento', 'horario', 'consulta', 'marcar', 'agendar',
  'cliente', 'clientes', 'produto', 'produtos', 'estoque', 'acabando',
  'boleto', 'fatura', 'faturas', 'receber', 'pagar', 'vencimento',
  'empresa', 'pessoal', 'orcamento', 'proposta', 'servico',
  'comparar', 'resumo', 'situacao', 'quanto', 'quantos', 'qual', 'quais', 'quando', 'quem', 'como',
  'tenho', 'tem', 'cadastrado', 'cadastrados', 'cadastro', 'cadastrar',
  'voce', 'tambem', 'porque', 'beleza', 'calculadora', 'dock', 'abrir', 'abre',
];

/** Erros comuns de digitação → forma canônica (já sem acento). */
const ALIASES = {
  vendel: 'vendeu',
  vendeo: 'vendeu',
  vendeu: 'vendeu',
  vendi: 'vendi',
  vendido: 'venda',
  vendas: 'vendas',
  venda: 'venda',
  fatument: 'faturamento',
  faturameto: 'faturamento',
  faturei: 'faturei',
  mez: 'mes',
  meis: 'mes',
  mess: 'mes',
  mès: 'mes',
  gastey: 'gastei',
  gaste: 'gastei',
  gastu: 'gasto',
  dispesa: 'despesa',
  despezas: 'despesas',
  despeza: 'despesa',
  agena: 'agenda',
  agendo: 'agenda',
  agend: 'agenda',
  compromisso: 'compromisso',
  conpromisso: 'compromisso',
  cliente: 'cliente',
  clente: 'cliente',
  clintes: 'clientes',
  produt: 'produto',
  estoqe: 'estoque',
  estoq: 'estoque',
  boletu: 'boleto',
  fatra: 'fatura',
  orcament: 'orcamento',
  orçamento: 'orcamento',
  organizacao: 'organizacao',
  organzaçao: 'organizacao',
  organicao: 'organizacao',
  controle: 'controle',
  controlee: 'controle',
  qunto: 'quanto',
  qanto: 'quanto',
  qal: 'qual',
  qaul: 'qual',
  kual: 'qual',
  knato: 'quanto',
  qndo: 'quando',
  qando: 'quando',
  onte: 'ontem',
  oje: 'hoje',
  hj: 'hoje',
  amnha: 'amanha',
  amanha: 'amanha',
  outubru: 'outubro',
  setenbro: 'setembro',
  setembr: 'setembro',
  fevreiro: 'fevereiro',
  fevereio: 'fevereiro',
  recita: 'receita',
  receta: 'receita',
  saldoo: 'saldo',
  caixa: 'caixa',
  fluco: 'fluxo',
  flujo: 'fluxo',
  vc: 'voce',
  voce: 'voce',
  pq: 'porque',
  tb: 'tambem',
  tbm: 'tambem',
  td: 'tudo',
  blz: 'beleza',
  vlw: 'valeu',
  tdbem: 'tudo bem',
  qnts: 'quantos',
  qtd: 'quantidade',
  calc: 'calculadora',
  calcu: 'calculadora',
  prod: 'produto',
  prods: 'produtos',
  msgs: 'mensagens',
  msg: 'mensagem',
  hj: 'hoje',
  obg: 'obrigado',
  flw: 'valeu',
  kd: 'cade',
  n: 'nao',
  ta: 'esta',
  to: 'estou',
  eh: 'e',
};

function dictSet() {
  const s = new Set(CANON);
  VERBOS.forEach((w) => s.add(w));
  TEMAS.forEach((w) => s.add(w));
  TEMPOS.forEach((w) => s.add(w));
  PREFIXOS.forEach((w) => s.add(w));
  Object.values(ALIASES).forEach((w) => s.add(w));
  Object.keys(ALIASES).forEach((w) => s.add(w));
  return s;
}

module.exports = {
  VERBOS,
  TEMAS,
  TEMPOS,
  PREFIXOS,
  CANON,
  ALIASES,
  situationSpaceSize,
  dictSet,
};
