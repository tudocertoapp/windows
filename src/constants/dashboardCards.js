/** Cards reutilizáveis para o Dashboard - podem vir de outras telas (Agenda, Dinheiro, Gráficos). */
export const AVAILABLE_CARD_TYPES = [
  { id: 'proximos', label: 'Tarefas e agendas', icon: 'alarm-outline', screen: 'Início' },
  { id: 'carousel', label: 'Carrossel', icon: 'images-outline', screen: 'Início' },
  { id: 'quote', label: 'Frase do dia', icon: 'chatbubble-outline', screen: 'Início' },
  { id: 'balance', label: 'Saldo disponível', icon: 'wallet-outline', screen: 'Dinheiro' },
  { id: 'gastos', label: 'Gastos por categoria', icon: 'pie-chart-outline', screen: 'Dinheiro' },
  { id: 'transacoes', label: 'Últimas transações', icon: 'swap-horizontal-outline', screen: 'Dinheiro' },
  { id: 'agenda', label: 'Próximos eventos', icon: 'calendar-outline', screen: 'Agenda' },
  { id: 'graficos', label: 'Resumo do mês', icon: 'stats-chart-outline', screen: 'Dinheiro' },
];

export const DEFAULT_SECTIONS = ['proximos', 'carousel', 'quote', 'balance', 'gastos', 'transacoes'];
