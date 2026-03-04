import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Dimensions, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBanks } from '../contexts/BanksContext';
import { usePlan } from '../contexts/PlanContext';
import { useMenu } from '../contexts/MenuContext';
import { DatePickerInput } from './DatePickerInput';
import { TimePickerInput } from './TimePickerInput';
import { MoneyInput } from './MoneyInput';
import { CategoryPicker, SubcategoryPicker } from './CategoryPicker';
import { ClienteModal } from './ClienteModal';
import { FornecedorModal } from './FornecedorModal';
import { parseMoney, formatCurrency } from '../utils/format';
import { playTapSound, playRecordingBeep } from '../utils/sounds';
import { parseExpenseVoice } from '../utils/voiceExpenseParser';
import { CATEGORIAS_RECEITA, CATEGORIAS_DESPESA } from '../constants/categories';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};
try {
  const sr = require('expo-speech-recognition');
  const mod = sr?.ExpoSpeechRecognitionModule;
  if (mod && typeof mod.isRecognitionAvailable === 'function' && mod.isRecognitionAvailable()) {
    ExpoSpeechRecognitionModule = mod;
    useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
  }
} catch (_) {}

const { width: SW, height: SH } = Dimensions.get('window');
const GAP = 24;
const SECTION_GAP = 20;
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
  pdvBox: { borderRadius: 16, borderWidth: 1, padding: GAP, marginBottom: SECTION_GAP },
  pdvCard: { borderRadius: 16, padding: 20, marginBottom: SECTION_GAP, minHeight: 200 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: SECTION_GAP },
  formaPagItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
});

const METODOS_PAGAMENTO_RECEITA = [
  { id: 'dinheiro', label: 'Dinheiro', icon: 'wallet-outline' },
  { id: 'pix', label: 'PIX', icon: 'phone-portrait-outline' },
  { id: 'debito', label: 'Cartão de débito', icon: 'card-outline' },
  { id: 'credito', label: 'Cartão de crédito', icon: 'card' },
  { id: 'boleto', label: 'Boleto', icon: 'document-text-outline' },
  { id: 'prazo', label: 'A prazo', icon: 'calendar-outline' },
];

const FORMAS_PAGAMENTO_DESPESA = [
  { id: 'dinheiro', label: 'Dinheiro', icon: 'wallet-outline' },
  { id: 'pix', label: 'PIX', icon: 'phone-portrait-outline' },
  { id: 'debito', label: 'Débito', icon: 'card-outline' },
  { id: 'credito', label: 'Crédito', icon: 'card' },
];

const TODAS_FORMAS_PAGAMENTO_RECEITA = [...METODOS_PAGAMENTO_RECEITA, { id: 'transferencia', label: 'Transferência', icon: 'swap-horizontal-outline' }];
const TODAS_FORMAS_PAGAMENTO_DESPESA = [...FORMAS_PAGAMENTO_DESPESA, { id: 'transferencia', label: 'Transferência', icon: 'swap-horizontal-outline' }, { id: 'boleto', label: 'Boleto', icon: 'document-text-outline' }, { id: 'prazo', label: 'A prazo', icon: 'calendar-outline' }];

export function AddModal({ type, params, onClose }) {
  const { colors } = useTheme();
  const { addTransaction, addAgendaEvent, updateAgendaEvent, addClient, addProduct, addService, addCheckListItem, addSupplier, addAReceber, clients, products, services } = useFinance();
  const { banks, cards, getBankById, getBankName, deductFromBank, addToBank, addToCardBalance } = useBanks();
  const { showEmpresaFeatures } = usePlan();
  const { openBancos } = useMenu();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (params?.amount != null) setAmount(String(params.amount));
    if (params?.description != null) setDescription(params.description);
    if (params?.categoryDesp) setCategoryDesp(params.categoryDesp);
    if (params?.subcategoryDesp) {
      setSubcategoryDesp(params.subcategoryDesp);
      setCategory(params.subcategoryDesp);
    }
    if (params?.tipoVenda) setTipoVenda(params.tipoVenda);
  }, [type, params]);
  useEffect(() => {
    if (type === 'receita') {
      const fromEvent = params?.fromAgendaEvent;
      if (fromEvent && (fromEvent.clientId || fromEvent.serviceId || (Array.isArray(fromEvent.preOrderItems) && fromEvent.preOrderItems.length > 0))) {
        setTipoVenda('empresa');
        setClientId(fromEvent.clientId || null);
        setUseNow(true);
        setFormaPagamento('pix');
        setReceitaBankId(null);
        setModoPagamentoMultipla(false);
        setPaymentSplits([]);
        if (Array.isArray(fromEvent.preOrderItems) && fromEvent.preOrderItems.length > 0) {
          const items = fromEvent.preOrderItems.map((i) => ({
            id: i.id || ('s-' + (i.serviceId || '') + '-' + String(i.price || 0).replace('.', '_')),
            name: i.name,
            price: i.price || 0,
            discount: i.discount || 0,
            qty: i.qty || 1,
            isProduct: i.isProduct === true,
            allowDiscount: i.isProduct === true,
          }));
          setSaleItems(items);
          const total = items.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);
          setAmount(total.toFixed(2).replace('.', ','));
        } else {
          const amt = Number(fromEvent.amount) || 0;
          setAmount(amt > 0 ? amt.toFixed(2).replace('.', ',') : '');
          if (fromEvent.serviceId && services?.length) {
            const svc = services.find((s) => s.id === fromEvent.serviceId);
            if (svc) {
              setSaleItems([{ id: 's-' + svc.id + '-' + String(svc.price || 0).replace('.', '_'), name: svc.name, price: svc.price || amt || 0, discount: 0, qty: 1, isProduct: false, allowDiscount: false }]);
              setAmount(((svc.price || amt || 0) * 1).toFixed(2).replace('.', ','));
            } else {
              setSaleItems([]);
            }
          } else {
            setSaleItems([]);
          }
        }
        setSearchPdv('');
        setServicePriceModal(null);
      } else {
        setTipoVenda('pessoal');
        setClientId(null);
        setUseNow(true);
        setSaleItems([]);
        setSearchPdv('');
        setServicePriceModal(null);
        setFormaPagamento('pix');
        setReceitaBankId(null);
        setModoPagamentoMultipla(false);
        setPaymentSplits([]);
      }
    }
  }, [type, params?.fromAgendaEvent, services]);
  useEffect(() => {
    if (type === 'cliente') {
      setPhotoUri(null);
      setClientNivel('orcamento');
    }
    if (type === 'tarefa') {
      const d = new Date();
      setTaskDate([String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/'));
      setTaskPriority('media');
    }
  }, [type]);
  useEffect(() => {
    if (!showEmpresaFeatures) setTipoVenda('pessoal');
  }, [showEmpresaFeatures, type]);
  useEffect(() => {
    if (type === 'receita' && tipoVenda) {
      setReceitaBankId(null);
      setPaymentSplits((s) => s.map((p) => ({ ...p, bankId: null, cardId: null })));
    }
  }, [type, tipoVenda]);
  useEffect(() => {
    if (type === 'despesa') {
      setFormaPagamentoDespesa('dinheiro');
      setDate([new Date().getDate(), new Date().getMonth() + 1, new Date().getFullYear()].map((x) => String(x).padStart(2, '0')).join('/'));
      const contextoDespesa = showEmpresaFeatures ? tipoVenda : 'pessoal';
      const comDebito = (banks || []).filter(
        (b) => ((b.tipoConta || 'ambos') === 'debito' || (b.tipoConta || 'ambos') === 'ambos') && ((b.tipo || 'pessoal') === contextoDespesa)
      );
      const carts = (cards || []).filter((c) => (getBankById(c.bankId)?.tipo || 'pessoal') === contextoDespesa);
      setDespesaBankId(comDebito[0]?.id || '');
      setDespesaCardId(carts[0]?.id || '');
    }
  }, [type, banks, cards, tipoVenda, showEmpresaFeatures]);
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
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [receitaBankId, setReceitaBankId] = useState(null);
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
  const [searchClient, setSearchClient] = useState('');
  const [modoPagamentoMultipla, setModoPagamentoMultipla] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [showFormaPagamentoPickerRec, setShowFormaPagamentoPickerRec] = useState(false);
  const [showFormaPagamentoPickerDesp, setShowFormaPagamentoPickerDesp] = useState(false);
  const [customFormasPagamentoRec, setCustomFormasPagamentoRec] = useState([]);
  const [customFormasPagamentoDesp, setCustomFormasPagamentoDesp] = useState([]);
  const [categoryRec, setCategoryRec] = useState('');
  const [subcategoryRec, setSubcategoryRec] = useState('');
  const [categoryDesp, setCategoryDesp] = useState('');
  const [subcategoryDesp, setSubcategoryDesp] = useState('');
  const [showAddFormaModalRec, setShowAddFormaModalRec] = useState(false);
  const [showAddFormaModalDesp, setShowAddFormaModalDesp] = useState(false);
  const [newFormaNome, setNewFormaNome] = useState('');
  const [showPdvDropdown, setShowPdvDropdown] = useState(false);
  const [taskDate, setTaskDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('media');
  const [voiceListening, setVoiceListening] = useState(false);
  const [micPulse] = useState(() => new Animated.Value(1));

  const isSpeechAvailable = ExpoSpeechRecognitionModule?.isRecognitionAvailable?.() ?? false;
  useSpeechRecognitionEvent('start', () => setVoiceListening(true));
  useSpeechRecognitionEvent('end', () => setVoiceListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    if (type !== 'despesa') return;
    const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
    if (transcript) {
      const parsed = parseExpenseVoice(transcript);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.categoryDesp) setCategoryDesp(parsed.categoryDesp);
      if (parsed.subcategoryDesp) { setSubcategoryDesp(parsed.subcategoryDesp); setCategory(parsed.subcategoryDesp); }
      if (parsed.description) setDescription(parsed.description);
      if (parsed.tipoVenda) setTipoVenda(parsed.tipoVenda);
    }
  });
  useSpeechRecognitionEvent('error', () => setVoiceListening(false));
  useEffect(() => {
    if (voiceListening) {
      Animated.loop(Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 0.9, duration: 500, useNativeDriver: true }),
      ])).start();
    } else micPulse.setValue(1);
  }, [voiceListening]);

  const contextoBancoTipo = type === 'receita' ? tipoVenda : (type === 'despesa' ? (showEmpresaFeatures ? tipoVenda : 'pessoal') : 'pessoal');
  const banksComDebito = (banks || []).filter(
    (b) => ((b.tipoConta || 'ambos') === 'debito' || (b.tipoConta || 'ambos') === 'ambos') && ((b.tipo || 'pessoal') === contextoBancoTipo)
  );
  const cardsOrdenados = (cards || []).filter((c) => {
    const bank = getBankById(c.bankId);
    return (bank?.tipo || 'pessoal') === contextoBancoTipo;
  });

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

  const getClientName = () => {
    const c = (clients || []).find((x) => x.id === clientId);
    return c?.name || '';
  };

  const handleSubmit = () => {
    if (type === 'receita' || type === 'despesa') {
      const amtRaw = parseMoney(amount);
      const amt = tipoReceita === 'venda' && saleItems.length > 0 && amtRaw === 0 ? saleTotal : amtRaw;
      const descVal = parseMoney(discount);
      const valorFinal = Math.max(0, (isNaN(amt) ? 0 : amt) - descVal);
      const descFinal = description.trim() || (tipoReceita === 'venda' && saleItems.length > 0 ? saleItems.map((i) => `${i.name} x${i.qty || 1}`).join(', ') : '') || (tipoReceita === 'outra' && (subcategoryRec || category) ? (subcategoryRec || category) : '') || (type === 'despesa' && (subcategoryDesp || category) ? (subcategoryDesp || category) : '');
      const clientName = getClientName();
      const descComCliente = clientName ? `${descFinal} — ${clientName}` : descFinal;
      if (!descFinal) return Alert.alert('Erro', 'Preencha o nome ou descrição.');
      if (valorFinal <= 0) return Alert.alert('Erro', 'Informe um valor maior que zero.');

      if (type === 'receita' && modoPagamentoMultipla) {
        const totalSplits = paymentSplits.reduce((s, p) => s + (parseMoney(p.valor) || 0), 0);
        if (Math.abs(totalSplits - valorFinal) > 0.01) return Alert.alert('Erro', `A soma das formas de pagamento (${formatCurrency(totalSplits)}) deve ser igual ao total (${formatCurrency(valorFinal)}).`);
        for (const p of paymentSplits) {
          const v = parseMoney(p.valor) || 0;
          if (v <= 0) return Alert.alert('Erro', 'Todos os valores devem ser maiores que zero.');
          if ((p.metodo === 'pix' || p.metodo === 'debito' || p.metodo === 'boleto' || p.metodo === 'transferencia') && !p.bankId) return Alert.alert('Erro', `Selecione o banco para ${([...METODOS_PAGAMENTO_RECEITA, { id: 'transferencia', label: 'Transferência' }].find((m) => m.id === p.metodo)?.label || p.metodo)}.`);
          if (p.metodo === 'credito' && !p.cardId && cardsOrdenados.length > 0) return Alert.alert('Erro', 'Selecione o cartão de crédito ou cadastre a máquina em Bancos e Cartões.');
        }
        const dateVal = useNow ? new Date().toISOString().slice(0, 10) : toYMD(date);
        addTransaction({ type: 'income', amount: valorFinal, description: descFinal, category: subcategoryRec || category || 'Outros', date: dateVal, formaPagamento: 'misturado', tipoVenda, desconto: descVal });
        for (const p of paymentSplits) {
          const v = parseMoney(p.valor) || 0;
          if (v <= 0) continue;
          if (p.metodo === 'dinheiro') { /* só registra na transação */ }
          else if ((p.metodo === 'pix' || p.metodo === 'debito' || p.metodo === 'boleto' || p.metodo === 'transferencia') && p.bankId) addToBank(p.bankId, v);
          else if (p.metodo === 'credito' && p.cardId) addToCardBalance(p.cardId, v);
          else if (p.metodo === 'prazo') {
            const n = parseInt(p.parcelas, 10) || 1;
            const dia = Math.min(28, Math.max(1, parseInt(p.diaVencimento, 10) || new Date().getDate()));
            const parcVal = v / n;
            for (let i = 0; i < n; i++) {
              const venc = new Date();
              venc.setMonth(venc.getMonth() + i);
              venc.setDate(dia);
              addAReceber({ description: descComCliente, amount: parcVal, dueDate: `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}/${venc.getFullYear()}`, parcel: i + 1, total: n, status: 'pendente' });
            }
          }
        }
        if (params?.fromAgendaEvent?.id) updateAgendaEvent(params.fromAgendaEvent.id, { status: 'concluido' });
      } else if (type === 'receita') {
        if ((formaPagamento === 'pix' || formaPagamento === 'debito' || formaPagamento === 'boleto' || formaPagamento === 'transferencia') && !receitaBankId) return Alert.alert('Erro', 'Selecione para onde está indo o valor da receita.');
        const dateVal = useNow ? new Date().toISOString().slice(0, 10) : toYMD(date);
        const formaPag = formaPagamento;
        addTransaction({ type: 'income', amount: valorFinal, description: descFinal, category: subcategoryRec || category || 'Outros', date: dateVal, formaPagamento: formaPag, tipoVenda, desconto: descVal });
        if (valorFinal > 0 && (formaPagamento === 'pix' || formaPagamento === 'debito' || formaPagamento === 'boleto' || formaPagamento === 'transferencia') && receitaBankId) addToBank(receitaBankId, valorFinal);
        if (formaPagamento === 'prazo' && valorFinal > 0) {
          const n = parseInt(parcelas, 10) || 1;
          const dia = Math.min(28, Math.max(1, parseInt(diaVencimento, 10) || new Date().getDate()));
          const parcVal = valorFinal / n;
          for (let i = 0; i < n; i++) {
            const venc = new Date();
            venc.setMonth(venc.getMonth() + i);
            venc.setDate(dia);
            addAReceber({ description: descComCliente, amount: parcVal, dueDate: `${String(venc.getDate()).padStart(2, '0')}/${String(venc.getMonth() + 1).padStart(2, '0')}/${venc.getFullYear()}`, parcel: i + 1, total: n, status: 'pendente' });
          }
        }
        if (params?.fromAgendaEvent?.id) updateAgendaEvent(params.fromAgendaEvent.id, { status: 'concluido' });
      } else if (type === 'despesa') {
        if ((formaPagamentoDespesa === 'debito' || formaPagamentoDespesa === 'transferencia') && !despesaBankId) return Alert.alert('Erro', 'Selecione o banco.');
        if (formaPagamentoDespesa === 'credito' && !despesaCardId) return Alert.alert('Erro', 'Selecione o cartão de crédito.');
        const dateVal = toYMD(date);
        addTransaction({ type: 'expense', amount: valorFinal, description: descFinal, category: subcategoryDesp || category || 'Outros', date: dateVal, formaPagamento: formaPagamentoDespesa, tipoVenda, desconto: descVal });
        if (valorFinal > 0) {
          if ((formaPagamentoDespesa === 'debito' || formaPagamentoDespesa === 'transferencia') && despesaBankId) deductFromBank(despesaBankId, valorFinal);
          if (formaPagamentoDespesa === 'credito' && despesaCardId) addToCardBalance(despesaCardId, valorFinal);
        }
      }
    } else if (type === 'agenda') {
      if (!title.trim() || !date.trim()) return Alert.alert('Erro', 'Preencha título e data.');
      addAgendaEvent({ title: title.trim(), description, date, time, type: 'meeting' });
    } else if (type === 'produto') {
      if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
      addProduct({ name: name.trim(), price: parseMoney(price), costPrice: parseMoney(costPrice), discount: parseMoney(discount), unit: unit.trim() || 'un', photoUri: photoUri || null });
    } else if (type === 'servico') {
      if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
      addService({ name: name.trim(), price: parseMoney(price), discount: parseMoney(discount), photoUri: photoUri || null });
    } else if (type === 'tarefa') {
      if (!title.trim()) return Alert.alert('Erro', 'Preencha a tarefa.');
      const taskDateStr = (taskDate || '').trim();
      const d = new Date();
      const defaultDate = [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
      addCheckListItem({ title: title.trim(), checked: false, date: taskDateStr || defaultDate, priority: taskPriority || 'media' });
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
  const valorTotalReceita = (() => {
    const amtRaw = parseMoney(amount);
    const amt = tipoReceita === 'venda' && saleItems.length > 0 && amtRaw === 0 ? saleTotal : amtRaw;
    const descVal = parseMoney(discount);
    return Math.max(0, (isNaN(amt) ? 0 : amt) - descVal);
  })();
  const totalSplitsAtual = paymentSplits.reduce((s, p) => s + (parseMoney(p.valor) || 0), 0);
  const valorRestante = Math.max(0, valorTotalReceita - totalSplitsAtual);
  const formatForMoneyInput = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace('.', ',');

  const searchPdvLower = (searchPdv || '').toLowerCase().trim();
  const filteredProducts = (products || []).filter((p) => {
    if (!searchPdvLower) return true;
    const matchName = p.name?.toLowerCase().includes(searchPdvLower);
    const matchCode = (p.code || '').toLowerCase().includes(searchPdvLower);
    return matchName || matchCode;
  });
  const filteredServices = (services || []).filter((s) => !searchPdvLower || s.name?.toLowerCase().includes(searchPdvLower));
  const mostUsedCombined = (() => {
    const prods = (products || []).slice(0, 3).map((p) => ({ ...p, isProduct: true }));
    const servs = (services || []).slice(0, 3).map((s) => ({ ...s, isProduct: false }));
    return [...prods, ...servs].slice(0, 3);
  })();

  if (!type) return null;

  if (type === 'cliente') {
    return <ClienteModal visible onClose={onClose} onSave={(d) => { addClient(d); onClose(); }} cliente={null} />;
  }
  if (type === 'fornecedor') {
    return <FornecedorModal visible onClose={onClose} onSave={(d) => { addSupplier(d); onClose(); }} fornecedor={null} />;
  }

  return (
    <Modal visible={!!type} transparent animationType="fade">
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
          <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8, zIndex: 2 }}>
            {type !== 'tarefa' && (
              <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }} onPress={() => Keyboard.dismiss()}>
                <Ionicons name="keyboard-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { color: colors.primary }]}>{type === 'receita' ? 'ADICIONAR RECEITA' : getTitle()}</Text>
          <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ maxHeight: FORM_MAX_HEIGHT - 140, flexGrow: 0 }} contentContainerStyle={{ paddingRight: 4, paddingBottom: GAP }}>
            {type === 'receita' && (
              <>
                {showEmpresaFeatures && (
                  <View style={{ marginBottom: SECTION_GAP }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>MODO</Text>
                    <View style={[styles.toggleRow, { backgroundColor: colors.bg, borderRadius: 12, padding: 4 }]}>
                      <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: tipoVenda === 'pessoal' ? colors.primary : 'transparent' }]}
                        onPress={() => { setTipoVenda('pessoal'); setClientId(null); }}
                      >
                        <Ionicons name="document-text-outline" size={18} color={tipoVenda === 'pessoal' ? '#fff' : colors.text} />
                        <Text style={[styles.toggleText, { color: tipoVenda === 'pessoal' ? '#fff' : colors.text }]}>PESSOAL</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: tipoVenda === 'empresa' ? colors.primary : 'transparent' }]}
                        onPress={() => setTipoVenda('empresa')}
                      >
                        <Ionicons name="bag-outline" size={18} color={tipoVenda === 'empresa' ? '#fff' : colors.text} />
                        <Text style={[styles.toggleText, { color: tipoVenda === 'empresa' ? '#fff' : colors.text }]}>EMPRESA</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {tipoVenda === 'empresa' && (
                  <View style={{ marginBottom: SECTION_GAP }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>CLIENTE (OPCIONAL)</Text>
                    <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, gap: 12 }]} onPress={() => { setShowClientPicker(true); setShowNewClientForm(false); setSearchClient(''); }}>
                      {(() => {
                        const sel = (clients || []).find((c) => c.id === clientId);
                        return (
                          <>
                            {sel?.foto ? (
                              <Image source={{ uri: sel.foto }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                            ) : (
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="person-outline" size={18} color={colors.primary} />
                              </View>
                            )}
                            <Text style={{ flex: 1, color: sel?.name ? colors.text : colors.textSecondary }} numberOfLines={1}>
                              {sel?.name || 'Selecionar cliente'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                          </>
                        );
                      })()}
                    </TouchableOpacity>
                    {showClientPicker && (
                      <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, maxHeight: 320 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <TouchableOpacity onPress={() => { playTapSound(); setShowClientPicker(false); setShowNewClientForm(false); setSearchClient(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="arrow-back" size={20} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Voltar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { playTapSound(); setShowNewClientForm(true); setSearchClient(''); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Cadastrar cliente</Text>
                          </TouchableOpacity>
                        </View>
                        {!showNewClientForm && (
                          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                            <TextInput
                              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, fontSize: 14 }]}
                              placeholder="Buscar cliente por nome..."
                              value={searchClient}
                              onChangeText={setSearchClient}
                              placeholderTextColor={colors.textSecondary}
                            />
                          </View>
                        )}
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
                          <ScrollView style={{ maxHeight: 200 }}>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }} onPress={() => { setClientId(null); setShowClientPicker(false); setSearchClient(''); }}>
                              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border + '60', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                              </View>
                              <Text style={{ color: colors.text, fontWeight: '500' }}>Nenhum</Text>
                            </TouchableOpacity>
                            {(clients || [])
                              .filter((c) => !searchClient.trim() || (c.name || '').toLowerCase().includes(searchClient.trim().toLowerCase()))
                              .map((c) => (
                                <TouchableOpacity key={c.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 12 }} onPress={() => { setClientId(c.id); setShowClientPicker(false); setSearchClient(''); }}>
                                  {c.foto ? (
                                    <Image source={{ uri: c.foto }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                  ) : (
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                                      <Ionicons name="person-outline" size={22} color={colors.primary} />
                                    </View>
                                  )}
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                                    {(c.email || c.phone) && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{c.email || c.phone}</Text>}
                                  </View>
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {tipoReceita === 'outra' && (
                  <View style={{ marginBottom: SECTION_GAP }}>
                    <CategoryPicker categories={CATEGORIAS_RECEITA} value={categoryRec} onChange={(id) => { setCategoryRec(id); setSubcategoryRec(''); }} placeholder="Selecionar categoria" colors={colors} label="CATEGORIA" />
                    <SubcategoryPicker subcategories={CATEGORIAS_RECEITA.find((c) => c.id === categoryRec)?.sub} value={subcategoryRec} onChange={(sub) => { setSubcategoryRec(sub); setCategory(sub); }} placeholder="Selecionar subcategoria" colors={colors} label="SUBCATEGORIA" />
                    {!categoryRec && (
                      <TextInput style={[styles.input, { marginBottom: 12, backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ou digite a categoria" value={category} onChangeText={setCategory} placeholderTextColor={colors.textSecondary} />
                    )}
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>NOME / DESCRIÇÃO</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: Cliente X, Projeto ABC" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                  </View>
                )}

                {tipoReceita === 'venda' && (
                  <View style={[styles.pdvBox, styles.pdvCard, { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primaryRgba(0.06), padding: 24, minHeight: 280, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryRgba(0.25), justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="cart-outline" size={30} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>Ponto de Venda</Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>Produtos e serviços</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 }}>BUSCAR POR NOME OU CÓDIGO</Text>
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        placeholder="Nome ou código do produto/serviço..."
                        value={searchPdv}
                        onChangeText={setSearchPdv}
                        onFocus={() => setShowPdvDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPdvDropdown(false), 200)}
                        placeholderTextColor={colors.textSecondary}
                      />
                      {(showPdvDropdown && searchPdv.length > 0) && (
                        <View style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, maxHeight: 200, zIndex: 100 }}>
                        <ScrollView style={{ maxHeight: 196 }} keyboardShouldPersistTaps="handled" onScrollBeginDrag={() => Keyboard.dismiss()}>
                          {searchPdvLower && filteredProducts.length > 0 && (
                            <>
                              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, paddingHorizontal: 12, paddingTop: 8, letterSpacing: 0.5 }}>PRODUTOS</Text>
                              {filteredProducts.slice(0, 6).map((p) => (
                                <TouchableOpacity key={'p-' + p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.bg, marginHorizontal: 8, marginBottom: 4, borderRadius: 8 }} onPress={() => { playTapSound(); addSaleItem(p, true); setShowPdvDropdown(false); setSearchPdv(''); }}>
                                  {p.photoUri ? (
                                    <Image source={{ uri: p.photoUri }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
                                  ) : (
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                                      <Ionicons name="cube-outline" size={20} color={colors.primary} />
                                    </View>
                                  )}
                                  <Text style={{ color: colors.text, fontWeight: '500', flex: 1 }} numberOfLines={1}>{p.name}</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{formatCurrency(p.price || 0)}</Text>
                                </TouchableOpacity>
                              ))}
                            </>
                          )}
                          {searchPdvLower && filteredServices.length > 0 && (
                            <>
                              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, paddingHorizontal: 12, paddingTop: 4, letterSpacing: 0.5 }}>SERVIÇOS</Text>
                              {filteredServices.slice(0, 6).map((s) => (
                                <TouchableOpacity key={'s-' + s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.bg, marginHorizontal: 8, marginBottom: 4, borderRadius: 8 }} onPress={() => { playTapSound(); setServicePriceModal(s); setShowPdvDropdown(false); setSearchPdv(''); }}>
                                  {s.photoUri ? (
                                    <Image source={{ uri: s.photoUri }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
                                  ) : (
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                                      <Ionicons name="construct-outline" size={20} color={colors.primary} />
                                    </View>
                                  )}
                                  <Text style={{ color: colors.text, fontWeight: '500', flex: 1 }} numberOfLines={1}>{s.name}</Text>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{formatCurrency(s.price || 0)}</Text>
                                </TouchableOpacity>
                              ))}
                            </>
                          )}
                        </ScrollView>
                        </View>
                      )}
                    </View>
                    {saleItems.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>CARRINHO</Text>
                        {saleItems.map((i) => {
                          const lineTotal = ((i.price || 0) - (i.discount || 0)) * (i.qty || 1);
                          return (
                            <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{i.name}</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{formatCurrency(i.price || 0)} {i.allowDiscount && (
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
                                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{formatCurrency(lineTotal)}</Text>
                                <TouchableOpacity onPress={() => removeSaleItem(i.id)} style={{ marginTop: 4 }}>
                                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 14, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.primaryRgba(0.12), borderRadius: 12, borderWidth: 2, borderColor: colors.primary + '40' }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>VALOR TOTAL</Text>
                          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{formatCurrency(saleTotal)}</Text>
                        </View>
                      </View>
                    )}
                    {saleItems.length === 0 && (
                      <View style={{ marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>VALOR TOTAL</Text>
                        <MoneyInput value={amount} onChange={setAmount} style={{ backgroundColor: colors.card }} colors={colors} />
                      </View>
                    )}
                    {saleItems.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 6 }]}>VALOR (edite se necessário)</Text>
                        <MoneyInput value={amount} onChange={setAmount} style={{ backgroundColor: colors.card }} colors={colors} />
                      </View>
                    )}
                  </View>
                )}

                {tipoReceita !== 'venda' && (
                  <View style={{ marginBottom: SECTION_GAP }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>VALOR</Text>
                    <MoneyInput value={amount} onChange={setAmount} style={{ backgroundColor: colors.bg }} colors={colors} />
                  </View>
                )}

                <View style={{ marginBottom: SECTION_GAP }}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>FORMA DE PAGAMENTO</Text>
                  <View style={[styles.toggleRow, { backgroundColor: colors.bg, borderRadius: 12, padding: 4, marginBottom: 12 }]}>
                    <TouchableOpacity style={[styles.toggleBtn, { flex: 1, backgroundColor: !modoPagamentoMultipla ? colors.primary : 'transparent' }]} onPress={() => { setModoPagamentoMultipla(false); setPaymentSplits([]); }}>
                      <Text style={[styles.toggleText, { color: !modoPagamentoMultipla ? '#fff' : colors.text, fontSize: 13 }]}>Uma forma</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, { flex: 1, backgroundColor: modoPagamentoMultipla ? colors.primary : 'transparent' }]} onPress={() => setModoPagamentoMultipla(true)}>
                      <Text style={[styles.toggleText, { color: modoPagamentoMultipla ? '#fff' : colors.text, fontSize: 13 }]}>Várias formas</Text>
                    </TouchableOpacity>
                  </View>

                  {!modoPagamentoMultipla ? (
                  <>
                    <TouchableOpacity
                      style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => setShowFormaPagamentoPickerRec(true)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={([...TODAS_FORMAS_PAGAMENTO_RECEITA, ...customFormasPagamentoRec].find((f) => f.id === formaPagamento) || TODAS_FORMAS_PAGAMENTO_RECEITA[0]).icon} size={18} color={colors.primary} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{([...TODAS_FORMAS_PAGAMENTO_RECEITA, ...customFormasPagamentoRec].find((f) => f.id === formaPagamento) || TODAS_FORMAS_PAGAMENTO_RECEITA[0]).label}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showFormaPagamentoPickerRec && (
                      <Modal visible transparent animationType="fade">
                        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowFormaPagamentoPickerRec(false)}>
                          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.formCard, { margin: 16, backgroundColor: colors.card, borderColor: colors.border, maxHeight: 360 }]}>
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 12 }]}>FORMA DE PAGAMENTO</Text>
                            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
                              {[...TODAS_FORMAS_PAGAMENTO_RECEITA, ...customFormasPagamentoRec].map((fp) => (
                                <TouchableOpacity
                                  key={fp.id}
                                  style={[styles.formaPagItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                  onPress={() => { setFormaPagamento(fp.id); if (fp.id !== 'pix' && fp.id !== 'debito' && fp.id !== 'boleto' && fp.id !== 'transferencia') setReceitaBankId(null); setShowFormaPagamentoPickerRec(false); }}
                                >
                                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: formaPagamento === fp.id ? colors.primary : colors.border + '40', justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name={fp.icon} size={18} color={formaPagamento === fp.id ? '#fff' : colors.text} />
                                  </View>
                                  <Text style={{ fontSize: 15, fontWeight: '600', color: formaPagamento === fp.id ? colors.primary : colors.text, flex: 1 }}>{fp.label}</Text>
                                  {formaPagamento === fp.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                                </TouchableOpacity>
                              ))}
                              <TouchableOpacity
                                style={[styles.formaPagItem, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: colors.border }]}
                                onPress={() => { setShowFormaPagamentoPickerRec(false); setNewFormaNome(''); setShowAddFormaModalRec(true); }}
                              >
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.15), justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Adicionar nova forma de pagamento</Text>
                              </TouchableOpacity>
                            </ScrollView>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </Modal>
                    )}
                    {showAddFormaModalRec && (
                      <Modal visible transparent animationType="fade">
                        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setShowAddFormaModalRec(false)}>
                          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>NOVA FORMA DE PAGAMENTO</Text>
                            <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: PicPay, Mercado Pago, Cheque" value={newFormaNome} onChangeText={setNewFormaNome} placeholderTextColor={colors.textSecondary} autoFocus />
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: colors.border }]} onPress={() => setShowAddFormaModalRec(false)}>
                                <Text style={[styles.btnText, { color: colors.text }]}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: colors.primary }]} onPress={() => { if (newFormaNome.trim()) { const id = 'custom_' + newFormaNome.trim(); setCustomFormasPagamentoRec((prev) => [...prev, { id, label: newFormaNome.trim(), icon: 'add-circle-outline' }]); setFormaPagamento(id); } setShowAddFormaModalRec(false); setNewFormaNome(''); }}>
                                <Text style={styles.btnText}>Adicionar</Text>
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </Modal>
                    )}
                    {(formaPagamento === 'pix' || formaPagamento === 'debito' || formaPagamento === 'boleto' || formaPagamento === 'transferencia') && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>PARA ONDE ESTÁ INDO O VALOR DA RECEITA?</Text>
                        <View style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.bg, padding: 0 }]}>
                          {banksComDebito.length === 0 ? (
                            <View style={{ padding: 16 }}>
                              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cadastre uma conta em Bancos e Cartões para receber o valor.</Text>
                              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={() => { onClose(); openBancos?.(); }}>
                                <Text style={styles.btnText}>Ir para Bancos e Cartões</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            banksComDebito.map((b, idx) => (
                              <TouchableOpacity
                                key={b.id}
                                style={[styles.formaPagItem, idx < banksComDebito.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                                onPress={() => setReceitaBankId(receitaBankId === b.id ? null : b.id)}
                              >
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: receitaBankId === b.id ? colors.primary : colors.border + '40', justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name="business-outline" size={18} color={receitaBankId === b.id ? '#fff' : colors.text} />
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: receitaBankId === b.id ? colors.primary : colors.text, flex: 1 }}>{getBankName(b)}</Text>
                                {receitaBankId === b.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      </View>
                    )}
                    {formaPagamento === 'credito' && (
                      <View style={[styles.formCard, { borderColor: colors.primary + '60', backgroundColor: colors.primaryRgba(0.08), marginTop: 12 }]}>
                        <Text style={{ fontSize: 14, color: colors.text, marginBottom: 8 }}>Cadastre sua máquina de cartão em Bancos e Cartões para receber pagamentos com cartão de crédito.</Text>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => { onClose(); openBancos?.(); }}>
                          <Text style={styles.btnText}>Ir para Bancos e Cartões</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {formaPagamento === 'prazo' && (
                      <View style={[styles.row, { marginTop: 12 }]}>
                        <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.bg }]} placeholder="Parcelas" value={parcelas} onChangeText={setParcelas} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                        <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.bg }]} placeholder="Dia venc. (1-31)" value={diaVencimento} onChangeText={setDiaVencimento} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                      </View>
                    )}
                  </>
                  ) : (
                  <View style={{ marginBottom: SECTION_GAP }}>
                    {paymentSplits.map((split, idx) => (
                      <View key={split.id} style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.bg, marginBottom: 12 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>Forma {idx + 1}</Text>
                          <TouchableOpacity onPress={() => setPaymentSplits((s) => s.filter((x) => x.id !== split.id))}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={[styles.label, { color: colors.textSecondary }]}>Valor</Text>
                          <MoneyInput value={split.valor} onChange={(v) => setPaymentSplits((s) => s.map((x) => x.id === split.id ? { ...x, valor: v } : x))} colors={colors} style={{ backgroundColor: colors.card }} />
                        </View>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={[styles.label, { color: colors.textSecondary }]}>Método</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                            {[...METODOS_PAGAMENTO_RECEITA, { id: 'transferencia', label: 'Transferência', icon: 'swap-horizontal-outline' }].map((fp) => (
                              <TouchableOpacity key={fp.id} onPress={() => setPaymentSplits((s) => s.map((x) => x.id === split.id ? { ...x, metodo: fp.id, bankId: null, cardId: null } : x))} style={{ marginHorizontal: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: split.metodo === fp.id ? colors.primary : colors.border + '40' }}>
                                <Ionicons name={fp.icon} size={18} color={split.metodo === fp.id ? '#fff' : colors.text} />
                                <Text style={{ fontSize: 11, color: split.metodo === fp.id ? '#fff' : colors.text, marginTop: 2 }}>{fp.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                        {(split.metodo === 'pix' || split.metodo === 'debito' || split.metodo === 'boleto' || split.metodo === 'transferencia') && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Banco</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {banksComDebito.map((b) => (
                                <TouchableOpacity key={b.id} onPress={() => setPaymentSplits((s) => s.map((x) => x.id === split.id ? { ...x, bankId: x.bankId === b.id ? null : b.id } : x))} style={[styles.toggleBtn, { flex: 0, minWidth: 90, borderWidth: 1, borderColor: split.bankId === b.id ? colors.primary : colors.border, backgroundColor: split.bankId === b.id ? colors.primaryRgba(0.15) : 'transparent' }]}>
                                  <Text style={[styles.toggleText, { fontSize: 12, color: split.bankId === b.id ? colors.primary : colors.text }]} numberOfLines={1}>{getBankName(b)}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                        {split.metodo === 'credito' && cardsOrdenados.length > 0 && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Cartão</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {cardsOrdenados.map((c) => {
                                const bank = getBankById(c.bankId);
                                const label = `${c.name || 'Cartão'}${bank ? ` (${getBankName(bank)})` : ''}`;
                                return (
                                  <TouchableOpacity key={c.id} onPress={() => setPaymentSplits((s) => s.map((x) => x.id === split.id ? { ...x, cardId: x.cardId === c.id ? null : c.id } : x))} style={[styles.toggleBtn, { flex: 0, minWidth: 100, borderWidth: 1, borderColor: split.cardId === c.id ? colors.primary : colors.border, backgroundColor: split.cardId === c.id ? colors.primaryRgba(0.15) : 'transparent' }]}>
                                    <Text style={[styles.toggleText, { fontSize: 12, color: split.cardId === c.id ? colors.primary : colors.text }]} numberOfLines={1}>{label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )}
                        {split.metodo === 'prazo' && (
                          <View style={[styles.row, { marginTop: 8 }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.label, { color: colors.textSecondary }]}>Parcelas</Text>
                              <TextInput style={[styles.input, { backgroundColor: colors.card }]} placeholder="4" value={split.parcelas || ''} onChangeText={(v) => setPaymentSplits((s) => s.map((x) => x.id === split.id ? { ...x, parcelas: v } : x))} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.label, { color: colors.textSecondary }]}>Dia venc.</Text>
                              <TextInput style={[styles.input, { backgroundColor: colors.card }]} placeholder="5" value={split.diaVencimento || ''} onChangeText={(v) => setPaymentSplits((s) => s.map((x) => x.id === split.id ? { ...x, diaVencimento: v } : x))} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => setPaymentSplits((s) => [...s, { id: Date.now().toString(), metodo: 'dinheiro', valor: valorRestante > 0 ? formatForMoneyInput(valorRestante) : '', bankId: null, cardId: null, parcelas: '', diaVencimento: '' }])} style={[styles.btn, { backgroundColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                      <Ionicons name="add-circle-outline" size={22} color={colors.text} />
                      <Text style={[styles.btnText, { color: colors.text }]}>Adicionar forma de pagamento</Text>
                    </TouchableOpacity>
                    {paymentSplits.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.primaryRgba(0.08), borderRadius: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Soma das formas</Text>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{formatCurrency(totalSplitsAtual)}</Text>
                        </View>
                        {valorTotalReceita > 0 && Math.abs(totalSplitsAtual - valorTotalReceita) > 0.01 && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: 12, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{totalSplitsAtual > valorTotalReceita ? 'Valor excedido' : 'Falta'}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{formatCurrency(Math.abs(valorTotalReceita - totalSplitsAtual))}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  )}
                </View>

                <View style={[styles.formCard, { borderColor: colors.border, backgroundColor: colors.bg }, { marginBottom: SECTION_GAP }]}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>DATA E HORA DE REGISTRO</Text>
                  <View style={[styles.toggleRow, { backgroundColor: colors.card, borderRadius: 12, padding: 4 }]}>
                    <TouchableOpacity style={[styles.toggleBtn, { flex: 1, backgroundColor: useNow ? colors.primary : 'transparent' }]} onPress={() => setUseNow(true)}>
                      <Ionicons name="time-outline" size={18} color={useNow ? '#fff' : colors.text} />
                      <Text style={[styles.toggleText, { color: useNow ? '#fff' : colors.text }]}>AGORA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, { flex: 1, backgroundColor: !useNow ? colors.primary : 'transparent' }]} onPress={() => { setUseNow(false); if (!date) setDate(todayStr()); if (!time) setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })); }}>
                      <Ionicons name="calendar-outline" size={18} color={!useNow ? '#fff' : colors.text} />
                      <Text style={[styles.toggleText, { color: !useNow ? '#fff' : colors.text }]}>ESCOLHER</Text>
                    </TouchableOpacity>
                  </View>
                  {!useNow && (
                    <View style={[styles.row, { gap: GAP, marginTop: 16 }]}>
                      <View style={{ flex: 1 }}>
                        <DatePickerInput value={date} onChange={setDate} colors={colors} style={{ backgroundColor: colors.card }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TimePickerInput value={time} onChange={setTime} colors={colors} style={{ backgroundColor: colors.card }} />
                      </View>
                    </View>
                  )}
                </View>

                {tipoReceita === 'venda' && (
                  <View style={{ marginBottom: SECTION_GAP }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>DESCRIÇÃO (OPCIONAL)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: Venda para cliente X" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: GAP }}>
                  <View style={{ flex: 1 }}>
                    <CategoryPicker categories={CATEGORIAS_DESPESA} value={categoryDesp} onChange={(id) => { setCategoryDesp(id); setSubcategoryDesp(''); setCategory(''); }} placeholder="Selecionar categoria" colors={colors} label="CATEGORIA" />
                  </View>
                  {isSpeechAvailable && (
                    <TouchableOpacity
                      onPress={async () => {
                        if (!ExpoSpeechRecognitionModule) return;
                        try {
                          const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
                          if (!res?.granted) { Alert.alert('Permissão', 'Permita o microfone para usar voz.'); return; }
                          if (voiceListening) { ExpoSpeechRecognitionModule.stop(); return; }
                          playRecordingBeep();
                          ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
                        } catch (e) { Alert.alert('Erro', 'Não foi possível iniciar o microfone.'); }
                      }}
                      style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: voiceListening ? colors.primary : colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center', marginTop: 18 }}
                    >
                      <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                        <Ionicons name={voiceListening ? 'mic' : 'mic-outline'} size={26} color={voiceListening ? '#fff' : colors.primary} />
                      </Animated.View>
                    </TouchableOpacity>
                  )}
                </View>
                <SubcategoryPicker subcategories={CATEGORIAS_DESPESA.find((c) => c.id === categoryDesp)?.sub} value={subcategoryDesp} onChange={(sub) => { setSubcategoryDesp(sub); setCategory(sub); }} placeholder="Selecionar subcategoria" colors={colors} label="SUBCATEGORIA" />
                {!categoryDesp && (
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: GAP }]} placeholder="Ou digite a categoria" value={category} onChangeText={setCategory} placeholderTextColor={colors.textSecondary} />
                )}
                <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIÇÃO (OPCIONAL)</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: GAP }]} placeholder="Ex: Supermercado do bairro. Ou use o microfone: 'gastei 50 na padaria com pão gasto empresa'" value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>VALOR</Text>
                <MoneyInput value={amount} onChange={setAmount} style={{ marginBottom: GAP }} colors={colors} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>FORMA DE PAGAMENTO</Text>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderColor: colors.border, marginBottom: GAP }]}
                  onPress={() => setShowFormaPagamentoPickerDesp(true)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name={([...TODAS_FORMAS_PAGAMENTO_DESPESA, ...customFormasPagamentoDesp].find((f) => f.id === formaPagamentoDespesa) || FORMAS_PAGAMENTO_DESPESA[0]).icon} size={18} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{([...TODAS_FORMAS_PAGAMENTO_DESPESA, ...customFormasPagamentoDesp].find((f) => f.id === formaPagamentoDespesa) || FORMAS_PAGAMENTO_DESPESA[0]).label}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {showFormaPagamentoPickerDesp && (
                  <Modal visible transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowFormaPagamentoPickerDesp(false)}>
                      <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.formCard, { margin: 16, backgroundColor: colors.card, borderColor: colors.border, maxHeight: 360 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 12 }]}>FORMA DE PAGAMENTO</Text>
                        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
                          {[...TODAS_FORMAS_PAGAMENTO_DESPESA, ...customFormasPagamentoDesp].map((fp) => (
                            <TouchableOpacity
                              key={fp.id}
                              style={[styles.formaPagItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                              onPress={() => { setFormaPagamentoDespesa(fp.id); setShowFormaPagamentoPickerDesp(false); }}
                            >
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: formaPagamentoDespesa === fp.id ? colors.primary : colors.border + '40', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name={fp.icon} size={18} color={formaPagamentoDespesa === fp.id ? '#fff' : colors.text} />
                              </View>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: formaPagamentoDespesa === fp.id ? colors.primary : colors.text, flex: 1 }}>{fp.label}</Text>
                              {formaPagamentoDespesa === fp.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={[styles.formaPagItem, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: colors.border }]}
                            onPress={() => { setShowFormaPagamentoPickerDesp(false); setNewFormaNome(''); setShowAddFormaModalDesp(true); }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.15), justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Adicionar nova forma de pagamento</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                )}
                {showAddFormaModalDesp && (
                  <Modal visible transparent animationType="fade">
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setShowAddFormaModalDesp(false)}>
                      <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>NOVA FORMA DE PAGAMENTO</Text>
                        <TextInput style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]} placeholder="Ex: PicPay, Vale-refeição" value={newFormaNome} onChangeText={setNewFormaNome} placeholderTextColor={colors.textSecondary} autoFocus />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                          <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: colors.border }]} onPress={() => setShowAddFormaModalDesp(false)}>
                            <Text style={[styles.btnText, { color: colors.text }]}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: colors.primary }]} onPress={() => { if (newFormaNome.trim()) { const id = 'custom_' + newFormaNome.trim(); setCustomFormasPagamentoDesp((prev) => [...prev, { id, label: newFormaNome.trim(), icon: 'add-circle-outline' }]); setFormaPagamentoDespesa(id); } setShowAddFormaModalDesp(false); setNewFormaNome(''); }}>
                            <Text style={styles.btnText}>Adicionar</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>
                )}
                {(formaPagamentoDespesa === 'debito' || formaPagamentoDespesa === 'transferencia') && banksComDebito.length > 0 && (
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
                {(formaPagamentoDespesa === 'debito' || formaPagamentoDespesa === 'transferencia') && banksComDebito.length === 0 && (
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
              <>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Título da tarefa" value={title} onChangeText={setTitle} placeholderTextColor={colors.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Data</Text>
                <DatePickerInput value={taskDate} onChange={setTaskDate} colors={colors} style={{ backgroundColor: colors.card }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Prioridade</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[{ id: 'baixa', label: 'Baixa' }, { id: 'media', label: 'Média' }, { id: 'alta', label: 'Alta' }, { id: 'urgente', label: 'Urgente' }].map((p) => (
                    <TouchableOpacity key={p.id} onPress={() => setTaskPriority(p.id)} style={{ flex: 1, minWidth: 70, padding: 10, borderRadius: 10, backgroundColor: taskPriority === p.id ? colors.primary : colors.border, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: taskPriority === p.id ? '#fff' : colors.text }}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          {(() => {
            const splitsNaoFecham = type === 'receita' && modoPagamentoMultipla && paymentSplits.length > 0 && valorTotalReceita > 0 && Math.abs(totalSplitsAtual - valorTotalReceita) > 0.01;
            return (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: splitsNaoFecham ? colors.border : colors.primary }]}
                onPress={splitsNaoFecham ? undefined : handleSubmit}
                disabled={splitsNaoFecham}
              >
                <Text style={[styles.btnText, splitsNaoFecham && { color: colors.textSecondary }]}>{type === 'receita' ? 'FATURAR' : 'Cadastrar'}</Text>
              </TouchableOpacity>
            );
          })()}
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}
