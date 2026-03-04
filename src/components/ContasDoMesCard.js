import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardHeader } from './CardHeader';

const ds = StyleSheet.create({
  card: { margin: 16, padding: 20, borderRadius: 20 },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  box: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
});

export function ContasDoMesCard({ contasPagas, contasAVencer, contasVencidas, formatCurrency, mask, colors }) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  const pagas = contasPagas || { qty: 0, valor: 0 };
  const aVencer = contasAVencer || { qty: 0, valor: 0 };
  const vencidas = contasVencidas || { qty: 0, valor: 0 };
  const totalContas = pagas.qty + aVencer.qty + vencidas.qty;
  const redBg = 'rgba(239, 68, 68, 0.4)';
  return (
    <View style={[ds.card, { backgroundColor: redBg }]}>
      <CardHeader icon="document-text-outline" title="Faturas" subtitle="Contas a pagar e vencidas" colors={colors} light />
      <View style={[ds.row, { marginTop: 12 }]}>
        <View style={[ds.box, { minWidth: '100%', marginBottom: 4 }]}>
          <Text style={ds.boxLabel}>TOTAL</Text>
          <Text style={ds.boxValue}>{totalContas} {totalContas === 1 ? 'conta' : 'contas'}</Text>
        </View>
        <View style={ds.box}>
          <Text style={ds.boxLabel}>PAGAS</Text>
          <Text style={ds.boxValue}>{pagas.qty} · {m(fmt(pagas.valor))}</Text>
        </View>
        <View style={ds.box}>
          <Text style={ds.boxLabel}>A VENCER</Text>
          <Text style={ds.boxValue}>{aVencer.qty} · {m(fmt(aVencer.valor))}</Text>
        </View>
        <View style={ds.box}>
          <Text style={ds.boxLabel}>VENCIDAS</Text>
          <Text style={[ds.boxValue, { color: '#fecaca' }]}>{vencidas.qty} · {m(fmt(vencidas.valor))}</Text>
        </View>
      </View>
    </View>
  );
}
