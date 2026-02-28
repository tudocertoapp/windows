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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { playTapSound } from '../utils/sounds';
import { DatePickerInput } from './DatePickerInput';
import { TimePickerInput } from './TimePickerInput';
import { MoneyInput } from './MoneyInput';
import { parseMoney } from '../utils/format';

const GAP = 20;
const INPUT_HEIGHT = 48;
const RADIUS = 14;

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

function nowTimeStr() {
  const d = new Date();
  return [String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0')].join(':');
}

export function AgendaFormModal({ visible, onClose, editingEvent, initialDate, onOpenNewClient, onOpenNewService }) {
  const { colors } = useTheme();
  const { clients, services, addAgendaEvent, updateAgendaEvent } = useFinance();
  const { showEmpresaFeatures } = usePlan();

  const [tipo, setTipo] = useState('pessoal');
  const [clientId, setClientId] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [date, setDate] = useState(initialDate || todayStr());
  const [amount, setAmount] = useState('0,00');
  const [timeStart, setTimeStart] = useState(nowTimeStr());
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const isEdit = Boolean(editingEvent);

  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        setTipo(editingEvent.tipo || 'pessoal');
        setClientId(editingEvent.clientId || null);
        setServiceId(editingEvent.serviceId || null);
        setDate(editingEvent.date || todayStr());
        setAmount(editingEvent.amount != null ? String(editingEvent.amount).replace('.', ',') : '0,00');
        setTimeStart(editingEvent.time || nowTimeStr());
        setTimeEnd(editingEvent.timeEnd || '10:00');
      } else {
        setTipo(showEmpresaFeatures ? 'empresa' : 'pessoal');
        setClientId(null);
        setServiceId(null);
        setDate(initialDate || todayStr());
        setAmount('0,00');
        setTimeStart(nowTimeStr());
        setTimeEnd('10:00');
      }
    }
  }, [visible, editingEvent, initialDate, showEmpresaFeatures]);

  const selectedClient = clients?.find((c) => c.id === clientId);
  const selectedService = services?.find((s) => s.id === serviceId);

  const parseAmount = () => parseMoney(amount || '0');

  const handleConfirm = () => {
    if (!date?.trim()) return Alert.alert('Erro', 'Informe a data do serviço.');
    playTapSound();
    const title = selectedService?.name || selectedClient?.name || 'Evento';
    const payload = {
      title,
      description: selectedClient && selectedService ? `${selectedClient.name} - ${selectedService.name}` : (selectedClient?.name || selectedService?.name || ''),
      date,
      time: timeStart,
      timeEnd,
      amount: parseAmount(),
      tipo: showEmpresaFeatures ? tipo : 'pessoal',
      clientId: showEmpresaFeatures ? clientId : null,
      serviceId: serviceId || null,
    };
    if (isEdit) {
      updateAgendaEvent(editingEvent.id, payload);
    } else {
      addAgendaEvent(payload);
    }
    onClose();
  };

  const inputS = [s.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }];
  const labelS = [s.label, { color: colors.textSecondary }];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboard}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.header}>
              <Text style={[s.title, { color: colors.text }]}>{isEdit ? 'EDITAR AGENDA' : 'ADICIONAR AGENDA'}</Text>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={() => { playTapSound(); onClose(); }}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={s.scroll} contentContainerStyle={s.scrollContent}>
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

              {showEmpresaFeatures && (
                <>
                  <View style={s.rowLabel}>
                    <Text style={labelS}>CLIENTE</Text>
                    <TouchableOpacity onPress={() => { playTapSound(); onOpenNewClient?.(); }}>
                      <Text style={[s.novoLink, { color: colors.primary }]}>NOVO</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[s.select, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setShowClientPicker(true)}>
                    <Text style={[s.selectText, { color: selectedClient ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                      {selectedClient?.name || 'Selecionar Cliente...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              <View style={s.rowLabel}>
                <Text style={labelS}>SERVIÇO</Text>
                <TouchableOpacity onPress={() => { playTapSound(); onOpenNewService?.(); }}>
                  <Text style={[s.novoLink, { color: colors.primary }]}>NOVO</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.select, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setShowServicePicker(true)}>
                <Text style={[s.selectText, { color: selectedService ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                  {selectedService?.name || 'Qual o serviço?'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={s.twoCol}>
                <View style={s.half}>
                  <Text style={labelS}>DATA DO SERVIÇO</Text>
                  <DatePickerInput value={date} onChange={setDate} colors={colors} style={[s.inputFlex, { backgroundColor: colors.bg }]} />
                </View>
                <View style={s.half}>
                  <Text style={labelS}>VALOR DO SERVIÇO</Text>
                  <MoneyInput value={amount} onChange={setAmount} colors={colors} containerStyle={{ backgroundColor: colors.bg }} />
                </View>
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
            </ScrollView>

            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
              <Text style={s.confirmText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>

      {showClientPicker && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} onPress={() => setShowClientPicker(false)}>
            <View style={[s.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Selecionar cliente</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                <TouchableOpacity style={s.pickerItem} onPress={() => { setClientId(null); setShowClientPicker(false); }}>
                  <Text style={{ color: colors.textSecondary }}>Nenhum</Text>
                </TouchableOpacity>
                {(clients || []).map((c) => (
                  <TouchableOpacity key={c.id} style={s.pickerItem} onPress={() => { setClientId(c.id); setShowClientPicker(false); }}>
                    <Text style={{ color: colors.text }}>{c.name}</Text>
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
                <TouchableOpacity style={s.pickerItem} onPress={() => { setServiceId(null); setShowServicePicker(false); }}>
                  <Text style={{ color: colors.textSecondary }}>Nenhum</Text>
                </TouchableOpacity>
                {(services || []).map((s) => (
                  <TouchableOpacity key={s.id} style={s.pickerItem} onPress={() => { setServiceId(s.id); setShowServicePicker(false); if (!amount || amount === '0,00') setAmount(String(s.price || 0).replace('.', ',')); }}>
                    <Text style={{ color: colors.text }}>{s.name} — R$ {(s.price || 0).toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: GAP },
  keyboard: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, borderRadius: 24, padding: GAP, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: GAP },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scroll: { maxHeight: 420 },
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
  confirmBtn: { borderRadius: RADIUS, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pickerCard: { width: '100%', maxWidth: 340, borderRadius: 20, padding: GAP, borderWidth: 1 },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
});
