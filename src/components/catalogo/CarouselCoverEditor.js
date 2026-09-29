import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../../utils/sounds';
import { carouselCapaImageBox, normalizeCarouselCapa } from '../../utils/catalogoStore';

export function CarouselCoverEditor({
  visible,
  uri,
  value,
  onSave,
  onClose,
  colors,
  accent,
  frameW = 220,
  frameH = 180,
}) {
  const [capa, setCapa] = useState(() => normalizeCarouselCapa(value));
  const drag = useRef(null);

  useEffect(() => {
    if (visible) setCapa(normalizeCarouselCapa(value));
  }, [visible, value]);

  const onMove = (clientX, clientY) => {
    const d = drag.current;
    if (!d) return;
    const dx = clientX - d.x;
    const dy = clientY - d.y;
    d.x = clientX;
    d.y = clientY;
    setCapa((prev) => ({
      ...prev,
      x: Math.min(100, Math.max(0, prev.x - (dx / frameW) * 80)),
      y: Math.min(100, Math.max(0, prev.y - (dy / frameH) * 80)),
    }));
  };

  const box = carouselCapaImageBox(capa, frameW, frameH);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.bg} onPress={onClose}>
        <Pressable style={[st.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[st.title, { color: colors.text }]}>Recortar capa</Text>
          <Text style={[st.hint, { color: colors.textSecondary }]}>
            Arraste a foto para mostrar a parte principal. Use o zoom se precisar aproximar.
          </Text>
          <View
            style={[st.frame, { width: frameW, height: frameH, borderColor: accent }]}
            {...(Platform.OS === 'web' ? {
              onPointerDown: (e) => {
                drag.current = { x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture?.(e.pointerId);
              },
              onPointerMove: (e) => onMove(e.clientX, e.clientY),
              onPointerUp: () => { drag.current = null; },
            } : {})}
          >
            {uri ? (
              <Image source={{ uri }} style={box} resizeMode="cover" />
            ) : (
              <View style={[st.empty, { backgroundColor: accent + '22' }]}>
                <Ionicons name="image-outline" size={28} color={accent} />
              </View>
            )}
          </View>
          {Platform.OS === 'web' ? (
            <View style={{ width: '100%', marginTop: 12 }}>
              <Text style={[st.hint, { color: colors.textSecondary, marginBottom: 4 }]}>Zoom {capa.zoom}%</Text>
              <input
                type="range"
                min={100}
                max={280}
                value={capa.zoom}
                onChange={(e) => setCapa((p) => ({ ...p, zoom: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: accent, cursor: 'ew-resize' }}
              />
            </View>
          ) : (
            <View style={st.zoomRow}>
              <TouchableOpacity onPress={() => { playTapSound(); setCapa((p) => ({ ...p, zoom: Math.max(100, p.zoom - 10) })); }} style={st.zoomBtn}>
                <Ionicons name="remove" size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{capa.zoom}%</Text>
              <TouchableOpacity onPress={() => { playTapSound(); setCapa((p) => ({ ...p, zoom: Math.min(280, p.zoom + 10) })); }} style={st.zoomBtn}>
                <Ionicons name="add" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
          <View style={st.actions}>
            <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={[st.btn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { playTapSound(); onSave?.(capa); }}
              style={[st.btn, st.btnOk, { backgroundColor: accent }]}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Usar recorte</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', alignSelf: 'flex-start' },
  hint: { fontSize: 12, fontWeight: '600', marginTop: 6, marginBottom: 12, alignSelf: 'stretch' },
  frame: { overflow: 'hidden', borderRadius: 12, borderWidth: 2, backgroundColor: '#0f172a', cursor: 'grab' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  zoomBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(148,163,184,0.22)', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16, width: '100%' },
  btn: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnOk: { borderWidth: 0 },
});
