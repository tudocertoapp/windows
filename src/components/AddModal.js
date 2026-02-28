import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBanks } from '../contexts/BanksContext';
import { usePlan } from '../contexts/PlanContext';
import { DatePickerInput } from './DatePickerInput';
import { TimePickerInput } from './TimePickerInput';
import { MoneyInput } from './MoneyInput';
import { parseMoney } from '../utils/format';
import { playTapSound } from '../utils/sounds';

const { width: SW, height: SH } = Dimensions.get('window');
const GAP = 16;
const BOX_MAX = Math.min(SW - 24, 420);
const FORM_MAX_HEIGHT = Math.round(SH * 0.88);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },
  box: { width: '100%', maxWidth: BOX_MAX, maxHeight: FORM_MAX_HEIGHT, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: GAP, borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: 'row', gap: GAP },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  pdvBox: { borderRadius: 16, borderWidth: 1, padding: GAP, marginBottom: GAP },
  pdvCard: { borderRadius: 16, padding: 20, marginBottom: GAP, minHeight: 200 },
});

const FORMAS_PAGAMENTO_RECEITA = [
  { id: 'dinheiro', label: 'Dinheiro', icon: 'wallet-outline' },
  { id: 'boleto', label: 'Boleto', icon: 'document-text-outline' },
  { id: 'prazo', label: 'Venda a prazo', icon: 'calendar-outline' },
  { id: 'pix', label: 'PIX', icon: 'phone-portrait-outline' },
  { id: 'credito', label: 'Crédito', icon: 'card-outline' },
];

const FORMAS_PAGAMENTO_DESPESA = [
  { id: 'dinheiro', label: 'Dinheiro', icon: 'wallet-outline' },
  { id: 'pix', label: 'PIX', icon: 'phone-portrait-outline' },
  { id: 'debito', label: 'Débito', icon: 'card-outline' },
  { id: 'credito', label: 'Crédito', icon: 'card' },
];

export function AddModal({ type, params, onClose }) {
  const { colors } = useTheme();
  const { addTransaction, addAgendaEvent, addClient, addProduct, addService, addCheckListItem, addSupplier, addAReceber, clients, products, services } = useFinance();
  const { banks, cards, getBankById, getBankName, deductFromBank, addToCardBalance } = useBanks();
  const { showEmpresaFeatures } = usePlan();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (params?.amount != null) setAmount(String(params.amount));
    if (params?.description != null) setDescription(params.description);
  }, [type, params]);
  useEffect(() => {
    if (type === 'receita') {
      setTipoVenda('pessoal');
      setClientId(null);
      setUseNow(true);
      setSaleItems([]);
      setSearchPdv('');
      setServicePriceModal(null);
    }
  }, [type]);
  useEffect(() => {
    if (type === 'cliente') {
      setPhotoUri(null);
      setClientNivel('orcamento');
    }
  }, [type]);
  useEffect(() => {
    if (!showEmpresaFeatures) setTipoVenda('pessoal');
  }, [showEmpresaFeatures, type]);
  useEffect(() => {
    if (type === 'despesa') {
      setFormaPagamentoDespesa('dinheiro');
      setDate([new Date().getDate(), new Date().getMonth() + 1, new Date().getFullYear()].map((x) => String(x).padStart(2, '0')).join('/'));
      const comDebito = (banks || []).filter((b) => (b.tipoConta || 'ambos') === 'debito' || (b.tipoConta || 'ambos') === 'ambos');
      const carts = cards || [];
      setDespesaBankId(comDebito[0]?.id || '');
      setDespesaCardId(carts[0]?.id || '');
    }
  }, [type, banks, cards]);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [unit, setUnit] = useState('un');
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [tipoVenda, setTipoVenda] = useState('pessoal');
  const tipoReceita = tipoVenda === 'empresa' ? 'venda' : 'outra';
  const [servicePriceModal, setServicePriceModal] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [useNow, setUseNow] = useState(true);
  const [saleItems, setSaleItems] = useState([]);
  const [searchPdv, setSearchPdv] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [parcelas, setParcelas] = useState('1');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [clientNivel, setClientNivel] = useState('orcamento');
  const [formaPagamentoDespesa, setFormaPagamentoDespesa] = useState('dinheiro');
  const [despesaBankId, setDespesaBankId] = useState('');
  const [despesaCardId, setDespesaCardId] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const banksComDebito = (banks || []).filter((b) => (b.tipoConta || 'ambos') === 'debito' || (b.tipoConta || 'ambos') === 'ambos');
  const cardsOrdenados = (cards || []).slice();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria para adicionar fotos.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const getTitle = () => {
    const t = { receita: 'Nova Receita', despesa: 'Nova Despesa', cliente: 'Novo Cliente', agenda: 'Novo Evento', produto: 'Novo Produto', servico: 'Novo Serviço', tarefa: 'Nova Tarefa', fornecedor: 'Novo Fornecedor' };
    return t[type] || 'Adicionar';
  };

  const toYMD = (d) => {
    if (!d || !d.trim()) return new Date().toISOString().slice(0, 10);
    const parts = d.trim().split('/');
    if (parts.length >= 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return new Date().toISOString().slice(0, 10);
  };

  const handleSubmit = () => {
    if (type === 'receita' || type === 'despesa') {
      const amtRaw = parseMoney(amount);
      const amt = tipoReceita === 'venda' && saleItems.length > 0 && amtRaw === 0 ? saleTotal : amtRaw;
      const descVal = parseMoney(discount);
      const valorFinal = Math.max(0, (isNaN(amt) ? 0 : amt) - descVal);
      const descFinal = description.trim() || (tipoReceita === 'venda' && saleItems.length > 0 ? saleItems.map((i) => `${i.name} x${i.qty || 1}`).join(', ') : '');
      if (!descFinal) return Alert.alert('Erro', 'Preencha o nome ou descrição.');
      if (valorFinal <= 0) return Alert.alert('Erro', 'Informe um valor maior que zero.');
      if (type === 'despesa' && formaPagamentoDespesa === 'debito' && !despesaBankId) return Alert.alert('Erro', 'Selecione o banco para débito.');
      if (type === 'despesa' && formaPagamentoDespesa === 'credito' && !despesaCardId) return Alert.alert('Erro', 'Selecione o cartão de crédito.');
      const dateVal = type === 'despesa' ? toYMD(date) : (useNow ? new Date().toISOString().slice(0, 10) : toYMD(date));
      const formaPag = type === 'despesa' ? formaPagamentoDespesa : formaPagamento;
      const tx = { type: type === 'receita' ? 'income' : 'expense', amount: valorFinal, description: descFinal, category: category || 'Outros', date: dateVal, formaPagamento: formaPag, tipoVenda, desconto: descVal };
      addTransaction(tx);
      if (type === 'despesa' && valorFinal > 0) {
        if (formaPagamentoDespesa === 'debito' && despesaBankId) deductFromBank(despesaBankId, valorFinal);
        if (formaPagamentoDespesa === 'credito' && despesaCardId) addToCardBalance(despesaCardId, valorFinal);
      }
      if (type === 'receita' && formaPagamento === 'prazo' && valorFinal > 0) {
        const n = parseInt(parcelas, 10) || 1;
        const dia = Math.min(28, Math.max(1, parseInt(diaVencimento, 10) || new Date().getDate()));
        const parcVal = valorFinal / n;
        for (let i = 0; i < n; i++) {
          const venc = new Date();
          venc.setMonth(venc.getMonth() + i);
          venc.setDate(dia);
          addAReceber({ description: descFinal, amount: parcVal, dueDate: `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}/${venc.getFullYear()}`, parcel: i + 1, total: n, status: 'pendente' });
        }
      }
    } else if (type === 'agenda') {
      if (!title.trim() || !date.trim()) return Alert.alert('Erro', 'Preencha título e data.');
      addAgendaEvent({ title: title.trim(), description, date, time, type: 'meeting' });
    } else if (type === 'cliente' || type === 'fornecedor') {
      if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
      const add = type === 'cliente' ? addClient : addSupplier;
      add(type === 'cliente' ? { name: name.trim(), email: email.trim(), phone: phone.trim(), foto: photoUri || null, nivel: clientNivel || 'orcamento' } : { name: name.trim(), email: email.trim(), phone: phone.trim() });
    } else if (type === 'produto') {
      if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
      addProduct({ name: name.trim(), price: parseMoney(price), costPrice: parseMoney(costPrice), discount: parseMoney(discount), unit: unit.trim() || 'un', photoUri: photoUri || null });
    } else if (type === 'servico') {
      if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
      addService({ name: name.trim(), price: parseMoney(price), discount: parseMoney(discount), photoUri: photoUri || null });
    } else if (type === 'tarefa') {
      if (!title.trim()) return Alert.alert('Erro', 'Preencha a tarefa.');
      addCheckListItem({ title: title.trim(), checked: false });
    }
    onClose();
  };

  const todayStr = () => {
    const d = new Date();
    return [d.getDate().toString().padStart(2, '0'), (d.getMonth() + 1).toString().padStart(2, '0'), d.getFullYear()].join('/');
  };

  const nowDateTimeStr = () => {
    const d = new Date();
    const date = [d.getDate(), d.getMonth() + 1, d.getFullYear()].map((x) => String(x).padStart(2, '0')).join('/');
    const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
    return `${date} ${time}`;
  };

  const addSaleItem = (item, isProduct = true, customPrice = null) => {
    const price = customPrice != null ? customPrice : (item.price || 0);
    const id = isProduct ? 'p-' + item.id : 's-' + item.id + '-' + String(price).replace('.', '_');
    const existing = saleItems.find((x) => x.id === id);
    let next;
    if (existing) {
      next = saleItems.map((x) => (x.id === id ? { ...x, qty: (x.qty || 1) + 1 } : x));
    } else {
      next = [...saleItems, { id, name: item.name, price, discount: 0, qty: 1, isProduct, allowDiscount: isProduct && (item.allowDiscount !== false) }];
    }
    setSaleItems(next);
    const total = next.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
    setAmount(total.toFixed(2));
    setSearchPdv('');
  };

  const incSaleItemQty = (itemId) => {
    const next = saleItems.map((x) => (x.id === itemId ? { ...x, qty: (x.qty || 1) + 1 } : x));
    setSaleItems(next);
    const total = next.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
    setAmount(total.toFixed(2));
  };

  const decSaleItemQty = (itemId) => {
    const item = saleItems.find((x) => x.id === itemId);
    if (!item || (item.qty || 1) <= 1) return removeSaleItem(itemId);
    const next = saleItems.map((x) => (x.id === itemId ? { ...x, qty: (x.qty || 1) - 1 } : x));
    setSaleItems(next);
    const total = next.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
    setAmount(total.toFixed(2));
  };

  const updateSaleItemDiscount = (itemId, discountVal) => {
    const d = parseMoney(discountVal);
    const next = saleItems.map((x) => (x.id === itemId ? { ...x, discount: isNaN(d) ? 0 : Math.max(0, d) } : x));
    setSaleItems(next);
    const total = next.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
    setAmount(total.toFixed(2));
  };

  const removeSaleItem = (id) => {
    const next = saleItems.filter((x) => x.id !== id);
    setSaleItems(next);
    const total = next.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
    setAmount(next.length > 0 ? total.toFixed(2) : '');
  };

  const saleTotal = saleItems.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);

  const filteredProducts = (products || []).filter((p) => p.name?.toLowerCase().includes((searchPdv || '').toLowerCase()));
  const filteredServices = (services || []).filter((s) => s.name?.toLowerCase().includes((searchPdv || '').toLowerCase()));
  const mostUsedCombined = (() => {
    const prods = (products || []).slice(0, 3).map((p) => ({ ...p, isProduct: true }));
    const servs = (services || []).slice(0, 3).map((s) => ({ ...s, isProduct: false }));
    return [...prods, ...servs].slice(0, 3);
  })();

  if (!type) return null;

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.box, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
          {servicePriceModal && (
            <Modal visible transparent animationType="fade">
              <TouchableOpacity style={[styles.overlay, { justifyContent: 'center', padding: GAP }]} activeOpacity={1} onPress={() => setServicePriceModal(null)}>
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.pdvCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Valor do serviço: {servicePriceModal.name}</Text>
                  <MoneyInput value={servicePriceModal ? String(servicePriceModal.price ?? 0) : ''} onChange={(v) => setServicePriceModal((prev) => prev ? { ...prev, price: parseMoney(v) || 0 } : null)} colors={colors} />
                  <View style={{ flexDirection: 'row', gap: GAP, marginTop: 12 }}>
                    <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: colors.border }]} onPress={() => setServicePriceModal(null)}>
                      <Text style={[styles.btnText, { color: colors.text }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => { addSaleItem(servicePriceModal, false, servicePriceModal.price); setServicePriceModal(null); }}>
                      <Text style={styles.btnText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>{type === 'receita' ? 'ADICIONAR RECEITA' : getTitle()}</Text>
          <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: FORM_MAX_HEIGHT - 140, flexGrow: 0 }} contentContainerStyle={{ paddingRight: 4, paddingBottom: GAP }}>
            {type === 'receita' && (
              <>
                {showEmpresaFeatures && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>MODO</Text>
                    <View style={[styles.toggleRow, { backgroundColor: colors.bg, borderRadius: 12, padding: 4 }]}>
                      <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: tipoVenda === 'pessoal' ? colors.primary : 'transparent' }]}
                        onPress={() => { setTipoVenda('pessoal'); setClientId(null); }}
                      >
                        <Ionicons name="document-text-outline" size={18} color={tipoVenda === 'pessoal' ? '#fff' : colors.text} />
                        <Text style={[styles.toggleText, { color: tipoVenda === 'pessoal' ? '#fff' : colors.text }]}>OUTRA RECEITA</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: tipoVenda === 'empresa' ? colors.primary : 'transparent' }]}
                        onPress={() => setTipoVenda('empresa')}
                      >
                        <Ionicons name="bag-outline" size={18} color={tipoVenda === 'empresa' ? '#fff' : colors.text} />
                        <Text style={[styles.toggleText, { color: tipoVenda === 'empresa' ? '#fff' : colors.text }]}>VENDA</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {tipoVenda === 'empresa' && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CLIENTE (OPCIONAL)</Text>
                    <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg }]} onPress={() => { setShowClientPicker(true); setShowNewClientForm(false); }}>
                      <Text style={{ color: (clients || []).find((c) => c.id === clientId)?.name ? colors.text : colors.textSecondary }} numberOfLines={1}>
                        {(clients || []).find((c) => c.id === clientId)?.name || 'Nenhum'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showClientPicker && (
                      <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, maxHeight: 220 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <TouchableOpacity onPress={() => { playTapSound(); setShowClientPicker(false); setShowNewClientForm(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="arrow-back" size={20} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Voltar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { playTapSound(); setShowNewClientForm(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Cadastrar cliente</Text>
                          </TouchableOpacity>
                        </View>
                        {showNewClientForm ? (
                          <View style={{ padding: 12 }}>
                            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: 8 }]} placeholder="Nome do cliente" value={newClientName} onChangeText={setNewClientName} placeholderTextColor={colors.textSecondary} />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: colors.border, paddingVertical: 10 }]} onPress={() => { playTapSound(); setShowNewClientForm(false); setNewClientName(''); }}>
                                <Text style={[styles.btnText, { color: colors.text }]}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.btn, { flex: 1, paddingVertical: 10 }]} onPress={async () => {
                                playTapSound();
                                if (!newClientName.trim()) return Alert.alert('Erro', 'Informe o nome do cliente.');
                                const id = await addClient({ name: newClientName.trim(), email: '', phone: '', nivel: 'orcamento' });
                                if (id) { setClientId(id); setShowClientPicker(false); setShowNewClientForm(false); setNewClientName(''); }
                              }}>
                                <Text style={styles.btnText}>Cadastrar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <ScrollView style={{ maxHeight: 140 }}>
                            <TouchableOpacity style={{ padding: 14 }} onPress={() => { setClientId(null); setShowClientPicker(false); }}>
                              <Text style={{ color: colors.text }}>Nenhum</Text>
                            </TouchableOpacity>
                            {(clients || []).map((c) => (
                              <TouchableOpacity key={c.id} style={{ padding: 14, borderTopWidth: 0.5, borderTopColor: colors.border }} onPress={() => { setClientId(c.id); setShowClientPicker(false); }}>
                                <Text style={{ color: colors.text }}>{c.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </>
                )}

                {tipoReceita === 'outra' && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>NOME / DESCRIÇÃO</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: Freelance, Consultoria, Pagamento serviço X" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                  </>
                )}

                {tipoReceita === 'venda' && (
                  <View style={[styles.pdvBox, styles.pdvCard, { borderColor: colors.primary + '80', backgroundColor: colors.primaryRgba(0.08) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="cart-outline" size={24} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Ponto de Venda</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Produtos e serviços</Text>
                      </View>
                    </View>
                    {mostUsedCombined.length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>MAIS VENDIDOS</Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'nowrap' }}>
                          {mostUsedCombined.map((it) => (
                            <TouchableOpacity
                              key={(it.isProduct ? 'p-' : 's-') + it.id}
                              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}
                              onPress={() => (it.isProduct ? addSaleItem(it, true) : setServicePriceModal(it))}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }} numberOfLines={2} textAlign="center">{it.name}</Text>
                              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>R$ {(it.price || 0).toFixed(2)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 }}>BUSCAR PRODUTO OU SERVIÇO</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder="Digite para buscar..." value={searchPdv} onChangeText={setSearchPdv} placeholderTextColor={colors.textSecondary} />
                    {searchPdv.length > 0 && (
                      <View style={{ marginTop: 8, maxHeight: 160 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 }}>PRODUTOS — 1 clique para adicionar</Text>
                        {filteredProducts.slice(0, 4).map((p) => (
                          <TouchableOpacity key={'p-' + p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: colors.bg, borderRadius: 8, marginBottom: 4 }}>
                            <Text style={{ color: colors.text, fontWeight: '500' }}>{p.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>R$ {(p.price || 0).toFixed(2)}</Text>
                              <TouchableOpacity onPress={() => { playTapSound(); addSaleItem(p, true); }} style={{ backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="add" size={20} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        ))}
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8, marginBottom: 4, letterSpacing: 0.5 }}>SERVIÇOS — toque para ajustar valor antes de adicionar</Text>
                        {filteredServices.slice(0, 4).map((s) => (
                          <TouchableOpacity key={'s-' + s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, backgroundColor: colors.bg, borderRadius: 8, marginBottom: 4 }} onPress={() => setServicePriceModal(s)}>
                            <Text style={{ color: colors.text, fontWeight: '500' }}>{s.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>R$ {(s.price || 0).toFixed(2)}</Text>
                              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {saleItems.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>CARRINHO</Text>
                        {saleItems.map((i) => {
                          const lineTotal = ((i.price || 0) - (i.discount || 0)) * (i.qty || 1);
                          return (
                            <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{i.name}</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>R$ {(i.price || 0).toFixed(2)} {i.allowDiscount && (
                                  <Text style={{ color: colors.primary }}>• Desconto:</Text>
                                )}</Text>
                                {i.allowDiscount && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <MoneyInput value={String(i.discount || 0)} onChange={(t) => updateSaleItemDiscount(i.id, t)} colors={colors} containerStyle={{ flex: 1, minWidth: 80 }} style={{ paddingVertical: 6, fontSize: 12 }} />
                                  </View>
                                )}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <TouchableOpacity onPress={() => { playTapSound(); decSaleItemQty(i.id); }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="remove" size={18} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 28, textAlign: 'center' }}>{i.qty || 1}</Text>
                                <TouchableOpacity onPress={() => { playTapSound(); incSaleItemQty(i.id); }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="add" size={18} color="#fff" />
                                </TouchableOpacity>
                              </View>
                              <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>R$ {lineTotal.toFixed(2)}</Text>
                                <TouchableOpacity onPress={() => removeSaleItem(i.id)} style={{ marginTop: 4 }}>
                                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>TOTAL A PAGAR</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>R$ {saleTotal.toFixed(2)}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>{tipoReceita === 'venda' ? 'VALOR (atualiza com o carrinho)' : 'VALOR'}</Text>
                <MoneyInput value={amount} onChange={setAmount} style={{ backgroundColor: colors.bg }} colors={colors} />
                {tipoReceita === 'venda' && saleItems.length > 0 && (
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 }}>Total: R$ {saleTotal.toFixed(2)}</Text>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>DATA E HORA</Text>
                <View style={[styles.toggleRow, { backgroundColor: colors.bg, borderRadius: 12, padding: 4 }]}>
                  <TouchableOpacity style={[styles.toggleBtn, { flex: 1, backgroundColor: useNow ? colors.primary : 'transparent' }]} onPress={() => setUseNow(true)}>
                    <Ionicons name="time-outline" size={18} color={useNow ? '#fff' : colors.text} />
                    <Text style={[styles.toggleText, { color: useNow ? '#fff' : colors.text }]}>AGORA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, { flex: 1, backgroundColor: !useNow ? colors.primary : 'transparent' }]} onPress={() => { setUseNow(false); if (!date) setDate(todayStr()); if (!time) setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })); }}>
                    <Ionicons name="calendar-outline" size={18} color={!useNow ? '#fff' : colors.text} />
                    <Text style={[styles.toggleText, { color: !useNow ? '#fff' : colors.text }]}>ESCOLHER</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.text }}>{useNow ? nowDateTimeStr() : (date || todayStr()) + ' ' + (time || '00:00')}</Text>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                </View>
                {!useNow && (
                  <View style={[styles.row, { gap: GAP }]}>
                    <View style={{ flex: 1 }}>
                      <DatePickerInput value={date} onChange={setDate} colors={colors} style={{ backgroundColor: colors.bg }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimePickerInput value={time} onChange={setTime} colors={colors} style={{ backgroundColor: colors.bg }} />
                    </View>
                  </View>
                )}

                {tipoReceita === 'venda' && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO (OPCIONAL)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: Venda para cliente X" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                  </>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>PARA ONDE ESTÁ INDO O VALOR DA RECEITA?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                  {FORMAS_PAGAMENTO_RECEITA.map((fp) => (
                    <TouchableOpacity
                      key={fp.id}
                      style={[styles.toggleBtn, { flex: 0, minWidth: 90, borderWidth: 1, borderColor: formaPagamento === fp.id ? colors.primary : colors.border, backgroundColor: formaPagamento === fp.id ? colors.primary : colors.bg }]}
                      onPress={() => setFormaPagamento(fp.id)}
                    >
                      <Ionicons name={fp.icon} size={16} color={formaPagamento === fp.id ? '#fff' : colors.text} />
                      <Text style={[styles.toggleText, { color: formaPagamento === fp.id ? '#fff' : colors.text, fontSize: 12 }]}>{fp.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {formaPagamento === 'prazo' && (
                  <View style={[styles.row, { marginTop: GAP }]}>
                    <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.bg }]} placeholder="Parcelas" value={parcelas} onChangeText={setParcelas} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                    <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.bg }]} placeholder="Dia venc. (1-31)" value={diaVencimento} onChangeText={setDiaVencimento} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                  </View>
                )}
              </>
            )}
            {(type === 'despesa') && (
              <>
                {showEmpresaFeatures && (
                <View style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
                  {['pessoal', 'empresa'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.input, { flex: 1, borderColor: tipoVenda === t ? colors.primary : colors.border, backgroundColor: tipoVenda === t ? colors.primaryRgba(0.1) : 'transparent' }]} onPress={() => setTipoVenda(t)}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: tipoVenda === t ? colors.primary : colors.text }}>{t === 'pessoal' ? 'Pessoal' : 'Empresa'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                )}
                <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: GAP }]} placeholder="Descrição" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>VALOR</Text>
                <MoneyInput value={amount} onChange={setAmount} style={{ marginBottom: GAP }} colors={colors} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORIA</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: GAP }]} placeholder="Ex: Alimentação" value={category} onChangeText={setCategory} placeholderTextColor={colors.textSecondary} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>FORMA DE PAGAMENTO</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: GAP }}>
                  {FORMAS_PAGAMENTO_DESPESA.map((fp) => (
                    <TouchableOpacity
                      key={fp.id}
                      style={[styles.toggleBtn, { flex: 0, minWidth: 80, borderWidth: 1, borderColor: formaPagamentoDespesa === fp.id ? colors.primary : colors.border, backgroundColor: formaPagamentoDespesa === fp.id ? colors.primary : colors.bg }]}
                      onPress={() => setFormaPagamentoDespesa(fp.id)}
                    >
                      <Ionicons name={fp.icon} size={16} color={formaPagamentoDespesa === fp.id ? '#fff' : colors.text} />
                      <Text style={[styles.toggleText, { color: formaPagamentoDespesa === fp.id ? '#fff' : colors.text, fontSize: 12 }]}>{fp.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {formaPagamentoDespesa === 'debito' && banksComDebito.length > 0 && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>BANCO (DÉBITO)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: GAP }}>
                      {banksComDebito.map((b) => (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.toggleBtn, { flex: 0, minWidth: 100, borderWidth: 1, borderColor: despesaBankId === b.id ? colors.primary : colors.border, backgroundColor: despesaBankId === b.id ? colors.primaryRgba(0.15) : 'transparent' }]}
                          onPress={() => setDespesaBankId(b.id)}
                        >
                          <Text style={[styles.toggleText, { fontSize: 12, color: despesaBankId === b.id ? colors.primary : colors.text }]} numberOfLines={1}>{getBankName(b)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                {formaPagamentoDespesa === 'credito' && cardsOrdenados.length > 0 && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CARTÃO DE CRÉDITO</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: GAP }}>
                      {cardsOrdenados.map((c) => {
                        const bank = getBankById(c.bankId);
                        const label = `${c.name || 'Cartão'}${bank ? ` (${getBankName(bank)})` : ''}`;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.toggleBtn, { flex: 0, minWidth: 120, borderWidth: 1, borderColor: despesaCardId === c.id ? colors.primary : colors.border, backgroundColor: despesaCardId === c.id ? colors.primaryRgba(0.15) : 'transparent' }]}
                            onPress={() => setDespesaCardId(c.id)}
                          >
                            <Text style={[styles.toggleText, { fontSize: 12, color: despesaCardId === c.id ? colors.primary : colors.text }]} numberOfLines={1}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
                {formaPagamentoDespesa === 'debito' && banksComDebito.length === 0 && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: GAP }}>Cadastre um banco com débito em Bancos e Cartões.</Text>
                )}
                {formaPagamentoDespesa === 'credito' && cardsOrdenados.length === 0 && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: GAP }}>Cadastre um cartão de crédito em Bancos e Cartões.</Text>
                )}
                <Text style={[styles.label, { color: colors.textSecondary }]}>DATA</Text>
                <DatePickerInput value={date} onChange={setDate} colors={colors} />
              </>
            )}
            {type === 'agenda' && (
              <>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Título" value={title} onChangeText={setTitle} placeholderTextColor={colors.textSecondary} />
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Descrição" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                <View style={[styles.row, { gap: GAP }]}>
                  <View style={{ flex: 1 }}>
                    <DatePickerInput value={date} onChange={setDate} colors={colors} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimePickerInput value={time} onChange={setTime} colors={colors} />
                  </View>
                </View>
              </>
            )}
            {(type === 'cliente' || type === 'fornecedor') && (
              <>
                {type === 'cliente' && (
                  <>
                    {photoUri ? (
                      <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: 8 }}>
                        <Image source={{ uri: photoUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                        <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>Trocar foto</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.input, { borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' }]} onPress={pickImage}>
                        <Ionicons name="camera-outline" size={24} color={colors.primary} />
                        <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Foto do cliente</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Nível / Status</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[{ id: 'orcamento', label: 'Orçamento' }, { id: 'lead', label: 'Lead' }, { id: 'fechou', label: 'Fechou' }].map((n) => (
                        <TouchableOpacity key={n.id} onPress={() => setClientNivel(n.id)} style={[styles.input, { flex: 1, borderColor: clientNivel === n.id ? colors.primary : colors.border, backgroundColor: clientNivel === n.id ? colors.primaryRgba(0.1) : 'transparent', paddingVertical: 10, alignItems: 'center' }]}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: clientNivel === n.id ? colors.primary : colors.text }}>{n.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={colors.textSecondary} />
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
              </>
            )}
            {type === 'produto' && (
              <>
                {photoUri ? (
                  <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: 8 }}>
                    <Image source={{ uri: photoUri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>Trocar foto</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.input, { borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' }]} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Adicionar foto do produto</Text>
                  </TouchableOpacity>
                )}
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome do produto" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
                <View style={[styles.row, { gap: GAP }]}>
                  <View style={{ flex: 1 }}><MoneyInput value={costPrice} onChange={setCostPrice} colors={colors} placeholder="Custo" /></View>
                  <View style={{ flex: 1 }}><MoneyInput value={price} onChange={setPrice} colors={colors} placeholder="Venda" /></View>
                </View>
                <View style={[styles.row, { gap: GAP }]}>
                  <View style={{ flex: 1 }}><MoneyInput value={discount} onChange={setDiscount} colors={colors} placeholder="Desconto" /></View>
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="Unidade" value={unit} onChangeText={setUnit} placeholderTextColor={colors.textSecondary} />
                </View>
              </>
            )}
            {type === 'servico' && (
              <>
                {photoUri ? (
                  <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: 8 }}>
                    <Image source={{ uri: photoUri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>Trocar foto</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.input, { borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' }]} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={24} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Adicionar foto do serviço</Text>
                  </TouchableOpacity>
                )}
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome do serviço" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><MoneyInput value={price} onChange={setPrice} colors={colors} placeholder="Preço" /></View>
                  <View style={{ flex: 1 }}><MoneyInput value={discount} onChange={setDiscount} colors={colors} placeholder="Desconto" /></View>
                </View>
              </>
            )}
            {type === 'tarefa' && (
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Título da tarefa" value={title} onChangeText={setTitle} placeholderTextColor={colors.textSecondary} />
            )}
          </ScrollView>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.btnText}>{type === 'receita' ? 'FATURAR' : 'Cadastrar'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}
