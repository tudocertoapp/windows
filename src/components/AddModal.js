import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBanks } from '../contexts/BanksContext';
import { usePlan } from '../contexts/PlanContext';

const { width: SW } = Dimensions.get('window');
const GAP = 16;
const BOX_MAX = Math.min(SW - 24, 420);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: GAP },
  box: { width: '100%', maxWidth: BOX_MAX, borderRadius: 20, padding: GAP, borderWidth: 1 },
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
  pdvBox: { borderRadius: 12, borderWidth: 1, padding: GAP, marginBottom: GAP },
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
      setTipoReceita('venda');
      setTipoVenda('pessoal');
      setClientId(null);
      setUseNow(true);
      setSaleItems([]);
      setSearchPdv('');
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
  const [tipoReceita, setTipoReceita] = useState('venda');
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
      const amtRaw = parseFloat(String(amount).replace(',', '.'));
      const amt = tipoReceita === 'venda' && saleItems.length > 0 && isNaN(amtRaw) ? saleTotal : (isNaN(amtRaw) ? 0 : amtRaw);
      const descVal = parseFloat(String(discount).replace(',', '.')) || 0;
      const valorFinal = Math.max(0, (isNaN(amt) ? 0 : amt) - descVal);
      if (!description.trim()) return Alert.alert('Erro', 'Preencha a descrição.');
      if (valorFinal <= 0) return Alert.alert('Erro', 'Informe um valor maior que zero.');
      if (type === 'despesa' && formaPagamentoDespesa === 'debito' && !despesaBankId) return Alert.alert('Erro', 'Selecione o banco para débito.');
      if (type === 'despesa' && formaPagamentoDespesa === 'credito' && !despesaCardId) return Alert.alert('Erro', 'Selecione o cartão de crédito.');
      const dateVal = type === 'despesa' ? toYMD(date) : (useNow ? new Date().toISOString().slice(0, 10) : toYMD(date));
      const formaPag = type === 'despesa' ? formaPagamentoDespesa : formaPagamento;
      const tx = { type: type === 'receita' ? 'income' : 'expense', amount: valorFinal, description: description.trim(), category: category || 'Outros', date: dateVal, formaPagamento: formaPag, tipoVenda, desconto: descVal };
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
          addAReceber({ description: description.trim(), amount: parcVal, dueDate: `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}/${venc.getFullYear()}`, parcel: i + 1, total: n, status: 'pendente' });
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
      const p = parseFloat(String(price).replace(',', '.'));
      const c = parseFloat(String(costPrice).replace(',', '.'));
      const d = parseFloat(String(discount).replace(',', '.'));
      addProduct({ name: name.trim(), price: isNaN(p) ? 0 : p, costPrice: isNaN(c) ? 0 : c, discount: isNaN(d) ? 0 : d, unit: unit.trim() || 'un', photoUri: photoUri || null });
    } else if (type === 'servico') {
      if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
      const p = parseFloat(String(price).replace(',', '.'));
      const d = parseFloat(String(discount).replace(',', '.'));
      addService({ name: name.trim(), price: isNaN(p) ? 0 : p, discount: isNaN(d) ? 0 : d, photoUri: photoUri || null });
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

  const addSaleItem = (item, isProduct = true) => {
    const id = isProduct ? 'p-' + item.id : 's-' + item.id;
    const existing = saleItems.find((x) => x.id === id);
    let next;
    if (existing) {
      next = saleItems.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x));
    } else {
      next = [...saleItems, { id, name: item.name, price: item.price || 0, qty: 1, isProduct }];
    }
    setSaleItems(next);
    const total = next.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    setAmount(total.toFixed(2));
    setSearchPdv('');
  };

  const removeSaleItem = (id) => {
    const next = saleItems.filter((x) => x.id !== id);
    setSaleItems(next);
    const total = next.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    setAmount(next.length > 0 ? total.toFixed(2) : '');
  };

  const saleTotal = saleItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

  const filteredProducts = (products || []).filter((p) => p.name?.toLowerCase().includes((searchPdv || '').toLowerCase()));
  const filteredServices = (services || []).filter((s) => s.name?.toLowerCase().includes((searchPdv || '').toLowerCase()));
  const mostUsedProducts = (products || []).slice(0, 3);
  const mostUsedServices = (services || []).slice(0, 2);

  if (!type) return null;

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.box, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>{type === 'receita' ? 'ADICIONAR RECEITA' : getTitle()}</Text>
          <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} contentContainerStyle={{ paddingRight: 4, paddingBottom: GAP }}>
            {type === 'receita' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO DE RECEITA</Text>
                <View style={[styles.toggleRow, { backgroundColor: colors.bg, borderRadius: 12, padding: 4 }]}>
                  {[
                    { id: 'venda', label: 'VENDA', icon: 'bag-outline' },
                    { id: 'outra', label: 'OUTRA RECEITA', icon: 'document-text-outline' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.toggleBtn, { backgroundColor: tipoReceita === t.id ? colors.primary : 'transparent' }]}
                      onPress={() => setTipoReceita(t.id)}
                    >
                      <Ionicons name={t.icon} size={18} color={tipoReceita === t.id ? '#fff' : colors.text} />
                      <Text style={[styles.toggleText, { color: tipoReceita === t.id ? '#fff' : colors.text }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {showEmpresaFeatures && (
                  <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>MODO</Text>
                <View style={[styles.toggleRow, { backgroundColor: colors.bg, borderRadius: 12, padding: 4 }]}>
                  {[
                    { id: 'pessoal', label: 'PESSOAL', icon: 'person-outline' },
                    { id: 'empresa', label: 'EMPRESA', icon: 'business-outline' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.toggleBtn, { backgroundColor: tipoVenda === t.id ? colors.primary : 'transparent' }]}
                      onPress={() => { setTipoVenda(t.id); if (t.id === 'pessoal') setClientId(null); }}
                    >
                      <Ionicons name={t.icon} size={18} color={tipoVenda === t.id ? '#fff' : colors.text} />
                      <Text style={[styles.toggleText, { color: tipoVenda === t.id ? '#fff' : colors.text }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                  </>
                )}

                {tipoVenda === 'empresa' && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CLIENTE (OPCIONAL)</Text>
                    <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg }]} onPress={() => setShowClientPicker(true)}>
                      <Text style={{ color: (clients || []).find((c) => c.id === clientId)?.name ? colors.text : colors.textSecondary }} numberOfLines={1}>
                        {(clients || []).find((c) => c.id === clientId)?.name || 'Nenhum'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showClientPicker && (
                      <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, maxHeight: 160 }}>
                        <ScrollView>
                          <TouchableOpacity style={{ padding: 14 }} onPress={() => { setClientId(null); setShowClientPicker(false); }}>
                            <Text style={{ color: colors.text }}>Nenhum</Text>
                          </TouchableOpacity>
                          {(clients || []).map((c) => (
                            <TouchableOpacity key={c.id} style={{ padding: 14, borderTopWidth: 0.5, borderTopColor: colors.border }} onPress={() => { setClientId(c.id); setShowClientPicker(false); }}>
                              <Text style={{ color: colors.text }}>{c.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}

                {tipoReceita === 'venda' && (
                  <View style={[styles.pdvBox, { borderColor: colors.primary + '60', backgroundColor: colors.bg }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Ionicons name="cart-outline" size={18} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>PONTO DE VENDA – PRODUTOS E SERVIÇOS</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>ADICIONE OS ITENS DA VENDA (DIGITE PARA BUSCAR)</Text>
                    {(mostUsedProducts.length > 0 || mostUsedServices.length > 0) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>MAIS USADOS: </Text>
                        {mostUsedProducts.map((it) => (
                          <TouchableOpacity key={'p-' + it.id} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.primary }} onPress={() => addSaleItem(it, true)}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{it.name}</Text>
                          </TouchableOpacity>
                        ))}
                        {mostUsedServices.map((it) => (
                          <TouchableOpacity key={'s-' + it.id} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.primary }} onPress={() => addSaleItem(it, false)}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{it.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder="Digite nome do produto ou serviço..." value={searchPdv} onChangeText={setSearchPdv} placeholderTextColor={colors.textSecondary} />
                    {searchPdv.length > 0 && (
                      <View style={{ marginTop: 8, maxHeight: 120 }}>
                        {filteredProducts.slice(0, 3).map((p) => (
                          <TouchableOpacity key={'p-' + p.id} style={{ paddingVertical: 10 }} onPress={() => addSaleItem(p, true)}>
                            <Text style={{ color: colors.text }}>{p.name} — R$ {(p.price || 0).toFixed(2)}</Text>
                          </TouchableOpacity>
                        ))}
                        {filteredServices.slice(0, 2).map((s) => (
                          <TouchableOpacity key={'s-' + s.id} style={{ paddingVertical: 10 }} onPress={() => addSaleItem(s, false)}>
                            <Text style={{ color: colors.text }}>{s.name} — R$ {(s.price || 0).toFixed(2)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {saleItems.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {saleItems.map((i) => (
                          <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingLeft: 12, paddingVertical: 6, borderRadius: 20 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{i.name} x{i.qty}</Text>
                            <TouchableOpacity style={{ padding: 4, marginLeft: 4 }} onPress={() => removeSaleItem(i.id)}>
                              <Ionicons name="close-circle" size={18} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>{tipoReceita === 'venda' ? 'VALOR DA VENDA (OPCIONAL: ADICIONE PRODUTOS ACIMA)' : 'VALOR'}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="R$ 0,00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />

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
                  <View style={styles.row}>
                    <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.bg }]} placeholder="DD/MM/AAAA" value={date} onChangeText={setDate} placeholderTextColor={colors.textSecondary} />
                    <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.bg }]} placeholder="HH:MM" value={time} onChangeText={setTime} placeholderTextColor={colors.textSecondary} />
                  </View>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: Pagamento serviço X" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />

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
                <Text style={[styles.label, { color: colors.textSecondary }]}>VALOR (R$)</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: GAP }]} placeholder="0,00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
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
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="DD/MM/AAAA" value={date} onChangeText={setDate} placeholderTextColor={colors.textSecondary} />
              </>
            )}
            {type === 'agenda' && (
              <>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Título" value={title} onChangeText={setTitle} placeholderTextColor={colors.textSecondary} />
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Descrição" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="DD/MM/AAAA" value={date} onChangeText={setDate} placeholderTextColor={colors.textSecondary} />
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="HH:MM" value={time} onChangeText={setTime} placeholderTextColor={colors.textSecondary} />
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
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="Preço custo (R$)" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="Preço venda (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="Desconto (R$)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
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
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="Preço (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
                  <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text }]} placeholder="Desconto (R$)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
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
