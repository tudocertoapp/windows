import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeusGastosChat } from './MeusGastosChat';
import { DockIcon } from './DockIcon';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { playTapSound } from '../utils/sounds';

const POS_KEY = '@tudocerto_dock_fab_pos';
const MODE_KEY = '@tudocerto_dock_mode';
const FAB = 58;
const SMALL_W = 380;
const SMALL_H = 480;

function mount(node) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !document.body) return node;
  try {
    const { createPortal } = require('react-dom');
    return createPortal(node, document.body);
  } catch (_) {
    return node;
  }
}

export function DockCornerChat() {
  const { colors } = useTheme();
  const { planFeatures } = usePlan();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [mode, setMode] = useState('fab');
  const [ready, setReady] = useState(false);
  const animPos = useRef(new Animated.ValueXY({ x: 16, y: 200 })).current;
  const dragStart = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const panelSize = useMemo(() => {
    if (mode === 'large') {
      return {
        w: Math.min(760, Math.max(320, W - 48)),
        h: Math.min(H - 48, Math.max(360, H * 0.86)),
      };
    }
    return { w: Math.min(SMALL_W, Math.max(280, W - 24)), h: Math.min(SMALL_H, H * 0.62) };
  }, [mode, W, H]);

  const clamp = useCallback((p, sizeW = FAB, sizeH = FAB) => {
    const minX = 8;
    const minY = Math.max(8, insets.top + 8);
    const maxX = Math.max(minX, W - sizeW - 8);
    const maxY = Math.max(minY, H - sizeH - Math.max(8, insets.bottom + 8));
    return {
      x: Math.max(minX, Math.min(Number(p?.x) || 0, maxX)),
      y: Math.max(minY, Math.min(Number(p?.y) || 0, maxY)),
    };
  }, [W, H, insets.top, insets.bottom]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(POS_KEY), AsyncStorage.getItem(MODE_KEY)]).then(([raw, m]) => {
      let pos = { x: 16, y: Math.max(120, H - 140) };
      try {
        if (raw) pos = JSON.parse(raw);
      } catch (_) {}
      const next = clamp(pos, FAB, FAB);
      animPos.setValue(next);
      if (m === 'small' || m === 'large' || m === 'fab') setMode(m);
      setReady(true);
    });
  }, [H, animPos, clamp]);

  const persistPos = (p) => {
    AsyncStorage.setItem(POS_KEY, JSON.stringify(p)).catch(() => {});
  };

  const persistMode = (m) => {
    setMode(m);
    AsyncStorage.setItem(MODE_KEY, m).catch(() => {});
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          moved.current = false;
          animPos.stopAnimation((v) => {
            dragStart.current = { x: v.x, y: v.y };
          });
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) + Math.abs(g.dy) > 8) moved.current = true;
          const sizeW = mode === 'fab' ? FAB : panelSize.w;
          const sizeH = mode === 'fab' ? FAB : panelSize.h;
          const next = clamp({ x: dragStart.current.x + g.dx, y: dragStart.current.y + g.dy }, sizeW, sizeH);
          animPos.setValue(next);
        },
        onPanResponderRelease: () => {
          animPos.stopAnimation((v) => {
            const sizeW = mode === 'fab' ? FAB : panelSize.w;
            const sizeH = mode === 'fab' ? FAB : panelSize.h;
            const next = clamp(v, sizeW, sizeH);
            animPos.setValue(next);
            persistPos(next);
          });
        },
      }),
    [animPos, clamp, mode, panelSize.h, panelSize.w]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const hide = () => persistMode('fab');
    window.addEventListener('tc:dock-minimize', hide);
    return () => window.removeEventListener('tc:dock-minimize', hide);
  }, []);
  if (Platform.OS !== 'web') return null;
  if (!planFeatures?.canUseMeusGastos) return null;
  if (!ready) return null;

  const openSmall = () => {
    playTapSound();
    persistMode('small');
  };

  const node = (
    <Animated.View
      style={[
        styles.host,
        {
          width: mode === 'fab' ? FAB : panelSize.w,
          height: mode === 'fab' ? FAB : panelSize.h,
          transform: [{ translateX: animPos.x }, { translateY: animPos.y }],
        },
      ]}
    >
      {mode === 'fab' ? (
        <View
          {...pan.panHandlers}
          accessibilityRole="button"
          accessibilityLabel="Abrir Dock"
          onClick={openSmall}
          onPress={openSmall}
          style={[styles.fab, Platform.OS === 'web' ? { cursor: 'pointer' } : null]}
        >
          <DockIcon size={36} />
        </View>
      ) : (
        <View style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View {...pan.panHandlers} style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <DockIcon size={26} />
            <Text style={[styles.title, { color: colors.text }]}>Dock</Text>
            <TouchableOpacity
              onPress={() => { playTapSound(); persistMode(mode === 'large' ? 'small' : 'large'); }}
              style={styles.headBtn}
              accessibilityLabel={mode === 'large' ? 'Tela pequena' : 'Tela grande'}
            >
              <Ionicons name={mode === 'large' ? 'contract-outline' : 'expand-outline'} size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { playTapSound(); persistMode('fab'); }}
              style={styles.headBtn}
              accessibilityLabel="Minimizar Dock"
            >
              <Ionicons name="remove-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>
            <MeusGastosChat corner ocrEnabled />
          </View>
        </View>
      )}
    </Animated.View>
  );

  return mount(node);
}

const styles = StyleSheet.create({
  host: {
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 8000,
  },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6cba16',
    boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    cursor: 'move',
  },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
  headBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
