import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeusGastosChat } from './MeusGastosChat';
import { DockIcon } from './DockIcon';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout, WEB_MOBILE_TAB_BAR_RESERVE } from '../utils/platformLayout';
import { WEB_DESKTOP_RAIL_LAYOUT_RESERVE, WEB_DESKTOP_RAIL_ROUND_BTN, getWebDesktopRailDockPosition } from './navigation/RightSideTabBar';

const MODE_KEY = '@tudocerto_dock_mode';
const FAB = 58;
const CARD_W = 340;
const CARD_H = 420;
const GAP = 12;

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
  const isDesktop = useIsDesktopLayout();
  const { width: W, height: H } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((m) => {
      setOpen(m === 'small' || m === 'large' || m === 'open');
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const hide = () => persistOpen(false);
    window.addEventListener('tc:dock-minimize', hide);
    return () => window.removeEventListener('tc:dock-minimize', hide);
  }, []);

  const persistOpen = (next) => {
    setOpen(next);
    AsyncStorage.setItem(MODE_KEY, next ? 'open' : 'fab').catch(() => {});
  };

  if (Platform.OS !== 'web') return null;
  if (!planFeatures?.canUseMeusGastos) return null;
  if (!ready) return null;

  const fabSize = isDesktop ? WEB_DESKTOP_RAIL_ROUND_BTN : FAB;
  const railPos = isDesktop ? getWebDesktopRailDockPosition(fabSize) : null;
  const right = isDesktop
    ? railPos.right
    : GAP + Math.max(insets.right, 8);
  const bottom = isDesktop
    ? railPos.bottom
    : GAP + Math.max(insets.bottom, WEB_MOBILE_TAB_BAR_RESERVE);
  const cardRight = isDesktop ? WEB_DESKTOP_RAIL_LAYOUT_RESERVE : right;
  const cardW = Math.min(CARD_W, Math.max(260, W - cardRight - GAP));
  const cardH = Math.min(CARD_H, Math.max(280, H - bottom - GAP - 24));

  const node = (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        open
          ? { right: cardRight, bottom, width: cardW, height: cardH }
          : { right, bottom, width: fabSize, height: fabSize },
      ]}
    >
      {open ? (
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <DockIcon size={22} />
            <Text style={[styles.title, { color: colors.text }]}>Dock</Text>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                persistOpen(false);
              }}
              style={styles.headBtn}
              accessibilityLabel="Minimizar Dock"
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            <MeusGastosChat corner ocrEnabled />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Abrir Dock"
          onPress={() => {
            playTapSound();
            persistOpen(true);
          }}
          style={[
            styles.fab,
            { width: fabSize, height: fabSize, borderRadius: fabSize / 2 },
            Platform.OS === 'web' ? { cursor: 'pointer' } : null,
          ]}
        >
          <DockIcon size={isDesktop ? 26 : 36} />
        </TouchableOpacity>
      )}
    </View>
  );

  return mount(node);
}

const styles = StyleSheet.create({
  anchor: {
    position: 'fixed',
    zIndex: 21000,
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
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(0,0,0,0.26)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '800' },
  headBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minHeight: 0 },
});
