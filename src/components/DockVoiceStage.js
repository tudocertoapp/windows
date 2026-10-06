import React, { useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DockAudioGraph } from './DockAudioGraph';
import { DockVoiceSphere } from './DockVoiceSphere';
import { useDockMascot } from '../contexts/DockMascotContext';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { DOCK_BLUE } from '../constants/brandColors';
import { stopDockSpeak } from '../utils/dockSpeak';

function mount(node) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !document.body) return node;
  try {
    const { createPortal } = require('react-dom');
    return createPortal(node, document.body);
  } catch (_) {
    return node;
  }
}

export function closeDockStage() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tc:dock-stage-close'));
  }
}

export function DockVoiceStage() {
  const { colors } = useTheme();
  const { voiceStatus, setVoiceStatus, spectrumId } = useDockMascot();
  const analyzerRef = useRef(null);

  const open = !!voiceStatus?.stage;
  const speaking = !!voiceStatus?.speaking;
  const listening = !!voiceStatus?.listening && voiceStatus?.mode === 'command';
  const confirmPrompt = String(voiceStatus?.confirmPrompt || '').trim();

  if (Platform.OS !== 'web' || !open) return null;

  const status = speaking
    ? 'Dock falando'
    : voiceStatus?.busy
      ? 'Resolvendo agora'
      : listening
        ? 'Escutando'
        : 'Pronto';

  const node = (
    <View style={styles.layer} pointerEvents="auto">
      <View style={styles.dim} />
      <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.top}>
          <Text style={[styles.kicker, { color: DOCK_BLUE }]}>DOCK AO VIVO</Text>
          <TouchableOpacity
            onPress={() => {
              playTapSound();
              stopDockSpeak();
              setVoiceStatus?.({
                mode: 'wake',
                stage: false,
                speaking: false,
                busy: false,
                caption: '',
                interim: '',
                lastHeard: '',
                confirmPrompt: '',
                listening: true,
              });
              closeDockStage();
            }}
            style={styles.close}
            accessibilityLabel="Encerrar Dock"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.sphereHold}>
          <View style={styles.sphereAbs} pointerEvents="none">
            <DockVoiceSphere speaking={speaking} listening={listening || !!voiceStatus?.busy} size={440} spectrumId={spectrumId} />
          </View>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>Dock</Text>
        <Text style={[styles.status, { color: speaking ? DOCK_BLUE : colors.textSecondary }]}>{status}</Text>

        <DockAudioGraph
          speaking={speaking}
          listening={listening || !!voiceStatus?.busy}
          analyzerRef={analyzerRef}
          color={DOCK_BLUE}
        />

        {confirmPrompt ? (
          <View style={[styles.you, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>CONFIRMAR</Text>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4 }}>{confirmPrompt}</Text>
          </View>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
            Pode falar. Eu escuto e respondo.
          </Text>
        )}
      </View>
    </View>
  );

  return mount(node);
}

const styles = StyleSheet.create({
  layer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 18, 0.72)',
  },
  card: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
  },
  top: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  sphereHold: {
    width: 440,
    height: 440,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    overflow: 'visible',
  },
  sphereAbs: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  status: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  you: {
    marginTop: 16,
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
});
