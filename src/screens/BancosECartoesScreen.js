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
import { usePlan } from '../contexts/PlanContext';
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
  bankCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, minHeight: 100 },
  bankCardInner: { padding: 18 },
  bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bankCardName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  bankCardSaldo: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
  bankCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  creditoCard: { borderRadius: 10, padding: 10, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  suggestItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  suggestItemLast: { borderBottomWidth: 0 },
});

function formatMoney(v) {
  const n = Number(v);
  if (isNaN(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function BankCard({ bank, getBankName, getCardsByBankId, formatMoney, openEditBank, handleRemoveBank, openEditCard, handleRemoveCard, gradientColors }) {
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
      <Ionicons name="card" size={20} color="rgba(255,255,255,0.95)" />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        <Text style={bc.creditoCardName} numberOfLines={1}>{card.name}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>·</Text>
        <Text style={bc.creditoCardInfo}>Fech. {card.diaFechamento} Venc. {card.diaVencimento}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>·</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{formatMoney(card.saldo || 0)}</Text>
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleRemoveCard(card); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const LinhaCreditoVazio = () => (
    <View style={bc.debitoCard}>
      <Ionicons name="card-outline" size={20} color="rgba(255,255,255,0.9)" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Crédito</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Adicione um cartão</Text>
      </View>
    </View>
  );

  return (
    <View style={bc.bankCard}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={bc.bankCardInner}>
        <View style={bc.bankCardHeader}>
          <Text style={bc.bankCardName} numberOfLines={1}>{nomeExibicao}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
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
  const { showEmpresaFeatures } = usePlan();

  const [showBankModal, setShowBankModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [bankForm, setBankForm] = useState({ bancoId: '', nomeCustom: '', tipo: 'pessoal', tipoConta: 'ambos', saldo: '' });
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [cardForm, setCardForm] = useState({ bankId: '', name: '', diaFechamento: '10', diaVencimento: '15', saldo: '' });

  const banksComCredito = banks.filter((b) => (b.tipoConta || 'ambos') === 'credito' || (b.tipoConta || 'ambos') === 'ambos');

  const bankSuggestions = bankSearchQuery.trim().length === 0
    ? BANCOS_BRASIL
    : BANCOS_BRASIL.filter((b) =>
        b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
          bankSearchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
      );

  useEffect(() => {
    if (!showEmpresaFeatures && filtroTipo === 'empresa') setFiltroTipo('pessoal');
  }, [showEmpresaFeatures]);

  const resetBankForm = () => {
    setBankForm({ bancoId: '', nomeCustom: '', tipo: 'pessoal', tipoConta: 'ambos', saldo: '' });
    setBankSearchQuery('');
    setEditingBank(null);
    Keyboard.dismiss();
  };

  const resetCardForm = () => {
    setCardForm({ bankId: banksComCredito[0]?.id || banks[0]?.id || '', name: '', diaFechamento: '10', diaVencimento: '15', saldo: '' });
    setEditingCard(null);
    Keyboard.dismiss();
  };

  const openAddBank = () => {
    resetBankForm();
    setShowBankModal(true);
  };

  const openEditBank = (bank) => {
    playTapSound();
    setEditingBank(bank);
    const base = BANCOS_BRASIL.find((b) => b.id === (bank.bancoId || 'outro'));
    const displayNome = bank.nomeCustom || base?.nome || 'Outro';
    setBankForm({
      bancoId: bank.bancoId || 'outro',
      nomeCustom: bank.nomeCustom || '',
      tipo: bank.tipo || 'pessoal',
      tipoConta: bank.tipoConta || 'ambos',
      saldo: bank.saldo != null ? String(bank.saldo) : '',
    });
    setBankSearchQuery(displayNome);
    setShowBankModal(true);
  };

  const openAddCard = () => {
    resetCardForm();
    if (banks.length === 0) {
      Alert.alert('Cadastre um banco', 'Adicione primeiro um banco para vincular o cartão.');
      return;
    }
    if (banksComCredito.length === 0) {
      Alert.alert('Nenhum banco com crédito', 'Cadastre um banco com opção "Crédito" ou "Crédito+Débito" para adicionar cartões.');
      return;
    }
    setCardForm((f) => ({ ...f, bankId: banksComCredito[0].id }));
    setShowCardModal(true);
  };

  const openEditCard = (card) => {
    playTapSound();
    setEditingCard(card);
    setCardForm({
      bankId: card.bankId || banks[0]?.id,
      name: card.name || '',
      diaFechamento: String(card.diaFechamento || 10),
      diaVencimento: String(card.diaVencimento || 15),
      saldo: card.saldo != null ? String(card.saldo) : '',
    });
    setShowCardModal(true);
  };

  const handleSaveBank = () => {
    const bancoId = bankForm.bancoId || (bankForm.nomeCustom?.trim() ? 'outro' : '');
    if (!bancoId) {
      Alert.alert('Erro', 'Selecione ou digite o nome do banco.');
      return;
    }
    playTapSound();
    Keyboard.dismiss();
    const temDebito = bankForm.tipoConta === 'debito' || bankForm.tipoConta === 'ambos';
    const saldo = temDebito ? (parseFloat(String(bankForm.saldo).replace(',', '.')) || 0) : 0;
    const finalBancoId = bankForm.bancoId || (bankForm.nomeCustom?.trim() ? 'outro' : '');
    const finalNomeCustom = bankForm.nomeCustom?.trim() || (finalBancoId === 'outro' ? bankSearchQuery.trim() : null) || null;
    const tipoFinal = showEmpresaFeatures ? bankForm.tipo : 'pessoal';
    if (editingBank) {
      updateBank(editingBank.id, {
        bancoId: finalBancoId,
        nomeCustom: finalNomeCustom,
        tipo: tipoFinal,
        tipoConta: bankForm.tipoConta,
        saldo,
      });
    } else {
      addBank({
        bancoId: finalBancoId,
        nomeCustom: finalNomeCustom,
        tipo: tipoFinal,
        tipoConta: bankForm.tipoConta,
        saldo,
      });
    }
    setShowBankModal(false);
    resetBankForm();
  };

  const handleSaveCard = () => {
    if (!cardForm.bankId) {
      Alert.alert('Erro', 'Selecione o banco do cartão.');
      return;
    }
    if (!cardForm.name?.trim()) {
      Alert.alert('Erro', 'Informe o nome do cartão.');
      return;
    }
    const diaFech = Math.max(1, Math.min(31, parseInt(cardForm.diaFechamento, 10) || 10));
    const diaVenc = Math.max(1, Math.min(31, parseInt(cardForm.diaVencimento, 10) || 15));
    const saldoCard = parseFloat(String(cardForm.saldo).replace(',', '.')) || 0;
    playTapSound();
    if (editingCard) {
      updateCard(editingCard.id, {
        bankId: cardForm.bankId,
        name: cardForm.name.trim(),
        diaFechamento: diaFech,
        diaVencimento: diaVenc,
        saldo: saldoCard,
      });
    } else {
      addCard({
        bankId: cardForm.bankId,
        name: cardForm.name.trim(),
        diaFechamento: diaFech,
        diaVencimento: diaVenc,
        saldo: saldoCard,
      });
    }
    setShowCardModal(false);
    resetCardForm();
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
                { flex: 1, borderColor: filtroTipo === 'todos' ? colors.primary : colors.border, backgroundColor: filtroTipo === 'todos' ? colors.primaryRgba(0.15) : 'transparent' },
              ]}
              onPress={() => { playTapSound(); setFiltroTipo('todos'); }}
            >
              <Text style={[bc.headerTabText, { color: filtroTipo === 'todos' ? colors.primary : colors.textSecondary, textAlign: 'center' }]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                bc.headerTab,
                { flex: 1, borderColor: filtroTipo === 'pessoal' ? colors.primary : colors.border, backgroundColor: filtroTipo === 'pessoal' ? colors.primaryRgba(0.15) : 'transparent' },
              ]}
              onPress={() => { playTapSound(); setFiltroTipo('pessoal'); }}
            >
              <Text style={[bc.headerTabText, { color: filtroTipo === 'pessoal' ? colors.primary : colors.textSecondary, textAlign: 'center' }]}>Pessoal</Text>
            </TouchableOpacity>
            {showEmpresaFeatures && (
            <TouchableOpacity
              style={[
                bc.headerTab,
                { flex: 1, borderColor: filtroTipo === 'empresa' ? '#6366f1' : colors.border, backgroundColor: filtroTipo === 'empresa' ? 'rgba(99,102,241,0.15)' : 'transparent' },
              ]}
              onPress={() => { playTapSound(); setFiltroTipo('empresa'); }}
            >
              <Text style={[bc.headerTabText, { color: filtroTipo === 'empresa' ? '#6366f1' : colors.textSecondary, textAlign: 'center' }]}>Empresa</Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={bc.section}>
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[bc.addBtn, { borderColor: colors.primary, flex: 1 }]}
              onPress={() => { playTapSound(); openAddBank(); }}
            >
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Banco</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[bc.addBtn, { borderColor: colors.primary, flex: 1 }]}
              onPress={() => { playTapSound(); openAddCard(); }}
            >
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Cartão</Text>
            </TouchableOpacity>
          </View>

          {banks.length === 0 ? (
            <View style={bc.empty}>
              <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
              <Text style={[bc.emptyText, { color: colors.textSecondary }]}>Nenhum banco cadastrado</Text>
              <Text style={[bc.emptyText, { fontSize: 13 }]}>Adicione bancos e cartões para acompanhar</Text>
            </View>
          ) : (
            <>
              {banks.filter((b) => b.tipo === 'pessoal').length > 0 && (filtroTipo === 'todos' || filtroTipo === 'pessoal') && (
                <View style={bc.sectionPessoal}>
                  <Text style={[bc.sectionTitle, { color: colors.primary }]}>PESSOAL</Text>
                  {banks.filter((b) => b.tipo === 'pessoal').map((bank) => (
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
                      gradientColors={['#059669', '#10b981', '#34d399']}
                    />
                  ))}
                </View>
              )}
              {showEmpresaFeatures && banks.filter((b) => b.tipo === 'empresa').length > 0 && (filtroTipo === 'todos' || filtroTipo === 'empresa') && (
                <View style={bc.sectionEmpresa}>
                  <Text style={[bc.sectionTitle, { color: '#6366f1' }]}>EMPRESA</Text>
                  {banks.filter((b) => b.tipo === 'empresa').map((bank) => (
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
                      gradientColors={['#4338ca', '#6366f1', '#818cf8']}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Banco */}
      <Modal visible={showBankModal} transparent animationType="slide">
        <View style={[bc.modalOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowBankModal(false); resetBankForm(); }} />
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <ScrollView
                style={{ maxHeight: '85%' }}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={[bc.modalContent, { backgroundColor: colors.card }]}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>
                    {editingBank ? 'Editar banco' : 'Novo banco'}
                  </Text>
                  <Text style={[bc.inputLabel, { color: colors.text }]}>Banco</Text>
                  <TextInput
                    style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                    value={bankSearchQuery}
                    onChangeText={(t) => {
                      setBankSearchQuery(t);
                      if (!t.trim()) {
                        setBankForm((f) => ({ ...f, bancoId: '', nomeCustom: '' }));
                        return;
                      }
                      const match = BANCOS_BRASIL.find((b) => b.nome.toLowerCase() === t.trim().toLowerCase());
                      if (match) setBankForm((f) => ({ ...f, bancoId: match.id, nomeCustom: '' }));
                      else setBankForm((f) => ({ ...f, bancoId: '', nomeCustom: t.trim() }));
                    }}
                    placeholder="Digite para buscar..."
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {bankSuggestions.length > 0 && (
                    <ScrollView style={[bc.suggestList, { maxHeight: 200, borderColor: colors.border, backgroundColor: colors.card }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {bankSuggestions.map((b, i) => (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            bc.suggestItem,
                            i === bankSuggestions.length - 1 && bc.suggestItemLast,
                            { borderColor: colors.border },
                          ]}
                          onPress={() => {
                            playTapSound();
                            setBankSearchQuery(b.nome);
                            setBankForm((f) => ({ ...f, bancoId: b.id, nomeCustom: b.id === 'outro' && bankSearchQuery.trim() ? bankSearchQuery.trim() : '' }));
                            Keyboard.dismiss();
                          }}
                        >
                          <Text style={[bc.pickerItemText, { color: colors.text }]}>{b.nome}</Text>
                        </TouchableOpacity>
                      ))}
                      {!bankSuggestions.some((s) => s.id === 'outro') && (
                        <TouchableOpacity
                          style={[bc.suggestItem, bc.suggestItemLast, { borderColor: colors.border }]}
                          onPress={() => {
                            playTapSound();
                            setBankSearchQuery('Outro');
                            setBankForm((f) => ({ ...f, bancoId: 'outro', nomeCustom: bankSearchQuery.trim() || '' }));
                            Keyboard.dismiss();
                          }}
                        >
                          <Text style={[bc.pickerItemText, { color: colors.text }]}>Outro</Text>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  )}
                  <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Nome personalizado (opcional)</Text>
                  <TextInput
                    style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                    value={bankForm.nomeCustom}
                    onChangeText={(t) => setBankForm((f) => ({ ...f, nomeCustom: t }))}
                    placeholder="Ex: Santander Empresas"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {showEmpresaFeatures && (
                  <>
                  <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Pessoal ou Empresa</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        bc.tipoBtn,
                        { borderColor: bankForm.tipo === 'pessoal' ? colors.primary : colors.border, backgroundColor: bankForm.tipo === 'pessoal' ? colors.primaryRgba(0.15) : 'transparent' },
                      ]}
                      onPress={() => setBankForm((f) => ({ ...f, tipo: 'pessoal' }))}
                    >
                      <Text style={[bc.pickerItemText, { color: bankForm.tipo === 'pessoal' ? colors.primary : colors.text, textAlign: 'center' }]}>Pessoal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        bc.tipoBtn,
                        { borderColor: bankForm.tipo === 'empresa' ? colors.primary : colors.border, backgroundColor: bankForm.tipo === 'empresa' ? colors.primaryRgba(0.15) : 'transparent' },
                      ]}
                      onPress={() => setBankForm((f) => ({ ...f, tipo: 'empresa' }))}
                    >
                      <Text style={[bc.pickerItemText, { color: bankForm.tipo === 'empresa' ? colors.primary : colors.text, textAlign: 'center' }]}>Empresa</Text>
                    </TouchableOpacity>
                  </View>
                  </>
                  )}
                  <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Tipo de conta</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        bc.tipoBtn,
                        { borderColor: bankForm.tipoConta === 'debito' ? colors.primary : colors.border, backgroundColor: bankForm.tipoConta === 'debito' ? colors.primaryRgba(0.15) : 'transparent' },
                      ]}
                      onPress={() => setBankForm((f) => ({ ...f, tipoConta: 'debito' }))}
                    >
                      <Text style={[bc.pickerItemText, { color: bankForm.tipoConta === 'debito' ? colors.primary : colors.text, textAlign: 'center' }]}>Débito</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        bc.tipoBtn,
                        { borderColor: bankForm.tipoConta === 'credito' ? colors.primary : colors.border, backgroundColor: bankForm.tipoConta === 'credito' ? colors.primaryRgba(0.15) : 'transparent' },
                      ]}
                      onPress={() => setBankForm((f) => ({ ...f, tipoConta: 'credito' }))}
                    >
                      <Text style={[bc.pickerItemText, { color: bankForm.tipoConta === 'credito' ? colors.primary : colors.text, textAlign: 'center' }]}>Crédito</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        bc.tipoBtn,
                        { borderColor: bankForm.tipoConta === 'ambos' ? colors.primary : colors.border, backgroundColor: bankForm.tipoConta === 'ambos' ? colors.primaryRgba(0.15) : 'transparent' },
                      ]}
                      onPress={() => setBankForm((f) => ({ ...f, tipoConta: 'ambos' }))}
                    >
                      <Text style={[bc.pickerItemText, { color: bankForm.tipoConta === 'ambos' ? colors.primary : colors.text, textAlign: 'center' }]}>Crédito+Débito</Text>
                    </TouchableOpacity>
                  </View>
                  {(bankForm.tipoConta === 'debito' || bankForm.tipoConta === 'ambos') && (
                    <>
                      <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Saldo atual (R$)</Text>
                      <TextInput
                        style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                        value={bankForm.saldo}
                        onChangeText={(t) => setBankForm((f) => ({ ...f, saldo: t }))}
                        placeholder="0,00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                      <TouchableOpacity
                        style={[bc.keyboardDismissBtn, { backgroundColor: colors.primaryRgba(0.15), alignSelf: 'flex-start' }]}
                        onPress={() => { playTapSound(); Keyboard.dismiss(); }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Ocultar teclado</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <View style={bc.row}>
                    <TouchableOpacity style={[bc.btn, { backgroundColor: colors.border }]} onPress={() => { playTapSound(); setShowBankModal(false); resetBankForm(); }}>
                      <Text style={[bc.btnText, { color: colors.text }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[bc.btn, { backgroundColor: colors.primary }]} onPress={handleSaveBank}>
                      <Text style={[bc.btnText, { color: '#fff' }]}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Modal Cartão */}
      <Modal visible={showCardModal} transparent animationType="slide">
        <View style={bc.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowCardModal(false); resetCardForm(); }} />
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <ScrollView
              style={{ maxHeight: '85%' }}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[bc.modalContent, { backgroundColor: colors.card }]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>
                  {editingCard ? 'Editar cartão' : 'Novo cartão'}
                </Text>
                <Text style={[bc.inputLabel, { color: colors.text }]}>Banco do cartão</Text>
                <View style={bc.pickerRow}>
                    {banksComCredito.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          bc.pickerItem,
                          {
                            borderColor: cardForm.bankId === b.id ? colors.primary : colors.border,
                            backgroundColor: cardForm.bankId === b.id ? colors.primaryRgba(0.15) : 'transparent',
                          },
                        ]}
                        onPress={() => { playTapSound(); setCardForm((f) => ({ ...f, bankId: b.id })); }}
                      >
                        <Text style={[bc.pickerItemText, { color: cardForm.bankId === b.id ? colors.primary : colors.text }]} numberOfLines={1}>{getBankName(b)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Nome do cartão</Text>
                <TextInput
                  style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                  value={cardForm.name}
                  onChangeText={(t) => setCardForm((f) => ({ ...f, name: t }))}
                  placeholder="Ex: Nubank Ultravioleta"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[bc.inputLabel, { color: colors.text, marginTop: 16 }]}>Saldo da fatura (R$)</Text>
                <TextInput
                  style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                  value={cardForm.saldo}
                  onChangeText={(t) => setCardForm((f) => ({ ...f, saldo: t }))}
                  placeholder="0,00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[bc.inputLabel, { color: colors.text }]}>Dia fechamento</Text>
                    <TextInput
                      style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                      value={cardForm.diaFechamento}
                      onChangeText={(t) => setCardForm((f) => ({ ...f, diaFechamento: t }))}
                      placeholder="10"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[bc.inputLabel, { color: colors.text }]}>Dia vencimento</Text>
                    <TextInput
                      style={[bc.input, { borderColor: colors.border, color: colors.text }]}
                      value={cardForm.diaVencimento}
                      onChangeText={(t) => setCardForm((f) => ({ ...f, diaVencimento: t }))}
                      placeholder="15"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={[bc.keyboardDismissBtn, { backgroundColor: colors.primaryRgba(0.15), marginTop: 12 }]}
                  onPress={() => { playTapSound(); Keyboard.dismiss(); }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Ocultar teclado</Text>
                </TouchableOpacity>
                <View style={bc.row}>
                  <TouchableOpacity style={[bc.btn, { backgroundColor: colors.border }]} onPress={() => { playTapSound(); setShowCardModal(false); resetCardForm(); }}>
                    <Text style={[bc.btnText, { color: colors.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[bc.btn, { backgroundColor: colors.primary }]} onPress={handleSaveCard}>
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
