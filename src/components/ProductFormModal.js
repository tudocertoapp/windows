import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { FornecedorModal } from './FornecedorModal';

const { width: SW } = Dimensions.get('window');
const GAP = 20;
const CARD_MAX_WIDTH = Math.min(SW - 8, 520);
const SCROLL_MAX_HEIGHT = Math.min(520, 580);

export function ProductFormModal({ visible, onClose, onSave, editingItem }) {
  const { colors } = useTheme();
  const { suppliers, products, addCompositeProduct, addSupplier } = useFinance();
  const { showEmpresaFeatures } = usePlan();
  const [name, setName] = useState(editingItem?.name || '');
  const [costPrice, setCostPrice] = useState(editingItem?.costPrice != null ? String(editingItem.costPrice) : '');
  const [price, setPrice] = useState(editingItem?.price != null ? String(editingItem.price) : '');
  const [discount, setDiscount] = useState(editingItem?.discount != null ? String(editingItem.discount) : '');
  const [unit, setUnit] = useState(editingItem?.unit || 'un');
  const [photoUris, setPhotoUris] = useState(editingItem?.photoUris?.length ? [...editingItem.photoUris] : (editingItem?.photoUri ? [editingItem.photoUri] : []));
  const [code, setCode] = useState(editingItem?.code || '');
  const [allowDiscount, setAllowDiscount] = useState(editingItem?.allowDiscount !== false);
  const [stock, setStock] = useState(editingItem?.stock != null ? String(editingItem.stock) : '0');
  const [minStock, setMinStock] = useState(editingItem?.minStock != null ? String(editingItem.minStock) : '0');
  const [supplierId, setSupplierId] = useState(editingItem?.supplierId || null);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showSupplierCreateModal, setShowSupplierCreateModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isCompositeProduct, setIsCompositeProduct] = useState(!!(editingItem?.isComposite));
  const [compositeItems, setCompositeItems] = useState(editingItem?.compositeItems || []);

  React.useEffect(() => {
    if (visible && editingItem) {
      setName(editingItem.name || '');
      setCostPrice(editingItem.costPrice != null ? String(editingItem.costPrice) : '');
      setPrice(editingItem.price != null ? String(editingItem.price) : '');
      setDiscount(editingItem.discount != null ? String(editingItem.discount) : '');
      setUnit(editingItem.unit || 'un');
      setPhotoUris(editingItem.photoUris?.length ? [...editingItem.photoUris] : (editingItem.photoUri ? [editingItem.photoUri] : []));
      setCode(editingItem.code || '');
      setAllowDiscount(editingItem.allowDiscount !== false);
      setStock(editingItem.stock != null ? String(editingItem.stock) : '0');
      setMinStock(editingItem.minStock != null ? String(editingItem.minStock) : '0');
      setSupplierId(editingItem.supplierId || null);
      setShowSupplierPicker(false);
      setShowSupplierCreateModal(false);
      setIsCompositeProduct(!!editingItem.isComposite);
      setCompositeItems(editingItem.compositeItems || []);
    } else if (visible && !editingItem) {
      setName('');
      setCostPrice('');
      setPrice('');
      setDiscount('');
      setUnit('un');
      setPhotoUris([]);
      setCode('');
      setAllowDiscount(true);
      setStock('0');
      setMinStock('0');
      setSupplierId(null);
      setShowSupplierPicker(false);
      setShowSupplierCreateModal(false);
      setIsCompositeProduct(false);
      setCompositeItems([]);
    }
  }, [visible, editingItem]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPhotoUris((prev) => [...prev, result.assets[0].uri]);
  };

  const removePhoto = (index) => setPhotoUris((prev) => prev.filter((_, i) => i !== index));


  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome do produto.');
    if (isCompositeProduct && showEmpresaFeatures) {
      addCompositeProduct({
        name: name.trim(),
        data: { items: compositeItems, price: parseFloat(String(price).replace(',', '.')) || 0 },
      });
      onSave({ _skipAdd: true });
    } else {
      const p = parseFloat(String(price).replace(',', '.')) || 0;
      const c = parseFloat(String(costPrice).replace(',', '.')) || 0;
      const d = parseFloat(String(discount).replace(',', '.')) || 0;
      const st = parseInt(String(stock).replace(/\D/g, ''), 10) || 0;
      const minSt = parseInt(String(minStock).replace(/\D/g, ''), 10) || 0;
      const payload = {
        name: name.trim(),
        price: p,
        costPrice: c,
        discount: d,
        unit: unit.trim() || 'un',
        photoUris: photoUris.length > 0 ? photoUris : null,
        code: code.trim() || null,
        allowDiscount,
        stock: st,
        minStock: minSt,
        supplierId: supplierId || null,
      };
      onSave(payload);
    }
  };

  const addCompositeItem = (product) => {
    if (product) {
      setCompositeItems((prev) => [...prev, { productId: product.id, productName: product.name, qty: 1 }]);
      setShowProductPicker(false);
    } else {
      if ((products || []).length === 0) return Alert.alert('Aviso', 'Cadastre produtos antes de criar um produto composto.');
      setShowProductPicker(true);
    }
  };

  const updateCompositeItem = (index, field, value) => {
    setCompositeItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const removeCompositeItem = (index) => {
    setCompositeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const sectionGap = { marginBottom: GAP };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.header, sectionGap]}>
              <Text style={[s.title, { color: colors.text }]}>{editingItem ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</Text>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled style={s.scroll} contentContainerStyle={s.scrollContent}>
              {/* Fotos do produto */}
              <Text style={[s.label, { color: colors.textSecondary }]}>FOTO DO PRODUTO (OPCIONAL)</Text>
              <View style={[s.photoRow, sectionGap]}>
                {photoUris.map((uri, idx) => (
                  <View key={idx} style={s.photoThumbWrap}>
                    <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                    <TouchableOpacity style={s.removePhotoBtn} onPress={() => removePhoto(idx)}>
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={pickImage} style={[s.photoAdd, { borderColor: colors.primary + '80' }]}>
                  <Ionicons name="add" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[s.label, { color: colors.textSecondary }]}>NOME (EX: CAMISA)</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, sectionGap]} placeholder="Camisa, Calça..." value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />

              {showEmpresaFeatures && (
                <>
                  <Text style={[s.label, { color: colors.textSecondary }]}>PRODUTO COMPOSTO?</Text>
                  <View style={[s.toggleRow, sectionGap]}>
                    <TouchableOpacity style={[s.toggleOpt, !isCompositeProduct && { backgroundColor: colors.primary }]} onPress={() => setIsCompositeProduct(false)}>
                      <Text style={[s.toggleText, { color: isCompositeProduct ? colors.text : '#fff' }]}>NÃO</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.toggleOpt, isCompositeProduct && { backgroundColor: colors.primary }]} onPress={() => setIsCompositeProduct(true)}>
                      <Text style={[s.toggleText, { color: isCompositeProduct ? '#fff' : colors.text }]}>SIM</Text>
                    </TouchableOpacity>
                  </View>

                  {isCompositeProduct && (
                    <View style={[s.compositeSection, { borderColor: colors.border, backgroundColor: colors.bg }, sectionGap]}>
                      <Text style={[s.label, { color: colors.textSecondary, marginBottom: 12 }]}>ITENS DO PRODUTO COMPOSTO</Text>
                      {compositeItems.map((it, idx) => (
                        <View key={idx} style={[s.compositeItemRow, { borderColor: colors.border }, idx < compositeItems.length - 1 && { marginBottom: 12 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{it.productName || 'Produto'}</Text>
                            <TextInput style={[s.input, { marginTop: 4, paddingVertical: 8 }]} value={String(it.qty || 1)} onChangeText={(t) => updateCompositeItem(idx, 'qty', parseInt(t, 10) || 1)} keyboardType="number-pad" placeholder="Qtd" placeholderTextColor={colors.textSecondary} />
                          </View>
                          <TouchableOpacity onPress={() => removeCompositeItem(idx)} style={{ padding: 8 }}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={[s.addCompositeBtn, { backgroundColor: colors.primaryRgba(0.2), borderColor: colors.primary }]} onPress={() => addCompositeItem(null)}>
                        <Ionicons name="add" size={20} color={colors.primary} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Adicionar produto</Text>
                      </TouchableOpacity>
                      {showProductPicker && (
                        <View style={[s.picker, { marginTop: 12, backgroundColor: colors.bg, borderColor: colors.border }]}>
                          <Text style={{ padding: 12, fontWeight: '600', color: colors.text }}>Selecione o produto</Text>
                          {(products || []).map((p) => (
                            <TouchableOpacity key={p.id} style={[s.pickerItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => addCompositeItem(p)}>
                              <Text style={{ color: colors.text }}>{p.name}</Text>
                              <Text style={{ fontSize: 12, color: colors.textSecondary }}>R$ {(p.price || 0).toFixed(2)}</Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity style={s.pickerItem} onPress={() => setShowProductPicker(false)}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Cancelar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={[s.hint, { color: colors.textSecondary, marginTop: 8 }]}>Selecione os produtos que compõem este item</Text>
                    </View>
                  )}
                </>
              )}

              <Text style={[s.label, { color: colors.textSecondary }]}>VARIAÇÕES (TAMANHO, COR, MARCA, ESTOQUE)</Text>
              <TouchableOpacity style={[s.select, { borderColor: colors.border, backgroundColor: colors.bg }, sectionGap]}>
                <Text style={[s.selectText, { color: colors.textSecondary }]}>Nenhum</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[s.label, { color: colors.textSecondary }]}>FORNECEDOR</Text>
              <View style={[s.row, sectionGap]}>
                <TouchableOpacity style={[s.select, { borderColor: colors.border, backgroundColor: colors.bg, flex: 1 }]} onPress={() => setShowSupplierPicker(true)}>
                  <Text style={[s.selectText, { color: suppliers.find((s) => s.id === supplierId)?.name ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                    {suppliers.find((s) => s.id === supplierId)?.name || 'Nenhum'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowSupplierPicker(false);
                    setShowSupplierCreateModal(true);
                  }}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.addBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>

              <View style={[s.row, sectionGap]}>
                <View style={s.half}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>PREÇO DE CUSTO</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="R$ 0,00" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={s.half}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>PREÇO DE VENDA</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="R$ 0,00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>

              <Text style={[s.label, { color: colors.textSecondary }]}>CÓDIGO DO PRODUTO</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, sectionGap]} placeholder="SKU, ref..." value={code} onChangeText={setCode} placeholderTextColor={colors.textSecondary} />

              <Text style={[s.label, { color: colors.textSecondary }]}>PERMITIR DESCONTO NA VENDA?</Text>
              <View style={[s.toggleRow, sectionGap]}>
                <TouchableOpacity style={[s.toggleOpt, !allowDiscount && { backgroundColor: colors.primary }]} onPress={() => setAllowDiscount(false)}>
                  <Text style={[s.toggleText, { color: allowDiscount ? colors.text : '#fff' }]}>NÃO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.toggleOpt, allowDiscount && { backgroundColor: colors.primary }]} onPress={() => setAllowDiscount(true)}>
                  <Text style={[s.toggleText, { color: allowDiscount ? '#fff' : colors.text }]}>SIM</Text>
                </TouchableOpacity>
              </View>

              {!isCompositeProduct && (
                <>
                  <View style={[s.row, sectionGap]}>
                    <View style={s.half}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>ESTOQUE ATUAL</Text>
                      <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="0" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                    </View>
                    <View style={s.half}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>ESTOQUE MÍNIMO</Text>
                      <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="0" value={minStock} onChangeText={setMinStock} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                    </View>
                  </View>
                  <Text style={[s.hint, { color: colors.textSecondary }, sectionGap]}>Alerta quando estoque estiver abaixo do mínimo</Text>
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{editingItem ? 'Salvar alterações' : 'CADASTRAR PRODUTO'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
      <FornecedorModal
        visible={showSupplierCreateModal}
        fornecedor={null}
        onClose={() => setShowSupplierCreateModal(false)}
        onSave={async (supplierPayload) => {
          const createdId = await addSupplier(supplierPayload);
          if (createdId) {
            setSupplierId(createdId);
            setShowSupplierPicker(false);
            return;
          }
          // fallback quando o provider atualizar o estado sem retornar id imediatamente
          const normalizedName = String(supplierPayload?.name || '').trim().toLowerCase();
          const match = (suppliers || []).find((s) => String(s?.name || '').trim().toLowerCase() === normalizedName);
          if (match?.id) {
            setSupplierId(match.id);
            setShowSupplierPicker(false);
          }
        }}
      />
      <Modal visible={showSupplierPicker} transparent animationType="fade">
        <View style={s.supplierPickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSupplierPicker(false)} />
          <View style={[s.supplierPickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Selecionar fornecedor</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={s.pickerItem} onPress={() => { setSupplierId(null); setShowSupplierPicker(false); }}>
                <Text style={{ color: colors.text }}>Nenhum</Text>
              </TouchableOpacity>
              {(suppliers || []).map((sup) => (
                <TouchableOpacity key={sup.id} style={s.pickerItem} onPress={() => { setSupplierId(sup.id); setShowSupplierPicker(false); }}>
                  <Text style={{ color: colors.text }}>{sup.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerItem} onPress={() => setShowSupplierPicker(false)}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  keyboardView: { flex: 1, width: '100%', justifyContent: 'center', maxHeight: '95%' },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: 20,
    padding: GAP,
    maxHeight: '95%',
    borderWidth: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', textTransform: 'uppercase' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scroll: { maxHeight: SCROLL_MAX_HEIGHT },
  scrollContent: { paddingBottom: GAP * 2 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  photoThumbWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: 72, height: 72, borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: 2, right: 2, padding: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  photoAdd: { width: 72, height: 72, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  compositeSection: { padding: 16, borderRadius: 12, borderWidth: 1 },
  compositeItemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  addCompositeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 2 },
  row: { flexDirection: 'row', gap: GAP },
  half: { flex: 1 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  selectText: { fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: GAP },
  toggleOpt: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12 },
  picker: { borderRadius: 12, borderWidth: 1, maxHeight: 160 },
  pickerItem: { padding: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  supplierPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  supplierPickerCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '72%',
    borderRadius: 14,
    borderWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: GAP },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
