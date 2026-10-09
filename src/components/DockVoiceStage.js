import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DockAudioGraph } from './DockAudioGraph';
import { DockVoiceSphere } from './DockVoiceSphere';
import { DockVoicePicker } from './DockVoicePicker';
import { useDockMascot } from '../contexts/DockMascotContext';
import { DOCK_BLUE } from '../constants/brandColors';
import { playTapSound } from '../utils/sounds';
import { stopDockSpeak } from '../utils/dockSpeak';
import { exitDockStageToHome } from '../utils/dockNav';
import { isDesktopZoomEvent, setDesktopZoomFrozen, subscribeDesktopZoom } from '../utils/lockAppZoom';

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
  const { voiceStatus, setVoiceStatus, spectrumId, voiceId, setVoiceId } = useDockMascot();
  const analyzerRef = useRef(null);
  const [cfgOpen, setCfgOpen] = useState(false);

  const open = !!voiceStatus?.stage;
  const speaking = !!voiceStatus?.speaking;
  const listening = !!voiceStatus?.listening && voiceStatus?.mode === 'command';
  const confirmPrompt = String(voiceStatus?.confirmPrompt || '').trim();
  const caption = String(voiceStatus?.caption || '').trim();
  const question = confirmPrompt || caption;
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') return { w: 1280, h: 800 };
    const vv = window.visualViewport;
    return {
      w: Math.round(vv?.width || window.innerWidth),
      h: Math.round(vv?.height || window.innerHeight),
    };
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const read = () => {
      const vv = window.visualViewport;
      setViewport({
        w: Math.round(vv?.width || window.innerWidth),
        h: Math.round(vv?.height || window.innerHeight),
      });
    };
    read();
    window.addEventListener('resize', read);
    window.addEventListener('tc:desktop-zoom', read);
    window.visualViewport?.addEventListener('resize', read);
    window.visualViewport?.addEventListener('scroll', read);
    const unsub = subscribeDesktopZoom(() => read());
    return () => {
      unsub();
      window.removeEventListener('resize', read);
      window.removeEventListener('tc:desktop-zoom', read);
      window.visualViewport?.removeEventListener('resize', read);
      window.visualViewport?.removeEventListener('scroll', read);
    };
  }, [open]);

  const layout = useMemo(() => {
    const padY = 8;
    const kickerH = 22;
    const nameH = 32;
    const statusH = 22;
    const hintH = question ? 0 : 36;
    const graphH = Math.round(Math.max(36, Math.min(viewport.h < 760 ? 64 : 96, viewport.h * 0.11)));
    const questionH = question ? Math.round(Math.max(56, Math.min(96, viewport.h * 0.16))) : 0;
    const chrome = padY * 2 + kickerH + nameH + statusH + graphH + questionH + hintH + 16;
    const availH = Math.max(96, viewport.h - chrome);
    const availW = Math.max(96, viewport.w - 40);
    const sphere = Math.round(Math.max(96, Math.min(440, availH, availW * 0.55)));
    return { sphere, graphH, padY };
  }, [viewport.h, viewport.w, question]);

  useEffect(() => {
    if (!open) setCfgOpen(false);
  }, [open]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    if (!open) return undefined;
    setDesktopZoomFrozen(true);
    document.body.classList.add('tc-dock-stage-lock');
    const style = document.getElementById('tc-dock-stage-lock-style') || document.createElement('style');
    style.id = 'tc-dock-stage-lock-style';
    style.textContent = [
      'body.tc-dock-stage-lock #root, body.tc-dock-stage-lock #root * { pointer-events: none !important; }',
      '#dock-voice-stage { position:fixed !important; inset:0 !important; width:100vw !important; height:100vh !important; height:100dvh !important; max-width:none !important; max-height:none !important; zoom:1 !important; transform:none !important; }',
    ].join('\n');
    if (!style.parentNode) document.head.appendChild(style);

    const leave = () => {
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
        armed: true,
      });
      exitDockStageToHome();
    };

    const fromUi = (event) => {
      const t = event?.target;
      return !!(t && typeof t.closest === 'function' && t.closest('#dock-voice-stage-ui, [data-dock-stage-ui="1"]'));
    };

    const block = (event) => {
      if (fromUi(event)) {
        if (event?.type === 'wheel' && isDesktopZoomEvent(event)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      if (isDesktopZoomEvent(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event?.type === 'keydown' && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) {
          if (cfgOpen) setCfgOpen(false);
          else leave();
        }
        return;
      }
      if (event?.type === 'keydown' || event?.type === 'keyup' || event?.type === 'keypress') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const opts = { capture: true, passive: false };
    const types = ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'pointerdown', 'pointerup', 'wheel', 'touchstart', 'touchmove'];
    types.forEach((type) => window.addEventListener(type, block, opts));
    return () => {
      setDesktopZoomFrozen(false);
      document.body.classList.remove('tc-dock-stage-lock');
      types.forEach((type) => window.removeEventListener(type, block, opts));
    };
  }, [open, setVoiceStatus, cfgOpen]);

  if (Platform.OS !== 'web' || !open) return null;

  const status = speaking
    ? 'Dock falando'
    : voiceStatus?.busy
      ? 'Resolvendo agora'
      : listening
        ? 'Escutando'
        : 'Pronto';

  const node = (
    <View
      nativeID="dock-voice-stage"
      style={[styles.layer, { paddingVertical: layout.padY }]}
      pointerEvents="box-none"
    >
      <View style={styles.dim} pointerEvents="none" />
      <View
        nativeID="dock-voice-stage-ui"
        style={styles.cfgHold}
        pointerEvents="auto"
        dataSet={{ dockStageUi: '1' }}
      >
        <TouchableOpacity
          onPress={() => {
            playTapSound();
            setCfgOpen((v) => !v);
          }}
          style={styles.cfgBtn}
          accessibilityLabel="Configurações do palco"
        >
          <Ionicons name="settings-outline" size={20} color="#F4F8FF" />
        </TouchableOpacity>
        {cfgOpen ? (
          <View style={styles.cfgPanel}>
            <Text style={styles.cfgTitle}>Configurações</Text>
            <DockVoicePicker value={voiceId} onChange={setVoiceId} dark />
          </View>
        ) : null}
      </View>
      <View style={styles.stage} pointerEvents="none">
        <Text style={styles.kicker}>DOCK AO VIVO</Text>

        <View style={[styles.sphereHold, { width: layout.sphere, height: layout.sphere }]}>
          <View style={styles.sphereAbs} pointerEvents="none">
            <DockVoiceSphere
              speaking={speaking}
              listening={listening || !!voiceStatus?.busy}
              size={layout.sphere}
              spectrumId={spectrumId}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.name}>Dock</Text>
          <Text style={[styles.status, { color: speaking ? DOCK_BLUE : 'rgba(220,232,248,0.78)' }]}>{status}</Text>
          <DockAudioGraph
            speaking={speaking}
            listening={listening || !!voiceStatus?.busy}
            analyzerRef={analyzerRef}
            color={DOCK_BLUE}
            height={layout.graphH}
          />
          {question ? (
            <View style={styles.you}>
              <Text style={styles.confirmLabel}>{confirmPrompt ? 'CONFIRMAR' : 'DOCK'}</Text>
              <Text style={styles.confirmText} numberOfLines={4}>{question}</Text>
            </View>
          ) : (
            <Text style={styles.hint}>Esc sai do palco para o Início. O resto do app fica bloqueado.</Text>
          )}
        </View>
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
    width: '100vw',
    height: '100vh',
    maxWidth: '100vw',
    maxHeight: '100vh',
    zIndex: 40000,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  stage: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    minHeight: 0,
  },
  cfgHold: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 6,
    alignItems: 'flex-end',
    maxWidth: 420,
  },
  cfgBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 18, 32, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(220,232,248,0.22)',
  },
  cfgPanel: {
    marginTop: 10,
    width: 360,
    maxWidth: '100%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(8, 18, 32, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(220,232,248,0.18)',
  },
  cfgTitle: { color: '#F4F8FF', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, color: DOCK_BLUE, marginTop: 4, flexShrink: 0 },
  name: { fontSize: 22, fontWeight: '800', color: '#F4F8FF' },
  sphereHold: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  sphereAbs: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    flexShrink: 0,
    paddingBottom: 8,
    gap: 4,
  },
  status: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  you: {
    marginTop: 8,
    width: '100%',
    maxWidth: 640,
    maxHeight: 96,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(8, 18, 32, 0.72)',
    overflow: 'hidden',
  },
  confirmLabel: { color: 'rgba(220,232,248,0.7)', fontSize: 11, fontWeight: '800' },
  confirmText: { color: '#F4F8FF', fontSize: 16, fontWeight: '600', marginTop: 4, textAlign: 'center', lineHeight: 22, maxWidth: '100%' },
  hint: { color: 'rgba(220,232,248,0.72)', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
