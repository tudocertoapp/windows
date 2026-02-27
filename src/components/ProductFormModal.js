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

const { width: SW, height: SH } = Dimensions.get('window');
const GAP = 16;
const CARD_MAX_WIDTH = Math.min(SW - 24, 440);
const SCROLL_MAX_HEIGHT = Math.min(SH * 0.6, 520);

export function ProductFormModal({ visible, onClose, onSave, editingItem }) {
  const { colors } = useTheme();
  const { suppliers, products, services } = useFinance();
  const [name, setName] = useState(editingItem?.name || '');
  const [costPrice, setCostPrice] = useState(editingItem?.costPrice != null ? String(editingItem.costPrice) : '');
  const [price, setPrice] = useState(editingItem?.price != null ? String(editingItem.price) : '');
  const [discount, setDiscount] = useState(editingItem?.discount != null ? String(editingItem.discount) : '');
  const [unit, setUnit] = useState(editingItem?.unit || 'un');
  const [photoUri, setPhotoUri] = useState(editingItem?.photoUri || null);
  const [code, setCode] = useState(editingItem?.code || '');
  const [allowDiscount, setAllowDiscount] = useState(editingItem?.allowDiscount !== false);
  const [stock, setStock] = useState(editingItem?.stock != null ? String(editingItem.stock) : '0');
  const [minStock, setMinStock] = useState(editingItem?.minStock != null ? String(editingItem.minStock) : '0');
  const [supplierId, setSupplierId] = useState(editingItem?.supplierId || null);
  const [isComposite, setIsComposite] = useState(!!(editingItem?.items?.length));
  const [compositeItems, setCompositeItems] = useState(editingItem?.items || []);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(null);

  React.useEffect(() => {
    if (visible && editingItem) {
      setName(editingItem.name || '');
      setCostPrice(editingItem.costPrice != null ? String(editingItem.costPrice) : '');
      setPrice(editingItem.price != null ? String(editingItem.price) : '');
      setDiscount(editingItem.discount != null ? String(editingItem.discount) : '');
      setUnit(editingItem.unit || 'un');
      setPhotoUri(editingItem.photoUri || null);
      setCode(editingItem.code || '');
      setAllowDiscount(editingItem.allowDiscount !== false);
      setStock(editingItem.stock != null ? String(editingItem.stock) : '0');
      setMinStock(editingItem.minStock != null ? String(editingItem.minStock) : '0');
      setSupplierId(editingItem.supplierId || null);
      setIsComposite(!!(editingItem.items?.length));
      setCompositeItems(editingItem.items || []);
    } else if (visible && !editingItem) {
      setName('');
      setCostPrice('');
      setPrice('');
      setDiscount('');
      setUnit('un');
      setPhotoUri(null);
      setCode('');
      setAllowDiscount(true);
      setStock('0');
      setMinStock('0');
      setSupplierId(null);
      setIsComposite(false);
      setCompositeItems([]);
    }
  }, [visible, editingItem]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const addCompositeItem = (type, id, qty = 1) => {
    const list = [...compositeItems];
    const idx = list.findIndex((x) => x.type === type && x.id === id);
    if (idx >= 0) list[idx].qty += qty;
    else list.push({ type, id, qty });
    setCompositeItems(list);
    setShowItemPicker(null);
  };

  const updateCompositeItem = (idx, patch) => {
    const list = [...compositeItems];
    list[idx] = { ...list[idx], ...patch };
    setCompositeItems(list);
  };

  const removeCompositeItem = (idx) => {
    setCompositeItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const getCompositeSummary = () => {
    if (compositeItems.length === 0) return null;
    return compositeItems
      .map((ci) => {
        const it = ci.type === 'product' ? products.find((p) => p.id === ci.id) : services.find((s) => s.id === ci.id);
        return `${ci.qty}x ${it?.name || '—'}`;
      })
      .join(' + ');
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome do produto.');
    if (isComposite && compositeItems.length === 0) return Alert.alert('Erro', 'Adicione ao menos um item ao produto composto.');
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
      photoUri: photoUri || null,
      code: code.trim() || null,
      allowDiscount,
      stock: st,
      minStock: minSt,
      supplierId: supplierId || null,
      isComposite,
      items: isComposite ? compositeItems : undefined,
    };
    onSave(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.header}>
              <Text style={[s.title, { color: colors.text }]}>{editingItem ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</Text>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.scrollContent}>
              <TouchableOpacity onPress={pickImage} style={[s.photoArea, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.photoImg} resizeMode="cover" />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Ionicons name="add-circle-outline" size={48} color={colors.primary} />
                    <Text style={[s.photoHint, { color: colors.textSecondary }]}>Toque para adicionar foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={s.photoActions}>
                <TouchableOpacity style={[s.photoBtn, { borderColor: colors.primary }]} onPress={pickImage}>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                  <Text style={[s.photoBtnText, { color: colors.primary }]}>Carregar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.photoBtnOutline, { borderColor: colors.border }]} onPress={pickImage}>
                  <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                  <Text style={[s.photoBtnTextOutline, { color: colors.textSecondary }]}>Editar</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.photoSubHint, { color: colors.textSecondary }]}>Toque na foto para escolher outra</Text>

              <Text style={[s.label, { color: colors.textSecondary }]}>NOME (EX: CAMISA)</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="Camisa, Calça..." value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />

              <TouchableOpacity style={[s.compositeRow, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setIsComposite(!isComposite)}>
                <Text style={[s.compositeLabel, { color: colors.text }]} numberOfLines={2}>
                  PRODUTO COMPOSTO (VÁRIOS PRODUTOS/SERVIÇOS EM UM SÓ)
                </Text>
                <View style={[s.checkCircle, { backgroundColor: isComposite ? colors.primary : 'transparent', borderColor: colors.primary }]}>
                  {isComposite && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>

              {isComposite && (
                <>
                  {getCompositeSummary() && (
                    <Text style={[s.summary, { color: colors.textSecondary }]} numberOfLines={2}>
                      {getCompositeSummary()}
                    </Text>
                  )}
                  {compositeItems.map((ci, idx) => {
                    const it = ci.type === 'product' ? products.find((p) => p.id === ci.id) : services.find((s) => s.id === ci.id);
                    return (
                      <View key={`${ci.type}-${ci.id}-${idx}`} style={[s.itemCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <View style={s.itemHeader}>
                          <Text style={[s.itemLabel, { color: colors.text }]}>ITEM {idx + 1}</Text>
                          <TouchableOpacity style={s.trashBtn} onPress={() => removeCompositeItem(idx)}>
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        <View style={s.itemRow}>
                          <TouchableOpacity style={[s.typeSelect, { borderColor: colors.border }]} onPress={() => updateCompositeItem(idx, { type: ci.type === 'product' ? 'service' : 'product', id: null })}>
                            <Text style={{ color: colors.text, fontSize: 14 }}>{ci.type === 'product' ? 'Produto' : 'Serviço'}</Text>
                            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TextInput
                            style={[s.qtyInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                            value={String(ci.qty)}
                            onChangeText={(t) => updateCompositeItem(idx, { qty: Math.max(1, parseInt(t.replace(/\D/g, ''), 10) || 1) })}
                            keyboardType="number-pad"
                          />
                        </View>
                        <TouchableOpacity style={[s.selectInput, { borderColor: colors.border }]} onPress={() => setShowItemPicker(idx)}>
                          <Text style={[s.selectText, { color: it?.name ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                            {ci.type === 'product' ? (it?.name || 'Selecione produto') : (it?.name || 'Selecione serviço')}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  <TouchableOpacity style={[s.addItemBtn, { backgroundColor: colors.primary }]} onPress={() => setShowItemPicker('new')}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={s.addItemText}>ADICIONAR ITEM AO COMPOSTO</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={[s.label, { color: colors.textSecondary }]}>VARIAÇÕES (TAMANHO, COR, MARCA, ESTOQUE)</Text>
              <TouchableOpacity style={[s.select, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                <Text style={[s.selectText, { color: colors.textSecondary }]}>Nenhum</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[s.label, { color: colors.textSecondary }]}>FORNECEDOR</Text>
              <View style={s.row}>
                <TouchableOpacity style={[s.select, { borderColor: colors.border, backgroundColor: colors.bg, flex: 1 }]} onPress={() => setShowSupplierPicker(true)}>
                  <Text style={[s.selectText, { color: suppliers.find((s) => s.id === supplierId)?.name ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                    {suppliers.find((s) => s.id === supplierId)?.name || 'Nenhum'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSupplierPicker(true)}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.addBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>

              {showSupplierPicker && (
                <View style={[s.picker, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <TouchableOpacity style={s.pickerItem} onPress={() => { setSupplierId(null); setShowSupplierPicker(false); }}>
                    <Text style={{ color: colors.text }}>Nenhum</Text>
                  </TouchableOpacity>
                  {suppliers.map((sup) => (
                    <TouchableOpacity key={sup.id} style={s.pickerItem} onPress={() => { setSupplierId(sup.id); setShowSupplierPicker(false); }}>
                      <Text style={{ color: colors.text }}>{sup.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.pickerItem} onPress={() => setShowSupplierPicker(false)}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.row}>
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
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="SKU, ref..." value={code} onChangeText={setCode} placeholderTextColor={colors.textSecondary} />

              <Text style={[s.label, { color: colors.textSecondary }]}>PERMITIR DESCONTO NA VENDA?</Text>
              <View style={s.toggleRow}>
                <TouchableOpacity style={[s.toggleOpt, !allowDiscount && { backgroundColor: colors.primary }]} onPress={() => setAllowDiscount(false)}>
                  <Text style={[s.toggleText, { color: allowDiscount ? colors.text : '#fff' }]}>NÃO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.toggleOpt, allowDiscount && { backgroundColor: colors.primary }]} onPress={() => setAllowDiscount(true)}>
                  <Text style={[s.toggleText, { color: allowDiscount ? '#fff' : colors.text }]}>SIM</Text>
                </TouchableOpacity>
              </View>

              <View style={s.row}>
                <View style={s.half}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>ESTOQUE ATUAL</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="0" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={s.half}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>ESTOQUE MÍNIMO</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="0" value={minStock} onChangeText={setMinStock} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>
              <Text style={[s.hint, { color: colors.textSecondary }]}>Alerta quando estoque estiver abaixo do mínimo</Text>
            </ScrollView>

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{editingItem ? 'Salvar alterações' : 'CADASTRAR PRODUTO'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>

      {showItemPicker !== null && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowItemPicker(null)}>
            <View style={[s.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Adicionar ao composto</Text>
              <ScrollView style={{ maxHeight: 280 }}>
                <Text style={[s.pickerSection, { color: colors.textSecondary }]}>Produtos</Text>
                {products.map((p) => (
                  <TouchableOpacity key={`p-${p.id}`} style={s.pickerItem} onPress={() => (showItemPicker === 'new' ? addCompositeItem('product', p.id) : updateCompositeItem(showItemPicker, { type: 'product', id: p.id }))}>
                    <Text style={{ color: colors.text }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={[s.pickerSection, { color: colors.textSecondary }]}>Serviços</Text>
                {services.map((s) => (
                  <TouchableOpacity key={`s-${s.id}`} style={s.pickerItem} onPress={() => (showItemPicker === 'new' ? addCompositeItem('service', s.id) : updateCompositeItem(showItemPicker, { type: 'service', id: s.id }))}>
                    <Text style={{ color: colors.text }}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.pickerClose, { backgroundColor: colors.primary }]} onPress={() => setShowItemPicker(null)}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: GAP },
  keyboardView: { flex: 1, width: '100%', justifyContent: 'center', maxHeight: '95%' },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: 20,
    padding: GAP,
    maxHeight: '95%',
    borderWidth: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: GAP },
  title: { fontSize: 18, fontWeight: '700', textTransform: 'uppercase' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scroll: { maxHeight: SCROLL_MAX_HEIGHT },
  scrollContent: { paddingBottom: GAP },
  photoArea: { width: '100%', aspectRatio: 1.6, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', marginBottom: GAP },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  photoHint: { fontSize: 14 },
  photoActions: { flexDirection: 'row', gap: GAP, marginBottom: GAP / 2 },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 2 },
  photoBtnText: { fontSize: 14, fontWeight: '600' },
  photoBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 2 },
  photoBtnTextOutline: { fontSize: 14, fontWeight: '600' },
  photoSubHint: { fontSize: 11, marginBottom: GAP },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  compositeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: GAP },
  compositeLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  summary: { fontSize: 13, marginBottom: GAP },
  itemCard: { padding: GAP, borderRadius: 12, borderWidth: 1, marginBottom: GAP },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemLabel: { fontSize: 12, fontWeight: '700' },
  trashBtn: { padding: 4 },
  itemRow: { flexDirection: 'row', gap: GAP, marginBottom: 8 },
  typeSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  qtyInput: { width: 60, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, textAlign: 'center' },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: GAP },
  addItemText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: GAP },
  half: { flex: 1 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  selectText: { fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  toggleOpt: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 6, marginBottom: GAP },
  picker: { marginTop: 8, borderRadius: 12, borderWidth: 1, maxHeight: 150 },
  pickerItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  pickerCard: { borderRadius: 16, borderWidth: 1, padding: 16, maxHeight: 360 },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerSection: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  pickerClose: { marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
