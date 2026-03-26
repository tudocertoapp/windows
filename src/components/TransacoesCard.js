import React from 'react';
import { CardHeader } from './CardHeader';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';
import { AppIcon } from './AppIcon';
import { ScrollableCardList } from './ScrollableCardList';

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txCat: { fontSize: 11, marginTop: 2 },
  txWhen: { fontSize: 10, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
});

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Data/hora do registro (createdAt) ou só a data da transação (campo date). */
export function formatTransactionDateTime(tx) {
  if (tx?.createdAt) {
    const d = new Date(tx.createdAt);
    if (!Number.isNaN(d.getTime())) {
      return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
  }
  const raw = tx?.date;
  if (raw == null || raw === '') return '';
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, day] = str.split(/[-T]/);
    return `${day}/${m}/${y}`;
  }
  return str;
}

export function TransacoesCard({ transactions, formatCurrency, mask, colors, iconColor, title = 'Últimas transações', subtitle = 'Receitas e despesas recentes', onVerMais, onEdit, onDelete, deleteLabel = 'Excluir', deleteMessage = 'Excluir esta transação? O valor será devolvido ao saldo.', playTapSound }) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  // transactions já vêm do contexto em ordem (mais recente primeiro).
  // Não inverter para manter o mais recente no topo.
  const list = (transactions || []).slice();
  const primary = colors.primary;
  return (
    <GlassCard colors={colors} solid style={s.card}>
      <CardHeader
        icon="swap-horizontal-outline"
        title={title}
        subtitle={subtitle}
        colors={colors}
        iconColor={iconColor}
        rightActions={onVerMais ? (
          <TouchableOpacity
            onPress={() => { playTapSound?.(); onVerMais(); }}
            style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: primary + '26', borderWidth: 1, borderColor: primary + '50' }}
          >
            <AppIcon name="expand-outline" size={22} color={primary} />
          </TouchableOpacity>
        ) : null}
      />
      <ScrollableCardList
        items={list}
        colors={colors}
        accentColor={primary}
        emptyText="Nenhuma transação"
        itemMarginBottom={0}
        renderItem={(tx) => {
          const whenLabel = formatTransactionDateTime(tx);
          return (
        <View style={[s.txItem, { borderBottomColor: colors.border }]}>
          <View style={[s.txIcon]}>
            <AppIcon name={tx.type === 'income' ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={tx.type === 'income' ? (iconColor || primary) : '#ef4444'} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.txDesc, { color: colors.text }]} numberOfLines={1}>{tx.description}</Text>
            <Text style={[s.txCat, { color: colors.textSecondary }]} numberOfLines={1}>{tx.category}</Text>
            {whenLabel ? (
              <Text style={[s.txWhen, { color: colors.textSecondary }]} numberOfLines={1}>
                {whenLabel}
              </Text>
            ) : null}
          </View>
          <Text style={[s.txAmount, { color: tx.type === 'income' ? (iconColor || primary) : '#ef4444' }]}>
            {tx.type === 'income' ? '+' : '-'}
            {m(fmt(tx.amount))}
          </Text>
          {onEdit && (
            <TouchableOpacity onPress={() => { playTapSound?.(); onEdit(tx); }} style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: primary + '20' }}>
              <Ionicons name="pencil" size={16} color={primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() => { playTapSound?.(); Alert.alert(deleteLabel, deleteMessage, [{ text: 'Não' }, { text: deleteLabel, style: 'destructive', onPress: () => onDelete(tx) }]); }}
              style={{ width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ef444420' }}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
          );
        }}
      />
    </GlassCard>
  );
}
