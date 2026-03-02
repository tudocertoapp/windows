import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from './AppIcon';
import { playTapSound } from '../utils/sounds';

const ds = StyleSheet.create({
  balanceCard: { margin: 16, padding: 20, borderRadius: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  balanceBox: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  filterTab: { flex: 1, minWidth: 60, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterTabText: { fontSize: 12, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
});

export function BalanceCard({
  balance,
  income,
  expense,
  formatCurrency,
  mask,
  colors,
  filter,
  filterLabel,
  onFilterChange,
  onFilterDatePrev,
  onFilterDateNext,
  showValues,
  onToggleValues,
}) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  const hasFilter = !!filter;
  const primaryBg = colors.primaryRgba ? colors.primaryRgba(0.4) : colors.primary + '66';

  return (
    <View style={[ds.balanceCard, { backgroundColor: primaryBg }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={ds.balanceLabel}>SALDO DISPONÍVEL</Text>
          <Text style={ds.balanceAmount}>{m(fmt(balance))}</Text>
        </View>
        {onToggleValues && (
          <TouchableOpacity onPress={() => { playTapSound(); onToggleValues(); }}>
            <AppIcon name={showValues ? 'eye-outline' : 'eye-off-outline'} size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        )}
      </View>
      {hasFilter && (
        <>
          <View style={ds.filterRow}>
            {['dia', 'mes', 'ano'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[ds.filterTab, { backgroundColor: filter === f ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)' }]}
                onPress={() => { playTapSound(); onFilterChange?.(f); }}
              >
                <Text style={[ds.filterTabText, { color: '#fff' }]}>{f === 'dia' ? 'Dia' : f === 'mes' ? 'Mês' : 'Ano'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={ds.navRow}>
            <TouchableOpacity onPress={() => { playTapSound(); onFilterDatePrev?.(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{filterLabel}</Text>
            <TouchableOpacity onPress={() => { playTapSound(); onFilterDateNext?.(); }} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
      <View style={ds.balanceRow}>
        <View style={ds.balanceBox}>
          <Text style={ds.boxLabel}>ENTRADA</Text>
          <Text style={ds.boxValue}>+ {m(fmt(income))}</Text>
        </View>
        <View style={ds.balanceBox}>
          <Text style={ds.boxLabel}>SAÍDA</Text>
          <Text style={[ds.boxValue, { color: colors.expense || '#fecaca' }]}>- {m(fmt(expense))}</Text>
        </View>
      </View>
    </View>
  );
}
