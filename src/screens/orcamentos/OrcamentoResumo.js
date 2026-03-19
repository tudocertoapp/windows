import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { formatCurrency } from '../../utils/format';

export function OrcamentoResumo({ subtotal, desconto, total, colors, onDescontoChange }) {
  return (
    <View style={[s.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.row}>
        <Text style={[s.label, { color: colors.textSecondary }]}>Subtotal</Text>
        <Text style={[s.value, { color: colors.text }]}>{formatCurrency(subtotal || 0)}</Text>
      </View>
      <View style={s.row}>
        <Text style={[s.label, { color: colors.textSecondary }]}>Desconto (R$)</Text>
        {onDescontoChange ? (
          <TextInput
            style={[s.input, { color: colors.text, borderColor: colors.border }]}
            value={String(desconto || 0)}
            onChangeText={(t) => onDescontoChange(parseFloat(String(t).replace(',', '.')) || 0)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        ) : (
          <Text style={[s.value, { color: colors.text }]}>{formatCurrency(desconto || 0)}</Text>
        )}
      </View>
      <View style={[s.row, s.totalRow]}>
        <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
        <Text style={[s.totalValue, { color: colors.primary }]}>{formatCurrency(total || 0)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 100, textAlign: 'right' },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
});
