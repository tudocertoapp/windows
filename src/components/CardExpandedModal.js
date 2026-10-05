import React, { useCallback, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CardScrollbar, CARD_SCROLLBAR_W } from './CardScrollbar';

/** Espaço padrão abaixo da área segura (notch/Dynamic Island), alinhado ao TopBar. */
const HEADER_PADDING_BELOW_SAFE = 12;

/**
 * Modal fullscreen que expande o conteúdo do card.
 * Header respeita área segura e ilha dinâmica com distância padrão do app.
 */
export function CardExpandedModal({ visible, onClose, title, accentColor, headerRight, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const accent = accentColor || colors.primary;
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24);
  const headerPaddingTop = topInset + HEADER_PADDING_BELOW_SAFE;
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const maxScroll = Math.max(0, contentH - viewportH);
  const showStrip = maxScroll > 2;
  const thumbHeight = showStrip ? Math.max(20, (viewportH / contentH) * viewportH) : viewportH;
  const thumbMaxTop = viewportH - thumbHeight;
  const thumbTop = showStrip ? Math.max(0, Math.min((scrollY / maxScroll) * thumbMaxTop, thumbMaxTop)) : 0;

  const onScroll = useCallback((ev) => {
    setScrollY(ev?.nativeEvent?.contentOffset?.y || 0);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={[s.header, { borderBottomColor: colors.border, paddingTop: headerPaddingTop, paddingBottom: HEADER_PADDING_BELOW_SAFE }]}>
          <View style={{ width: 40, height: 40 }} />
          <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <View style={s.rightActions}>
            {headerRight}
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Ionicons name="close" size={24} color={accent} />
            </TouchableOpacity>
          </View>
        </View>
        <View
          style={s.scrollWrap}
          onLayout={(e) => {
            const h = e?.nativeEvent?.layout?.height;
            if (typeof h === 'number' && h > 0) setViewportH(h);
          }}
        >
          <ScrollView
            style={[
              s.scroll,
              showStrip ? { paddingRight: CARD_SCROLLBAR_W + 4 } : null,
              Platform.OS === 'web' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : null,
            ]}
            contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(_, h) => setContentH(h)}
            {...(Platform.OS === 'web' ? { className: 'tc-card-scroll' } : null)}
          >
            {children}
          </ScrollView>
          <CardScrollbar
            visible={showStrip}
            height={viewportH}
            thumbTop={thumbTop}
            thumbHeight={thumbHeight}
            colors={colors}
            accentColor={accent}
          />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtn: { padding: 8, zIndex: 10 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  scrollWrap: { flex: 1, minHeight: 0, position: 'relative' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 16 },
});
