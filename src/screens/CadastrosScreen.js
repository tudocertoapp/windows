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
import { FornecedorModal } from '../components/FornecedorModal';
import { FaturaModal } from '../components/FaturaModal';
import { ServicoFormModal } from '../components/ServicoFormModal';
import { TarefaFormModal } from '../components/TarefaFormModal';
import { GlassCard } from '../components/GlassCard';
import { DatePickerInput } from '../components/DatePickerInput';
import { TimePickerInput } from '../components/TimePickerInput';
import { playTapSound } from '../utils/sounds';

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

const SECTIONS = [
  { id: 'clientes', label: 'Clientes', icon: 'people-outline' },
  { id: 'produtos', label: 'Produtos', icon: 'cube-outline' },
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
  listIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
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

export function CadastrosScreen({ route, initialSection, initialEditItemId, onClose, isModal }) {
  const sectionFromRoute = initialSection || route?.params?.section || 'clientes';
  const [section, setSection] = useState(sectionFromRoute);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [boletosTipo, setBoletosTipo] = useState('todos');
  const now = new Date();
  const [boletosMes, setBoletosMes] = useState(now.getMonth() + 1);
  const [boletosAno, setBoletosAno] = useState(now.getFullYear());
  const [boletosFiltroMesAno, setBoletosFiltroMesAno] = useState(true);

  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const { items, add, update, remove, fields, labels, titleKey, subKey, hasFoto, hasNivel, hasPaid } = useSectionData(section);

  useEffect(() => {
    if (initialSection) setSection(initialSection);
    else if (route?.params?.section) setSection(route.params.section);
  }, [initialSection, route?.params?.section]);

  useEffect(() => {
    if (initialEditItemId && section === 'tarefas') {
      const list = items || [];
      const item = list.find((i) => i.id === initialEditItemId);
      if (item) {
        setEditingItem(item);
        setFormData({
          title: item.title || '',
          priority: item.priority || 'media',
          date: item.date || todayStr(),
          showTime: !!(item.timeStart || item.timeEnd),
          timeStart: item.timeStart || '',
          timeEnd: item.timeEnd || '',
          description: item.description || '',
          important: item.important ?? false,
        });
        setShowForm(true);
      }
    }
  }, [initialEditItemId, section, items]);

  useEffect(() => {
    if (!showEmpresaFeatures && ['clientes', 'fornecedores'].includes(section)) {
      setSection('produtos');
    }
  }, [showEmpresaFeatures, section]);
  const parseBoletoDate = (str) => {
    if (!str || !String(str).trim()) return null;
    const parts = String(str).trim().split(/[/\-.]/);
    if (parts.length < 2) return null;
    const day = parseInt(parts[0], 10) || 1;
    const month = parseInt(parts[1], 10) || 1;
    const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
    return { day, month, year };
  };
  const baseBoletos = section === 'boletos'
    ? (showEmpresaFeatures ? (items || []).filter((i) => boletosTipo === 'todos' ? true : (i.tipo || 'pessoal') === boletosTipo) : (items || []))
    : [];
  const filteredItems = section === 'boletos'
    ? (boletosFiltroMesAno ? baseBoletos.filter((i) => {
        const d = parseBoletoDate(i.dueDate);
        if (!d) return false;
        return d.month === boletosMes && d.year === boletosAno;
      }) : baseBoletos)
    : (items || []);
  const { addProduct, updateProduct } = useFinance();

  const handleProductSave = (data) => {
    if (data?._skipAdd) {
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      return;
    }
    if (editingItem) {
      updateProduct(editingItem.id, data);
    } else {
      addProduct(data);
    }
    setShowForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleFornecedorSave = (data) => {
    if (editingItem) update(editingItem.id, data);
    else add(data);
    setShowForm(false);
    setEditingItem(null);
  };

  const handleFaturaSave = (data) => {
    if (editingItem) update(editingItem.id, data);
    else add(data);
    setShowForm(false);
    setEditingItem(null);
  };

  const handleServicoSave = (data) => {
    if (editingItem) update(editingItem.id, data);
    else add(data);
    setShowForm(false);
    setEditingItem(null);
  };

  const handleTarefaSave = (data) => {
    if (editingItem) update(editingItem.id, data);
    else add(data);
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (section === 'produtos') return;
    const entry = {};
    fields.forEach((f) => (entry[f] = (formData[f] || '').trim()));
    const required = section === 'tarefas' ? 'title' : fields[0];
    const requiredVal = section === 'tarefas' ? (entry.title || formData.title || '').trim() : entry[required];
    if (!requiredVal) return Alert.alert('Erro', section === 'tarefas' ? 'Preencha o título da tarefa.' : `Preencha ${labels[required]}.`);
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
      entry.tipo = formData.tipo || 'pessoal';
    }
    if (section === 'clientes') {
      entry.foto = formData.foto || null;
      entry.nivel = formData.nivel || 'orcamento';
    }
    if (section === 'tarefas') {
      entry.title = (formData.title || '').trim();
      entry.checked = editingItem ? editingItem.checked : false;
      entry.important = formData.important ?? false;
      entry.priority = formData.priority || 'media';
      entry.date = formData.date || todayStr();
      entry.timeStart = formData.showTime ? (formData.timeStart || null) : null;
      entry.timeEnd = formData.showTime ? (formData.timeEnd || null) : null;
      entry.description = (formData.description || '').trim() || null;
      if (editingItem) entry.sortOrder = editingItem.sortOrder ?? 0;
    }
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
    setFormData(section === 'tarefas' ? { title: '', priority: 'media', date: todayStr(), showTime: false, timeStart: '', timeEnd: '', description: '', important: false } : {});
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
    if (section === 'boletos') {
      data.paid = item.paid ?? false;
      data.tipo = item.tipo || 'pessoal';
    }
    if (section === 'tarefas') {
      data.title = item.title || '';
      data.priority = item.priority || 'media';
      data.date = item.date || todayStr();
      data.showTime = !!(item.timeStart || item.timeEnd);
      data.timeStart = item.timeStart || '';
      data.timeEnd = item.timeEnd || '';
      data.description = item.description || '';
      data.important = item.important ?? false;
    }
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
          {SECTIONS.filter((s) => (['clientes', 'fornecedores'].includes(s.id) ? showEmpresaFeatures : true)).map((s) => (
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
      {section === 'boletos' && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              style={[cs.segmentBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: boletosFiltroMesAno ? colors.primary : colors.primaryRgba(0.15), paddingHorizontal: 12 }]}
              onPress={() => { playTapSound(); setBoletosFiltroMesAno(true); }}
            >
              <Ionicons name="calendar-outline" size={18} color={boletosFiltroMesAno ? '#fff' : colors.text} />
              <Text style={[cs.segmentText, { color: boletosFiltroMesAno ? '#fff' : colors.text }]}>Mês/Ano</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.segmentBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: !boletosFiltroMesAno ? colors.primary : colors.primaryRgba(0.15), paddingHorizontal: 12 }]}
              onPress={() => { playTapSound(); setBoletosFiltroMesAno(false); }}
            >
              <Ionicons name="list" size={18} color={!boletosFiltroMesAno ? '#fff' : colors.text} />
              <Text style={[cs.segmentText, { color: !boletosFiltroMesAno ? '#fff' : colors.text }]}>Todos</Text>
            </TouchableOpacity>
            {boletosFiltroMesAno && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 200 }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                    <TouchableOpacity key={m} onPress={() => { playTapSound(); setBoletosMes(m); }} style={[cs.segmentBtn, { backgroundColor: boletosMes === m ? colors.primary : colors.primaryRgba(0.12), paddingHorizontal: 10 }]}>
                      <Text style={[cs.segmentText, { fontSize: 12, color: boletosMes === m ? '#fff' : colors.text }]}>{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity onPress={() => { playTapSound(); setBoletosAno((a) => Math.max(2020, a - 1)); }} style={[cs.segmentBtn, { backgroundColor: colors.primaryRgba(0.12), paddingHorizontal: 10 }]}>
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                  </TouchableOpacity>
                  <View style={[cs.segmentBtn, { backgroundColor: colors.primaryRgba(0.12), paddingHorizontal: 12, justifyContent: 'center' }]}>
                    <Text style={[cs.segmentText, { color: colors.text, fontSize: 13 }]}>{boletosAno}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { playTapSound(); setBoletosAno((a) => Math.min(2030, a + 1)); }} style={[cs.segmentBtn, { backgroundColor: colors.primaryRgba(0.12), paddingHorizontal: 10 }]}>
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          {showEmpresaFeatures && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[cs.segmentBtn, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: boletosTipo === 'todos' ? colors.primary : colors.primaryRgba(0.15) }]}
                onPress={() => { playTapSound(); setBoletosTipo('todos'); }}
              >
                <Ionicons name="list" size={18} color={boletosTipo === 'todos' ? '#fff' : colors.text} />
                <Text style={[cs.segmentText, { color: boletosTipo === 'todos' ? '#fff' : colors.text }]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cs.segmentBtn, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: boletosTipo === 'pessoal' ? colors.primary : colors.primaryRgba(0.15) }]}
                onPress={() => { playTapSound(); setBoletosTipo('pessoal'); }}
              >
                <Ionicons name="person-outline" size={18} color={boletosTipo === 'pessoal' ? '#fff' : colors.text} />
                <Text style={[cs.segmentText, { color: boletosTipo === 'pessoal' ? '#fff' : colors.text }]}>Pessoal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cs.segmentBtn, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: boletosTipo === 'empresa' ? '#6366f1' : 'rgba(99,102,241,0.15)' }]}
                onPress={() => { playTapSound(); setBoletosTipo('empresa'); }}
              >
                <Ionicons name="business-outline" size={18} color={boletosTipo === 'empresa' ? '#fff' : colors.text} />
                <Text style={[cs.segmentText, { color: boletosTipo === 'empresa' ? '#fff' : colors.text }]}>Empresa</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {section === 'produtos' ? (
        <ProductFormModal
          visible={showForm}
          onClose={() => { setShowForm(false); setEditingItem(null); setFormData({}); }}
          onSave={handleProductSave}
          editingItem={editingItem}
        />
      ) : section === 'fornecedores' ? (
        <FornecedorModal
          visible={showForm}
          fornecedor={editingItem}
          onSave={handleFornecedorSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      ) : section === 'boletos' ? (
        <FaturaModal
          visible={showForm}
          fatura={editingItem}
          onSave={handleFaturaSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      ) : section === 'servicos' ? (
        <ServicoFormModal
          visible={showForm}
          servico={editingItem}
          onSave={handleServicoSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      ) : section === 'tarefas' ? (
        <TarefaFormModal
          visible={showForm}
          tarefa={editingItem}
          onSave={handleTarefaSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      ) : (
      <Modal visible={showForm} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowForm(false); setEditingItem(null); setFormData({}); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxHeight: '90%' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[cs.form, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{editingItem ? 'Editar' : 'Novo cadastro'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {section !== 'tarefas' && (
                <TouchableOpacity onPress={() => Keyboard.dismiss()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="keyboard-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setShowForm(false); setEditingItem(null); setFormData({}); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ maxHeight: 360 }}>
          {section === 'tarefas' ? (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Título</Text>
              <TextInput style={[cs.input, { borderColor: colors.border, color: colors.text }]} placeholder="Título da tarefa" value={formData.title || ''} onChangeText={(t) => setFormData((prev) => ({ ...prev, title: t }))} placeholderTextColor={colors.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Nível de prioridade</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[{ id: 'baixa', label: 'Baixa' }, { id: 'media', label: 'Média' }, { id: 'alta', label: 'Alta' }, { id: 'urgente', label: 'Urgente' }].map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => setFormData((prev) => ({ ...prev, priority: p.id }))} style={{ flex: 1, minWidth: 70, padding: 12, borderRadius: 12, backgroundColor: (formData.priority || 'media') === p.id ? colors.primary : colors.border, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: (formData.priority || 'media') === p.id ? '#fff' : colors.text }}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Data</Text>
              <DatePickerInput value={formData.date || todayStr()} onChange={(v) => setFormData((prev) => ({ ...prev, date: v }))} colors={colors} style={{ backgroundColor: colors.bg }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Adicionar horário</Text>
                <Switch value={formData.showTime ?? false} onValueChange={(v) => setFormData((prev) => ({ ...prev, showTime: v }))} trackColor={{ false: '#e5e7eb', true: colors.primary }} thumbColor="#fff" />
              </View>
              {formData.showTime && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>De</Text>
                    <TimePickerInput value={formData.timeStart} onChange={(v) => setFormData((prev) => ({ ...prev, timeStart: v }))} placeholder="09:00" colors={colors} style={{ backgroundColor: colors.bg }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Até</Text>
                    <TimePickerInput value={formData.timeEnd} onChange={(v) => setFormData((prev) => ({ ...prev, timeEnd: v }))} placeholder="17:00" colors={colors} style={{ backgroundColor: colors.bg }} />
                  </View>
                </View>
              )}
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Descrição (o que será feito)</Text>
              <TextInput style={[cs.input, { borderColor: colors.border, color: colors.text, minHeight: 80, textAlignVertical: 'top' }]} placeholder="Detalhes da tarefa..." value={formData.description || ''} onChangeText={(t) => setFormData((prev) => ({ ...prev, description: t }))} placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} />
            </>
          ) : (
          fields.map((f) => (
            <TextInput
              key={f}
              style={[cs.input, { borderColor: colors.border, color: colors.text }]}
              placeholder={labels[f]}
              value={formData[f] || ''}
              onChangeText={(t) => setFormData((prev) => ({ ...prev, [f]: t }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType={f === 'price' || f === 'amount' ? 'decimal-pad' : 'default'}
            />
          )))}
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
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  </View>
                )}
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>{formData.foto ? 'Trocar foto' : 'Carregar foto'}</Text>
              </TouchableOpacity>
            </>
          )}
          {showEmpresaFeatures && section === 'boletos' && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { id: 'pessoal', label: 'Pessoal' },
                  { id: 'empresa', label: 'Empresa' },
                ].map((n) => (
                  <TouchableOpacity key={n.id} onPress={() => setFormData((prev) => ({ ...prev, tipo: n.id }))} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: (formData.tipo || 'pessoal') === n.id ? colors.primary : colors.border, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: (formData.tipo || 'pessoal') === n.id ? '#fff' : colors.text }}>{n.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          {section === 'tarefas' && (
            <TouchableOpacity onPress={() => setFormData((prev) => ({ ...prev, important: !(prev.important ?? false) }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 8 }}>
              <Ionicons name={formData.important ? 'star' : 'star-outline'} size={24} color={formData.important ? '#f59e0b' : colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Marcar como importante</Text>
            </TouchableOpacity>
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
      {section === 'tarefas' ? (
        <View style={{ paddingVertical: 8, paddingBottom: 100, paddingHorizontal: 16 }}>
          {(() => {
            const prOrd = (p) => ({ urgente: 4, alta: 3, media: 2, baixa: 1 }[p] || 2);
            const parseDt = (str) => {
              if (!str) return new Date(0);
              const parts = String(str).trim().split(/[/\-]/);
              if (parts.length < 3) return new Date(0);
              return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            };
            const tarefas = filteredItems || [];
            const aFazer = tarefas.filter((t) => !t.checked).sort((a, b) => {
              const oa = a.sortOrder ?? 999; const ob = b.sortOrder ?? 999;
              if (oa !== ob) return oa - ob;
              const da = parseDt(a.date); const db = parseDt(b.date);
              if (da.getTime() !== db.getTime()) return da - db;
              return prOrd(b.priority) - prOrd(a.priority);
            });
            const concluidas = tarefas.filter((t) => t.checked).sort((a, b) => parseDt(b.date) - parseDt(a.date));
            const moveUp = (t) => {
              const idx = aFazer.findIndex((x) => x.id === t.id);
              if (idx <= 0) return;
              const prev = aFazer[idx - 1];
              const soCur = t.sortOrder ?? idx;
              const soPrev = prev.sortOrder ?? idx - 1;
              update(t.id, { sortOrder: soPrev });
              update(prev.id, { sortOrder: soCur });
            };
            const moveDown = (t) => {
              const idx = aFazer.findIndex((x) => x.id === t.id);
              if (idx < 0 || idx >= aFazer.length - 1) return;
              const next = aFazer[idx + 1];
              const soCur = t.sortOrder ?? idx;
              const soNext = next.sortOrder ?? idx + 1;
              update(t.id, { sortOrder: soNext });
              update(next.id, { sortOrder: soCur });
            };
            const renderTarefa = (t, isConcluida, showReorder) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: colors.primary + '40', marginBottom: 8, paddingRight: 8 }}>
                {showReorder && (
                  <View style={{ flexDirection: 'column', gap: 2 }}>
                    <TouchableOpacity onPress={() => { playTapSound(); moveUp(t); }} style={{ padding: 4 }}>
                      <Ionicons name="chevron-up" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { playTapSound(); moveDown(t); }} style={{ padding: 4 }}>
                      <Ionicons name="chevron-down" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity onPress={() => { playTapSound(); update(t.id, { important: !(t.important ?? false) }); }} style={{ padding: 6 }}>
                  <Ionicons name={t.important ? 'star' : 'star-outline'} size={20} color={t.important ? '#f59e0b' : colors.textSecondary} />
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, color: colors.text, textDecorationLine: isConcluida ? 'line-through' : 'none' }} numberOfLines={2}>{t.title}</Text>
                  {(t.date || t.timeStart || t.description) && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                      {[t.date, t.timeStart && t.timeEnd ? `${t.timeStart}-${t.timeEnd}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => { playTapSound(); openEdit(t); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { playTapSound(); update(t.id, { checked: !t.checked }); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={t.checked ? 'arrow-undo' : 'checkmark-done'} size={22} color={t.checked ? colors.textSecondary : '#10b981'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { playTapSound(); confirmDelete(t); }} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
            return (
              <>
                <GlassCard colors={colors} style={{ marginBottom: 16, padding: 16, borderWidth: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Tarefas a fazer</Text>
                  {aFazer.length === 0 ? (
                    <Text style={{ fontSize: 14, color: colors.textSecondary, paddingVertical: 8 }}>Nenhuma tarefa pendente</Text>
                  ) : (
                    aFazer.map((t) => renderTarefa(t, false, true))
                  )}
                </GlassCard>
                <GlassCard colors={colors} style={{ padding: 16, borderWidth: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Tarefas concluídas</Text>
                  {concluidas.length === 0 ? (
                    <Text style={{ fontSize: 14, color: colors.textSecondary, paddingVertical: 8 }}>Nenhuma tarefa concluída</Text>
                  ) : (
                    concluidas.map((t) => renderTarefa(t, true, false))
                  )}
                </GlassCard>
              </>
            );
          })()}
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={cs.empty}>
          <Ionicons name={sectionInfo.icon} size={48} color={colors.textSecondary} />
          <Text style={[cs.emptyText, { color: colors.textSecondary }]}>Nenhum item cadastrado</Text>
        </View>
      ) : (
        <View style={{ paddingVertical: 8, paddingBottom: 100 }}>
          {filteredItems.map((item) => (
            <View key={item.id} style={[cs.listItem, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', opacity: section === 'boletos' && item.paid ? 0.7 : 1 }]}>
              {(section === 'clientes' && item.foto) || (section === 'produtos' && (item.photoUri || item.photoUris?.[0])) ? (
                <Image source={{ uri: (section === 'clientes' ? item.foto : (item.photoUri || item.photoUris?.[0])) }} style={[cs.listIcon, { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }]} resizeMode="cover" />
              ) : (
                <View style={[cs.listIcon, { backgroundColor: 'transparent' }]}>
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
                  <TouchableOpacity onPress={() => update(item.id, { paid: !item.paid })} style={{ padding: 8, borderRadius: 8, backgroundColor: 'transparent' }}>
                    <Ionicons name={item.paid ? 'checkmark-done' : 'checkmark-done-outline'} size={18} color={item.paid ? '#10b981' : colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 8, borderRadius: 8, backgroundColor: 'transparent' }}>
                  <Ionicons name="pencil" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 8, borderRadius: 8, backgroundColor: 'transparent' }}>
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
