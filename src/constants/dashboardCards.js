/** Cor do ícone (e dos botões + e tela cheia) por card - cores distintas entre si */
export const CARD_ICON_COLORS = {
  proximos: '#10b981',       // esmeralda
  agendamentos: '#0ea5e9',   // azul céu
  meusgastos: '#7c3aed',     // violeta
  aniversariantes: '#ec4899', // rosa
  anotacoes: '#eab308',      // âmbar
  listacompras: '#f97316',   // laranja
  quote: '#06b6d4',          // ciano
  contas: '#dc2626',         // vermelho
  balance: '#059669',        // verde escuro
  bancos: '#4f46e5',         // índigo
  gastos: '#a855f7',         // roxo
  transacoes: '#0d9488',     // teal
  graficos: '#f59e0b',       // dourado
};

/** Cards reutilizáveis para o Dashboard - podem vir de outras telas (Agenda, Dinheiro, Gráficos). */
export const AVAILABLE_CARD_TYPES = [
  { id: 'proximos', label: 'Próximas tarefas', icon: 'checkmark-done-outline', screen: 'Início' },
  { id: 'agendamentos', label: 'Próximos eventos', icon: 'calendar-outline', screen: 'Início' },
  { id: 'carousel', label: 'Carrossel', icon: 'images-outline', screen: 'Início' },
  { id: 'quote', label: 'Frase do dia', icon: 'chatbubble-outline', screen: 'Início' },
  { id: 'meusgastos', label: 'Meus gastos', icon: 'chatbubbles-outline', screen: 'Início' },
  { id: 'balance', label: 'Saldo disponível', icon: 'wallet-outline', screen: 'Dinheiro' },
  { id: 'contas', label: 'Minhas Faturas', icon: 'document-text-outline', screen: 'Início, Dinheiro' },
  { id: 'gastos', label: 'Gastos por categoria', icon: 'pie-chart-outline', screen: 'Dinheiro' },
  { id: 'transacoes', label: 'Últimas transações', icon: 'swap-horizontal-outline', screen: 'Dinheiro' },
  { id: 'graficos', label: 'Resumo do mês', icon: 'stats-chart-outline', screen: 'Dinheiro' },
  { id: 'anotacoes', label: 'Minhas anotações', icon: 'document-text-outline', screen: 'Início' },
  { id: 'listacompras', label: 'Lista de compras', icon: 'cart-outline', screen: 'Início' },
  { id: 'aniversariantes', label: 'Aniversariantes da semana', icon: 'gift-outline', screen: 'Início' },
];

/** Cards padrão do Início (saldo e gastos ficam só na página Dinheiro) */
export const DEFAULT_SECTIONS = ['proximos', 'agendamentos', 'carousel', 'quote', 'meusgastos', 'aniversariantes', 'anotacoes', 'listacompras', 'contas'];

/** Cards padrão para web – altere aqui para layout diferente da web sem afetar o mobile */
export const DEFAULT_SECTIONS_WEB = DEFAULT_SECTIONS;

/** Cards da página Dinheiro que podem ser adicionados ao Início via Organize (transações só na Dinheiro) */
export const DINHEIRO_ADDABLE_CARDS = [];

/** IDs permitidos no Início (inclui addáveis do Dinheiro para usuários que os adicionaram) */
export const ALL_INICIO_IDS = [...new Set([...DEFAULT_SECTIONS, ...DINHEIRO_ADDABLE_CARDS])];

/** Cards da página Dinheiro - ordem editável */
export const DINHEIRO_CARD_TYPES = [
  { id: 'balance', label: 'Saldo disponível', icon: 'wallet-outline', screen: 'Dinheiro' },
  { id: 'contas', label: 'Minhas Faturas', icon: 'document-text-outline', screen: 'Dinheiro' },
  { id: 'bancos', label: 'Bancos e cartões', icon: 'card-outline', screen: 'Dinheiro' },
  { id: 'gastos', label: 'Gastos por categoria', icon: 'pie-chart-outline', screen: 'Dinheiro' },
  { id: 'transacoes', label: 'Últimas transações', icon: 'swap-horizontal-outline', screen: 'Dinheiro' },
  { id: 'graficos', label: 'Resumo do mês', icon: 'stats-chart-outline', screen: 'Dinheiro' },
];

export const DEFAULT_DINHEIRO_SECTIONS = ['balance', 'contas', 'bancos', 'gastos', 'transacoes', 'graficos'];

/** Cards padrão Dinheiro para web – altere aqui para layout diferente sem afetar o mobile */
export const DEFAULT_DINHEIRO_SECTIONS_WEB = DEFAULT_DINHEIRO_SECTIONS;
