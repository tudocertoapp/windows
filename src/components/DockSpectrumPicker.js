import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DOCK_BLUE } from '../constants/brandColors';
import { listDockSpectrums } from '../constants/dockSpectrums';
import { playTapSound } from '../utils/sounds';

export function DockSpectrumPicker({ value, onChange, colors }) {
  const options = listDockSpectrums();
  if (!options.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Espectro</Text>
      <View style={styles.row}>
        {options.map((item) => {
          const on = item.id === value;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                playTapSound();
                onChange?.(item.id);
              }}
              style={[
                styles.chip,
                {
                  borderColor: on ? DOCK_BLUE : colors.border,
                  backgroundColor: on ? 'rgba(0, 180, 255, 0.16)' : colors.bg,
                },
              ]}
              accessibilityLabel={`Espectro ${item.name}`}
            >
              <Text style={{ color: on ? DOCK_BLUE : colors.text, fontSize: 12, fontWeight: '700' }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
