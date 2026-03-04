export const CATEGORY_COLORS = {
  'Alimentação': '#f59e0b',
  'Aluguel': '#3b82f6',
  'Transporte': '#8b5cf6',
  'Lazer': '#ec4899',
  'Assinaturas': '#06b6d4',
  'Saúde': '#10b981',
  'Educação': '#f97316',
  'Salário': '#10b981',
  'Freelance': '#3b82f6',
  'Outros': '#6b7280',
  // Moradia
  'Condomínio': '#0ea5e9',
  'IPTU': '#6366f1',
  'Energia': '#fbbf24',
  'Água': '#38bdf8',
  'Gás': '#fb923c',
  'Internet': '#a78bfa',
  'Manutenção': '#94a3b8',
  // Alimentação
  'Supermercado': '#f59e0b',
  'Restaurante': '#f97316',
  'Delivery': '#fb923c',
  'Padaria': '#eab308',
  'Café': '#a16207',
  // Transporte
  'Combustível': '#8b5cf6',
  'Uber/99': '#a78bfa',
  'Ônibus/Metrô': '#c084fc',
  'Estacionamento': '#7c3aed',
  'Manutenção veículo': '#6d28d9',
  'IPVA': '#5b21b6',
  // Saúde
  'Plano de saúde': '#10b981',
  'Farmácia': '#34d399',
  'Médico': '#059669',
  'Dentista': '#6ee7b7',
  'Academia': '#047857',
  // Educação
  'Cursos': '#f97316',
  'Livros': '#fb923c',
  'Material escolar': '#fdba74',
  'Faculdade': '#ea580c',
  // Lazer
  'Streaming': '#ec4899',
  'Cinema': '#f472b6',
  'Shows': '#db2777',
  'Viagem': '#e879f9',
  'Hobby': '#d946ef',
  'Esportes': '#c026d3',
  // Compras
  'Roupas': '#ec4899',
  'Eletrônicos': '#6366f1',
  'Móveis': '#818cf8',
  'Casa': '#4f46e5',
  // Financeiro
  'Empréstimo': '#ef4444',
  'Seguro': '#dc2626',
  'Taxas bancárias': '#b91c1c',
  'Impostos': '#991b1b',
  // Trabalho
  'Bônus': '#22c55e',
  'Hora extra': '#16a34a',
  'Comissão': '#15803d',
  'Vale alimentação': '#166534',
  // Vendas
  'Produtos': '#3b82f6',
  'Serviços': '#2563eb',
  'Revenda': '#1d4ed8',
  // Investimentos
  'Dividendos': '#10b981',
  'Juros': '#059669',
  'Rendimentos': '#047857',
  'Venda de ativos': '#065f46',
  // Outros
  'Reembolso': '#6b7280',
  'Presente': '#9ca3af',
  'Indenização': '#6b7280',
  'Doação': '#64748b',
};

const CATEGORY_PALETTE = [
  '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316',
  '#0ea5e9', '#6366f1', '#fbbf24', '#38bdf8', '#fb923c', '#a78bfa', '#94a3b8',
  '#a78bfa', '#c084fc', '#7c3aed', '#6d28d9', '#5b21b6', '#34d399', '#059669',
  '#6ee7b7', '#047857', '#fdba74', '#ea580c', '#f472b6', '#db2777', '#e879f9',
  '#d946ef', '#c026d3', '#818cf8', '#4f46e5', '#ef4444', '#dc2626', '#b91c1c',
  '#22c55e', '#16a34a', '#15803d', '#2563eb', '#1d4ed8', '#065f46', '#64748b',
];

/** Retorna cor única para cada categoria. Se não estiver em CATEGORY_COLORS, usa paleta por hash. */
export function getCategoryColor(cat) {
  if (!cat) return '#6b7280';
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  let hash = 0;
  const str = String(cat);
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  const idx = Math.abs(hash) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[idx];
}
