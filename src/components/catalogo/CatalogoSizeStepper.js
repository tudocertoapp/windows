import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../../utils/sounds';

export function clampScale(n, min = 50, max = 200) {
  const v = Math.round(Number(n) || 100);
  return Math.min(max, Math.max(min, v));
}

export function CatalogoSizeStepper({
  label,
  value = 100,
  onChange,
  colors,
  accent,
  step = 5,
  min = 50,
  max = 200,
  compact = false,
}) {
  const v = clampScale(value, min, max);
  const bump = (delta) => {
    playTapSound();
    onChange(clampScale(v + delta, min, max));
  };
  return (
    <View style={[compact ? st.rowCompact : st.row, !compact && { borderColor: colors.border }]}>
      {label && !compact ? (
        <Text style={[st.label, { color: colors.text }]} numberOfLines={1}>{label}</Text>
      ) : null}
      <View style={st.controls}>
        {compact ? <Text style={[st.editHint, { color: colors.textSecondary }]}>Tamanho</Text> : null}
        <TouchableOpacity onPress={() => bump(-step)} style={[st.btn, compact && st.btnCompact, { borderColor: colors.border }]} hitSlop={6}>
          <Ionicons name="remove" size={compact ? 16 : 18} color={accent} />
        </TouchableOpacity>
        <Text style={[st.val, { color: colors.text }]}>{v}%</Text>
        <TouchableOpacity onPress={() => bump(step)} style={[st.btn, compact && st.btnCompact, { borderColor: colors.border }]} hitSlop={6}>
          <Ionicons name="add" size={compact ? 16 : 18} color={accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: { flex: 1, fontSize: 14, fontWeight: '600' },
  editHint: { fontSize: 11, fontWeight: '700', marginRight: 4 },
  btnCompact: { width: 32, height: 32, borderRadius: 9 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  val: { minWidth: 44, textAlign: 'center', fontSize: 13, fontWeight: '800' },
});
