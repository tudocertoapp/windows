export function buildOverviewKpis({
  isEmpresaView,
  monthTx = [],
  income = 0,
  expense = 0,
  formatCurrency,
  clients = [],
  products = [],
  services = [],
  agendaEvents = [],
  checkListItems = [],
  inPeriod,
  novosClientes = 0,
  faturasPagas = 0,
}) {
  const incomeCount = monthTx.filter((t) => t.type === 'income').length;
  const expenseCount = monthTx.filter((t) => t.type === 'expense').length;
  const agendasPeriodo = (agendaEvents || []).filter((e) => (inPeriod ? inPeriod(e.date) : true)).length;
  const tarefasOk = (checkListItems || []).filter((t) => t.checked).length;

  const money = [
    { id: 'in', label: 'Entrando', value: income, display: formatCurrency(income), color: '#10b981' },
    { id: 'out', label: 'Saindo', value: expense, display: formatCurrency(expense), color: '#ef4444' },
  ];

  const counts = [
    { id: 'rec', label: 'Lançamentos de entrada', value: incomeCount, color: '#10b981' },
    { id: 'desp', label: 'Lançamentos de saída', value: expenseCount, color: '#ef4444' },
    { id: 'ag', label: isEmpresaView ? 'Atendimentos no período' : 'Eventos no período', value: agendasPeriodo, color: '#f59e0b' },
    { id: 'tar', label: 'Tarefas concluídas', value: tarefasOk, color: '#6366f1' },
  ];

  if (isEmpresaView) {
    counts.push(
      { id: 'cli', label: 'Clientes cadastrados', value: (clients || []).length, color: '#3b82f6' },
      { id: 'novos', label: 'Novos clientes no período', value: novosClientes, color: '#0ea5e9' },
      { id: 'prod', label: 'Produtos no catálogo', value: (products || []).length, color: '#8b5cf6' },
      { id: 'serv', label: 'Serviços no catálogo', value: (services || []).length, color: '#a855f7' },
      { id: 'fat', label: 'Faturas pagas no período', value: faturasPagas, color: '#ec4899' },
    );
  }

  return { money, counts };
}
