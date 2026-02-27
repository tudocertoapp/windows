import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ds = StyleSheet.create({
  balanceCard: { margin: 16, padding: 20, borderRadius: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  balanceAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  balanceRow: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  balanceBox: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
});

export function BalanceCard({ balance, income, expense, contasPagas, contasAVencer, contasVencidas, formatCurrency, mask, colors }) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  return (
    <View style={[ds.balanceCard, { backgroundColor: colors.primary }]}>
      <Text style={ds.balanceLabel}>SALDO DISPONÍVEL</Text>
      <Text style={ds.balanceAmount}>{m(fmt(balance))}</Text>
      <View style={ds.balanceRow}>
        <View style={ds.balanceBox}>
          <Text style={ds.boxLabel}>ENTRADA</Text>
          <Text style={ds.boxValue}>+ {m(fmt(income))}</Text>
        </View>
        <View style={ds.balanceBox}>
          <Text style={ds.boxLabel}>SAÍDA</Text>
          <Text style={[ds.boxValue, { color: colors.expense }]}>- {m(fmt(expense))}</Text>
        </View>
        {contasPagas != null && (
          <View style={ds.balanceBox}>
            <Text style={ds.boxLabel}>PAGAS</Text>
            <Text style={ds.boxValue}>{contasPagas.qty} · {m(fmt(contasPagas.valor))}</Text>
          </View>
        )}
        {contasAVencer != null && (
          <View style={ds.balanceBox}>
            <Text style={ds.boxLabel}>A VENCER</Text>
            <Text style={ds.boxValue}>{contasAVencer.qty} · {m(fmt(contasAVencer.valor))}</Text>
          </View>
        )}
        {contasVencidas != null && (
          <View style={ds.balanceBox}>
            <Text style={ds.boxLabel}>VENCIDAS</Text>
            <Text style={[ds.boxValue, { color: '#fecaca' }]}>{contasVencidas.qty} · {m(fmt(contasVencidas.valor))}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
