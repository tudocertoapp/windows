import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

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
        <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]} showsVerticalScrollIndicator>
          {children}
        </ScrollView>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 16 },
});
