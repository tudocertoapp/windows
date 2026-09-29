import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { WebView } from 'react-native-webview';
import { playTapSound } from '../../utils/sounds';

const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX3 = /^#([0-9a-f]{3})$/i;

export function normalizeHexColor(raw) {
  let s = String(raw || '').trim().replace(/['"]/g, '');
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const h = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0'))
      .join('');
    return `#${h}`;
  }
  if (s && !s.startsWith('#')) s = `#${s}`;
  if (/^#([0-9a-f]{8})$/i.test(s)) s = s.slice(0, 7);
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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/></head><body style="margin:0;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#fff;gap:12px;padding:12px;box-sizing:border-box"><input type="color" id="p" value="${v}" style="width:min(100%,280px);height:140px;border:none;border-radius:12px;cursor:pointer;padding:0"/><p id="lbl" style="margin:0;font-weight:700;font-size:16px">${v}</p><script>const p=document.getElementById('p');const l=document.getElementById('lbl');function send(){l.textContent=p.value;window.ReactNativeWebView.postMessage(JSON.stringify({type:'color',value:p.value}));}p.oninput=send;p.onchange=send;</script></body></html>`;
}

export function CatalogoHexTools({ hex, onChange, colors, compact = false, dark = false }) {
  const [draft, setDraft] = useState(hex);
  const [flash, setFlash] = useState('');
  useEffect(() => { setDraft(hex); }, [hex]);

  const commit = (raw) => {
    const n = normalizeHexColor(raw);
    if (n) {
      setDraft(n);
      onChange(n);
    } else {
      setDraft(hex);
    }
  };

  const copy = async () => {
    playTapSound();
    try {
      await Clipboard.setStringAsync(hex);
      setFlash('Copiado');
      setTimeout(() => setFlash(''), 1200);
    } catch (_) {}
  };

  const paste = async () => {
    playTapSound();
    try {
      const t = await Clipboard.getStringAsync();
      const n = normalizeHexColor(t);
      if (n) {
        setDraft(n);
        onChange(n);
        setFlash('Colado');
        setTimeout(() => setFlash(''), 1200);
      } else {
        setFlash('Código inválido');
        setTimeout(() => setFlash(''), 1400);
      }
    } catch (_) {}
  };

  const ink = dark ? '#e2e8f0' : (colors?.text || '#0f172a');
  const muted = dark ? '#94a3b8' : (colors?.textSecondary || '#64748b');
  const border = dark ? 'rgba(255,255,255,0.18)' : (colors?.border || '#e2e8f0');
  const bg = dark ? 'rgba(15,23,42,0.9)' : (colors?.bg || '#fff');

  return (
    <View style={[st.hexRow, compact && st.hexRowCompact]}>
      <TextInput
        style={[st.hexInput, compact && st.hexInputCompact, { color: ink, borderColor: border, backgroundColor: bg }]}
        value={draft}
        onChangeText={(t) => {
          setDraft(t);
          const n = normalizeHexColor(t);
          if (n) onChange(n);
        }}
        onBlur={() => commit(draft)}
        onSubmitEditing={() => commit(draft)}
        placeholder="#000000"
        placeholderTextColor={muted}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={9}
        selectTextOnFocus
      />
      <TouchableOpacity onPress={copy} style={[st.hexBtn, compact && st.hexBtnCompact, { borderColor: border }]} hitSlop={6}>
        <Ionicons name="copy-outline" size={compact ? 13 : 16} color={ink} />
      </TouchableOpacity>
      <TouchableOpacity onPress={paste} style={[st.hexBtn, compact && st.hexBtnCompact, { borderColor: border }]} hitSlop={6}>
        <Ionicons name="clipboard-outline" size={compact ? 13 : 16} color={ink} />
      </TouchableOpacity>
      {flash ? <Text style={[st.flash, { color: muted }]} numberOfLines={1}>{flash}</Text> : null}
    </View>
  );
}

function WebSwatch({ hex, onChange, style, children, onOpen }) {
  const ref = useRef(null);
  return (
    <View style={[st.swatchHit, style]}>
      <input
        ref={ref}
        type="color"
        value={hex}
        onChange={(e) => {
          const n = normalizeHexColor(e.target.value);
          if (n) onChange(n);
        }}
        onClick={() => { playTapSound(); onOpen?.(); }}
        title="Escolher cor"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          border: 'none',
          padding: 0,
          margin: 0,
          zIndex: 2,
        }}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: hex, borderRadius: style?.borderRadius ?? 10 }]} />
      {children}
    </View>
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
  slot = false,
  selected = false,
  onRemove,
  onActivate,
  caption,
  buttonStyle,
  wrapStyle,
  captionColor,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(normalizeHexColor(value) || '#6366f1');
  const hex = normalizeHexColor(value) || '#6366f1';

  const commitHex = useCallback((next) => {
    const n = normalizeHexColor(next);
    if (n) onChange(n);
  }, [onChange]);

  const openNativePicker = () => {
    playTapSound();
    setDraftHex(hex);
    setModalOpen(true);
  };

  const nativeModal = Platform.OS === 'web' ? null : (
    <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
      <Pressable style={st.modalBg} onPress={() => setModalOpen(false)}>
        <Pressable style={[st.modalSheet, { backgroundColor: colors?.card || '#0f172a', borderColor: colors?.border || '#334155' }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[st.modalTitle, { color: colors?.text || '#fff' }]}>Cor</Text>
          <View style={{ height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
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
          <CatalogoHexTools hex={draftHex} onChange={(n) => { setDraftHex(n); commitHex(n); }} colors={colors} />
          <TouchableOpacity
            style={[st.modalOk, { backgroundColor: accent || '#64748b' }]}
            onPress={() => { playTapSound(); setModalOpen(false); }}
          >
            <Text style={st.modalOkText}>Pronto</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const openIfNative = () => {
    onActivate?.();
    if (Platform.OS !== 'web') openNativePicker();
  };

  if (slot) {
    return (
      <View style={[{ position: 'relative' }, wrapStyle]}>
        {Platform.OS === 'web' ? (
          <WebSwatch
            hex={hex}
            onChange={commitHex}
            style={[st.slot, { borderColor: selected ? (colors?.text || '#fff') : 'transparent' }]}
            onOpen={() => onActivate?.()}
          />
        ) : (
          <TouchableOpacity
            onPress={() => { onActivate?.(); openNativePicker(); }}
            activeOpacity={0.85}
            style={[st.slot, { backgroundColor: hex, borderColor: selected ? (colors?.text || '#fff') : 'transparent' }]}
          />
        )}
        {onRemove ? (
          <TouchableOpacity style={st.slotRemove} onPress={() => { playTapSound(); onRemove(); }} hitSlop={6}>
            <Ionicons name="close" size={12} color="#fff" />
          </TouchableOpacity>
        ) : null}
        {nativeModal}
      </View>
    );
  }

  if (toolbar) {
    return (
      <View style={[{ position: 'relative', alignItems: 'center' }, wrapStyle]}>
        <View style={[st.toolbarBtn, { width: '100%' }, buttonStyle]}>
          {Platform.OS === 'web' ? (
            <WebSwatch hex={hex} onChange={commitHex} onOpen={() => setCodeOpen(true)} style={st.toolbarSwatch} />
          ) : (
            <TouchableOpacity onPress={openNativePicker} style={[st.toolbarSwatch, { backgroundColor: hex }]} />
          )}
          {caption ? (
            <Text style={[st.toolbarCaption, captionColor ? { color: captionColor } : null]} numberOfLines={1}>{caption}</Text>
          ) : null}
          {codeOpen ? (
            <CatalogoHexTools hex={hex} onChange={commitHex} colors={colors} compact dark />
          ) : null}
        </View>
        {nativeModal}
      </View>
    );
  }

  const swatchEl = Platform.OS === 'web' ? (
    <WebSwatch
      hex={hex}
      onChange={commitHex}
      style={[inline ? st.swatchInline : st.swatchBig, { borderColor: colors?.border }]}
      onOpen={openIfNative}
    />
  ) : (
    <TouchableOpacity
      onPress={openNativePicker}
      activeOpacity={0.85}
      style={[inline ? st.swatchInline : st.swatchBig, { backgroundColor: hex, borderColor: colors?.border }]}
    />
  );

  return (
    <View style={inline ? st.wrapInline : (compact ? st.wrapCompact : st.wrap)}>
      {label && !inline ? <Text style={[st.label, { color: colors?.textSecondary }]}>{label}</Text> : null}
      <View style={st.pickCol}>
        {swatchEl}
        <CatalogoHexTools hex={hex} onChange={commitHex} colors={colors} compact={compact || inline} />
      </View>
      {nativeModal}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 8 },
  wrapCompact: { marginTop: 4 },
  wrapInline: { marginTop: 0, flexShrink: 0 },
  pickCol: { gap: 8 },
  swatchHit: { position: 'relative', overflow: 'hidden' },
  swatchBig: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  swatchInline: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  toolbarBtn: {
    minWidth: 52,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toolbarSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  toolbarCaption: { fontSize: 9, fontWeight: '800', letterSpacing: 0.1, color: '#fff', textAlign: 'center', maxWidth: 88 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%', flexWrap: 'wrap' },
  hexRowCompact: { gap: 4 },
  hexInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 84,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hexInputCompact: {
    minWidth: 72,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 11,
    borderRadius: 7,
  },
  hexBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexBtnCompact: { width: 26, height: 26, borderRadius: 7 },
  flash: { fontSize: 10, fontWeight: '700' },
  slot: { width: 42, height: 42, borderRadius: 12, borderWidth: 3, overflow: 'hidden' },
  slotRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  modalOk: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  modalOkText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
