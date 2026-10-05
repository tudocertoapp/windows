import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeusGastosChat } from './MeusGastosChat';
import { DockMascot } from './DockMascot';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useDockMascot } from '../contexts/DockMascotContext';
import { playTapSound } from '../utils/sounds';
import { DOCK_TONES } from '../utils/dockMascot';
import { useIsDesktopLayout, WEB_MOBILE_TAB_BAR_RESERVE } from '../utils/platformLayout';
import { WEB_DESKTOP_RAIL_LAYOUT_RESERVE, WEB_DESKTOP_RAIL_ROUND_BTN, getWebDesktopRailDockPosition } from './navigation/RightSideTabBar';

const MODE_KEY = '@tudocerto_dock_mode';
const FAB = 58;
const CARD_W = 360;
const CARD_H = 460;
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
  const { cue, tone, setTone } = useDockMascot();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktopLayout();
  const { width: W, height: H } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [cfg, setCfg] = useState(false);

  const persistOpen = useCallback((next) => {
    setOpen(next);
    if (!next) setCfg(false);
    AsyncStorage.setItem(MODE_KEY, next ? 'open' : 'fab').catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((m) => {
      setOpen(m === 'small' || m === 'large' || m === 'open');
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const hide = () => persistOpen(false);
    const show = () => persistOpen(true);
    window.addEventListener('tc:dock-minimize', hide);
    window.addEventListener('tc:dock-open', show);
    return () => {
      window.removeEventListener('tc:dock-minimize', hide);
      window.removeEventListener('tc:dock-open', show);
    };
  }, [persistOpen]);

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
  const cardRight = isDesktop
    ? Math.max(WEB_DESKTOP_RAIL_LAYOUT_RESERVE, right + fabSize + GAP)
    : right;
  const cardBottom = isDesktop ? bottom : bottom + fabSize + GAP;
  const cardW = Math.min(CARD_W, Math.max(260, W - cardRight - GAP));
  const cardH = Math.min(CARD_H, Math.max(300, H - cardBottom - GAP - 24));
  const face = cue?.expression || 'feliz';

  const node = (
    <View pointerEvents="box-none" style={styles.layer}>
      {open ? (
        <View
          style={[
            styles.card,
            {
              right: cardRight,
              bottom: cardBottom,
              width: cardW,
              height: cardH,
              backgroundColor: colors.bg,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <DockMascot expression={face} size={64} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: colors.text }]}>Dock</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                Seu parceiro nas finanças
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                setCfg((v) => !v);
              }}
              style={styles.headBtn}
              accessibilityLabel="Configurar Dock"
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                persistOpen(false);
              }}
              style={styles.headBtn}
              accessibilityLabel="Fechar Dock"
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>
            {cfg ? (
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Linguagem do Dock</Text>
                {DOCK_TONES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      playTapSound();
                      setTone(t.id);
                    }}
                    style={[
                      styles.toneBtn,
                      {
                        borderColor: tone === t.id ? colors.primary : colors.border,
                        backgroundColor: tone === t.id ? `${colors.primary}22` : colors.card,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <MeusGastosChat corner ocrEnabled />
            )}
          </View>
        </View>
      ) : null}

      {!isDesktop ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fechar Dock' : 'Abrir Dock'}
          onPress={() => {
            playTapSound();
            persistOpen(!open);
          }}
          style={[
            styles.fab,
            {
              right,
              bottom,
              width: fabSize,
              height: fabSize,
              borderRadius: fabSize / 2,
            },
            Platform.OS === 'web' ? { cursor: 'pointer' } : null,
          ]}
        >
          <DockMascot expression={face} size={Math.round(fabSize * 1.35)} />
        </TouchableOpacity>
      ) : null}
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
    zIndex: 21000,
    pointerEvents: 'box-none',
  },
  fab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    backgroundColor: 'transparent',
    overflow: 'visible',
    zIndex: 2,
  },
  card: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'visible',
    boxShadow: '0 12px 32px rgba(0,0,0,0.26)',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    overflow: 'visible',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: { fontSize: 14, fontWeight: '800' },
  headBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minHeight: 0, overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  toneBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
