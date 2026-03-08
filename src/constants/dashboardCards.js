/** Cards reutilizáveis para o Dashboard - podem vir de outras telas (Agenda, Dinheiro, Gráficos). */
export const AVAILABLE_CARD_TYPES = [
  { id: 'proximos', label: 'Próximas tarefas', icon: 'checkmark-done-outline', screen: 'Início' },
  { id: 'agendamentos', label: 'Próximos eventos', icon: 'calendar-outline', screen: 'Início' },
  { id: 'carousel', label: 'Carrossel', icon: 'images-outline', screen: 'Início' },
  { id: 'quote', label: 'Frase do dia', icon: 'chatbubble-outline', screen: 'Início' },
  { id: 'meusgastos', label: 'Meus gastos', icon: 'chatbubbles-outline', screen: 'Início' },
  { id: 'balance', label: 'Saldo disponível', icon: 'wallet-outline', screen: 'Início, Dinheiro' },
  { id: 'contas', label: 'Faturas', icon: 'document-text-outline', screen: 'Início, Dinheiro' },
  { id: 'gastos', label: 'Gastos por categoria', icon: 'pie-chart-outline', screen: 'Início, Dinheiro' },
  { id: 'transacoes', label: 'Últimas transações', icon: 'swap-horizontal-outline', screen: 'Início, Dinheiro' },
  { id: 'graficos', label: 'Resumo do mês', icon: 'stats-chart-outline', screen: 'Dinheiro' },
  { id: 'anotacoes', label: 'Minhas anotações', icon: 'document-text-outline', screen: 'Início' },
  { id: 'listacompras', label: 'Lista de compras', icon: 'cart-outline', screen: 'Início' },
];

export const DEFAULT_SECTIONS = ['proximos', 'agendamentos', 'carousel', 'quote', 'meusgastos', 'anotacoes', 'listacompras', 'balance', 'contas', 'gastos', 'transacoes'];

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
