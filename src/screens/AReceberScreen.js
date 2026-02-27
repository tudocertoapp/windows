import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { TopBar } from '../components/TopBar';
import { formatCurrency } from '../utils/format';

const ars = StyleSheet.create({
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  totalCard: { margin: 16, padding: 20, borderRadius: 20 },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  totalValue: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  itemBody: { flex: 1 },
  itemDesc: { fontSize: 15, fontWeight: '600' },
  itemDate: { fontSize: 12, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
});

export function AReceberScreen({ onClose, isModal }) {
  const { aReceber, deleteAReceber, updateAReceber } = useFinance();
  const { colors } = useTheme();

  const total = useMemo(() => aReceber.filter((r) => r.status !== 'pago').reduce((s, r) => s + (r.amount || 0), 0), [aReceber]);

  const receberPorVencimento = useMemo(() => {
    const arr = [...aReceber].sort((a, b) => {
      const da = parseDate(a.dueDate);
      const db = parseDate(b.dueDate);
      return da - db;
    });
    return arr;
  }, [aReceber]);

  function parseDate(str) {
    if (!str) return 0;
    const [d, m, y] = str.split('/').map(Number);
    if (!d || !m || !y) return 0;
    return new Date(y, m - 1, d).getTime();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>A Receber</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="A Receber" colors={colors} />
      )}
      <View style={[ars.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Text style={[ars.title, { color: colors.text }]}>Valores a receber</Text>
      </View>
      <View style={[ars.totalCard, { backgroundColor: colors.primary }]}>
        <Text style={[ars.totalLabel, { color: 'rgba(255,255,255,0.8)' }]}>TOTAL A RECEBER</Text>
        <Text style={[ars.totalValue, { color: '#fff' }]}>{formatCurrency(total)}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[ars.sectionLabel, { color: colors.textSecondary }]}>PARCELAS</Text>
        {receberPorVencimento.length === 0 ? (
        <View style={ars.empty}>
          <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum valor a receber</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Use "A prazo" ao registrar receita para gerar parcelas</Text>
        </View>
      ) : (
        receberPorVencimento.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[ars.item, { backgroundColor: r.status === 'pago' ? colors.primaryRgba(0.1) : colors.card, borderColor: colors.border, opacity: r.status === 'pago' ? 0.7 : 1 }]}
            onLongPress={() =>
              Alert.alert('Parcela', r.status === 'pago' ? 'Marcar como não paga?' : 'Marcar como recebida ou excluir?', [
                { text: 'Cancelar' },
                r.status === 'pago'
                  ? { text: 'Desfazer', onPress: () => updateAReceber(r.id, { status: 'pendente' }) }
                  : { text: 'Recebido', onPress: () => updateAReceber(r.id, { status: 'pago' }) },
                { text: 'Excluir', style: 'destructive', onPress: () => deleteAReceber(r.id) },
              ])
            }
          >
            <View style={[ars.itemIcon, { backgroundColor: r.status === 'pago' ? colors.primaryRgba(0.3) : colors.primaryRgba(0.2) }]}>
              <Ionicons name={r.status === 'pago' ? 'checkmark-circle' : 'calendar-outline'} size={22} color={colors.primary} />
            </View>
            <View style={ars.itemBody}>
              <Text style={[ars.itemDesc, { color: colors.text }]}>{r.description || 'Parcela'}</Text>
              <Text style={[ars.itemDate, { color: colors.textSecondary }]}>
                Vencimento: {r.dueDate} {r.total > 1 ? `(${r.parcel || 1}/${r.total})` : ''}
              </Text>
            </View>
            <Text style={[ars.itemAmount, { color: r.status === 'pago' ? colors.textSecondary : colors.primary }]}>{formatCurrency(r.amount || 0)}</Text>
          </TouchableOpacity>
        ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
