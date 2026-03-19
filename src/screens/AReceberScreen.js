import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { DatePickerInput } from '../components/DatePickerInput';
import { MoneyInput } from '../components/MoneyInput';
import { formatCurrency, parseMoney } from '../utils/format';
import { playTapSound } from '../utils/sounds';

const ars = StyleSheet.create({
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  totalCard: { margin: 16, padding: 20, borderRadius: 20 },
  totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  totalValue: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  itemBody: { flex: 1 },
  itemDesc: { fontSize: 15, fontWeight: '600' },
  itemDate: { fontSize: 12, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
});

export function AReceberScreen({ onClose, isModal }) {
  const { aReceber, deleteAReceber, updateAReceber } = useFinance();
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const isVendasPrazo = showEmpresaFeatures;
  const [editItem, setEditItem] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const titleTxt = isVendasPrazo ? 'Vendas a prazo' : 'Valores a receber';

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
    const [d, m, y] = String(str).split(/[/\-]/).map(Number);
    if (!d || !m || !y) return 0;
    return new Date(y, m - 1, d).getTime();
  }

  const openEdit = (r) => {
    playTapSound();
    setEditItem(r);
    setEditDesc(r.description || '');
    setEditAmount(r.amount != null ? (r.amount).toFixed(2).replace('.', ',') : '');
    setEditDueDate(r.dueDate || '');
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    const amt = parseMoney(editAmount);
    if (isNaN(amt) || amt <= 0) return Alert.alert('Erro', 'Informe um valor válido.');
    if (!editDueDate?.trim()) return Alert.alert('Erro', 'Informe a data de vencimento.');
    playTapSound();
    updateAReceber(editItem.id, { description: editDesc.trim() || 'Parcela', amount: amt, dueDate: editDueDate.trim() });
    setEditItem(null);
  };

  const handleConcluir = (r) => {
    playTapSound();
    updateAReceber(r.id, { status: r.status === 'pago' ? 'pendente' : 'pago' });
  };

  const handleExcluir = (r) => {
    Alert.alert('Excluir', `Excluir parcela "${r.description || 'Parcela'}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => { playTapSound(); deleteAReceber(r.id); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{isVendasPrazo ? 'Vendas a prazo' : 'A Receber'}</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title={isVendasPrazo ? 'Vendas a prazo' : 'A Receber'} colors={colors} />
      )}
      <View style={[ars.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Text style={[ars.title, { color: colors.text }]}>{titleTxt}</Text>
      </View>
      <View style={[ars.totalCard, { backgroundColor: colors.primary }]}>
        <Text style={[ars.totalLabel, { color: 'rgba(255,255,255,0.8)' }]}>{isVendasPrazo ? 'TOTAL VENDAS A PRAZO' : 'TOTAL A RECEBER'}</Text>
        <Text style={[ars.totalValue, { color: '#fff' }]}>{formatCurrency(total)}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[ars.sectionLabel, { color: colors.textSecondary }]}>PARCELAS</Text>
        {receberPorVencimento.length === 0 ? (
        <View style={ars.empty}>
          <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>{isVendasPrazo ? 'Nenhuma venda a prazo' : 'Nenhum valor a receber'}</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Use "A prazo" ao registrar receita para gerar parcelas</Text>
        </View>
      ) : (
        receberPorVencimento.map((r) => (
          <View key={r.id} style={[ars.item, { backgroundColor: r.status === 'pago' ? colors.primaryRgba(0.1) : colors.card, borderColor: colors.border, opacity: r.status === 'pago' ? 0.7 : 1, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[ars.itemIcon, { backgroundColor: 'transparent' }]}>
                <Ionicons name={r.status === 'pago' ? 'checkmark-circle' : 'calendar-outline'} size={22} color={colors.primary} />
              </View>
              <View style={ars.itemBody}>
                <Text style={[ars.itemDesc, { color: colors.text }]}>{r.description || 'Parcela'}</Text>
                <Text style={[ars.itemDate, { color: colors.textSecondary }]}>
                  Vencimento: {r.dueDate} {r.total > 1 ? `(${r.parcel || 1}/${r.total})` : ''}
                </Text>
              </View>
              <Text style={[ars.itemAmount, { color: r.status === 'pago' ? colors.textSecondary : colors.primary }]}>{formatCurrency(r.amount || 0)}</Text>
            </View>
            <View style={ars.actionRow}>
              <TouchableOpacity onPress={() => openEdit(r)} style={[ars.actionBtn, { backgroundColor: colors.primaryRgba(0.2) }]}>
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleConcluir(r)} style={[ars.actionBtn, { backgroundColor: r.status === 'pago' ? colors.textSecondary + '30' : colors.primaryRgba(0.2) }]}>
                <Ionicons name={r.status === 'pago' ? 'refresh' : 'checkmark-circle'} size={16} color={r.status === 'pago' ? colors.textSecondary : colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: r.status === 'pago' ? colors.textSecondary : colors.primary }}>{r.status === 'pago' ? 'Desfazer' : 'Concluir'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleExcluir(r)} style={[ars.actionBtn, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={!!editItem} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditItem(null)} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Editar parcela</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Descrição</Text>
            <TextInput style={{ borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, borderColor: colors.border, backgroundColor: colors.bg, marginBottom: 12 }} placeholder="Descrição" placeholderTextColor={colors.textSecondary} value={editDesc} onChangeText={setEditDesc} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Valor (R$)</Text>
            <MoneyInput value={editAmount} onChange={setEditAmount} colors={colors} containerStyle={{ marginBottom: 12, borderWidth: 1, borderRadius: 12, borderColor: colors.border, backgroundColor: colors.bg }} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Data de vencimento</Text>
            <DatePickerInput value={editDueDate} onChange={setEditDueDate} colors={colors} style={{ marginBottom: 20, backgroundColor: colors.bg, borderColor: colors.border }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditItem(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
