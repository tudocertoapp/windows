import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../../utils/sounds';
import {
  GRADIENTE_MAX_STOPS,
  normalizeGradientStops,
  addGradientStop,
  patchGradientStop,
  removeGradientStop,
  colorAtStops,
  CatalogoGradientFill,
} from '../../utils/catalogoGradient';
import { CatalogoColorBrush } from './CatalogoColorBrush';

export function CatalogoGradientStops({
  stops,
  cores,
  look,
  onChange,
  colors = {},
  accent = '#64748b',
  compact = false,
  dark = false,
}) {
  const list = useMemo(() => normalizeGradientStops(stops, cores), [stops, cores]);
  const [selectedId, setSelectedId] = useState(list[0]?.id);
  const selected = list.find((s) => s.id === selectedId) || list[0];
  const [barW, setBarW] = useState(1);
  const barRef = useRef(null);
  const dragRef = useRef(null);
  const listRef = useRef(list);
  listRef.current = list;

  const commit = (next) => onChange?.(normalizeGradientStops(next, cores));

  const posFromEvent = (e, el) => {
    const rect = (el || barRef.current)?.getBoundingClientRect?.();
    if (!rect || !rect.width) return 50;
    const x = (e.clientX ?? e.nativeEvent?.pageX ?? 0) - rect.left;
    return Math.min(100, Math.max(0, Math.round((x / rect.width) * 100)));
  };

  const addAt = (pos) => {
    if (list.length >= GRADIENTE_MAX_STOPS) return;
    const p = Math.min(100, Math.max(0, Math.round(Number(pos) || 0)));
    const next = addGradientStop(list, p, colorAtStops(list, p));
    const added = next.find((s) => !list.some((x) => x.id === s.id));
    if (added) setSelectedId(added.id);
    commit(next);
  };

  const startDragStop = (id, e) => {
    if (Platform.OS !== 'web') return;
    e.stopPropagation?.();
    e.preventDefault?.();
    playTapSound();
    setSelectedId(id);
    dragRef.current = { type: 'stop', id };
    const move = (ev) => {
      const drag = dragRef.current;
      if (!drag || drag.type !== 'stop') return;
      const pos = posFromEvent(ev);
      commit(patchGradientStop(listRef.current, drag.id, { pos }));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startDragMid = (leftId, rightPos, leftPos, e) => {
    if (Platform.OS !== 'web') return;
    e.stopPropagation?.();
    e.preventDefault?.();
    dragRef.current = { type: 'mid', id: leftId, leftPos, rightPos };
    const move = (ev) => {
      const drag = dragRef.current;
      if (!drag || drag.type !== 'mid') return;
      const pos = posFromEvent(ev);
      const span = Math.max(1, drag.rightPos - drag.leftPos);
      const peso = Math.round(((pos - drag.leftPos) / span) * 100);
      commit(patchGradientStop(listRef.current, drag.id, { peso }));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const ink = dark ? '#e2e8f0' : (colors.text || '#0f172a');
  const muted = dark ? '#94a3b8' : (colors.textSecondary || '#64748b');
  const border = dark ? 'rgba(255,255,255,0.16)' : (colors.border || '#e2e8f0');

  return (
    <View style={st.wrap}>
      <Pressable
        ref={barRef}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w) setBarW(w);
        }}
        onPress={(e) => {
          if (dragRef.current) return;
          playTapSound();
          const x = e.nativeEvent.locationX;
          const pos = Math.round((x / Math.max(1, barW)) * 100);
          addAt(pos);
        }}
        style={st.barHit}
      >
        <CatalogoGradientFill
          stops={list}
          cores={cores}
          look={{ ...(look || {}), inverter: false }}
          style={st.bar}
        />
        {list.slice(0, -1).map((s, i) => {
          const n = list[i + 1];
          const mid = s.pos + (n.pos - s.pos) * ((s.peso || 50) / 100);
          return (
            <View
              key={`mid-${s.id}`}
              dataSet={{ midId: s.id }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => startDragMid(s.id, n.pos, s.pos, e.nativeEvent)}
              style={[st.mid, { left: `${mid}%` }]}
              {...(Platform.OS === 'web' ? {
                onPointerDown: (e) => startDragMid(s.id, n.pos, s.pos, e),
              } : {})}
            >
              <View style={st.midDiamond} />
            </View>
          );
        })}
        {list.map((s) => (
          <View
            key={s.id}
            dataSet={{ stopId: s.id }}
            style={[st.handle, { left: `${s.pos}%`, borderColor: selected?.id === s.id ? '#fff' : 'rgba(15,23,42,0.85)' }]}
            {...(Platform.OS === 'web' ? {
              onPointerDown: (e) => startDragStop(s.id, e),
            } : {})}
          >
            <TouchableOpacity
              onPress={() => { playTapSound(); setSelectedId(s.id); }}
              style={[st.handleFill, { backgroundColor: s.cor }]}
            />
          </View>
        ))}
      </Pressable>
      <View style={st.actions}>
        <TouchableOpacity
          onPress={() => {
            playTapSound();
            if (list.length >= GRADIENTE_MAX_STOPS) return;
            let gap = 0;
            let at = 50;
            for (let i = 0; i < list.length - 1; i += 1) {
              const g = list[i + 1].pos - list[i].pos;
              if (g > gap) {
                gap = g;
                at = Math.round(list[i].pos + g / 2);
              }
            }
            const next = addGradientStop(list, at);
            const added = next.find((s) => !list.some((x) => x.id === s.id));
            if (added) setSelectedId(added.id);
            commit(next);
          }}
          style={[st.actionBtn, { borderColor: border }]}
        >
          <Ionicons name="add" size={14} color={ink} />
          <Text style={[st.actionText, { color: ink }]}>Cor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={list.length <= 2}
          onPress={() => {
            playTapSound();
            const next = removeGradientStop(list, selected?.id);
            setSelectedId(next[0]?.id);
            commit(next);
          }}
          style={[st.actionBtn, { borderColor: border, opacity: list.length <= 2 ? 0.4 : 1 }]}
        >
          <Ionicons name="trash-outline" size={14} color={ink} />
          <Text style={[st.actionText, { color: ink }]}>Tirar</Text>
        </TouchableOpacity>
        <Text style={[st.count, { color: muted }]}>{list.length}/{GRADIENTE_MAX_STOPS}</Text>
      </View>
      {selected ? (
        <View style={st.edit}>
          <CatalogoColorBrush
            compact
            label={compact ? undefined : 'Cor da parada'}
            value={selected.cor}
            onChange={(c) => commit(patchGradientStop(list, selected.id, { cor: c }))}
            colors={dark ? { text: '#fff', textSecondary: '#94a3b8', border, bg: 'rgba(15,23,42,0.65)', card: '#0f172a' } : colors}
            accent={accent}
          />
          <View style={st.sliders}>
            <Text style={[st.slideLabel, { color: muted }]}>Posição {selected.pos}%</Text>
            {Platform.OS === 'web' ? (
              <input
                type="range"
                min={0}
                max={100}
                value={selected.pos}
                onChange={(e) => commit(patchGradientStop(list, selected.id, { pos: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: selected.cor, cursor: 'ew-resize' }}
              />
            ) : (
              <View style={st.stepRow}>
                <TouchableOpacity onPress={() => commit(patchGradientStop(list, selected.id, { pos: selected.pos - 2 }))} style={st.step}><Ionicons name="remove" size={14} color={ink} /></TouchableOpacity>
                <TouchableOpacity onPress={() => commit(patchGradientStop(list, selected.id, { pos: selected.pos + 2 }))} style={st.step}><Ionicons name="add" size={14} color={ink} /></TouchableOpacity>
              </View>
            )}
            <Text style={[st.slideLabel, { color: muted }]}>Intensidade desta cor {selected.peso}%</Text>
            {Platform.OS === 'web' ? (
              <input
                type="range"
                min={10}
                max={90}
                value={selected.peso}
                onChange={(e) => commit(patchGradientStop(list, selected.id, { peso: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: accent, cursor: 'ew-resize' }}
              />
            ) : (
              <View style={st.stepRow}>
                <TouchableOpacity onPress={() => commit(patchGradientStop(list, selected.id, { peso: selected.peso - 5 }))} style={st.step}><Ionicons name="remove" size={14} color={ink} /></TouchableOpacity>
                <TouchableOpacity onPress={() => commit(patchGradientStop(list, selected.id, { peso: selected.peso + 5 }))} style={st.step}><Ionicons name="add" size={14} color={ink} /></TouchableOpacity>
              </View>
            )}
            {!compact ? (
              <Text style={[st.hint, { color: muted }]}>
                Arraste as setas na barra para posicionar. O losango no meio puxa a intensidade para um lado. Clique na barra para criar outra cor.
              </Text>
            ) : (
              <Text style={[st.hint, { color: muted }]}>Clique na barra para nova cor. Losango = intensidade.</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 8, width: '100%' },
  barHit: {
    position: 'relative',
    height: 44,
    marginBottom: 18,
    cursor: 'crosshair',
  },
  bar: {
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.35)',
  },
  handle: {
    position: 'absolute',
    top: 26,
    width: 16,
    height: 18,
    marginLeft: -8,
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: '#fff',
    zIndex: 3,
    cursor: 'ew-resize',
  },
  handleFill: { flex: 1, borderRadius: 1 },
  mid: {
    position: 'absolute',
    top: 6,
    width: 12,
    height: 12,
    marginLeft: -6,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'ew-resize',
  },
  midDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.55)',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 30,
  },
  actionText: { fontSize: 11, fontWeight: '800' },
  count: { fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  edit: { gap: 8 },
  sliders: { gap: 4 },
  slideLabel: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 11, fontWeight: '600', lineHeight: 15, marginTop: 4 },
  stepRow: { flexDirection: 'row', gap: 8 },
  step: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(148,163,184,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
