import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';
import { AppIcon } from './AppIcon';
import { playTapSound } from '../utils/sounds';

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  box: { flex: 1, padding: 12, borderRadius: 12 },
  boxLabel: { fontSize: 10, fontWeight: '600' },
  boxValue: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statText: { fontSize: 12, fontWeight: '600' },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 8, marginBottom: 8 },
  detailValue: { fontSize: 20, fontWeight: '800' },
});

export function ResumoDoMesCard({
  income,
  expense,
  balance,
  formatCurrency,
  mask,
  colors,
  vendas = 0,
  agendas = 0,
  tarefasConcluidas = 0,
  novosClientes = 0,
  faturasPagas = 0,
  prevIncome,
  prevExpense,
}) {
  const [selectedDetail, setSelectedDetail] = useState(null);
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);

  const stats = [
    { id: 'vendas', label: 'Vendas', value: vendas, icon: 'cart-outline', color: colors.primary },
    { id: 'agendas', label: 'Agendas', value: agendas, icon: 'calendar-outline', color: '#f59e0b' },
    { id: 'tarefas', label: 'Tarefas', value: tarefasConcluidas, icon: 'checkmark-done-outline', color: '#10b981' },
    { id: 'clientes', label: 'Clientes', value: novosClientes, icon: 'people-outline', color: '#3b82f6' },
    { id: 'faturas', label: 'Faturas', value: faturasPagas, icon: 'document-text-outline', color: '#8b5cf6' },
  ];

  const selectedStat = stats.find((st) => st.id === selectedDetail);

  return (
    <GlassCard colors={colors} style={[s.card, { borderColor: colors.primary + '50', borderWidth: 2, padding: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }]} contentStyle={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
          <AppIcon name="stats-chart-outline" size={26} color="#a855f7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text }]}>Resumo do mês</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Receitas, despesas e saldo</Text>
        </View>
      </View>
      <View style={s.row}>
        <View style={[s.box, { backgroundColor: colors.primaryRgba?.(0.15) || colors.primary + '26', borderWidth: 1, borderColor: colors.primary + '40' }]}>
          <Text style={[s.boxLabel, { color: colors.textSecondary }]}>RECEITAS</Text>
          <Text style={[s.boxValue, { color: colors.primary }]}>{m(fmt(income))}</Text>
        </View>
        <View style={[s.box, { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }]}>
          <Text style={[s.boxLabel, { color: colors.textSecondary }]}>DESPESAS</Text>
          <Text style={[s.boxValue, { color: '#ef4444' }]}>{m(fmt(expense))}</Text>
        </View>
        <View style={[s.box, { backgroundColor: (colors.border || '#e5e7eb') + '40', borderWidth: 1, borderColor: colors.border }]}>
          <Text style={[s.boxLabel, { color: colors.textSecondary }]}>SALDO</Text>
          <Text style={[s.boxValue, { color: balance >= 0 ? colors.primary : '#ef4444' }]}>{m(fmt(balance))}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {stats.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            onPress={() => { playTapSound(); setSelectedDetail(selectedDetail === stat.id ? null : stat.id); }}
            style={[s.detailBtn, { backgroundColor: selectedDetail === stat.id ? (stat.color || colors.primary) + '30' : colors.primaryRgba?.(0.12) || colors.primary + '20', borderWidth: 1, borderColor: selectedDetail === stat.id ? stat.color : colors.border }]}
          >
            <AppIcon name={stat.icon} size={16} color={stat.color} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedStat && (
        <View style={[s.statsRow, { borderTopColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: (selectedStat.color || colors.primary) + '25', justifyContent: 'center', alignItems: 'center' }}>
              <AppIcon name={selectedStat.icon} size={22} color={selectedStat.color} />
            </View>
            <View>
              <Text style={[s.detailValue, { color: selectedStat.color }]}>{selectedStat.value}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>{selectedStat.label} no período</Text>
            </View>
          </View>
        </View>
      )}
      {prevIncome != null && prevExpense != null && (prevIncome > 0 || prevExpense > 0) && (
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 12 }}>
          Mês anterior: +{m(fmt(prevIncome))} / -{m(fmt(prevExpense))}
        </Text>
      )}
    </GlassCard>
  );
}
