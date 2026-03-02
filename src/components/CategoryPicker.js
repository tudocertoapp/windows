import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const s = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  closeBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '600' },
});

export function CategoryPicker({ categories, value, onChange, placeholder, colors, label }) {
  const [open, setOpen] = useState(false);
  const sel = categories.find((c) => c.id === value);

  return (
    <>
      <View style={{ marginBottom: 12 }}>
        {label && <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>}
        <TouchableOpacity
          style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg || colors.card, borderColor: colors.border }]}
          onPress={() => setOpen(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {sel ? <Ionicons name={sel.icon} size={18} color={colors.primary} /> : null}
            <Text style={{ fontSize: 15, color: sel ? colors.text : colors.textSecondary }}>{sel?.label || placeholder}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {open && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[s.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Selecionar categoria</Text>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[s.item, { borderBottomColor: colors.border }]} onPress={() => { onChange(cat.id); setOpen(false); }}>
                    <Ionicons name={cat.icon} size={20} color={value === cat.id ? colors.primary : colors.textSecondary} />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: value === cat.id ? '600' : '500', color: value === cat.id ? colors.primary : colors.text }}>{cat.label}</Text>
                    {value === cat.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.border }]} onPress={() => setOpen(false)}>
                <Text style={[s.closeBtnText, { color: colors.text }]}>Fechar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

export function SubcategoryPicker({ subcategories, value, onChange, placeholder, colors, label }) {
  const [open, setOpen] = useState(false);
  if (!subcategories || subcategories.length === 0) return null;

  return (
    <>
      <View style={{ marginBottom: 12 }}>
        {label && <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>}
        <TouchableOpacity
          style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg || colors.card, borderColor: colors.border }]}
          onPress={() => setOpen(true)}
        >
          <Text style={{ fontSize: 15, color: value ? colors.text : colors.textSecondary }}>{value || placeholder}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {open && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[s.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Selecionar subcategoria</Text>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator>
                {subcategories.map((sub) => (
                  <TouchableOpacity key={sub} style={[s.item, { borderBottomColor: colors.border }]} onPress={() => { onChange(sub); setOpen(false); }}>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: value === sub ? '600' : '500', color: value === sub ? colors.primary : colors.text }}>{sub}</Text>
                    {value === sub && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.border }]} onPress={() => setOpen(false)}>
                <Text style={[s.closeBtnText, { color: colors.text }]}>Fechar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}
