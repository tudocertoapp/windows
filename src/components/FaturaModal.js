import React, { useState, useEffect, useMemo } from 'react';
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
import { useFinance } from '../contexts/FinanceContext';
import { DatePickerInput } from './DatePickerInput';
import { MoneyInput } from './MoneyInput';
import { parseMoney } from '../utils/format';
import { parseBoletoDueInput, buildBoletoSavePayloads, findBoletoSeriesSiblings, sortBoletosInSeries } from '../utils/boletoDates';
import { useIsDesktopLayout } from '../utils/platformLayout';

const { width: SW } = Dimensions.get('window');
const GAP = 20;
const CARD_MAX_WIDTH = Math.min(SW - 8, 520);
const SCROLL_MAX_HEIGHT = Math.min(520, 580);

const MIN_MONTHS = 1;
const MAX_MONTHS = 60;

function clampMonths(n) {
  return Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, n));
}

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');
}

export function FaturaModal({ visible, fatura, onSave, onClose }) {
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const { boletos } = useFinance();
  const isDesktopWeb = Platform.OS === 'web' && useIsDesktopLayout();
  const [name, setName] = useState('');
  const [dueInput, setDueInput] = useState('');
  const [amount, setAmount] = useState('');
  const [tipo, setTipo] = useState('pessoal');
  const [paid, setPaid] = useState(false);
  const [monthsCount, setMonthsCount] = useState(1);
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!fatura?.id;

  const editSeriesSiblings = useMemo(() => {
    if (!visible || !fatura?.id) return [];
    return sortBoletosInSeries(findBoletoSeriesSiblings(fatura, boletos));
  }, [visible, fatura, boletos]);

  useEffect(() => {
    if (visible && fatura) {
      const sorted = editSeriesSiblings.length ? editSeriesSiblings : [fatura];
      const first = sorted[0] || fatura;
      setName(fatura.name || '');
      setDueInput(first.dueDate || fatura.dueDate || todayStr());
      setAmount(fatura.amount != null && fatura.amount !== '' ? String(fatura.amount) : '');
      setTipo(fatura.tipo || 'pessoal');
      setPaid(fatura.paid ?? false);
      if (fatura.recurring) {
        setIsRecurring(true);
        setMonthsCount(1);
      } else {
        setIsRecurring(false);
        const parcelas = Math.max(sorted.length, Number(fatura.installmentTotal) || 1);
        setMonthsCount(clampMonths(parcelas));
      }
    } else if (visible && !fatura) {
      setName('');
      setDueInput(todayStr());
      setAmount('');
      setTipo('pessoal');
      setPaid(false);
      setMonthsCount(1);
      setIsRecurring(false);
    }
  }, [visible, fatura, editSeriesSiblings]);

  const parsedDue = useMemo(() => parseBoletoDueInput(dueInput), [dueInput]);

  const changeMonths = (delta) => {
    setMonthsCount((m) => clampMonths(m + delta));
  };

  const handleMonthsInput = (text) => {
    const digits = String(text).replace(/\D/g, '');
    if (!digits) {
      setMonthsCount(MIN_MONTHS);
      return;
    }
    setMonthsCount(clampMonths(parseInt(digits, 10)));
  };

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim()) return Alert.alert('Erro', 'Preencha a descrição.');
    const parsed = parseBoletoDueInput(dueInput);
    if (!parsed) {
      return Alert.alert(
        'Vencimento inválido',
        'Informe o dia (ex: 15) ou a data completa (ex: 15/06/2026).'
      );
    }

    const amt = parseMoney(amount);
    const repeatType = isRecurring ? 'recurring' : monthsCount <= 1 ? 'once' : 'installments';

    const base = {
      name: name.trim(),
      dueDate: parsed.dueDate,
      dueDay: parsed.dueDay,
      amount: amt,
      tipo: showEmpresaFeatures ? tipo : 'pessoal',
      paid,
      repeatType,
      repeatCount: isRecurring ? 1 : monthsCount,
      recurring: isRecurring,
    };

    const seriesIdForBuild =
      fatura?.seriesId || editSeriesSiblings[0]?.seriesId || undefined;
    const payloads = buildBoletoSavePayloads(
      base,
      isEdit && seriesIdForBuild ? { seriesId: seriesIdForBuild } : {}
    );

    setSaving(true);
    try {
      if (isEdit) {
        if (!fatura.recurring && !isRecurring && payloads?.length !== monthsCount) {
          return Alert.alert(
            'Erro',
            `Esperado ${monthsCount} parcela(s), mas foram geradas ${payloads?.length || 0}.`
          );
        }
        await Promise.resolve(
          onSave({
            ...base,
            recurring: repeatType === 'recurring',
            _payloads: payloads,
            _seriesId: seriesIdForBuild,
            _seriesCount: editSeriesSiblings.length,
          })
        );
        return;
      }

      if (!payloads?.length) {
        return Alert.alert('Erro', 'Não foi possível gerar as parcelas.');
      }

      if (payloads.length !== (isRecurring ? 1 : monthsCount)) {
        return Alert.alert(
          'Erro',
          `Esperado ${isRecurring ? 1 : monthsCount} fatura(s), mas foram geradas ${payloads.length}. Ajuste a quantidade e tente de novo.`
        );
      }

      await Promise.resolve(onSave({ ...base, _payloads: payloads }));
    } finally {
      setSaving(false);
    }
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

              <Text style={[s.label, { color: colors.textSecondary }]}>VENCIMENTO</Text>
              <Text style={[s.hint, { color: colors.textSecondary }]}>Digite só o dia (ex: 15) ou a data completa. Use o calendário abaixo se preferir.</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                placeholder="15 ou 15/06/2026"
                value={dueInput}
                onChangeText={setDueInput}
                placeholderTextColor={colors.textSecondary}
                keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
              />
              {parsedDue ? (
                <Text style={[s.hint, { color: colors.primary, marginTop: 6, marginBottom: 8 }]}>
                  Vence em {parsedDue.dueDate}
                  {isRecurring ? ` · todo mês no dia ${parsedDue.dueDay}` : ''}
                </Text>
              ) : dueInput.trim() ? (
                <Text style={[s.hint, { color: '#ef4444', marginTop: 6, marginBottom: 8 }]}>Formato inválido — use dia ou DD/MM/AAAA</Text>
              ) : null}
              <DatePickerInput
                value={parsedDue?.dueDate || dueInput}
                onChange={(v) => setDueInput(v)}
                colors={colors}
                style={[s.input, { backgroundColor: colors.bg, borderColor: colors.border }]}
              />
              <View style={sectionGap} />

              <>
                  <Text style={[s.label, { color: colors.textSecondary }]}>QUANTOS MESES</Text>
                  <Text style={[s.hint, { color: colors.textSecondary, marginBottom: 10 }]}>
                    {isEdit
                      ? `Quantas parcelas desta série (${editSeriesSiblings.length} cadastrada${editSeriesSiblings.length !== 1 ? 's' : ''}). Reduzir exclui as parcelas extras — ex.: de 10 para 2 mantém só as 2 primeiras.`
                      : 'Quantas faturas mensais criar (1 = só este mês).'}
                  </Text>
                  <View style={[s.stepperRow, { borderColor: colors.border, backgroundColor: colors.bg }, isRecurring && { opacity: 0.45 }, sectionGap]}>
                    <TouchableOpacity
                      style={[s.stepperBtn, { backgroundColor: colors.primaryRgba(0.15) }]}
                      onPress={() => changeMonths(-1)}
                      disabled={isRecurring || monthsCount <= MIN_MONTHS}
                      accessibilityLabel="Diminuir meses"
                    >
                      <Ionicons name="remove" size={24} color={monthsCount <= MIN_MONTHS || isRecurring ? colors.textSecondary : colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={[s.stepperInput, { color: colors.text, borderColor: colors.border }]}
                      value={String(monthsCount)}
                      onChangeText={handleMonthsInput}
                      keyboardType="number-pad"
                      editable={!isRecurring}
                      selectTextOnFocus
                      maxLength={2}
                    />
                    <TouchableOpacity
                      style={[s.stepperBtn, { backgroundColor: colors.primaryRgba(0.15) }]}
                      onPress={() => changeMonths(1)}
                      disabled={isRecurring || monthsCount >= MAX_MONTHS}
                      accessibilityLabel="Aumentar meses"
                    >
                      <Ionicons name="add" size={24} color={monthsCount >= MAX_MONTHS || isRecurring ? colors.textSecondary : colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {!isRecurring && monthsCount > 1 && !isEdit && (
                    <Text style={[s.hint, { color: colors.textSecondary, marginBottom: GAP }]}>
                      Serão criadas {monthsCount} faturas mensais a partir de {parsedDue?.dueDate || '…'}.
                    </Text>
                  )}
                  {isEdit && !isRecurring && editSeriesSiblings.length > monthsCount && (
                    <Text style={[s.hint, { color: '#ef4444', marginBottom: GAP }]}>
                      {editSeriesSiblings.length - monthsCount} parcela(s) serão excluída(s) ao salvar.
                    </Text>
                  )}
                  <View style={[s.rowPaid, { borderColor: colors.border, backgroundColor: colors.bg }, sectionGap]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Recorrente</Text>
                      <Text style={[s.hint, { color: colors.textSecondary, marginTop: 4, marginBottom: 0 }]}>
                        Repete todo mês no mesmo dia, sem número fixo de parcelas.
                      </Text>
                    </View>
                    <Switch
                      value={isRecurring}
                      onValueChange={(v) => {
                        setIsRecurring(v);
                        if (v) setMonthsCount(1);
                      }}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                  {isRecurring && (
                    <Text style={[s.hint, { color: colors.textSecondary, marginBottom: GAP }]}>
                      Esta conta aparecerá todo mês no dia {parsedDue?.dueDay || '—'} até você marcar como paga ou excluir.
                    </Text>
                  )}
                  {isEdit && fatura?.recurring && (
                    <Text style={[s.hint, { color: colors.primary, marginBottom: GAP }]}>
                      Conta recorrente — vence todo mês no dia {fatura.dueDay || parsedDue?.dueDay || '—'}.
                    </Text>
                  )}
                  {isEdit && !fatura?.recurring && editSeriesSiblings.length > 1 && (
                    <Text style={[s.hint, { color: colors.primary, marginBottom: GAP }]}>
                      Editando parcela {fatura.installmentIndex || '?'} de {editSeriesSiblings.length} — vencimento acima é da 1ª parcela.
                    </Text>
                  )}
                </>

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
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>
                {saving
                  ? 'Salvando…'
                  : isEdit
                  ? 'Salvar alterações'
                  : !isRecurring && monthsCount > 1
                  ? `CADASTRAR ${monthsCount} FATURAS`
                  : 'CADASTRAR FATURA'}
              </Text>
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
  hint: { fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  inputWrap: { borderWidth: 1, borderRadius: 12 },
  toggleRow: { flexDirection: 'row', gap: GAP },
  toggleOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.08)' },
  toggleText: { fontSize: 14, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 6, gap: 8 },
  stepperBtn: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepperInput: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '700', paddingVertical: 10, borderWidth: 1, borderRadius: 10 },
  rowPaid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: GAP },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
