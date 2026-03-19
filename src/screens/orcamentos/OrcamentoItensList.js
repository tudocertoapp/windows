import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../components/GlassCard';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sounds';

export function OrcamentoItensList({ items, setItems, products, services, colors }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState('produto');
  const [search, setSearch] = useState('');

  const addItem = (item, isProduct) => {
    const id = (isProduct ? 'p-' : 's-') + item.id;
    const existing = items.find((i) => i.id === id);
    if (existing) {
      setItems(items.map((i) => (i.id === id ? { ...i, qty: (i.qty || 1) + 1 } : i)));
    } else {
      setItems([...items, {
        id,
        name: item.name,
        price: item.price || 0,
        discount: 0,
        qty: 1,
        isProduct,
      }]);
    }
    setPickerOpen(false);
  };

  const updateItem = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const baseList = pickerType === 'produto' ? (products || []) : (services || []);
  const list = search.trim()
    ? baseList.filter((p) => (p.name || '').toLowerCase().includes(search.trim().toLowerCase()) || String(p.code || '').toLowerCase().includes(search.trim().toLowerCase()))
    : baseList;

  return (
    <View style={s.wrap}>
      <TouchableOpacity
        onPress={() => { playTapSound(); setPickerType('produto'); setPickerOpen(true); }}
        style={[s.addBtn, { borderColor: colors.primary, backgroundColor: colors.primaryRgba?.(0.1) }]}
      >
        <Ionicons name="cube-outline" size={20} color={colors.primary} />
        <Text style={[s.addBtnText, { color: colors.primary }]}>Adicionar produto</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { playTapSound(); setPickerType('servico'); setPickerOpen(true); }}
        style={[s.addBtn, { borderColor: colors.primary, backgroundColor: colors.primaryRgba?.(0.1) }]}
      >
        <Ionicons name="construct-outline" size={20} color={colors.primary} />
        <Text style={[s.addBtnText, { color: colors.primary }]}>Adicionar serviço</Text>
      </TouchableOpacity>

      {items.map((item, idx) => (
        <GlassCard key={item.id} colors={colors} style={[s.itemCard, { borderColor: colors.border }]}>
          <View style={s.itemHeader}>
            <Text style={[s.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
            <TouchableOpacity onPress={() => { playTapSound(); removeItem(idx); }} style={s.removeBtn}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <View style={s.itemRow}>
            <View style={s.field}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Qtd</Text>
              <TextInput
                style={[s.fieldInput, { borderColor: colors.border, color: colors.text }]}
                value={String(item.qty || 1)}
                onChangeText={(t) => updateItem(idx, 'qty', Math.max(0, parseInt(t, 10) || 1))}
                keyboardType="number-pad"
              />
            </View>
            <View style={s.field}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Unit.</Text>
              <TextInput
                style={[s.fieldInput, { borderColor: colors.border, color: colors.text }]}
                value={String(item.price || 0).replace('.', ',')}
                onChangeText={(t) => updateItem(idx, 'price', parseFloat(t.replace(',', '.')) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={s.field}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Desc.</Text>
              <TextInput
                style={[s.fieldInput, { borderColor: colors.border, color: colors.text }]}
                value={String(item.discount || 0).replace('.', ',')}
                onChangeText={(t) => updateItem(idx, 'discount', parseFloat(t.replace(',', '.')) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Text style={[s.subtotal, { color: colors.primary }]}>
            Subtotal: {formatCurrency(((item.price || 0) - (item.discount || 0)) * (item.qty || 1))}
          </Text>
        </GlassCard>
      ))}

      <Modal visible={pickerOpen} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)} />
        <View style={[s.modalContent, { backgroundColor: colors.card }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{pickerType === 'produto' ? 'Selecionar produto' : 'Selecionar serviço'}</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[s.searchInput, { borderColor: colors.border, color: colors.text }]}
            placeholder={pickerType === 'produto' ? 'Buscar produto por nome ou código...' : 'Buscar serviço por nome...'}
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView style={s.pickerList}>
            {list.length === 0 ? (
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>Nenhum {pickerType} cadastrado</Text>
            ) : (
              list.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => { addItem(p, pickerType === 'produto'); playTapSound(); }}
                >
                  <Text style={[s.pickerItemName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[s.pickerItemPrice, { color: colors.primary }]}>{formatCurrency(p.price || 0)}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  itemCard: { padding: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '600' },
  removeBtn: { padding: 4 },
  itemRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderRadius: 8, padding: 8 },
  subtotal: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  searchInput: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  pickerList: { maxHeight: 300 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  pickerItemName: { flex: 1, fontSize: 15 },
  pickerItemPrice: { fontSize: 14, fontWeight: '600' },
  emptyText: { padding: 24, textAlign: 'center' },
});
