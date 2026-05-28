import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../utils/sounds';

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MIN_YEAR = 2020;
const MAX_YEAR = 2035;

export function formatMonthYearLabel(month, year) {
  const m = Math.min(12, Math.max(1, month));
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

export function MonthYearPicker({ month, year, onChange, colors, style }) {
  const [open, setOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(month);
  const [pickerYear, setPickerYear] = useState(year);

  useEffect(() => {
    if (open) {
      setPickerMonth(month);
      setPickerYear(year);
    }
  }, [open, month, year]);

  const applyMonth = (m) => {
    playTapSound();
    onChange?.({ month: m, year: pickerYear });
    setOpen(false);
  };

  const confirmYearOnly = () => {
    playTapSound();
    onChange?.({ month: pickerMonth, year: pickerYear });
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[s.trigger, { borderColor: colors.border, backgroundColor: colors.bg }, style]}
        onPress={() => {
          playTapSound();
          setOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="calendar" size={20} color={colors.primary} />
        <Text style={[s.triggerText, { color: colors.text }]}>{formatMonthYearLabel(month, year)}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[s.cardTitle, { color: colors.text }]}>Selecionar mês e ano</Text>

            <View style={[s.yearRow, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  playTapSound();
                  setPickerYear((y) => Math.max(MIN_YEAR, y - 1));
                }}
                style={s.yearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={26} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[s.yearText, { color: colors.text }]}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  playTapSound();
                  setPickerYear((y) => Math.min(MAX_YEAR, y + 1));
                }}
                style={s.yearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={26} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.monthGrid}>
              {MONTH_NAMES.map((label, idx) => {
                const m = idx + 1;
                const selected = pickerMonth === m;
                const isCurrent =
                  m === new Date().getMonth() + 1 && pickerYear === new Date().getFullYear();
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      s.monthCell,
                      {
                        backgroundColor: selected ? colors.primary : colors.primaryRgba(0.08),
                        borderColor: isCurrent && !selected ? colors.primary : 'transparent',
                        borderWidth: isCurrent && !selected ? 1.5 : 0,
                      },
                    ]}
                    onPress={() => applyMonth(m)}
                  >
                    <Text
                      style={[
                        s.monthCellText,
                        { color: selected ? '#fff' : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {label.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.okBtn, { backgroundColor: colors.primary }]}
              onPress={confirmYearOnly}
            >
              <Text style={s.okBtnText}>Aplicar {formatMonthYearLabel(pickerMonth, pickerYear)}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 0,
  },
  triggerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    gap: 20,
  },
  yearBtn: { padding: 6 },
  yearText: { fontSize: 22, fontWeight: '700', minWidth: 72, textAlign: 'center' },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthCell: {
    width: '30%',
    maxWidth: 110,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthCellText: { fontSize: 14, fontWeight: '600' },
  okBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  okBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
