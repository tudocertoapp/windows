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
  Dimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DatePickerInput } from './DatePickerInput';
import { TimePickerInput } from './TimePickerInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playTapSound } from '../utils/sounds';

const DEFAULT_TIME_START_KEY = '@tudocerto_agenda_default_time_start';
const { width: SW } = Dimensions.get('window');
const GAP = 20;
const CARD_MAX_WIDTH = Math.min(SW - 8, 520);
const SCROLL_MAX_HEIGHT = Math.min(520, 580);

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

const PRIORIDADES = [
  { id: 'baixa', label: 'Baixa' },
  { id: 'media', label: 'Média' },
  { id: 'alta', label: 'Alta' },
  { id: 'urgente', label: 'Urgente' },
];

export function TarefaFormModal({ visible, tarefa, onSave, onClose }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('media');
  const [date, setDate] = useState(todayStr());
  const [showTime, setShowTime] = useState(false);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [description, setDescription] = useState('');
  const [important, setImportant] = useState(false);

  const isEdit = !!tarefa?.id;

  useEffect(() => {
    if (visible && !tarefa) {
      AsyncStorage.getItem(DEFAULT_TIME_START_KEY).then((saved) => {
        if (saved && typeof saved === 'string' && saved.trim() && /^\d{1,2}:\d{2}$/.test(saved.trim())) {
          setTimeStart(saved.trim());
        }
      });
    }
  }, [visible, tarefa]);

  const handleSetDefaultTimeStart = () => {
    playTapSound();
    AsyncStorage.setItem(DEFAULT_TIME_START_KEY, timeStart || '09:00');
    Alert.alert('Salvo', `Hora de início padrão definida: ${timeStart || '09:00'}`);
  };

  useEffect(() => {
    if (visible && tarefa) {
      setTitle(tarefa.title || '');
      setPriority(tarefa.priority || 'media');
      setDate(tarefa.date || todayStr());
      setShowTime(!!(tarefa.timeStart || tarefa.timeEnd));
      setTimeStart(tarefa.timeStart || '');
      setTimeEnd(tarefa.timeEnd || '');
      setDescription(tarefa.description || '');
      setImportant(tarefa.important ?? false);
    } else if (visible && !tarefa) {
      setTitle('');
      setPriority('media');
      setDate(todayStr());
      setShowTime(true);
      setTimeStart('');
      setTimeEnd('');
      setDescription('');
      setImportant(false);
    }
  }, [visible, tarefa]);

  const handleSave = () => {
    if (!title.trim()) return Alert.alert('Erro', 'Preencha o título da tarefa.');
    onSave({
      title: title.trim(),
      checked: tarefa?.checked ?? false,
      priority,
      date: date.trim() || todayStr(),
      timeStart: showTime ? (timeStart.trim() || null) : null,
      timeEnd: showTime ? (timeEnd.trim() || null) : null,
      description: description.trim() || null,
      important,
      sortOrder: tarefa?.sortOrder ?? 0,
    });
    onClose();
  };

  if (!visible) return null;

  const sectionGap = { marginBottom: GAP };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.header, sectionGap]}>
              <Text style={[s.title, { color: colors.primary }]}>{isEdit ? 'EDITAR TAREFA' : 'NOVA TAREFA'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled style={s.scroll} contentContainerStyle={s.scrollContent}>
              <Text style={[s.label, { color: colors.textSecondary }]}>TÍTULO</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, sectionGap]} placeholder="Ex: Reunião, Ligar cliente..." value={title} onChangeText={setTitle} placeholderTextColor={colors.textSecondary} />

              <Text style={[s.label, { color: colors.textSecondary }]}>PRIORIDADE</Text>
              <View style={[s.toggleRow, sectionGap]}>
                {PRIORIDADES.map((p) => (
                  <TouchableOpacity key={p.id} style={[s.toggleOpt, priority === p.id && { backgroundColor: colors.primary }]} onPress={() => setPriority(p.id)}>
                    <Text style={[s.toggleText, { color: priority === p.id ? '#fff' : colors.text }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.label, { color: colors.textSecondary }]}>DATA</Text>
              <DatePickerInput value={date} onChange={setDate} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} />
              <View style={sectionGap} />

              <View style={[s.rowSwitch, { borderColor: colors.border, backgroundColor: colors.bg }, sectionGap]}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Horário da tarefa</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Lembrete 30 min antes (só com hora)</Text>
                </View>
                <Switch value={showTime} onValueChange={setShowTime} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>

              {showTime && (
                <>
                  <View style={[s.row, sectionGap]}>
                    <View style={s.half}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>HORÁRIO DE INÍCIO</Text>
                      <TimePickerInput value={timeStart} onChange={setTimeStart} placeholder="09:00" colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} />
                    </View>
                    <View style={s.half}>
                      <Text style={[s.label, { color: colors.textSecondary }]}>ATÉ</Text>
                      <TimePickerInput value={timeEnd} onChange={setTimeEnd} placeholder="17:00" colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} />
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleSetDefaultTimeStart} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: -8, marginBottom: GAP }}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Definir {timeStart || '09:00'} como hora de início padrão</Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={[s.label, { color: colors.textSecondary }]}>DESCRIÇÃO (OPCIONAL)</Text>
              <TextInput style={[s.input, s.inputMultiline, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, sectionGap]} placeholder="Detalhes da tarefa..." value={description} onChangeText={setDescription} placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} />

              <TouchableOpacity onPress={() => setImportant(!important)} style={[s.importantRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                <Ionicons name={important ? 'star' : 'star-outline'} size={24} color={important ? '#f59e0b' : colors.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Marcar como importante</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{isEdit ? 'Salvar alterações' : 'CADASTRAR TAREFA'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  keyboardView: { flex: 1, width: '100%', justifyContent: 'center', maxHeight: '95%' },
  card: { width: '100%', maxWidth: CARD_MAX_WIDTH, borderRadius: 20, padding: GAP, maxHeight: '95%', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', textTransform: 'uppercase' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scroll: { maxHeight: SCROLL_MAX_HEIGHT },
  scrollContent: { paddingBottom: GAP * 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleOpt: { flex: 1, minWidth: 70, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.08)' },
  toggleText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: GAP },
  rowSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  half: { flex: 1 },
  importantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: GAP },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
