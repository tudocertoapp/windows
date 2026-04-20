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
import { usePlan } from '../contexts/PlanContext';
import { DatePickerInput } from './DatePickerInput';
import { MoneyInput } from './MoneyInput';
import { useIsDesktopLayout } from '../utils/platformLayout';

const { width: SW } = Dimensions.get('window');
const GAP = 20;
const CARD_MAX_WIDTH = Math.min(SW - 8, 520);
const SCROLL_MAX_HEIGHT = Math.min(520, 580);

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

export function FaturaModal({ visible, fatura, onSave, onClose }) {
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const isDesktopWeb = Platform.OS === 'web' && useIsDesktopLayout();
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [tipo, setTipo] = useState('pessoal');
  const [paid, setPaid] = useState(false);

  const isEdit = !!fatura?.id;

  useEffect(() => {
    if (visible && fatura) {
      setName(fatura.name || '');
      setDueDate(fatura.dueDate || todayStr());
      setAmount(fatura.amount != null ? String(fatura.amount).replace('.', ',') : '');
      setTipo(fatura.tipo || 'pessoal');
      setPaid(fatura.paid ?? false);
    } else if (visible && !fatura) {
      setName('');
      setDueDate(todayStr());
      setAmount('');
      setTipo('pessoal');
      setPaid(false);
    }
  }, [visible, fatura]);

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha a descrição.');
    const amt = parseFloat(String(amount).replace(',', '.')) || 0;
    onSave({
      name: name.trim(),
      dueDate: dueDate.trim() || todayStr(),
      amount: amt,
      tipo: showEmpresaFeatures ? tipo : 'pessoal',
      paid,
    });
  };

  if (!visible) return null;

  const sectionGap = { marginBottom: GAP };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.keyboardView, isDesktopWeb ? { justifyContent: 'flex-start' } : null]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              s.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              isDesktopWeb ? { maxWidth: '100%', minHeight: '100%', maxHeight: '100%', borderRadius: 0 } : null,
            ]}
          >
            <View style={[s.header, sectionGap]}>
              <Text style={[s.title, { color: colors.primary }]}>{isEdit ? 'EDITAR FATURA' : 'NOVA FATURA'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={() => Keyboard.dismiss()}>
                  <Ionicons name="keyboard-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled style={[s.scroll, isDesktopWeb ? { maxHeight: undefined, flex: 1 } : null]} contentContainerStyle={s.scrollContent}>
              <Text style={[s.label, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, sectionGap]} placeholder="Ex: Conta de luz, Aluguel..." value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />

              <Text style={[s.label, { color: colors.textSecondary }]}>DATA DE VENCIMENTO</Text>
              <DatePickerInput value={dueDate} onChange={setDueDate} colors={colors} style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]} />
              <View style={sectionGap} />

              <Text style={[s.label, { color: colors.textSecondary }]}>VALOR (R$)</Text>
              <MoneyInput value={amount} onChange={setAmount} colors={colors} containerStyle={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]} />
              <View style={sectionGap} />

              {showEmpresaFeatures && (
                <>
                  <Text style={[s.label, { color: colors.textSecondary }]}>TIPO</Text>
                  <View style={[s.toggleRow, sectionGap]}>
                    <TouchableOpacity style={[s.toggleOpt, tipo === 'pessoal' && { backgroundColor: colors.primary }]} onPress={() => setTipo('pessoal')}>
                      <Ionicons name="person-outline" size={18} color={tipo === 'pessoal' ? '#fff' : colors.text} />
                      <Text style={[s.toggleText, { color: tipo === 'pessoal' ? '#fff' : colors.text }]}>PESSOAL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.toggleOpt, tipo === 'empresa' && { backgroundColor: colors.primary }]} onPress={() => setTipo('empresa')}>
                      <Ionicons name="business-outline" size={18} color={tipo === 'empresa' ? '#fff' : colors.text} />
                      <Text style={[s.toggleText, { color: tipo === 'empresa' ? '#fff' : colors.text }]}>EMPRESA</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={[s.label, { color: colors.textSecondary }]}>STATUS</Text>
              <View style={[s.rowPaid, { borderColor: colors.border, backgroundColor: colors.bg }, sectionGap]}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Conta paga?</Text>
                <Switch value={paid} onValueChange={setPaid} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{isEdit ? 'Salvar alterações' : 'CADASTRAR FATURA'}</Text>
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
  inputWrap: { borderWidth: 1, borderRadius: 12 },
  toggleRow: { flexDirection: 'row', gap: GAP },
  toggleOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.08)' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  rowPaid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: GAP },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
