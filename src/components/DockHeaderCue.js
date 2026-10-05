import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { DockMascot } from './DockMascot';
import { useDockMascot } from '../contexts/DockMascotContext';
import { playTapSound } from '../utils/sounds';
import { DOCK_BLUE } from '../constants/brandColors';

export function openDockChat() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tc:dock-arm', { detail: { openStage: true } }));
  }
}

export function DockHeaderCue({ colors, compact = false }) {
  const { voiceStatus } = useDockMascot();

  const openDock = () => {
    playTapSound();
    openDockChat();
  };
  const command = voiceStatus?.mode === 'command';
  const busy = !!voiceStatus?.busy;
  const armed = !!voiceStatus?.armed;
  const micError = String(voiceStatus?.error || '').trim();
  const phrase = micError
    ? micError
    : command
      ? 'Ouvindo.'
      : armed
        ? 'Ouvindo. Chame: Dock.'
        : 'Chame por voz: Dock.';
  const mascotH = compact ? 72 : 104;

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={openDock} accessibilityLabel="Abrir Dock" accessibilityRole="button">
        <DockMascot size={mascotH} />
      </TouchableOpacity>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: colors.text }]}>Dock</Text>
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={compact ? 3 : 2}>
          {phrase}
        </Text>
        {command ? (
          <Text style={[styles.listen, { color: DOCK_BLUE }]}>
            {busy ? 'Resolvendo…' : 'Pode falar'}
          </Text>
        ) : armed ? (
          <Text style={[styles.listen, { color: DOCK_BLUE }]}>Ouvindo · chame “Dock”</Text>
        ) : (
          <Text style={[styles.listen, { color: colors.textSecondary }]}>
            Permita o microfone e fale “e aí, Dock”
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'visible' },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
  name: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  text: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  listen: { fontSize: 11, fontWeight: '700' },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ctaLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
