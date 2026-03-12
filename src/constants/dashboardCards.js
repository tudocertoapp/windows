/** Cards reutilizáveis para o Dashboard - podem vir de outras telas (Agenda, Dinheiro, Gráficos). */
export const AVAILABLE_CARD_TYPES = [
  { id: 'proximos', label: 'Próximas tarefas', icon: 'checkmark-done-outline', screen: 'Início' },
  { id: 'agendamentos', label: 'Próximos eventos', icon: 'calendar-outline', screen: 'Início' },
  { id: 'carousel', label: 'Carrossel', icon: 'images-outline', screen: 'Início' },
  { id: 'quote', label: 'Frase do dia', icon: 'chatbubble-outline', screen: 'Início' },
  { id: 'meusgastos', label: 'Meus gastos', icon: 'chatbubbles-outline', screen: 'Início' },
  { id: 'balance', label: 'Saldo disponível', icon: 'wallet-outline', screen: 'Início, Dinheiro' },
  { id: 'contas', label: 'Faturas', icon: 'document-text-outline', screen: 'Início, Dinheiro' },
  { id: 'gastos', label: 'Gastos por categoria', icon: 'pie-chart-outline', screen: 'Dinheiro' },
  { id: 'transacoes', label: 'Últimas transações', icon: 'swap-horizontal-outline', screen: 'Dinheiro' },
  { id: 'graficos', label: 'Resumo do mês', icon: 'stats-chart-outline', screen: 'Dinheiro' },
  { id: 'anotacoes', label: 'Minhas anotações', icon: 'document-text-outline', screen: 'Início' },
  { id: 'listacompras', label: 'Lista de compras', icon: 'cart-outline', screen: 'Início' },
  { id: 'aniversariantes', label: 'Aniversariantes da semana', icon: 'gift-outline', screen: 'Início' },
];

/** Cards padrão do Início (gastos e transacoes ficam só na página Dinheiro) */
export const DEFAULT_SECTIONS = ['proximos', 'agendamentos', 'carousel', 'quote', 'meusgastos', 'aniversariantes', 'anotacoes', 'listacompras', 'balance', 'contas'];

/** Cards da página Dinheiro que podem ser adicionados ao Início via Organize */
export const DINHEIRO_ADDABLE_CARDS = ['gastos', 'transacoes'];

/** IDs permitidos no Início (inclui addáveis do Dinheiro para usuários que os adicionaram) */
export const ALL_INICIO_IDS = [...new Set([...DEFAULT_SECTIONS, ...DINHEIRO_ADDABLE_CARDS])];

/** Cards da página Dinheiro - ordem editável */
export const DINHEIRO_CARD_TYPES = [
  { id: 'balance', label: 'Saldo disponível', icon: 'wallet-outline', screen: 'Dinheiro' },
  { id: 'contas', label: 'Faturas', icon: 'document-text-outline', screen: 'Dinheiro' },
  { id: 'bancos', label: 'Bancos e cartões', icon: 'card-outline', screen: 'Dinheiro' },
  { id: 'gastos', label: 'Gastos por categoria', icon: 'pie-chart-outline', screen: 'Dinheiro' },
  { id: 'transacoes', label: 'Últimas transações', icon: 'swap-horizontal-outline', screen: 'Dinheiro' },
  { id: 'graficos', label: 'Resumo do mês', icon: 'stats-chart-outline', screen: 'Dinheiro' },
];

export const DEFAULT_DINHEIRO_SECTIONS = ['balance', 'contas', 'bancos', 'gastos', 'transacoes', 'graficos'];
