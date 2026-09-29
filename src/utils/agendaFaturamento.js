import { Alert, Platform } from 'react-native';
import { formatCurrency } from './format';

export function isEmpresaAgendaEvent(event, showEmpresaFeatures) {
  if (!showEmpresaFeatures || !event) return false;
  return event.tipo === 'empresa' || !!event.clientId || !!event.serviceId
    || (Array.isArray(event.preOrderItems) && event.preOrderItems.length > 0);
}

export function agendaEventAmount(event) {
  if (!event) return 0;
  const items = Array.isArray(event.preOrderItems) ? event.preOrderItems : [];
  if (items.length) {
    return items.reduce((s, i) => s + ((Number(i.price) || 0) - (Number(i.discount) || 0)) * (Number(i.qty) || 1), 0);
  }
  return Number(event.amount) || 0;
}

/**
 * Concluir na agenda: se for atendimento da empresa, pede confirmação de faturamento.
 * Faturar abre o lançamento de receita (empresa). Só concluir marca o evento.
 */
function escolherFaturamento(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(`${title}\n\n${message}\n\nOK para faturar agora.`)) return Promise.resolve('faturar');
    if (window.confirm('Concluir o atendimento sem lançar no faturamento da empresa?')) return Promise.resolve('concluir');
    return Promise.resolve('cancelar');
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve('cancelar') },
      { text: 'Só concluir', onPress: () => resolve('concluir') },
      { text: 'Faturar', onPress: () => resolve('faturar') },
    ]);
  });
}

export async function promptConcluirAgenda(event, {
  showEmpresaFeatures,
  isConcluido,
  openAddModal,
  updateAgendaEvent,
  onAfterAction,
}) {
  if (!event?.id) return;
  if (isConcluido || event.status === 'concluido') {
    updateAgendaEvent?.(event.id, { status: 'pendente' });
    return;
  }
  const empresa = isEmpresaAgendaEvent(event, showEmpresaFeatures);
  if (!empresa) {
    updateAgendaEvent?.(event.id, { status: 'concluido' });
    onAfterAction?.();
    return;
  }
  const amount = agendaEventAmount(event);
  const valorTxt = amount > 0 ? `\nValor: ${formatCurrency(amount)}` : '\nInforme o valor na tela de faturamento.';
  const choice = await escolherFaturamento(
    'Concluir atendimento',
    `Deseja faturar este atendimento e lançar no faturamento da empresa?${valorTxt}`,
  );
  if (choice === 'faturar') {
    openAddModal?.('receita', { fromAgendaEvent: event, tipoVenda: 'empresa' });
    onAfterAction?.();
    return;
  }
  if (choice === 'concluir') {
    updateAgendaEvent?.(event.id, { status: 'concluido' });
    onAfterAction?.();
  }
}
