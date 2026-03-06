import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useMenu } from '../contexts/MenuContext';
import { playTapSound } from '../utils/sounds';
import { DatePickerInput } from './DatePickerInput';
import { TimePickerInput } from './TimePickerInput';
import { MoneyInput } from './MoneyInput';
import { parseMoney } from '../utils/format';

const GAP = 20;
const INPUT_HEIGHT = 48;
const RADIUS = 14;
const { width: SW, height: SH } = Dimensions.get('window');
const MODAL_MAX_WIDTH = Math.min(SW - 8, 520);
const MODAL_SCROLL_MAX_HEIGHT = Math.round(SH * 0.7);

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

function nowTimeStr() {
  const d = new Date();
  return [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0')].join(':');
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function AgendaFormModal({ visible, onClose, editingEvent, initialDate, onOpenNewClient, onOpenNewService }) {
  const { colors } = useTheme();
  const { clients, services, products, addAgendaEvent, updateAgendaEvent, deleteAgendaEvent } = useFinance();
  const { showEmpresaFeatures } = usePlan();
  const { openAddModal } = useMenu();

  const [tipo, setTipo] = useState('pessoal');
  const [tipoAtendimento, setTipoAtendimento] = useState('venda');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [date, setDate] = useState(initialDate || todayStr());
  const [amount, setAmount] = useState('0,00');
  const [timeStart, setTimeStart] = useState(nowTimeStr());
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [preOrderItems, setPreOrderItems] = useState([]);
  const [editingItemIdx, setEditingItemIdx] = useState(null);
  const [editingItemPrice, setEditingItemPrice] = useState('0,00');
  const isEdit = Boolean(editingEvent);

  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        const isVendaEmpresa = (editingEvent.tipo || 'pessoal') === 'empresa' && editingEvent.type === 'venda';
        const existingItems = Array.isArray(editingEvent.preOrderItems) ? editingEvent.preOrderItems : [];
        const fallbackService = editingEvent.serviceId ? services?.find((s) => s.id === editingEvent.serviceId) : null;
        setTipo(editingEvent.tipo || 'pessoal');
        setTipoAtendimento(['venda', 'orcamento', 'manutencao'].includes(editingEvent.type) ? editingEvent.type : 'venda');
        setDescription(editingEvent.description || editingEvent.title || '');
        setClientId(editingEvent.clientId || null);
        setServiceId(editingEvent.serviceId || null);
        setDate(editingEvent.date || todayStr());
        setAmount(editingEvent.amount != null ? String(editingEvent.amount).replace('.', ',') : '0,00');
        setTimeStart(editingEvent.time || nowTimeStr());
        setTimeEnd(editingEvent.timeEnd || '10:00');
        if (isVendaEmpresa && existingItems.length === 0 && fallbackService) {
          setPreOrderItems([
            {
              id: 's-' + fallbackService.id + '-' + String(fallbackService.price || editingEvent.amount || 0).replace('.', '_'),
              name: fallbackService.name,
              price: fallbackService.price || editingEvent.amount || 0,
              qty: 1,
              discount: 0,
              isProduct: false,
            },
          ]);
        } else {
          setPreOrderItems(existingItems);
        }
      } else {
        setTipo(showEmpresaFeatures ? 'empresa' : 'pessoal');
        setTipoAtendimento('venda');
        setDescription('');
        setClientId(null);
        setServiceId(null);
        setDate(initialDate || todayStr());
        setAmount('0,00');
        setTimeStart(nowTimeStr());
        setTimeEnd('10:00');
        setPreOrderItems([]);
      }
    }
  }, [visible, editingEvent, initialDate, showEmpresaFeatures, services]);

  const selectedClient = clients?.find((c) => c.id === clientId);
  const selectedService = services?.find((s) => s.id === serviceId);

  const parseAmount = () => parseMoney(amount || '0');

  const preOrderTotal = preOrderItems.reduce((s, i) => s + ((i.price || 0) - (i.discount || 0)) * (i.qty || 1), 0);

  const handleConfirm = () => {
    if (!date?.trim()) return Alert.alert('Erro', 'Informe a data.');
    if (tipo === 'pessoal' && !description?.trim()) return Alert.alert('Erro', 'Preencha a descrição do evento.');
    if (timeToMinutes(timeEnd) < timeToMinutes(timeStart)) {
      return Alert.alert('Erro', 'A hora de término não pode ser menor que a hora de início.');
    }
    playTapSound();
    const hasPreOrder = tipo === 'empresa' && tipoAtendimento === 'venda' && preOrderItems.length > 0;
    const title = tipo === 'pessoal'
      ? (description?.trim() || 'Evento')
      : (selectedClient?.name || selectedService?.name || 'Atendimento');
    const desc = hasPreOrder
      ? preOrderItems.map((i) => `${i.name} x${i.qty || 1}`).join(', ')
      : (selectedClient && selectedService ? `${selectedClient.name} - ${selectedService.name}` : (selectedClient?.name || selectedService?.name || ''));
    const amt = hasPreOrder ? preOrderTotal : parseAmount();
    const payload = {
      title,
      description: tipo === 'pessoal' ? (description?.trim() || '') : desc,
      date,
      time: timeStart,
      timeEnd,
      amount: tipo === 'pessoal' ? 0 : amt,
      tipo: showEmpresaFeatures ? tipo : 'pessoal',
      clientId: tipo === 'empresa' ? clientId : null,
      serviceId: tipo === 'empresa' && !hasPreOrder ? serviceId : null,
      type: tipo === 'empresa' ? tipoAtendimento : 'evento',
      preOrderItems: tipo === 'empresa' && tipoAtendimento === 'venda' ? preOrderItems : [],
    };
    if (isEdit) {
      updateAgendaEvent(editingEvent.id, payload);
    } else {
      addAgendaEvent(payload);
    }
    onClose();
  };

  const handleConcluir = () => {
    if (!isEdit) return;
    playTapSound();
    const hasPreOrder = tipo === 'empresa' && tipoAtendimento === 'venda' && preOrderItems.length > 0;
    const fromAgendaEvent = {
      ...editingEvent,
      tipo,
      type: tipoAtendimento,
      date,
      time: timeStart,
      timeEnd,
      clientId: tipo === 'empresa' ? clientId : null,
      serviceId: tipo === 'empresa' && !hasPreOrder ? serviceId : null,
      preOrderItems: tipo === 'empresa' && tipoAtendimento === 'venda' ? preOrderItems : [],
      amount: tipo === 'empresa' ? (hasPreOrder ? preOrderTotal : parseAmount()) : 0,
      title: tipo === 'pessoal'
        ? (description?.trim() || editingEvent?.title || 'Evento')
        : (selectedClient?.name || selectedService?.name || editingEvent?.title || 'Atendimento'),
      description: tipo === 'pessoal'
        ? (description?.trim() || '')
        : (hasPreOrder
          ? preOrderItems.map((i) => `${i.name} x${i.qty || 1}`).join(', ')
          : (selectedClient && selectedService ? `${selectedClient.name} - ${selectedService.name}` : (selectedClient?.name || selectedService?.name || editingEvent?.description || ''))),
    };
    openAddModal?.('receita', { fromAgendaEvent });
    onClose();
  };

  const handleExcluir = () => {
    if (!isEdit) return;
    playTapSound();
    Alert.alert('Excluir atendimento', 'Quer realmente excluir este atendimento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteAgendaEvent(editingEvent.id);
          onClose();
        },
      },
    ]);
  };

  const inputS = [s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }];
  const labelS = [s.label, { color: colors.textSecondary }];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboard}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.header}>
              <Text style={[s.title, { color: colors.text }]}>
                {isEdit
                  ? (tipo === 'pessoal' ? 'EDITAR EVENTO' : 'EDITAR ATENDIMENTO')
                  : (tipo === 'pessoal' ? 'ADICIONAR EVENTO' : 'ADICIONAR ATENDIMENTO')}
              </Text>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={() => { playTapSound(); onClose(); }}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
            >
              {showEmpresaFeatures && (
                <View style={[s.toggleRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[s.toggleBtn, tipo === 'pessoal' && { backgroundColor: colors.primary }]}
                    onPress={() => { playTapSound(); setTipo('pessoal'); }}
                  >
                    <Ionicons name="person-outline" size={18} color={tipo === 'pessoal' ? '#fff' : colors.text} />
                    <Text style={[s.toggleText, { color: tipo === 'pessoal' ? '#fff' : colors.text }]}>PESSOAL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.toggleBtn, tipo === 'empresa' && { backgroundColor: colors.primary }]}
                    onPress={() => { playTapSound(); setTipo('empresa'); }}
                  >
                    <Ionicons name="business-outline" size={18} color={tipo === 'empresa' ? '#fff' : colors.text} />
                    <Text style={[s.toggleText, { color: tipo === 'empresa' ? '#fff' : colors.text }]}>EMPRESA</Text>
                  </TouchableOpacity>
                </View>
              )}

              {tipo === 'pessoal' ? (
                <>
                  <View style={s.rowLabel}>
                    <Text style={labelS}>DESCRIÇÃO DO EVENTO</Text>
                  </View>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                    placeholder="Ex: Reunião, compromisso..."
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                  <View style={s.rowLabel}>
                    <Text style={labelS}>DATA</Text>
                  </View>
                  <DatePickerInput value={date} onChange={setDate} colors={colors} style={[s.input, { backgroundColor: colors.bg }]} />
                  <View style={s.twoCol}>
                    <View style={s.half}>
                      <Text style={labelS}>INÍCIO</Text>
                      <TimePickerInput value={timeStart} onChange={setTimeStart} colors={colors} placeholder="09:00" style={{ backgroundColor: colors.bg }} />
                    </View>
                    <View style={s.half}>
                      <Text style={labelS}>TÉRMINO</Text>
                      <TimePickerInput value={timeEnd} onChange={setTimeEnd} colors={colors} placeholder="10:00" style={{ backgroundColor: colors.bg }} />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {showEmpresaFeatures && (
                    <>
                      <View style={s.rowLabel}>
                        <Text style={labelS}>TIPO DE ATENDIMENTO</Text>
                      </View>
                      <View style={[s.toggleRow, { backgroundColor: colors.bg, borderColor: colors.border, marginBottom: GAP }]}>
                        {[
                          { id: 'venda', label: 'Venda', icon: 'cash-outline' },
                          { id: 'orcamento', label: 'Orçamento', icon: 'document-text-outline' },
                          { id: 'manutencao', label: 'Garantia', icon: 'construct-outline' },
                        ].map((opt) => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[s.toggleBtn, tipoAtendimento === opt.id && { backgroundColor: colors.primary }]}
                            onPress={() => { playTapSound(); setTipoAtendimento(opt.id); }}
                          >
                            <Ionicons name={opt.icon} size={16} color={tipoAtendimento === opt.id ? '#fff' : colors.text} />
                            <Text style={[s.toggleText, { fontSize: 11 }, { color: tipoAtendimento === opt.id ? '#fff' : colors.text }]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={s.rowLabel}>
                        <Text style={labelS}>CLIENTE</Text>
                        <TouchableOpacity onPress={() => { playTapSound(); onOpenNewClient?.(); }}>
                          <Text style={[s.novoLink, { color: colors.primary }]}>NOVO</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={[s.select, { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setShowClientPicker(true)}>
                        {selectedClient?.foto ? (
                          <Image source={{ uri: selectedClient.foto }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                        ) : (
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="person-outline" size={18} color={colors.primary} />
                          </View>
                        )}
                        <Text style={[s.selectText, { flex: 1, color: selectedClient ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                          {selectedClient?.name || 'Selecionar Cliente...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {tipoAtendimento === 'venda' ? (
                        <>
                          <View style={s.rowLabel}>
                            <Text style={labelS}>ITENS DA VENDA</Text>
                            <TouchableOpacity onPress={() => { playTapSound(); setShowItemPicker(true); }}>
                              <Text style={[s.novoLink, { color: colors.primary }]}>ADICIONAR</Text>
                            </TouchableOpacity>
                          </View>
                          {preOrderItems.length > 0 ? (
                            <>
                              {preOrderItems.map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.bg, borderRadius: 12, marginBottom: 6 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                      <TouchableOpacity onPress={() => { playTapSound(); const q = item.qty || 1; if (q <= 1) return; setPreOrderItems((prev) => prev.map((x, i) => i === idx ? { ...x, qty: q - 1 } : x)); }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="remove" size={16} color={colors.text} />
                                      </TouchableOpacity>
                                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' }}>{item.qty || 1}</Text>
                                      <TouchableOpacity onPress={() => { playTapSound(); setPreOrderItems((prev) => prev.map((x, i) => i === idx ? { ...x, qty: (x.qty || 1) + 1 } : x)); }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryRgba?.(0.3) || colors.primary + '40', justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="add" size={16} color={colors.primary} />
                                      </TouchableOpacity>
                                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>R$ {((item.price || 0) * (item.qty || 1)).toFixed(2).replace('.', ',')}</Text>
                                    </View>
                                  </View>
                                  <TouchableOpacity onPress={() => { playTapSound(); setEditingItemIdx(idx); setEditingItemPrice(String(item.price || 0).replace('.', ',')); }} style={{ padding: 6 }}>
                                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => { playTapSound(); setPreOrderItems((prev) => prev.filter((_, i) => i !== idx)); }} style={{ padding: 6 }}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 4 }}>Total: R$ {preOrderTotal.toFixed(2).replace('.', ',')}</Text>
                            </>
                          ) : (
                            <TouchableOpacity style={[s.select, { backgroundColor: colors.bg, borderColor: colors.border, borderStyle: 'dashed' }]} onPress={() => setShowItemPicker(true)}>
                              <Text style={[s.selectText, { color: colors.textSecondary }]}>Adicionar produtos ou serviços</Text>
                              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </>
                      ) : (
                        <>
                          <View style={s.rowLabel}>
                            <Text style={labelS}>SERVIÇO</Text>
                            <TouchableOpacity onPress={() => { playTapSound(); onOpenNewService?.(); }}>
                              <Text style={[s.novoLink, { color: colors.primary }]}>NOVO</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity style={[s.select, { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setShowServicePicker(true)}>
                            {selectedService?.photoUri ? (
                              <Image source={{ uri: selectedService.photoUri }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                            ) : (
                              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="construct-outline" size={18} color={colors.primary} />
                              </View>
                            )}
                            <Text style={[s.selectText, { flex: 1, color: selectedService ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                              {selectedService?.name || 'Qual o serviço?'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </>
                      )}
                      <View style={s.twoCol}>
                        <View style={s.half}>
                          <Text style={labelS}>DATA DO ATENDIMENTO</Text>
                          <DatePickerInput value={date} onChange={setDate} colors={colors} style={[s.inputFlex, { backgroundColor: colors.bg }]} />
                        </View>
                        {!(tipoAtendimento === 'venda' && preOrderItems.length > 0) && (
                          <View style={s.half}>
                            <Text style={labelS}>VALOR</Text>
                            <MoneyInput value={amount} onChange={setAmount} colors={colors} containerStyle={{ backgroundColor: colors.bg }} />
                          </View>
                        )}
                      </View>
                      <View style={s.twoCol}>
                        <View style={s.half}>
                          <Text style={labelS}>INÍCIO</Text>
                          <TimePickerInput value={timeStart} onChange={setTimeStart} colors={colors} placeholder="09:00" style={{ backgroundColor: colors.bg }} />
                        </View>
                        <View style={s.half}>
                          <Text style={labelS}>TÉRMINO</Text>
                          <TimePickerInput value={timeEnd} onChange={setTimeEnd} colors={colors} placeholder="10:00" style={{ backgroundColor: colors.bg }} />
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>

            {isEdit && tipo === 'empresa' && (
              <View style={s.actionsRow}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10b981' }]} onPress={handleConcluir}>
                  <Text style={s.actionText}>FATURAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ef4444' }]} onPress={handleExcluir}>
                  <Text style={s.actionText}>EXCLUIR</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
              <Text style={s.confirmText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>

      {showClientPicker && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} onPress={() => setShowClientPicker(false)}>
            <View style={[s.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Selecionar cliente</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                <TouchableOpacity style={[s.pickerItem, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => { setClientId(null); setShowClientPicker(false); }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border + '60', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                  </View>
                  <Text style={{ color: colors.textSecondary }}>Nenhum</Text>
                </TouchableOpacity>
                {(clients || []).map((c) => (
                  <TouchableOpacity key={c.id} style={[s.pickerItem, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => { setClientId(c.id); setShowClientPicker(false); }}>
                    {c.foto ? (
                      <Image source={{ uri: c.foto }} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="person-outline" size={22} color={colors.primary} />
                      </View>
                    )}
                    <Text style={{ color: colors.text, flex: 1 }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showServicePicker && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} onPress={() => setShowServicePicker(false)}>
            <View style={[s.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Selecionar serviço</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                <TouchableOpacity style={[s.pickerItem, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => { setServiceId(null); setShowServicePicker(false); }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border + '60', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                  </View>
                  <Text style={{ color: colors.textSecondary }}>Nenhum</Text>
                </TouchableOpacity>
                {(services || []).map((s) => (
                  <TouchableOpacity key={s.id} style={[s.pickerItem, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => { setServiceId(s.id); setShowServicePicker(false); if (!amount || amount === '0,00') setAmount(String(s.price || 0).replace('.', ',')); }}>
                    {s.photoUri ? (
                      <Image source={{ uri: s.photoUri }} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="construct-outline" size={22} color={colors.primary} />
                      </View>
                    )}
                    <Text style={{ color: colors.text, flex: 1 }}>{s.name} — R$ {(s.price || 0).toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showItemPicker && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} onPress={() => setShowItemPicker(false)}>
            <View style={[s.pickerCard, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: 360 }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Adicionar produto ou serviço</Text>
              <ScrollView style={{ maxHeight: 280 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 4 }}>PRODUTOS</Text>
                {(products || []).map((p) => (
                  <TouchableOpacity
                    key={'p-' + p.id}
                    style={[s.pickerItem, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
                    onPress={() => {
                      playTapSound();
                      setPreOrderItems((prev) => [...prev, { id: 'p-' + p.id, name: p.name, price: p.price || 0, qty: 1, discount: 0, isProduct: true }]);
                      setShowItemPicker(false);
                    }}
                  >
                    {p.photoUri ? (
                      <Image source={{ uri: p.photoUri }} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="cube-outline" size={22} color={colors.primary} />
                      </View>
                    )}
                    <Text style={{ color: colors.text, flex: 1 }}>{p.name} — R$ {(p.price || 0).toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 12 }}>SERVIÇOS</Text>
                {(services || []).map((s) => (
                  <TouchableOpacity
                    key={'s-' + s.id}
                    style={[s.pickerItem, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
                    onPress={() => {
                      playTapSound();
                      setPreOrderItems((prev) => [...prev, { id: 's-' + s.id + '-' + String(s.price || 0).replace('.', '_'), name: s.name, price: s.price || 0, qty: 1, discount: 0, isProduct: false }]);
                      setShowItemPicker(false);
                    }}
                  >
                    {s.photoUri ? (
                      <Image source={{ uri: s.photoUri }} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="construct-outline" size={22} color={colors.primary} />
                      </View>
                    )}
                    <Text style={{ color: colors.text, flex: 1 }}>{s.name} — R$ {(s.price || 0).toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
                {(!products || products.length === 0) && (!services || services.length === 0) && (
                  <Text style={{ color: colors.textSecondary, paddingVertical: 16, textAlign: 'center' }}>Cadastre produtos e serviços primeiro</Text>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {editingItemIdx !== null && preOrderItems[editingItemIdx] && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setEditingItemIdx(null)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[s.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Editar valor</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>{preOrderItems[editingItemIdx]?.name}</Text>
              <MoneyInput value={editingItemPrice} onChange={setEditingItemPrice} colors={colors} containerStyle={{ backgroundColor: colors.bg, marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => setEditingItemIdx(null)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const val = parseMoney(editingItemPrice);
                    setPreOrderItems((prev) => prev.map((x, i) => i === editingItemIdx ? { ...x, price: val } : x));
                    setEditingItemIdx(null);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 10 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  keyboard: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: MODAL_MAX_WIDTH, borderRadius: 24, padding: GAP, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: GAP },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scroll: { maxHeight: MODAL_SCROLL_MAX_HEIGHT },
  scrollContent: { paddingBottom: GAP },
  toggleRow: { flexDirection: 'row', borderRadius: RADIUS, borderWidth: 1, padding: 4, marginBottom: GAP },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  rowLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  novoLink: { fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: RADIUS, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: INPUT_HEIGHT },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS, paddingHorizontal: 14, minHeight: INPUT_HEIGHT },
  inputFlex: { flex: 1, fontSize: 15 },
  yearText: { fontSize: 14, fontWeight: '600' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: RADIUS, paddingHorizontal: 14, minHeight: INPUT_HEIGHT, marginBottom: GAP },
  selectText: { fontSize: 15, flex: 1 },
  twoCol: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  half: { flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 2, marginBottom: 8 },
  actionBtn: { flex: 1, borderRadius: RADIUS, paddingVertical: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  confirmBtn: { borderRadius: RADIUS, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pickerCard: { width: '100%', maxWidth: 340, borderRadius: 20, padding: GAP, borderWidth: 1 },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, borderRadius: 12, borderBottomWidth: 0, backgroundColor: 'transparent' },
});
