import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardHeader } from './CardHeader';
import { GlassCard } from './GlassCard';

const CARD_MARGIN_H = 16;
const CARD_MARGIN_TOP = 16;

const ds = StyleSheet.create({
  card: { marginHorizontal: CARD_MARGIN_H, marginTop: CARD_MARGIN_TOP, marginBottom: 0, padding: 20, borderRadius: 20 },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  box: { flex: 1, minWidth: 90, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  boxLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  boxValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },
});

export function ContasDoMesCard({ contasPagas, contasAVencer, contasVencidas, formatCurrency, mask, colors, lightBackground }) {
  const fmt = formatCurrency || ((v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`);
  const m = mask || ((v) => v);
  const pagas = contasPagas || { qty: 0, valor: 0 };
  const aVencer = contasAVencer || { qty: 0, valor: 0 };
  const vencidas = contasVencidas || { qty: 0, valor: 0 };
  const totalContas = pagas.qty + aVencer.qty + vencidas.qty;
  return (
    <GlassCard
      colors={colors}
      style={[
        ds.card,
        {
          borderColor: colors.primary + '50',
          borderWidth: 2,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        },
      ]}
      contentStyle={{ padding: 20 }}
    >
      <CardHeader icon="document-text-outline" title="Faturas" subtitle="Contas a pagar e vencidas" colors={colors} />
      <View style={[ds.row, { marginTop: 12 }]}>
        <View style={[ds.box, { minWidth: '100%', marginBottom: 4, backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>TOTAL</Text>
          <Text style={[ds.boxValue, { color: colors.text }]}>{totalContas} {totalContas === 1 ? 'conta' : 'contas'}</Text>
        </View>
        <View style={[ds.box, { backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>PAGAS</Text>
          <Text style={[ds.boxValue, { color: colors.text }]}>{pagas.qty} · {m(fmt(pagas.valor))}</Text>
        </View>
        <View style={[ds.box, { backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>A VENCER</Text>
          <Text style={[ds.boxValue, { color: colors.text }]}>{aVencer.qty} · {m(fmt(aVencer.valor))}</Text>
        </View>
        <View style={[ds.box, { backgroundColor: colors.primaryRgba?.(0.12) }]}>
          <Text style={[ds.boxLabel, { color: colors.textSecondary }]}>VENCIDAS</Text>
          <Text style={[ds.boxValue, { color: lightBackground ? '#dc2626' : '#fecaca' }]}>{vencidas.qty} · {m(fmt(vencidas.valor))}</Text>
        </View>
      </View>
    </GlassCard>
  );
}
