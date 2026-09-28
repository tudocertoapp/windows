import React, { useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { playTapSound } from '../../utils/sounds';
import {
  CATALOGO_FONTES,
  CATALOGO_FONT_GROUPS,
  getCatalogoFonte,
  ensureCatalogoGoogleFonts,
} from '../../utils/catalogoFonts';

export function CatalogoFontPicker({
  visible,
  title,
  value,
  onSelect,
  onClose,
  compact = false,
  live = false,
}) {
  useEffect(() => {
    if (visible) ensureCatalogoGoogleFonts();
  }, [visible]);

  const current = getCatalogoFonte(value);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[st.bg, compact && st.bgCompact]} onPress={onClose}>
        <Pressable style={[st.sheet, compact && st.sheetCompact]} onPress={(e) => e.stopPropagation()}>
          <Text style={[st.title, compact && st.titleCompact]}>{title || 'Fonte'}</Text>
          <Text style={st.current} numberOfLines={1}>{current.label}</Text>
          <ScrollView style={compact ? st.listCompact : st.list} showsVerticalScrollIndicator nestedScrollEnabled>
            {CATALOGO_FONT_GROUPS.map((group) => (
              <View key={group.id} style={{ marginBottom: compact ? 8 : 14 }}>
                <Text style={st.group}>{group.label}</Text>
                {CATALOGO_FONTES.filter((f) => f.group === group.id).map((f) => {
                  const on = value === f.id || (!value && f.id === 'system');
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => {
                        playTapSound();
                        onSelect?.(f.id);
                        if (!live) onClose?.();
                      }}
                      style={[st.row, compact && st.rowCompact, on && st.rowOn]}
                    >
                      <Text style={[st.sample, compact && st.sampleCompact, f.family ? { fontFamily: f.family } : null]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          {live ? (
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Text style={st.closeText}>Fechar</Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  bgCompact: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: 88,
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxHeight: '80%',
  },
  sheetCompact: {
    width: 200,
    maxHeight: 260,
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'rgba(15,23,42,0.96)',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  titleCompact: { fontSize: 12, marginBottom: 2 },
  current: { color: '#94a3b8', fontSize: 11, marginBottom: 8 },
  list: { maxHeight: 420 },
  listCompact: { maxHeight: 180 },
  group: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' },
  row: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4 },
  rowCompact: { paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2, borderRadius: 8 },
  rowOn: { backgroundColor: 'rgba(37,99,235,0.35)' },
  sample: { color: '#fff', fontSize: 18 },
  sampleCompact: { fontSize: 13 },
  closeBtn: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  closeText: { color: '#93c5fd', fontSize: 12, fontWeight: '700' },
});
