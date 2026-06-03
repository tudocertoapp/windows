import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductCategoriesEditor } from './ProductCategoriesEditor';
import { DEFAULT_CATEGORIAS_PRODUTOS } from '../../utils/productCategories';
import { loadProductCategories, saveProductCategories } from '../../utils/productCategoriesPersist';
import { playTapSound } from '../../utils/sounds';

export function ProductCategoriesModal({
  visible,
  onClose,
  user,
  products,
  services,
  colors,
}) {
  const [value, setValue] = useState(DEFAULT_CATEGORIAS_PRODUTOS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    loadProductCategories(user, products, services)
      .then((data) => { if (!cancelled) setValue(data); })
      .catch(() => { if (!cancelled) setValue(DEFAULT_CATEGORIAS_PRODUTOS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, user?.id, products?.length, services?.length]);

  const handleSave = async () => {
    playTapSound();
    setSaving(true);
    try {
      await saveProductCategories(user, value, products, services);
      Alert.alert('Salvo', 'Categorias de produtos atualizadas.');
      onClose?.();
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível salvar as categorias.');
    }
    setSaving(false);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={st.overlay}>
        <View style={[st.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.header}>
            <Text style={[st.title, { color: colors.text }]}>Categorias de produtos</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <ProductCategoriesEditor value={value} onChange={setValue} colors={colors} />
          )}
          <TouchableOpacity
            style={[st.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving || loading}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.saveBtnText}>Salvar categorias</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28, maxHeight: '92%', borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  saveBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
