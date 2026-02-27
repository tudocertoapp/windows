import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { ProductFormModal } from '../components/ProductFormModal';

const SECTIONS = [
  { id: 'clientes', label: 'Clientes', icon: 'people-outline' },
  { id: 'produtos', label: 'Produtos', icon: 'cube-outline' },
  { id: 'produtos_compostos', label: 'Compostos', icon: 'layers-outline' },
  { id: 'servicos', label: 'Serviços', icon: 'construct-outline' },
  { id: 'tarefas', label: 'Tarefas', icon: 'checkbox-outline' },
  { id: 'boletos', label: 'Boletos', icon: 'document-text-outline' },
  { id: 'fornecedores', label: 'Fornecedores', icon: 'business-outline' },
];

const cs = StyleSheet.create({
  segment: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  segmentBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  segmentText: { fontSize: 13, fontWeight: '600' },
  form: { margin: 16, padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginHorizontal: 16, marginBottom: 8, gap: 12 },
  listIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  listBody: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listSub: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#6b7280' },
});

function useSectionData(section) {
  const finance = useFinance();
  switch (section) {
    case 'clientes':
      return { items: finance.clients, add: finance.addClient, update: finance.updateClient, remove: finance.deleteClient, fields: ['name', 'email', 'phone'], labels: { name: 'Nome', email: 'E-mail', phone: 'Telefone' }, titleKey: 'name', subKey: 'email', hasFoto: true, hasNivel: true };
    case 'produtos':
      return { items: finance.products, add: finance.addProduct, update: finance.updateProduct, remove: finance.deleteProduct, fields: ['name', 'costPrice', 'price', 'discount', 'unit'], labels: { name: 'Nome', costPrice: 'Custo (R$)', price: 'Venda (R$)', discount: 'Desconto (R$)', unit: 'Unidade' }, titleKey: 'name', subKey: 'price' };
    case 'produtos_compostos':
      return { items: finance.compositeProducts, add: finance.addCompositeProduct, update: finance.updateCompositeProduct, remove: finance.deleteCompositeProduct, fields: ['name', 'price'], labels: { name: 'Nome do pacote', price: 'Preço (R$)' }, titleKey: 'name', subKey: 'price', isComposite: true };
    case 'servicos':
      return { items: finance.services, add: finance.addService, update: finance.updateService, remove: finance.deleteService, fields: ['name', 'price', 'discount'], labels: { name: 'Nome', price: 'Preço (R$)', discount: 'Desconto (R$)' }, titleKey: 'name', subKey: 'price' };
    case 'tarefas':
      return { items: finance.checkListItems, add: finance.addCheckListItem, update: finance.updateCheckListItem, remove: finance.deleteCheckListItem, fields: ['title'], labels: { title: 'Tarefa' }, titleKey: 'title', subKey: null };
    case 'boletos':
      return { items: finance.boletos, add: finance.addBoleto, update: finance.updateBoleto, remove: finance.deleteBoleto, fields: ['name', 'dueDate', 'amount'], labels: { name: 'Descrição', dueDate: 'Vencimento', amount: 'Valor' }, titleKey: 'name', subKey: 'amount', hasPaid: true };
    case 'fornecedores':
      return { items: finance.suppliers, add: finance.addSupplier, update: finance.updateSupplier, remove: finance.deleteSupplier, fields: ['name', 'email', 'phone'], labels: { name: 'Nome', email: 'E-mail', phone: 'Telefone' }, titleKey: 'name', subKey: 'email' };
    default:
      return { items: [], add: () => {}, update: () => {}, remove: () => {}, fields: [], labels: {}, titleKey: 'name', subKey: null };
  }
}

export function CadastrosScreen({ route, initialSection, onClose, isModal }) {
  const sectionFromRoute = initialSection || route?.params?.section || 'clientes';
  const [section, setSection] = useState(sectionFromRoute);
  useEffect(() => {
    if (initialSection) setSection(initialSection);
    else if (route?.params?.section) setSection(route.params.section);
  }, [initialSection, route?.params?.section]);
  useEffect(() => {
    if (!showEmpresaFeatures && ['clientes', 'produtos_compostos', 'fornecedores'].includes(section)) {
      setSection('produtos');
    }
  }, [showEmpresaFeatures]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const { items, add, update, remove, fields, labels, titleKey, subKey, isComposite, hasFoto, hasNivel, hasPaid } = useSectionData(section);
  const { products, services, addProduct, updateProduct, addCompositeProduct } = useFinance();

  const handleProductSave = (data) => {
    const { isComposite: composite, items: compItems, ...rest } = data;
    if (composite && compItems?.length) {
      addCompositeProduct({ name: rest.name, data: { ...rest, items: compItems } });
    } else if (editingItem) {
      updateProduct(editingItem.id, rest);
    } else {
      addProduct(rest);
    }
    setShowForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSave = () => {
    if (section === 'produtos') return;
    const entry = {};
    fields.forEach((f) => (entry[f] = (formData[f] || '').trim()));
    const required = fields[0];
    if (!entry[required]) return Alert.alert('Erro', `Preencha ${labels[required]}.`);
    if (section === 'produtos_compostos') {
      const p = parseFloat(String(entry.price).replace(',', '.'));
      entry.price = isNaN(p) ? 0 : p;
      entry.items = formData.items || [];
    }
    if (section === 'produtos') {
      const p = parseFloat(String(entry.price).replace(',', '.'));
      const c = parseFloat(String(entry.costPrice).replace(',', '.'));
      const d = parseFloat(String(entry.discount).replace(',', '.'));
      entry.price = isNaN(p) ? 0 : p;
      entry.costPrice = isNaN(c) ? 0 : c;
      entry.discount = isNaN(d) ? 0 : d;
    }
    if (section === 'servicos') {
      const p = parseFloat(String(entry.price).replace(',', '.'));
      const d = parseFloat(String(entry.discount).replace(',', '.'));
      entry.price = isNaN(p) ? 0 : p;
      entry.discount = isNaN(d) ? 0 : d;
    }
    if (section === 'boletos') {
      const a = parseFloat(String(entry.amount).replace(',', '.'));
      entry.amount = isNaN(a) ? 0 : a;
    }
    if (section === 'clientes') {
      entry.foto = formData.foto || null;
      entry.nivel = formData.nivel || 'orcamento';
    }
    if (section === 'tarefas') entry.checked = false;
    if (section === 'boletos') entry.paid = formData.paid ?? false;
    if (editingItem) {
      update(editingItem.id, entry);
    } else {
      add(entry);
    }
    setFormData({});
    setEditingItem(null);
    setShowForm(false);
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    const data = {};
    fields.forEach((f) => (data[f] = String(item[f] ?? '')));
    if (section === 'clientes') {
      data.foto = item.foto || null;
      data.nivel = item.nivel || 'orcamento';
    }
    if (section === 'boletos') data.paid = item.paid ?? false;
    if (section === 'produtos_compostos') data.items = item.items || [];
    setFormData(data);
    setShowForm(true);
  };

  const confirmDelete = (item) => {
    Alert.alert('Excluir', 'Remover este item?', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => remove(item.id) },
    ]);
  };

  const sectionInfo = SECTIONS.find((s) => s.id === section) || SECTIONS[0];
  const compositeItems = formData.items || [];
  const addCompositeItem = (t, id, qty = 1) => {
    const list = [...compositeItems];
    const idx = list.findIndex((x) => x.type === t && x.id === id);
    if (idx >= 0) list[idx].qty += qty;
    else list.push({ type: t, id, qty });
    setFormData((prev) => ({ ...prev, items: list }));
  };
  const removeCompositeItem = (idx) => {
    const list = [...compositeItems];
    list.splice(idx, 1);
    setFormData((prev) => ({ ...prev, items: list }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{sectionInfo.label}</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="Cadastros" colors={colors} />
      )}
      {!isModal && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={[cs.segment]}>
          {SECTIONS.filter((s) => (['clientes', 'produtos_compostos', 'fornecedores'].includes(s.id) ? showEmpresaFeatures : true)).map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[cs.segmentBtn, { backgroundColor: section === s.id ? colors.primary : colors.primaryRgba(0.15) }]}
              onPress={() => { setSection(s.id); setShowForm(false); setEditingItem(null); setFormData({}); }}
            >
              <Text style={[cs.segmentText, { color: section === s.id ? '#fff' : colors.text }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{sectionInfo.label}</Text>
        <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {section === 'produtos' ? (
        <ProductFormModal
          visible={showForm}
          onClose={() => { setShowForm(false); setEditingItem(null); setFormData({}); }}
          onSave={handleProductSave}
          editingItem={editingItem}
        />
      ) : (
      <Modal visible={showForm} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowForm(false); setEditingItem(null); setFormData({}); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxHeight: '90%' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[cs.form, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{editingItem ? 'Editar' : 'Novo cadastro'}</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setEditingItem(null); setFormData({}); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="close" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
          {fields.map((f) => (
            <TextInput
              key={f}
              style={[cs.input, { borderColor: colors.border, color: colors.text }]}
              placeholder={labels[f]}
              value={formData[f] || ''}
              onChangeText={(t) => setFormData((prev) => ({ ...prev, [f]: t }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType={f === 'price' || f === 'amount' ? 'decimal-pad' : 'default'}
            />
          ))}
          {hasFoto && section === 'clientes' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Foto do cliente</Text>
              <TouchableOpacity onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                if (!result.canceled) setFormData((prev) => ({ ...prev, foto: result.assets[0].uri }));
              }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg }}>
                {formData.foto ? (
                  <Image source={{ uri: formData.foto }} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  </View>
                )}
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>{formData.foto ? 'Trocar foto' : 'Carregar foto'}</Text>
              </TouchableOpacity>
            </>
          )}
          {hasPaid && section === 'boletos' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Pago</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>Conta paga?</Text>
                <Switch value={formData.paid ?? false} onValueChange={(v) => setFormData((prev) => ({ ...prev, paid: v }))} trackColor={{ false: '#e5e7eb', true: colors.primary }} thumbColor="#fff" />
              </View>
            </>
          )}
          {hasNivel && section === 'clientes' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Nível / Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { id: 'orcamento', label: 'Orçamento' },
                  { id: 'lead', label: 'Lead' },
                  { id: 'fechou', label: 'Fechou' },
                ].map((n) => (
                  <TouchableOpacity key={n.id} onPress={() => setFormData((prev) => ({ ...prev, nivel: n.id }))} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: (formData.nivel ?? 'orcamento') === n.id ? colors.primary : colors.border, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: (formData.nivel ?? 'orcamento') === n.id ? '#fff' : colors.text }}>{n.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {isComposite && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Itens do pacote</Text>
              {compositeItems.map((ci, idx) => {
                const it = ci.type === 'product' ? products.find((p) => p.id === ci.id) : services.find((s) => s.id === ci.id);
                return (
                  <View key={`${ci.type}-${ci.id}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, color: colors.text }}>{it?.name || '—'} (x{ci.qty})</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{ci.type === 'product' ? 'Produto' : 'Serviço'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeCompositeItem(idx)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Adicionar produto ou serviço:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {products.map((p) => (
                  <TouchableOpacity key={`p-${p.id}`} onPress={() => addCompositeItem('product', p.id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primaryRgba(0.2) }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>{p.name} +</Text>
                  </TouchableOpacity>
                ))}
                {services.map((s) => (
                  <TouchableOpacity key={`s-${s.id}`} onPress={() => addCompositeItem('service', s.id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primaryRgba(0.2) }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>{s.name} +</Text>
                  </TouchableOpacity>
                ))}
                {(products.length === 0 && services.length === 0) && <Text style={{ fontSize: 12, color: colors.textSecondary }}>Cadastre produtos e serviços antes</Text>}
              </View>
            </>
          )}
          </ScrollView>
          <TouchableOpacity style={[cs.saveBtn, { backgroundColor: colors.primary, marginTop: 8 }]} onPress={handleSave}>
            <Text style={cs.saveBtnText}>Cadastrar</Text>
          </TouchableOpacity>
          </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
      )}
      {items.length === 0 ? (
        <View style={cs.empty}>
          <Ionicons name={sectionInfo.icon} size={48} color={colors.textSecondary} />
          <Text style={[cs.emptyText, { color: colors.textSecondary }]}>Nenhum item cadastrado</Text>
        </View>
      ) : (
        <View style={{ paddingVertical: 8, paddingBottom: 100 }}>
          {items.map((item) => (
            <View key={item.id} style={[cs.listItem, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', opacity: section === 'boletos' && item.paid ? 0.7 : 1 }]}>
              {section === 'clientes' && item.foto ? (
                <Image source={{ uri: item.foto }} style={[cs.listIcon, { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }]} resizeMode="cover" />
              ) : (
                <View style={[cs.listIcon, { backgroundColor: colors.primaryRgba(0.2) }]}>
                  <Ionicons name={sectionInfo.icon} size={20} color={colors.primary} />
                </View>
              )}
              <View style={cs.listBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[cs.listTitle, { color: colors.text }]}>{item[titleKey] || '—'}</Text>
                  {section === 'clientes' && item.nivel && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: (item.nivel === 'fechou' ? '#10b981' : item.nivel === 'lead' ? '#f59e0b' : '#6b7280') + '30' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: item.nivel === 'fechou' ? '#10b981' : item.nivel === 'lead' ? '#f59e0b' : '#6b7280' }}>{item.nivel === 'fechou' ? 'Fechou' : item.nivel === 'lead' ? 'Lead' : 'Orçamento'}</Text>
                    </View>
                  )}
                </View>
                {subKey && item[subKey] != null && <Text style={[cs.listSub, { color: colors.textSecondary }]}>{typeof item[subKey] === 'number' ? `R$ ${item[subKey].toFixed(2)}` : item[subKey]}</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {section === 'boletos' && (
                  <TouchableOpacity onPress={() => update(item.id, { ...item, paid: !item.paid })} style={{ padding: 8, borderRadius: 8, backgroundColor: (item.paid ? '#10b981' : colors.border) + '40' }}>
                    <Ionicons name={item.paid ? 'checkmark-done' : 'checkmark-done-outline'} size={18} color={item.paid ? '#10b981' : colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.primaryRgba(0.2) }}>
                  <Ionicons name="pencil" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.2)' }}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
