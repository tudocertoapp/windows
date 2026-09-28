import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { playTapSound } from '../../utils/sounds';

const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX3 = /^#([0-9a-f]{3})$/i;

export function normalizeHexColor(raw) {
  const s = String(raw || '').trim();
  if (HEX6.test(s)) return s.toLowerCase();
  const m3 = s.match(HEX3);
  if (m3) {
    const h = m3[1];
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  return null;
}

function pickerHtml(hex) {
  const v = normalizeHexColor(hex) || '#6366f1';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/></head><body style="margin:0;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#fff;gap:16px;padding:16px;box-sizing:border-box"><p style="margin:0;font-size:14px;text-align:center">Toque no campo para abrir o seletor de cor do sistema</p><input type="color" id="p" value="${v}" style="width:min(100%,320px);height:120px;border:none;border-radius:12px;cursor:pointer"/><p id="lbl" style="margin:0;font-weight:700;font-size:16px">${v}</p><script>const p=document.getElementById('p');const l=document.getElementById('lbl');function send(){l.textContent=p.value;window.ReactNativeWebView.postMessage(JSON.stringify({type:'color',value:p.value}));}p.oninput=send;p.onchange=send;</script></body></html>`;
}

function WebColorInput({ value, onChange, accent, size = 44 }) {
  const ref = useRef(null);
  const hex = normalizeHexColor(value) || '#6366f1';
  return (
    <>
      <input
        ref={ref}
        type="color"
        value={hex}
        onChange={(e) => onChange(normalizeHexColor(e.target.value))}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: 'none',
        }}
      />
      <TouchableOpacity
        onPress={() => {
          playTapSound();
          ref.current?.click?.();
        }}
        activeOpacity={0.85}
        style={[st.brushBtn, { backgroundColor: accent || '#6366f1', width: size, height: size }]}
      >
        <Ionicons name="brush" size={size < 40 ? 16 : 20} color="#fff" />
      </TouchableOpacity>
    </>
  );
}

export function CatalogoColorBrush({
  value,
  onChange,
  colors,
  accent,
  label,
  compact = false,
  inline = false,
  toolbar = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(normalizeHexColor(value) || '#6366f1');
  const hex = normalizeHexColor(value) || '#6366f1';
  const toolbarInputRef = useRef(null);

  const commitHex = useCallback((next) => {
    const n = normalizeHexColor(next);
    if (n) onChange(n);
  }, [onChange]);

  const openNativePicker = () => {
    playTapSound();
    setDraftHex(hex);
    setModalOpen(true);
  };

  const modal = (
    <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
      <Pressable style={st.modalBg} onPress={() => setModalOpen(false)}>
        <Pressable style={[st.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[st.modalTitle, { color: colors.text }]}>Seletor de cor</Text>
          <View style={{ height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            <WebView
              originWhitelist={['*']}
              source={{ html: pickerHtml(draftHex) }}
              onMessage={(e) => {
                try {
                  const data = JSON.parse(e.nativeEvent.data);
                  if (data?.type === 'color' && data.value) {
                    const n = normalizeHexColor(data.value);
                    if (n) {
                      setDraftHex(n);
                      commitHex(n);
                    }
                  }
                } catch (_) {}
              }}
              style={{ flex: 1, backgroundColor: '#0f172a' }}
            />
          </View>
          <TouchableOpacity
            style={[st.modalOk, { backgroundColor: accent }]}
            onPress={() => { playTapSound(); setModalOpen(false); }}
          >
            <Text style={st.modalOkText}>Pronto</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (toolbar) {
    return (
      <View style={{ position: 'relative' }}>
        {Platform.OS === 'web' ? (
          <input
            ref={toolbarInputRef}
            type="color"
            value={hex}
            onChange={(e) => commitHex(normalizeHexColor(e.target.value))}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
          />
        ) : null}
        <TouchableOpacity
          onPress={() => {
            playTapSound();
            if (Platform.OS === 'web') toolbarInputRef.current?.click?.();
            else openNativePicker();
          }}
          style={st.toolbarBtn}
          activeOpacity={0.85}
        >
          <View style={[st.toolbarSwatch, { backgroundColor: hex }]} />
          <Ionicons name="brush" size={16} color="#fff" />
        </TouchableOpacity>
        {modal}
      </View>
    );
  }

  const brush = Platform.OS === 'web' ? (
    <WebColorInput value={hex} onChange={commitHex} accent={accent} size={inline ? 36 : 44} />
  ) : (
    <TouchableOpacity
      onPress={openNativePicker}
      activeOpacity={0.85}
      style={[st.brushBtn, { backgroundColor: accent }, inline && st.brushBtnInline]}
    >
      <Ionicons name="brush" size={inline ? 16 : 20} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <View style={inline ? st.wrapInline : (compact ? st.wrapCompact : st.wrap)}>
      {label && !inline ? <Text style={[st.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View style={[
        inline ? st.rowInline : st.row,
        { borderColor: colors.border, backgroundColor: colors.bg },
      ]}>
        <View style={[inline ? st.swatchInline : st.swatch, { backgroundColor: hex, borderColor: colors.border }]} />
        {brush}
        {inline ? null : (
          <>
            <TextInput
              style={[st.hexInput, { color: colors.text, borderColor: colors.border }]}
              value={hex}
              onChangeText={(t) => commitHex(t)}
              placeholder="#000000"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
            <Text style={[st.hint, { color: colors.textSecondary }]}>HEX</Text>
          </>
        )}
      </View>
      {!compact && !inline ? (
        <Text style={[st.subHint, { color: colors.textSecondary }]}>
          Use o pincel para escolher qualquer cor — não há paleta fixa.
        </Text>
      ) : null}
      {modal}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 8 },
  wrapCompact: { marginTop: 0 },
  wrapInline: { marginTop: 0, flexShrink: 0 },
  toolbarBtn: {
    minWidth: 40,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toolbarSwatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  swatchInline: { width: 28, height: 28, borderRadius: 8, borderWidth: 1 },
  brushBtnInline: { width: 36, height: 36, borderRadius: 10 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  swatch: { width: 40, height: 40, borderRadius: 10, borderWidth: 1 },
  brushBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: { fontSize: 11, fontWeight: '700' },
  subHint: { fontSize: 11, marginTop: 6, lineHeight: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  modalOk: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalOkText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
