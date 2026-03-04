import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useBanks, BANCOS_BRASIL } from '../contexts/BanksContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePlan } from '../contexts/PlanContext';
import { useValuesVisibility } from '../contexts/ValuesVisibilityContext';
import { BanksCarousel } from '../components/BanksCarousel';
import { topBarStyles } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';

const bc = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#6b7280', marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  bankName: { fontSize: 17, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  saldoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  saldoLabel: { fontSize: 13, color: '#6b7280' },
  saldoVal: { fontSize: 18, fontWeight: '800' },
  cardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', gap: 12 },
  cardIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  tipoBtn: { flex: 1, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 6, borderWidth: 1 },
  pickerItemText: { fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#6b7280' },
  debitoTag: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginTop: 4 },
  bankCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, minHeight: 100, alignSelf: 'stretch' },
  bankCardInner: { padding: 18 },
  bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0 },
  bankCardName: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, minWidth: 0 },
  bankCardSaldo: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
  bankCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  creditoCard: { borderRadius: 10, padding: 10, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  creditoCardName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  creditoCardInfo: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  debitoCard: { borderRadius: 10, padding: 10, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 10 },
  openFinanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, marginBottom: 20 },
  sectionPessoal: { marginBottom: 24 },
  sectionEmpresa: { marginBottom: 24 },
  headerTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6, borderWidth: 1 },
  headerTabText: { fontSize: 13, fontWeight: '600' },
  keyboardDismissBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignSelf: 'flex-end', marginTop: 8 },
  suggestList: { maxHeight: 200, borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginTop: 4 },
  suggestItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  suggestItemLast: { borderBottomWidth: 0 },
});

function formatMoney(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CORES_BANCO = [
  { id: 'verde', label: 'Verde', hex: '#059669', grad: ['#047857', '#10b981'] },
  { id: 'roxo', label: 'Roxo', hex: '#6366f1', grad: ['#4338ca', '#818cf8'] },
  { id: 'vermelho', label: 'Vermelho', hex: '#dc2626', grad: ['#b91c1c', '#ef4444'] },
  { id: 'laranja', label: 'Laranja', hex: '#d97706', grad: ['#b45309', '#f59e0b'] },
  { id: 'violeta', label: 'Violeta', hex: '#7c3aed', grad: ['#5b21b6', '#a78bfa'] },
  { id: 'ciano', label: 'Ciano', hex: '#0891b2', grad: ['#0e7490', '#22d3ee'] },
  { id: 'rosa', label: 'Rosa', hex: '#be185d', grad: ['#9d174d', '#ec4899'] },
  { id: 'azul', label: 'Azul', hex: '#2563eb', grad: ['#1d4ed8', '#60a5fa'] },
  { id: 'teal', label: 'Teal', hex: '#0d9488', grad: ['#0f766e', '#2dd4bf'] },
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5', grad: ['#3730a3', '#818cf8'] },
];

function getGradientForBank(bank, defaultPessoal, defaultEmpresa) {
  if (bank?.cor) {
    const preset = CORES_BANCO.find((c) => c.id === bank.cor || c.hex === bank.cor);
    if (preset) return preset.grad;
    if (typeof bank.cor === 'string' && bank.cor.startsWith('#')) return [bank.cor, bank.cor];
  }
  return (bank?.tipo || 'pessoal') === 'empresa' ? defaultEmpresa : defaultPessoal;
}

function BankCard({ bank, getBankName, getCardsByBankId, formatMoney, openEditBank, handleRemoveBank, openEditCard, handleRemoveCard, onAddCardToBank, gradientColors }) {
  const bankCards = getCardsByBankId(bank.id);
  const nomeExibicao = getBankName(bank);
  const tipoConta = bank.tipoConta || 'ambos';
  const temDebito = tipoConta === 'debito' || tipoConta === 'ambos';
  const temCredito = tipoConta === 'credito' || tipoConta === 'ambos';
  const ehAmbos = tipoConta === 'ambos';

  const LinhaDebito = () => (
    <View style={[bc.creditoCard, { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)' }]}>
      <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.95)" />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>Débito</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>·</Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{formatMoney(bank.saldo)}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>· Saldo corrente</Text>
      </View>
    </View>
  );

  const LinhaCredito = ({ card }) => (
    <TouchableOpacity
      style={bc.creditoCard}
      onPress={() => openEditCard(card)}
      activeOpacity={0.8}
    >
      <Ionicons name="card" size={20} color="rgba(255,255,255,0.95)" style={{ marginRight: 4 }} />
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        <Text style={bc.creditoCardName} numberOfLines={1}>{card.name}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>·</Text>
        <Text style={[bc.creditoCardInfo, { flexShrink: 0 }]}>Fech. {card.diaFechamento} Venc. {card.diaVencimento}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>·</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{formatMoney(card.saldo || 0)}</Text>
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleRemoveCard(card); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4, marginLeft: 4 }}>
        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const LinhaCreditoVazio = () => (
    <TouchableOpacity style={bc.debitoCard} onPress={() => onAddCardToBank?.(bank)} activeOpacity={0.8}>
      <Ionicons name="card-outline" size={20} color="rgba(255,255,255,0.9)" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Crédito</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Adicione um cartão</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={bc.bankCard}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={bc.bankCardInner}>
        <View style={bc.bankCardHeader}>
          <Text style={bc.bankCardName} numberOfLines={1}>{nomeExibicao}</Text>
          <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
            <TouchableOpacity onPress={() => openEditBank(bank)} style={{ padding: 6 }}>
              <Ionicons name="pencil-outline" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveBank(bank)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        </View>

        {ehAmbos ? (
          <View style={{ marginTop: 4 }}>
            <LinhaDebito />
            {bankCards.length > 0 ? bankCards.map((card) => <LinhaCredito key={card.id} card={card} />) : <LinhaCreditoVazio />}
          </View>
        ) : temDebito ? (
          <>
            <Text style={bc.bankCardSaldo}>{formatMoney(bank.saldo)}</Text>
            <Text style={bc.bankCardSub}>Conta corrente · Saldo disponível</Text>
          </>
        ) : null}

        {temCredito && !ehAmbos && (
          <View style={{ marginTop: 6 }}>
            {bankCards.length > 0 ? bankCards.map((card) => <LinhaCredito key={card.id} card={card} />) : <LinhaCreditoVazio />}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

export function BancosECartoesScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const {
    banks,
    cards,
    addBank,
    updateBank,
    removeBank,
    addCard,
    updateCard,
    removeCard,
    getBankById,
    getCardsByBankId,
    getBankName,
  } = useBanks();
  const { profile } = useProfile();
  const { showEmpresaFeatures } = usePlan();
  const { showValues } = useValuesVisibility();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [addCardOnlyMode, setAddCardOnlyMode] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('pessoal');

  const filteredBanksForCarousel = banks.filter((b) => (b.tipo || 'pessoal') === filtroTipo);

  const BANDEIRAS_OPTS = [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
    { id: 'elo', label: 'Elo' },
    { id: 'hipercard', label: 'Hipercard' },
    { id: 'amex', label: 'Amex' },
  ];
  const [form, setForm] = useState({
    bancoId: '', nomeCustom: '', tipo: 'pessoal', tipoConta: 'ambos',
    saldo: '', cor: '', bandeira: 'visa',
    cardName: '', cardDiaFechamento: '10', cardDiaVencimento: '15', cardSaldo: '', cardBandeira: 'visa',
  });
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [showTipoContaList, setShowTipoContaList] = useState(false);
  const [showBandeiraList, setShowBandeiraList] = useState(false);
  const [showBandeiraCardList, setShowBandeiraCardList] = useState(false);
  const [showCorList, setShowCorList] = useState(false);

  const bankSuggestions = bankSearchQuery.trim().length === 0
    ? BANCOS_BRASIL
    : BANCOS_BRASIL.filter((b) =>
        b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
          bankSearchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
      );

  useEffect(() => {
    if (!showEmpresaFeatures && filtroTipo === 'empresa') setFiltroTipo('pessoal');
  }, [showEmpresaFeatures, filtroTipo]);

  const resetForm = () => {
    setForm({
      bancoId: '', nomeCustom: '', tipo: 'pessoal', tipoConta: 'ambos',
      saldo: '', cor: '', bandeira: 'visa',
      cardName: profile?.nome?.trim() || '', cardDiaFechamento: '10', cardDiaVencimento: '15', cardSaldo: '', cardBandeira: 'visa',
    });
    setBankSearchQuery('');
    setShowBankList(false);
    setShowTipoContaList(false);
    setShowBandeiraList(false);
    setShowBandeiraCardList(false);
    setShowCorList(false);
    setEditingBank(null);
    setEditingCard(null);
    setAddCardOnlyMode(false);
    Keyboard.dismiss();
  };

  const openAddBank = () => {
    resetForm();
    setAddCardOnlyMode(false);
    setShowFormModal(true);
  };

  const openEditBank = (bank) => {
    playTapSound();
    setAddCardOnlyMode(false);
    setEditingBank(bank);
    setEditingCard(null);
    const base = BANCOS_BRASIL.find((b) => b.id === (bank.bancoId || 'outro'));
    const displayNome = bank.nomeCustom || base?.nome || 'Outro';
    const firstCard = getCardsByBankId(bank.id)[0];
    setForm({
      bancoId: bank.bancoId || 'outro',
      nomeCustom: bank.nomeCustom || '',
      tipo: bank.tipo || 'pessoal',
      tipoConta: bank.tipoConta || 'ambos',
      saldo: bank.saldo != null ? String(bank.saldo) : '',
      cor: bank.cor || '',
      bandeira: bank.bandeira || 'visa',
      cardName: firstCard?.name || '',
      cardDiaFechamento: String(firstCard?.diaFechamento || 10),
      cardDiaVencimento: String(firstCard?.diaVencimento || 15),
      cardSaldo: firstCard?.saldo != null ? String(firstCard.saldo) : '',
      cardBandeira: firstCard?.bandeira || bank.bandeira || 'visa',
    });
    setBankSearchQuery(displayNome);
    setShowFormModal(true);
  };

  const openAddCardToBank = (bank) => {
    playTapSound();
    setAddCardOnlyMode(true);
    setEditingBank(bank);
    setEditingCard(null);
    const base = BANCOS_BRASIL.find((b) => b.id === (bank.bancoId || 'outro'));
    const displayNome = bank.nomeCustom || base?.nome || 'Outro';
    setForm({
      bancoId: bank.bancoId || 'outro',
      nomeCustom: bank.nomeCustom || '',
      tipo: bank.tipo || 'pessoal',
      tipoConta: bank.tipoConta || 'ambos',
      saldo: bank.saldo != null ? String(bank.saldo) : '',
      cor: bank.cor || '',
      bandeira: bank.bandeira || 'visa',
      cardName: profile?.nome?.trim() || '', cardDiaFechamento: '10', cardDiaVencimento: '15', cardSaldo: '', cardBandeira: bank.bandeira || 'visa',
    });
    setBankSearchQuery(displayNome);
    setShowFormModal(true);
  };

  const openEditCard = (card) => {
    playTapSound();
    setAddCardOnlyMode(false);
    const bank = getBankById(card.bankId);
    if (!bank) return;
    setEditingBank(bank);
    setEditingCard(card);
    const base = BANCOS_BRASIL.find((b) => b.id === (bank.bancoId || 'outro'));
    const displayNome = bank.nomeCustom || base?.nome || 'Outro';
    setForm({
      bancoId: bank.bancoId || 'outro',
      nomeCustom: bank.nomeCustom || '',
      tipo: bank.tipo || 'pessoal',
      tipoConta: bank.tipoConta || 'ambos',
      saldo: bank.saldo != null ? String(bank.saldo) : '',
      cor: bank.cor || '',
      bandeira: bank.bandeira || 'visa',
      cardName: card.name || '',
      cardDiaFechamento: String(card.diaFechamento || 10),
      cardDiaVencimento: String(card.diaVencimento || 15),
      cardSaldo: card.saldo != null ? String(card.saldo) : '',
      cardBandeira: card.bandeira || 'visa',
    });
    setBankSearchQuery(displayNome);
    setShowFormModal(true);
  };

  const handleSaveForm = () => {
    const temCredito = form.tipoConta === 'credito' || form.tipoConta === 'ambos' || addCardOnlyMode;
    const temDebito = form.tipoConta === 'debito' || form.tipoConta === 'ambos';
    if (temCredito && !form.cardName?.trim()) {
      Alert.alert('Erro', 'Informe o nome do cartão de crédito.');
      return;
    }
    const bancoId = form.bancoId || (form.nomeCustom?.trim() ? 'outro' : '');
    if (!editingBank && !bancoId) {
      Alert.alert('Erro', 'Selecione ou digite o nome do banco.');
      return;
    }
    playTapSound();
    Keyboard.dismiss();
    const saldo = temDebito ? (parseFloat(String(form.saldo).replace(',', '.')) || 0) : 0;
    const finalBancoId = bancoId || (form.nomeCustom?.trim() ? 'outro' : '');
    const finalNomeCustom = form.nomeCustom?.trim() || (finalBancoId === 'outro' ? bankSearchQuery.trim() : null) || null;
    const tipoFinal = showEmpresaFeatures ? form.tipo : 'pessoal';
    const diaFech = Math.max(1, Math.min(31, parseInt(form.cardDiaFechamento, 10) || 10));
    const diaVenc = Math.max(1, Math.min(31, parseInt(form.cardDiaVencimento, 10) || 15));
    const saldoCard = parseFloat(String(form.cardSaldo).replace(',', '.')) || 0;

    const cardBandeiraFinal = (form.tipoConta === 'ambos' && !addCardOnlyMode) ? (form.bandeira || 'visa') : (form.cardBandeira || 'visa');
    if ((editingBank && !editingCard && temCredito && form.cardName?.trim()) || (addCardOnlyMode && form.cardName?.trim())) {
      addCard({
        bankId: editingBank.id,
        name: form.cardName.trim(),
        diaFechamento: diaFech,
        diaVencimento: diaVenc,
        saldo: saldoCard,
        bandeira: cardBandeiraFinal,
      });
    } else if (editingBank && editingCard) {
      updateBank(editingBank.id, {
        bancoId: finalBancoId,
        nomeCustom: finalNomeCustom,
        tipo: tipoFinal,
        tipoConta: form.tipoConta,
        saldo,
        cor: form.cor || null,
        bandeira: form.bandeira || 'visa',
      });
      if (temCredito) {
        updateCard(editingCard.id, {
          bankId: editingBank.id,
          name: form.cardName.trim(),
          diaFechamento: diaFech,
          diaVencimento: diaVenc,
          saldo: saldoCard,
          bandeira: cardBandeiraFinal,
        });
      }
    } else if (editingBank) {
      updateBank(editingBank.id, {
        bancoId: finalBancoId,
        nomeCustom: finalNomeCustom,
        tipo: tipoFinal,
        tipoConta: form.tipoConta,
        saldo,
        cor: form.cor || null,
        bandeira: form.bandeira || 'visa',
      });
    } else {
      const newBankId = addBank({
        bancoId: finalBancoId,
        nomeCustom: finalNomeCustom,
        tipo: tipoFinal,
        tipoConta: form.tipoConta,
        saldo,
        cor: form.cor || null,
        bandeira: form.bandeira || 'visa',
      });
      if (temCredito && form.cardName?.trim() && newBankId) {
        addCard({
          bankId: newBankId,
          name: form.cardName.trim(),
          diaFechamento: diaFech,
          diaVencimento: diaVenc,
          saldo: saldoCard,
          bandeira: cardBandeiraFinal,
        });
      }
    }
    setShowFormModal(false);
    resetForm();
  };

  const handleRemoveBank = (bank) => {
    const cardCount = getCardsByBankId(bank.id).length;
    Alert.alert(
      'Remover banco',
      cardCount > 0 ? `Este banco tem ${cardCount} cartão(ões). Ao remover, os cartões também serão excluídos. Continuar?` : 'Remover este banco?',
      [
        { text: 'Cancelar' },
        { text: 'Remover', style: 'destructive', onPress: () => { playTapSound(); removeBank(bank.id); } },
      ]
    );
  };

  const handleRemoveCard = (card) => {
    Alert.alert('Remover cartão', 'Remover este cartão?', [
      { text: 'Cancelar' },
      { text: 'Remover', style: 'destructive', onPress: () => { playTapSound(); removeCard(card.id); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose && (
        <View style={[topBarStyles.bar, { backgroundColor: colors.bg, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[topBarStyles.title, { color: colors.text }]}>Bancos e Cartões</Text>
            <TouchableOpacity
              style={[topBarStyles.menuBtn, { backgroundColor: colors.primaryRgba(0.2) }]}
              onPress={() => { playTapSound(); onClose(); }}
            >
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[
                bc.headerTab,
                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: filtroTipo === 'pessoal' ? colors.primary : colors.border, backgroundColor: filtroTipo === 'pessoal' ? colors.primaryRgba(0.15) : 'transparent' },
              ]}
              onPress={() => { playTapSound(); setFiltroTipo('pessoal'); }}
            >
              <Ionicons name="person-outline" size={18} color={filtroTipo === 'pessoal' ? colors.primary : colors.textSecondary} />
              <Text style={[bc.headerTabText, { color: filtroTipo === 'pessoal' ? colors.primary : colors.textSecondary, textAlign: 'center' }]}>Pessoal</Text>
            </TouchableOpacity>
            {showEmpresaFeatures && (
            <TouchableOpacity
              style={[
                bc.headerTab,
                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: filtroTipo === 'empresa' ? '#6366f1' : colors.border, backgroundColor: filtroTipo === 'empresa' ? 'rgba(99,102,241,0.15)' : 'transparent' },
              ]}
              onPress={() => { playTapSound(); setFiltroTipo('empresa'); }}
            >
              <Ionicons name="business-outline" size={18} color={filtroTipo === 'empresa' ? '#6366f1' : colors.textSecondary} />
              <Text style={[bc.headerTabText, { color: filtroTipo === 'empresa' ? '#6366f1' : colors.textSecondary, textAlign: 'center' }]}>Empresa</Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={bc.section}>
          {banks.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[bc.sectionTitle, { color: colors.textSecondary }]}>SEUS CARTÕES</Text>
              <View style={{ marginHorizontal: -16 }}>
              <BanksCarousel
                banks={filteredBanksForCarousel}
                getBankName={getBankName}
                getCardsByBankId={getCardsByBankId}
                getBankGrad={(bank) => getGradientForBank(bank, ['#059669', '#10b981', '#34d399'], ['#4338ca', '#6366f1', '#818cf8'])}
                profile={profile}
                formatBankMoney={formatMoney}
                showValues={showValues}
                onCardPress={(bank) => bank && openEditBank(bank)}
                onEmptyPress={openAddBank}
                emptyContent={
                  <View style={[bc.empty, { paddingVertical: 24 }]}>
                    <Ionicons name="wallet-outline" size={32} color={colors.textSecondary} />
                    <Text style={[bc.emptyText, { color: colors.textSecondary }]}>Nenhum banco neste filtro</Text>
                  </View>
                }
                dotActiveColor={colors.primary}
                dotInactiveColor={colors.textSecondary + '50'}
              />
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[bc.openFinanceBtn, { backgroundColor: colors.primary }]}
            onPress={() => { playTapSound(); Alert.alert('Open Finance', 'Integração com Open Finance em desenvolvimento. Em breve você poderá sincronizar suas contas automaticamente.'); }}
          >
            <Ionicons name="link-outline" size={24} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Open Finance</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Em breve</Text>
            </View>
          </TouchableOpacity>

          <Text style={[bc.sectionTitle, { color: colors.textSecondary }]}>ADICIONAR</Text>
          <TouchableOpacity
            style={[bc.addBtn, { borderColor: colors.primary }]}
            onPress={() => { playTapSound(); openAddBank(); }}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>Banco ou Cartão</Text>
          </TouchableOpacity>

          {banks.length === 0 ? (
            <View style={bc.empty}>
              <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
              <Text style={[bc.emptyText, { color: colors.textSecondary }]}>Nenhum banco cadastrado</Text>
              <Text style={[bc.emptyText, { fontSize: 13 }]}>Adicione bancos e cartões para acompanhar</Text>
            </View>
          ) : (
            <>
              {banks.filter((b) => (b.tipo || 'pessoal') === 'pessoal').length > 0 && (filtroTipo === 'pessoal') && (
                <View style={bc.sectionPessoal}>
                  <Text style={[bc.sectionTitle, { color: colors.primary }]}>PESSOAL</Text>
                  {banks.filter((b) => (b.tipo || 'pessoal') === 'pessoal').map((bank) => (
                    <BankCard
                      key={bank.id}
                      bank={bank}
                      getBankName={getBankName}
                      getCardsByBankId={getCardsByBankId}
                      formatMoney={formatMoney}
                      openEditBank={openEditBank}
                      handleRemoveBank={handleRemoveBank}
                      openEditCard={openEditCard}
                      handleRemoveCard={handleRemoveCard}
                      onAddCardToBank={openAddCardToBank}
                      gradientColors={getGradientForBank(bank, ['#059669', '#10b981', '#34d399'], ['#4338ca', '#6366f1', '#818cf8'])}
                    />
                  ))}
                </View>
              )}
              {showEmpresaFeatures && banks.filter((b) => (b.tipo || 'pessoal') === 'empresa').length > 0 && (filtroTipo === 'empresa') && (
                <View style={bc.sectionEmpresa}>
                  <Text style={[bc.sectionTitle, { color: '#6366f1' }]}>EMPRESA</Text>
                  {banks.filter((b) => (b.tipo || 'pessoal') === 'empresa').map((bank) => (
                    <BankCard
                      key={bank.id}
                      bank={bank}
                      getBankName={getBankName}
                      getCardsByBankId={getCardsByBankId}
                      formatMoney={formatMoney}
                      openEditBank={openEditBank}
                      handleRemoveBank={handleRemoveBank}
                      openEditCard={openEditCard}
                      handleRemoveCard={handleRemoveCard}
                      onAddCardToBank={openAddCardToBank}
                      gradientColors={getGradientForBank(bank, ['#059669', '#10b981', '#34d399'], ['#4338ca', '#6366f1', '#818cf8'])}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal unificado Banco + Cartão */}
      <Modal visible={showFormModal} transparent animationType="slide">
        <View style={[bc.modalOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowFormModal(false); resetForm(); }} />
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <ScrollView style={{ maxHeight: '90%' }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[bc.modalContent, { backgroundColor: colors.card }]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
                  {editingCard ? 'Editar cartão' : addCardOnlyMode ? 'Adicionar cartão ao banco' : editingBank ? 'Editar banco e cartão' : 'Novo banco ou cartão'}
                </Text>
                {showEmpresaFeatures && !addCardOnlyMode && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    <TouchableOpacity
                      style={[bc.headerTab, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: form.tipo === 'pessoal' ? colors.primary : colors.border, backgroundColor: form.tipo === 'pessoal' ? colors.primaryRgba(0.15) : 'transparent' }]}
                      onPress={() => { playTapSound(); setForm((f) => ({ ...f, tipo: 'pessoal' })); }}
                    >
                      <Ionicons name="person-outline" size={18} color={form.tipo === 'pessoal' ? colors.primary : colors.textSecondary} />
                      <Text style={[bc.headerTabText, { color: form.tipo === 'pessoal' ? colors.primary : colors.textSecondary, textAlign: 'center' }]}>Pessoal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[bc.headerTab, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: form.tipo === 'empresa' ? '#6366f1' : colors.border, backgroundColor: form.tipo === 'empresa' ? 'rgba(99,102,241,0.15)' : 'transparent' }]}
                      onPress={() => { playTapSound(); setForm((f) => ({ ...f, tipo: 'empresa' })); }}
                    >
                      <Ionicons name="business-outline" size={18} color={form.tipo === 'empresa' ? '#6366f1' : colors.textSecondary} />
                      <Text style={[bc.headerTabText, { color: form.tipo === 'empresa' ? '#6366f1' : colors.textSecondary, textAlign: 'center' }]}>Empresa</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!addCardOnlyMode && (
                  <>
                    <Text style={[bc.inputLabel, { color: colors.text, marginTop: 0, marginBottom: 8 }]}>Tipo de conta</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                      <TouchableOpacity style={{ flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: form.tipoConta === 'ambos' ? colors.primary : colors.border, backgroundColor: form.tipoConta === 'ambos' ? colors.primaryRgba(0.15) : 'transparent' }} onPress={() => { playTapSound(); setForm((f) => ({ ...f, tipoConta: 'ambos' })); }}>
                        <Ionicons name="layers-outline" size={24} color={form.tipoConta === 'ambos' ? colors.primary : colors.textSecondary} style={{ marginBottom: 4 }} />
                        <Text style={[bc.pickerItemText, { color: form.tipoConta === 'ambos' ? colors.primary : colors.text, textAlign: 'center', fontSize: 12 }]}>Débito + Crédito</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: form.tipoConta === 'debito' ? colors.primary : colors.border, backgroundColor: form.tipoConta === 'debito' ? colors.primaryRgba(0.15) : 'transparent' }} onPress={() => { playTapSound(); setForm((f) => ({ ...f, tipoConta: 'debito' })); }}>
                        <Ionicons name="wallet-outline" size={24} color={form.tipoConta === 'debito' ? colors.primary : colors.textSecondary} style={{ marginBottom: 4 }} />
                        <Text style={[bc.pickerItemText, { color: form.tipoConta === 'debito' ? colors.primary : colors.text, textAlign: 'center', fontSize: 12 }]}>Débito</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: form.tipoConta === 'credito' ? colors.primary : colors.border, backgroundColor: form.tipoConta === 'credito' ? colors.primaryRgba(0.15) : 'transparent' }} onPress={() => { playTapSound(); setForm((f) => ({ ...f, tipoConta: 'credito' })); }}>
                        <Ionicons name="card-outline" size={24} color={form.tipoConta === 'credito' ? colors.primary : colors.textSecondary} style={{ marginBottom: 4 }} />
                        <Text style={[bc.pickerItemText, { color: form.tipoConta === 'credito' ? colors.primary : colors.text, textAlign: 'center', fontSize: 12 }]}>Crédito</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {!editingBank && !addCardOnlyMode ? (
                  <>
                    <Text style={[bc.inputLabel, { color: colors.text }]}>Banco</Text>
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={[bc.input, { borderColor: colors.border, color: colors.text, paddingRight: 40 }]}
                        value={bankSearchQuery}
                        onChangeText={(t) => {
                          setBankSearchQuery(t);
                          setShowBankList(true);
                          if (!t.trim()) { setForm((f) => ({ ...f, bancoId: '', nomeCustom: '' })); return; }
                          const match = BANCOS_BRASIL.find((b) => b.nome.toLowerCase() === t.trim().toLowerCase());
                          if (match) setForm((f) => ({ ...f, bancoId: match.id, nomeCustom: '' }));
                          else setForm((f) => ({ ...f, bancoId: '', nomeCustom: t.trim() }));
                        }}
                        onFocus={() => setShowBankList(true)}
                        onBlur={() => setTimeout(() => setShowBankList(false), 200)}
                        placeholder="Digite ou selecione o banco..."
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                      <TouchableOpacity style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 10 }} onPress={() => { playTapSound(); setShowBankList((v) => !v); Keyboard.dismiss(); }}>
                        <Ionicons name={showBankList ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
                      </TouchableOpacity>
                      {showBankList && (
                        <View style={[bc.suggestList, { maxHeight: 240, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 4 }]}>
                          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { playTapSound(); setShowBankList(false); Keyboard.dismiss(); }}>
                            <Ionicons name="chevron-up" size={18} color={colors.primary} />
                            <Text style={[bc.pickerItemText, { color: colors.primary }]}>Ocultar lista</Text>
                          </TouchableOpacity>
                          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                            {bankSuggestions.map((b, i) => (
                              <TouchableOpacity key={b.id} style={[bc.suggestItem, i === bankSuggestions.length - 1 && bc.suggestItemLast, { borderBottomColor: colors.border }]} onPress={() => { playTapSound(); setBankSearchQuery(b.nome); setForm((f) => ({ ...f, bancoId: b.id, nomeCustom: b.id === 'outro' ? (bankSearchQuery.trim() || '') : '' })); setShowBankList(false); Keyboard.dismiss(); }}>
                                <Text style={[bc.pickerItemText, { color: colors.text }]}>{b.nome}</Text>
                              </TouchableOpacity>
                            ))}
                            {!bankSuggestions.some((s) => s.id === 'outro') && (
                              <TouchableOpacity style={[bc.suggestItem, bc.suggestItemLast, { borderBottomWidth: 0 }]} onPress={() => { playTapSound(); setBankSearchQuery('Outro'); setForm((f) => ({ ...f, bancoId: 'outro', nomeCustom: bankSearchQuery.trim() || '' })); setShowBankList(false); Keyboard.dismiss(); }}>
                                <Text style={[bc.pickerItemText, { color: colors.text }]}>Outro</Text>
                              </TouchableOpacity>
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </>
                ) : editingBank ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={[bc.inputLabel, { color: colors.textSecondary }]}>Banco</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{bankSearchQuery || getBankName(editingBank)}</Text>
                  </View>
                ) : null}
                {!editingBank && (form.bancoId === 'outro' || (form.nomeCustom && form.bancoId === '')) && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[bc.inputLabel, { color: colors.text }]}>Nome personalizado</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Se não encontrou o banco na lista acima</Text>
                    <TextInput style={[bc.input, { borderColor: colors.border, color: colors.text }]} value={form.nomeCustom} onChangeText={(t) => setForm((f) => ({ ...f, nomeCustom: t }))} placeholder="Ex: Meu Banco Regional" placeholderTextColor={colors.textSecondary} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                  </View>
                )}
                {!addCardOnlyMode && (
                <>
                {(form.tipoConta === 'debito' || form.tipoConta === 'ambos') && (
                  <>
                    <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Saldo conta corrente (R$)</Text>
                    <TextInput style={[bc.input, { borderColor: colors.border, color: colors.text }]} value={form.saldo} onChangeText={(t) => setForm((f) => ({ ...f, saldo: t }))} placeholder="0,00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                  </>
                )}
                {(form.tipoConta !== 'ambos') && (
                  <>
                    <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Bandeira</Text>
                    <View style={{ position: 'relative' }}>
                      <TouchableOpacity style={[bc.input, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => { playTapSound(); setShowBandeiraList((v) => !v); setShowTipoContaList(false); setShowBandeiraCardList(false); setShowCorList(false); }}>
                        <Text style={[bc.pickerItemText, { color: colors.text }]}>{BANDEIRAS_OPTS.find((b) => b.id === form.bandeira)?.label || 'Selecionar...'}</Text>
                        <Ionicons name={showBandeiraList ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {showBandeiraList && (
                        <ScrollView style={[bc.suggestList, { maxHeight: 220, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 4 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                          {BANDEIRAS_OPTS.map((b, i) => (
                            <TouchableOpacity key={b.id} style={[bc.suggestItem, i === BANDEIRAS_OPTS.length - 1 && bc.suggestItemLast, { borderBottomColor: colors.border }]} onPress={() => { playTapSound(); setForm((f) => ({ ...f, bandeira: b.id, cardBandeira: form.cardBandeira || b.id })); setShowBandeiraList(false); }}>
                              <Text style={[bc.pickerItemText, { color: form.bandeira === b.id ? colors.primary : colors.text }]}>{b.label}</Text>
                              {form.bandeira === b.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                    <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Cor do cartão</Text>
                    <View style={{ position: 'relative' }}>
                      <TouchableOpacity style={[bc.input, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => { playTapSound(); setShowCorList((v) => !v); setShowTipoContaList(false); setShowBandeiraList(false); setShowBandeiraCardList(false); }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {form.cor ? (
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: CORES_BANCO.find((x) => x.id === form.cor)?.hex || colors.border }} />
                          ) : null}
                          <Text style={[bc.pickerItemText, { color: colors.text }]}>{CORES_BANCO.find((c) => c.id === form.cor)?.label || 'Selecionar cor...'}</Text>
                        </View>
                        <Ionicons name={showCorList ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {showCorList && (
                        <ScrollView style={[bc.suggestList, { maxHeight: 220, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 4 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                          {CORES_BANCO.map((c, i) => (
                            <TouchableOpacity key={c.id} style={[bc.suggestItem, i === CORES_BANCO.length - 1 && bc.suggestItemLast, { borderBottomColor: colors.border }]} onPress={() => { playTapSound(); setForm((f) => ({ ...f, cor: f.cor === c.id ? '' : c.id })); setShowCorList(false); }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.hex, borderWidth: 1, borderColor: colors.border }} />
                                <Text style={[bc.pickerItemText, { color: form.cor === c.id ? colors.primary : colors.text }]}>{c.label}</Text>
                              </View>
                              {form.cor === c.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </>
                )}
                </>
                )}
                {addCardOnlyMode && editingBank && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[bc.inputLabel, { color: colors.textSecondary }]}>Banco</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{bankSearchQuery || getBankName(editingBank)}</Text>
                  </View>
                )}
                {(form.tipoConta === 'credito' || form.tipoConta === 'ambos' || addCardOnlyMode) && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[bc.sectionTitle, { fontSize: 14, color: colors.primary, marginBottom: 16, letterSpacing: 1.2 }]}>CARTÃO DE CRÉDITO</Text>
                    {(form.tipoConta === 'ambos' && !addCardOnlyMode) && (
                      <>
                        <Text style={[bc.inputLabel, { color: colors.text }]}>Bandeira</Text>
                        <View style={{ position: 'relative', marginBottom: 0 }}>
                          <TouchableOpacity style={[bc.input, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => { playTapSound(); setShowBandeiraList((v) => !v); setShowTipoContaList(false); setShowBandeiraCardList(false); setShowCorList(false); }}>
                            <Text style={[bc.pickerItemText, { color: colors.text }]}>{BANDEIRAS_OPTS.find((b) => b.id === form.bandeira)?.label || 'Selecionar...'}</Text>
                            <Ionicons name={showBandeiraList ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {showBandeiraList && (
                            <ScrollView style={[bc.suggestList, { maxHeight: 220, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 4 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                              {BANDEIRAS_OPTS.map((b, i) => (
                                <TouchableOpacity key={b.id} style={[bc.suggestItem, i === BANDEIRAS_OPTS.length - 1 && bc.suggestItemLast, { borderBottomColor: colors.border }]} onPress={() => { playTapSound(); setForm((f) => ({ ...f, bandeira: b.id })); setShowBandeiraList(false); }}>
                                  <Text style={[bc.pickerItemText, { color: form.bandeira === b.id ? colors.primary : colors.text }]}>{b.label}</Text>
                                  {form.bandeira === b.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                        <Text style={[bc.inputLabel, { color: colors.text, marginTop: 12 }]}>Cor do cartão</Text>
                        <View style={{ position: 'relative' }}>
                          <TouchableOpacity style={[bc.input, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => { playTapSound(); setShowCorList((v) => !v); setShowTipoContaList(false); setShowBandeiraList(false); setShowBandeiraCardList(false); }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {form.cor ? (
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: CORES_BANCO.find((x) => x.id === form.cor)?.hex || colors.border }} />
                              ) : null}
                              <Text style={[bc.pickerItemText, { color: colors.text }]}>{CORES_BANCO.find((c) => c.id === form.cor)?.label || 'Selecionar cor...'}</Text>
                            </View>
                            <Ionicons name={showCorList ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {showCorList && (
                            <ScrollView style={[bc.suggestList, { maxHeight: 220, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 4 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                              {CORES_BANCO.map((c, i) => (
                                <TouchableOpacity key={c.id} style={[bc.suggestItem, i === CORES_BANCO.length - 1 && bc.suggestItemLast, { borderBottomColor: colors.border }]} onPress={() => { playTapSound(); setForm((f) => ({ ...f, cor: f.cor === c.id ? '' : c.id })); setShowCorList(false); }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.hex, borderWidth: 1, borderColor: colors.border }} />
                                    <Text style={[bc.pickerItemText, { color: form.cor === c.id ? colors.primary : colors.text }]}>{c.label}</Text>
                                  </View>
                                  {form.cor === c.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      </>
                    )}
                    <Text style={[bc.inputLabel, { color: colors.text, marginTop: form.tipoConta === 'ambos' && !addCardOnlyMode ? 12 : 0 }]}>Nome do cartão</Text>
                    <TextInput style={[bc.input, { borderColor: colors.border, color: colors.text }]} value={form.cardName} onChangeText={(t) => setForm((f) => ({ ...f, cardName: t }))} placeholder={profile?.nome ? `Ex: ${profile.nome}` : 'Ex: Nubank Ultravioleta'} placeholderTextColor={colors.textSecondary} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                    {(form.tipoConta === 'credito' || addCardOnlyMode) && (
                      <>
                        <Text style={[bc.inputLabel, { color: colors.text, marginTop: 12 }]}>Bandeira do cartão</Text>
                        <View style={{ position: 'relative' }}>
                          <TouchableOpacity style={[bc.input, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => { playTapSound(); setShowBandeiraCardList((v) => !v); setShowTipoContaList(false); setShowBandeiraList(false); setShowCorList(false); }}>
                            <Text style={[bc.pickerItemText, { color: colors.text }]}>{BANDEIRAS_OPTS.find((b) => b.id === form.cardBandeira)?.label || 'Selecionar...'}</Text>
                            <Ionicons name={showBandeiraCardList ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {showBandeiraCardList && (
                            <ScrollView style={[bc.suggestList, { maxHeight: 220, borderColor: colors.border, backgroundColor: colors.bg, marginTop: 4 }]} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                              {BANDEIRAS_OPTS.map((b, i) => (
                                <TouchableOpacity key={b.id} style={[bc.suggestItem, i === BANDEIRAS_OPTS.length - 1 && bc.suggestItemLast, { borderBottomColor: colors.border }]} onPress={() => { playTapSound(); setForm((f) => ({ ...f, cardBandeira: b.id })); setShowBandeiraCardList(false); }}>
                                  <Text style={[bc.pickerItemText, { color: form.cardBandeira === b.id ? colors.primary : colors.text }]}>{b.label}</Text>
                                  {form.cardBandeira === b.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      </>
                    )}
                    {form.tipoConta === 'ambos' && !addCardOnlyMode && (
                      <Text style={[bc.debitoTag, { color: colors.textSecondary, marginTop: 12 }]}>Mesma bandeira do cartão débito</Text>
                    )}
                    <Text style={[bc.inputLabel, { color: colors.text, marginTop: 12 }]}>Saldo da fatura (R$)</Text>
                    <TextInput style={[bc.input, { borderColor: colors.border, color: colors.text }]} value={form.cardSaldo} onChangeText={(t) => setForm((f) => ({ ...f, cardSaldo: t }))} placeholder="0,00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[bc.inputLabel, { color: colors.text }]}>Dia fechamento</Text>
                        <TextInput style={[bc.input, { borderColor: colors.border, color: colors.text }]} value={form.cardDiaFechamento} onChangeText={(t) => setForm((f) => ({ ...f, cardDiaFechamento: t }))} placeholder="10" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={2} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[bc.inputLabel, { color: colors.text }]}>Dia vencimento</Text>
                        <TextInput style={[bc.input, { borderColor: colors.border, color: colors.text }]} value={form.cardDiaVencimento} onChangeText={(t) => setForm((f) => ({ ...f, cardDiaVencimento: t }))} placeholder="15" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={2} returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} />
                      </View>
                    </View>
                  </View>
                )}
                <View style={bc.row}>
                  <TouchableOpacity style={[bc.btn, { backgroundColor: colors.border }]} onPress={() => { playTapSound(); setShowFormModal(false); resetForm(); }}>
                    <Text style={[bc.btnText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[bc.btn, { backgroundColor: colors.primary }]} onPress={handleSaveForm}>
                    <Text style={[bc.btnText, { color: '#fff' }]}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
