import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../../utils/sounds';
import { clampAngulo } from '../../utils/catalogoGradient';

function MiniChip({ icon, label, active, onPress, accent, colors }) {
  return (
    <TouchableOpacity
      onPress={() => { playTapSound(); onPress?.(); }}
      style={[
        st.chip,
        { borderColor: active ? (accent || '#64748b') : (colors?.border || 'rgba(255,255,255,0.14)'), backgroundColor: active ? `${accent || '#64748b'}22` : 'transparent' },
      ]}
      activeOpacity={0.85}
    >
      {icon ? <Ionicons name={icon} size={13} color={active ? (accent || '#fff') : (colors?.textSecondary || '#94a3b8')} /> : null}
      <Text style={[st.chipText, { color: active ? (colors?.text || '#fff') : (colors?.textSecondary || '#94a3b8') }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export function CatalogoGradientControls({
  look,
  onChange,
  compact = false,
  colors = {},
  accent = '#64748b',
}) {
  const forma = look?.forma === 'radial' ? 'radial' : 'linear';
  const angulo = clampAngulo(look?.angulo, 135);
  const inverter = !!look?.inverter;
  const patch = (next) => onChange?.({ forma, angulo, inverter, ...next });

  return (
    <View style={st.wrap}>
      <View style={st.row}>
        <MiniChip icon="remove-outline" label="Linear" active={forma === 'linear'} onPress={() => patch({ forma: 'linear' })} accent={accent} colors={colors} />
        <MiniChip icon="ellipse-outline" label="Arredondado" active={forma === 'radial'} onPress={() => patch({ forma: 'radial' })} accent={accent} colors={colors} />
        <MiniChip icon="swap-vertical-outline" label="Inverter" active={inverter} onPress={() => patch({ inverter: !inverter })} accent={accent} colors={colors} />
      </View>
      {forma === 'linear' ? (
        <View style={st.angleBlock}>
          <View style={st.angleRow}>
            <TouchableOpacity
              onPress={() => { playTapSound(); patch({ angulo: clampAngulo(angulo - 15) }); }}
              style={st.step}
            >
              <Ionicons name="remove" size={14} color={colors.text || '#fff'} />
            </TouchableOpacity>
            <Text style={[st.angleVal, { color: colors.text || '#fff' }]}>{angulo}°</Text>
            <TouchableOpacity
              onPress={() => { playTapSound(); patch({ angulo: clampAngulo(angulo + 15) }); }}
              style={st.step}
            >
              <Ionicons name="add" size={14} color={colors.text || '#fff'} />
            </TouchableOpacity>
          </View>
          {Platform.OS === 'web' ? (
            <input
              type="range"
              min={0}
              max={359}
              value={angulo}
              onChange={(e) => patch({ angulo: clampAngulo(e.target.value) })}
              style={{ width: '100%', accentColor: accent, cursor: 'ew-resize' }}
            />
          ) : null}
          {!compact ? <Text style={[st.hint, { color: colors.textSecondary || '#94a3b8' }]}>Gire 360° para apontar o degradê.</Text> : null}
        </View>
      ) : (
        <Text style={[st.hint, { color: colors.textSecondary || '#94a3b8' }]}>O arredondado sai do centro. Inverter troca o lado das cores.</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 8, width: '100%' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 88,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  chipText: { fontSize: 11, fontWeight: '800' },
  angleBlock: { gap: 6 },
  angleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  step: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(148,163,184,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  angleVal: { fontSize: 16, fontWeight: '800', minWidth: 52, textAlign: 'center' },
  hint: { fontSize: 11, fontWeight: '600' },
});
