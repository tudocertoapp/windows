import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DOCK_BLUE } from '../constants/brandColors';
import { listDockVoices } from '../constants/dockVoices';
import { playTapSound } from '../utils/sounds';
import { speakDock } from '../utils/dockSpeak';

export function DockVoicePicker({ value, onChange, dark = false }) {
  const options = listDockVoices();
  const labelColor = dark ? 'rgba(220,232,248,0.72)' : undefined;
  const textOff = dark ? '#F4F8FF' : undefined;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>Voz do Dock</Text>
      <View style={styles.row}>
        {options.map((item) => {
          const on = item.id === value;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                playTapSound();
                onChange?.(item.id);
                speakDock(`Sou o Dock. Esta é a voz ${item.name}.`, { voiceId: item.id });
              }}
              style={[
                styles.chip,
                {
                  borderColor: on ? DOCK_BLUE : dark ? 'rgba(220,232,248,0.28)' : 'rgba(0,0,0,0.18)',
                  backgroundColor: on ? 'rgba(0, 180, 255, 0.18)' : dark ? 'rgba(8, 18, 32, 0.72)' : 'transparent',
                },
              ]}
              accessibilityLabel={`Voz ${item.name}`}
            >
              <Text style={{ color: on ? DOCK_BLUE : textOff || '#111', fontSize: 13, fontWeight: '800' }}>
                {item.name}
              </Text>
              <Text style={[styles.hint, { color: on ? 'rgba(0,180,255,0.9)' : labelColor || '#666' }]}>
                {item.hint}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 108,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  hint: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});
