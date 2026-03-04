import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { CardHeader } from './CardHeader';
import { getCategoryColor } from '../constants/colors';

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  catItem: { marginBottom: 14 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 13, fontWeight: '500' },
  catAmount: { fontSize: 13, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});

export function GastosPorCategoriaCard({ catBreakdown, totalExpense, formatCurrency, mask, colors, title = 'Gastos por categoria', subtitle = 'Distribuição das despesas por categoria' }) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  const expense = totalExpense || 0;
  const items = catBreakdown || [];
  return (
    <GlassCard colors={colors} style={s.card}>
      <CardHeader icon="pie-chart-outline" title={title} subtitle={subtitle} colors={colors} />
      {items.map(([cat, amount]) => {
        const pct = expense > 0 ? (amount / expense) * 100 : 0;
        return (
          <View key={cat} style={s.catItem}>
            <View style={s.catHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.catDot, { backgroundColor: getCategoryColor(cat) }]} />
                <Text style={[s.catName, { color: colors.text }]}>{cat}</Text>
              </View>
              <Text style={[s.catAmount, { color: colors.text }]}>{m(fmt(amount))}</Text>
            </View>
            <View style={[s.progressBar, { backgroundColor: colors.border }]}>
              <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: getCategoryColor(cat) }]} />
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}
