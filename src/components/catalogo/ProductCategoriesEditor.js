import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../../utils/sounds';
import {
  normalizeCategoriasProdutos,
  addCategory,
  removeCategory,
  updateCategoryName,
  addSubcategory,
  removeSubcategory,
  updateSubcategoryName,
} from '../../utils/productCategories';

export function ProductCategoriesEditor({ value, onChange, colors, accent, compact }) {
  const categorias = normalizeCategoriasProdutos(value);
  const primary = accent || colors?.primary || '#6366f1';
  const [newCatName, setNewCatName] = useState('');
  const [newSubNames, setNewSubNames] = useState({});

  const patch = (next) => onChange?.(next);

  return (
    <View style={compact ? null : { marginTop: 4 }}>
      <View style={st.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={[st.switchLabel, { color: colors.text }]}>Usar categorias na loja</Text>
          <Text style={[st.hint, { color: colors.textSecondary }]}>
            Opcional. Ex.: Piercing, Bonés — com subcategorias como Tragus, Helix.
          </Text>
        </View>
        <Switch
          value={categorias.enabled}
          onValueChange={(v) => { playTapSound(); patch({ ...categorias, enabled: v }); }}
          trackColor={{ true: primary }}
        />
      </View>

      {categorias.enabled ? (
        <ScrollView style={{ maxHeight: compact ? 320 : 420 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {categorias.items.map((cat) => (
            <View key={cat.id} style={[st.catBlock, { borderColor: colors.border, backgroundColor: colors.bg }]}>
              <View style={st.catHeader}>
                <Ionicons name="folder-outline" size={18} color={primary} />
                <TextInput
                  style={[st.catInput, { borderColor: colors.border, color: colors.text, flex: 1 }]}
                  value={cat.name}
                  onChangeText={(t) => patch(updateCategoryName(categorias, cat.id, t))}
                  placeholder="Nome da categoria"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => { playTapSound(); patch(removeCategory(categorias, cat.id)); }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {(cat.subcategorias || []).map((sub) => (
                <View key={sub.id} style={st.subRow}>
                  <Ionicons name="return-down-forward-outline" size={14} color={colors.textSecondary} />
                  <TextInput
                    style={[st.subInput, { borderColor: colors.border, color: colors.text, flex: 1 }]}
                    value={sub.name}
                    onChangeText={(t) => patch(updateSubcategoryName(categorias, cat.id, sub.id, t))}
                    placeholder="Subcategoria"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    onPress={() => { playTapSound(); patch(removeSubcategory(categorias, cat.id, sub.id)); }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={st.subAddRow}>
                <TextInput
                  style={[st.subInput, { borderColor: colors.border, color: colors.text, flex: 1 }]}
                  value={newSubNames[cat.id] || ''}
                  onChangeText={(t) => setNewSubNames((prev) => ({ ...prev, [cat.id]: t }))}
                  placeholder="Nova subcategoria (opcional)"
                  placeholderTextColor={colors.textSecondary}
                  onSubmitEditing={() => {
                    const name = newSubNames[cat.id];
                    if (!name?.trim()) return;
                    patch(addSubcategory(categorias, cat.id, name));
                    setNewSubNames((prev) => ({ ...prev, [cat.id]: '' }));
                  }}
                />
                <TouchableOpacity
                  style={[st.miniBtn, { backgroundColor: primary + '22' }]}
                  onPress={() => {
                    playTapSound();
                    const name = newSubNames[cat.id];
                    if (!name?.trim()) return;
                    patch(addSubcategory(categorias, cat.id, name));
                    setNewSubNames((prev) => ({ ...prev, [cat.id]: '' }));
                  }}
                >
                  <Ionicons name="add" size={18} color={primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={[st.addCatRow, { borderColor: colors.border }]}>
            <TextInput
              style={[st.catInput, { borderColor: colors.border, color: colors.text, flex: 1 }]}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Nova categoria (ex: Piercing, Bonés)"
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={() => {
                if (!newCatName.trim()) return;
                patch(addCategory(categorias, newCatName));
                setNewCatName('');
              }}
            />
            <TouchableOpacity
              style={[st.addCatBtn, { backgroundColor: primary }]}
              onPress={() => {
                playTapSound();
                if (!newCatName.trim()) return;
                patch(addCategory(categorias, newCatName));
                setNewCatName('');
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={st.addCatBtnText}>Categoria</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  switchLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  catBlock: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 8 },
  subInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 },
  subAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginLeft: 8 },
  miniBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 10, marginBottom: 8 },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  addCatBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
