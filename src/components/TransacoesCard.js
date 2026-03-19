import React from 'react';
import { CardHeader } from './CardHeader';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  txAmount: { fontSize: 14, fontWeight: '600' },
});

export function TransacoesCard({ transactions, formatCurrency, mask, colors, title = 'Últimas transações', subtitle = 'Receitas e despesas recentes', onVerMais }) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  // transactions já vêm do contexto em ordem (mais recente primeiro).
  // Não inverter para manter o mais recente no topo.
  const list = (transactions || []).slice();
  return (
    <GlassCard colors={colors} style={s.card}>
      <CardHeader icon="swap-horizontal-outline" title={title} subtitle={subtitle} colors={colors} iconColor="#14b8a6" />
      <ScrollableCardList
        items={list}
        colors={colors}
        emptyText="Nenhuma transação"
        onVerMais={onVerMais}
        itemMarginBottom={0}
        renderItem={(tx) => (
        <View style={[s.txItem, { borderBottomColor: colors.border }]}>
          <View style={[s.txIcon]}>
            <AppIcon name={tx.type === 'income' ? 'trending-up-outline' : 'trending-down-outline'} size={18} color={tx.type === 'income' ? colors.primary : '#ef4444'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.txDesc, { color: colors.text }]}>{tx.description}</Text>
            <Text style={[s.txCat, { color: colors.textSecondary }]}>{tx.category}</Text>
          </View>
          <Text style={[s.txAmount, { color: tx.type === 'income' ? colors.primary : '#ef4444' }]}>
            {tx.type === 'income' ? '+' : '-'}
            {m(fmt(tx.amount))}
          </Text>
        </View>
      )}
      />
    </GlassCard>
  );
}
