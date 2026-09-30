import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CatalogoGradientFill } from '../../utils/catalogoGradient';
import { CatalogoGradientControls } from './CatalogoGradientControls';
import { CatalogoGradientStops } from './CatalogoGradientStops';
import { isHeroElementVisible, getCatalogoTheme, getCatalogoRotulos, getCatalogoFontColors, clampHeroScale, nudgeHeroItems, alignHeroItems, DEFAULT_HERO_POSICOES, getHeroSafePadPercent, clampHeroPosToSafe, getHeroTextos, addHeroTexto, patchHeroTexto, removeHeroTexto, getHeroItemScale, getHeroExtraPx, isHeroExtraTextId, listHeroElementIds, HERO_EXTRA_TEXT_MAX } from '../../utils/catalogoStore';
import {
  HERO_COLOR_KEYS,
  HERO_FONT_KEYS,
  FONTE_FILL_OPTS,
  FX_DIR_IDS,
  getHeroFontFamily,
  getHeroTextFxLayers,
  getHeroObjectFx,
  normalizeFonteEstilo,
  normalizeFonteEstilos,
  ensureCatalogoFonts,
} from '../../utils/catalogoFonts';
import { playTapSound } from '../../utils/sounds';
import { CatalogoColorBrush } from './CatalogoColorBrush';
import { CatalogoFontPicker } from './CatalogoFontPicker';
import { makeLogoTransparent, detectLogoTransparency } from '../../utils/logoChromaKey';
import { useTheme } from '../../contexts/ThemeContext';

const HERO_TEXT_KEYS = {
  nome: 'nomeLoja',
  titulo: 'titulo',
  subtitulo: 'subtitulo',
  slogan: 'slogan',
};

const ELEMENT_LABELS = {
  logo: 'Logo',
  nome: 'Nome',
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  slogan: 'Slogan',
};

const heroDockListeners = new Set();
let heroDockNode = null;
function publishHeroDock(node) {
  heroDockNode = node;
  heroDockListeners.forEach((fn) => fn());
}

const heroFxListeners = new Set();
let heroFxNode = null;
function publishHeroFx(node) {
  heroFxNode = node;
  heroFxListeners.forEach((fn) => fn());
}

export function HeroDockHost({ style, vertical = false }) {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    heroDockListeners.add(fn);
    fn();
    return () => heroDockListeners.delete(fn);
  }, []);
  return (
    <View
      collapsable={false}
      dataSet={{ heroKeep: '1' }}
      style={[vertical ? { width: 44, flex: 1, flexShrink: 0 } : { minHeight: 46 }, style]}
    >
      {heroDockNode}
    </View>
  );
}

export function HeroFxFloatHost() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    heroFxListeners.add(fn);
    fn();
    return () => heroFxListeners.delete(fn);
  }, []);
  return (
    <View
      pointerEvents="box-none"
      collapsable={false}
      dataSet={{ heroKeep: '1' }}
      style={st.fxFloatHost}
    >
      {heroFxNode}
    </View>
  );
}

function EditableHeroText({
  id,
  value,
  placeholder,
  style,
  backStyle,
  reflectStyle,
  numberOfLines = 2,
  canEdit,
  editing,
  onSelect,
  onStartEdit,
  onEndEdit,
  onChangeText,
}) {
  const [draft, setDraft] = useState(value || '');
  const lastTap = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      const t = setTimeout(() => inputRef.current?.focus?.(), 20);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [editing]);

  const startEdit = () => {
    if (!canEdit) return;
    setDraft(value || '');
    onStartEdit?.(id);
  };

  const commit = () => {
    onChangeText?.(id, draft);
    onEndEdit?.();
  };

  const onPress = (e) => {
    if (!canEdit) return;
    e?.stopPropagation?.();
    onSelect?.(id);
    const now = Date.now();
    if (now - lastTap.current < 380) startEdit();
    lastTap.current = now;
  };

  if (editing) {
    return (
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        multiline
        blurOnSubmit
        style={[style, st.heroInlineInput]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        selectionColor="#fff"
      />
    );
  }

  const shown = value || placeholder;

  return (
    <Pressable
      onPress={onPress}
      style={canEdit ? st.heroTextHit : undefined}
    >
      <View style={st.heroTextStack}>
        {backStyle ? (
          <Text
            pointerEvents="none"
            style={[style, backStyle, st.heroTextFxBack]}
            numberOfLines={numberOfLines}
          >
            {shown}
          </Text>
        ) : null}
        {reflectStyle ? (
          <Text
            pointerEvents="none"
            style={[style, reflectStyle, st.heroTextFxReflect]}
            numberOfLines={numberOfLines}
          >
            {shown}
          </Text>
        ) : null}
        <Text
          style={[style, canEdit && st.heroTextMove, st.heroTextFxFront]}
          numberOfLines={numberOfLines}
          onDoubleClick={canEdit ? (ev) => { ev?.stopPropagation?.(); startEdit(); } : undefined}
        >
          {shown}
        </Text>
      </View>
    </Pressable>
  );
}

function getDomNode(refVal) {
  if (!refVal) return null;
  if (typeof refVal.addEventListener === 'function') return refVal;
  const node = refVal._nativeNode || refVal._node || refVal.childNodes?.[0];
  return typeof node?.addEventListener === 'function' ? node : null;
}

function HeroWheelLock({ enabled, scale, onScale, onHoverLock, onSelect, style, onLayout, panHandlers, dataSet, children }) {
  const ref = useRef(null);
  const cb = useRef({});
  cb.current = { onHoverLock, onSelect, enabled };

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return undefined;
    const el = getDomNode(ref.current);
    if (!el) return undefined;
    el.style.overscrollBehavior = 'contain';
    return undefined;
  }, [enabled]);

  const lockOn = () => {
    if (!enabled) return;
    cb.current.onHoverLock?.(true);
  };
  const lockOff = () => {
    if (!enabled) return;
    cb.current.onHoverLock?.(false);
  };

  return (
    <View
      ref={ref}
      collapsable={false}
      dataSet={dataSet}
      {...(panHandlers || {})}
      onLayout={onLayout}
      style={[
        style,
        {
          transform: [{ scale: Math.max(0.15, Number(scale || 100) / 100) }],
          transformOrigin: 'center center',
        },
      ]}
      onPointerEnter={enabled ? lockOn : undefined}
      onPointerLeave={enabled ? lockOff : undefined}
    >
      {children}
    </View>
  );
}

function ResizeHandle({ scale, onScale, onDragStart, onDragEnd }) {
  const startRef = useRef(100);
  const cb = useRef({});
  cb.current = { scale, onScale, onDragStart, onDragEnd };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      startRef.current = cb.current.scale || 100;
      cb.current.onDragStart?.();
    },
    onPanResponderMove: (_, g) => {
      const next = clampHeroScale(startRef.current + (g.dx + g.dy) * 0.45);
      cb.current.onScale?.(next);
    },
    onPanResponderRelease: (_, g) => {
      const next = clampHeroScale(startRef.current + (g.dx + g.dy) * 0.45);
      cb.current.onScale?.(next);
      cb.current.onDragEnd?.();
    },
    onPanResponderTerminate: () => cb.current.onDragEnd?.(),
  })).current;

  return (
    <View
      {...pan.panHandlers}
      style={st.resizeHandle}
      accessibilityLabel="Arraste para aumentar ou diminuir"
    >
      <Ionicons name="resize-outline" size={13} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
    </View>
  );
}

function DraggableHeroItem({
  id,
  pos,
  containerW,
  containerH,
  editable,
  resizable,
  selected,
  scale = 100,
  safePad,
  onSelect,
  onMove,
  onScale,
  onHoverLock,
  onDragStart,
  onDragEnd,
  children,
}) {
  const posRef = useRef(pos);
  const boxRef = useRef({ w: containerW, h: containerH });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const cb = useRef({});
  const [dragPx, setDragPx] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const safeRef = useRef(safePad);
  safeRef.current = safePad;
  posRef.current = pos;
  boxRef.current = { w: containerW, h: containerH };
  cb.current = { editable, onMove, onDragStart, onDragEnd, onSelect, id };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => !!cb.current.editable && (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      const box = boxRef.current;
      const p = posRef.current || { x: 50, y: 50 };
      dragOrigin.current = {
        x: (p.x / 100) * (box.w || 1),
        y: (p.y / 100) * (box.h || 1),
      };
      setDragPx({ dx: 0, dy: 0 });
      cb.current.onSelect?.(cb.current.id, 'keep');
      cb.current.onDragStart?.();
    },
    onPanResponderMove: (_, g) => setDragPx({ dx: g.dx, dy: g.dy }),
    onPanResponderRelease: (_, g) => {
      const box = boxRef.current;
      const safe = safeRef.current || { x: 4, y: 4 };
      const x = dragOrigin.current.x + g.dx;
      const y = dragOrigin.current.y + g.dy;
      let nx = box.w ? (x / box.w) * 100 : 50;
      let ny = box.h ? (y / box.h) * 100 : 50;
      if (Math.abs(nx - 50) < 3) nx = 50;
      if (Math.abs(ny - 50) < 3) ny = 50;
      const clamped = clampHeroPosToSafe({ x: nx, y: ny }, safe);
      setDragPx(null);
      cb.current.onMove?.(cb.current.id, { x: Math.round(clamped.x * 10) / 10, y: Math.round(clamped.y * 10) / 10 });
      cb.current.onDragEnd?.();
    },
    onPanResponderTerminate: () => {
      setDragPx(null);
      cb.current.onDragEnd?.();
    },
  })).current;

  if (!containerW || !containerH) return null;

  const minPxX = ((safePad?.x ?? 4) / 100) * containerW;
  const minTop = ((safePad?.top ?? safePad?.y ?? 4) / 100) * containerH;
  const minBottom = ((safePad?.bottom ?? safePad?.y ?? 4) / 100) * containerH;
  const rawX = dragPx ? dragOrigin.current.x + dragPx.dx : (pos.x / 100) * containerW;
  const rawY = dragPx ? dragOrigin.current.y + dragPx.dy : (pos.y / 100) * containerH;
  const centerX = Math.min(containerW - minPxX, Math.max(minPxX, rawX));
  const centerY = Math.min(containerH - minBottom, Math.max(minTop, rawY));
  const left = centerX - size.w / 2;
  const top = centerY - size.h / 2;

  return (
    <HeroWheelLock
      enabled={!!(editable || resizable)}
      scale={scale}
      onScale={(v) => onScale?.(id, v)}
      onSelect={() => onSelect?.(id)}
      onHoverLock={onHoverLock}
      panHandlers={editable ? pan.panHandlers : undefined}
      dataSet={{ heroKeep: '1' }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!dragPx && (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5)) {
          setSize({ w: width, h: height });
        }
      }}
      style={[
        st.absItem,
        { left, top, zIndex: selected || dragPx ? 40 : 3, cursor: editable ? (dragPx ? 'grabbing' : 'move') : undefined },
      ]}
    >
      {selected ? <View pointerEvents="none" style={st.selectRing} /> : null}
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onSelect?.(id);
        }}
        style={st.absItemHit}
      >
        {children}
      </Pressable>
      {selected && (resizable || editable) ? (
        <ResizeHandle
          scale={scale}
          onScale={(v) => onScale?.(id, v)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ) : null}
    </HeroWheelLock>
  );
}

function DockBtn({ icon, label, onPress, ink, icoBg, active, danger, fill }) {
  return (
    <TouchableOpacity
      onPress={() => { playTapSound(); onPress?.(); }}
      style={[st.dockBtn, fill && st.dockBtnFill, { backgroundColor: active ? '#2563eb' : icoBg }]}
      activeOpacity={0.85}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={16} color={danger ? '#ef4444' : (active ? '#fff' : ink)} />
      {label ? (
        <Text style={[st.dockBtnLabel, { color: danger ? '#ef4444' : (active ? '#fff' : ink) }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function DockSlot({ children, open, fly }) {
  return (
    <View style={[st.dockSlot, open && { zIndex: 30 }]}>
      {children}
      {open && fly ? <View style={st.dockFlyCol}>{fly}</View> : null}
    </View>
  );
}

const FX_EFFECT_OPTS = [
  { id: 'sombra', icon: 'contrast-outline', label: 'Sombra' },
  { id: 'luz', icon: 'sunny-outline', label: 'Luz' },
  { id: 'neon', icon: 'flash-outline', label: 'Neon' },
  { id: 'relevo', icon: 'layers-outline', label: 'Relevo' },
  { id: 'halo', icon: 'radio-button-off-outline', label: 'Halo' },
  { id: 'brilho', icon: 'star-outline', label: 'Brilho' },
  { id: 'extrude', icon: 'cube-outline', label: '3D' },
  { id: 'reflexo', icon: 'copy-outline', label: 'Reflexo' },
  { id: 'desfoque', icon: 'cloudy-outline', label: 'Desfoque' },
  { id: 'vidro', icon: 'diamond-outline', label: 'Vidro' },
];

const FX_DIR_ICONS = {
  centro: { icon: 'ellipse', rot: '0deg' },
  cima: { icon: 'arrow-up', rot: '0deg' },
  baixo: { icon: 'arrow-down', rot: '0deg' },
  esquerda: { icon: 'arrow-back', rot: '0deg' },
  direita: { icon: 'arrow-forward', rot: '0deg' },
  'cima-esq': { icon: 'arrow-up', rot: '-45deg' },
  'cima-dir': { icon: 'arrow-up', rot: '45deg' },
  'baixo-esq': { icon: 'arrow-down', rot: '45deg' },
  'baixo-dir': { icon: 'arrow-down', rot: '-45deg' },
};

function FxChip({ icon, label, active, onPress, wide }) {
  return (
    <TouchableOpacity
      onPress={() => { playTapSound(); onPress?.(); }}
      style={[st.fxChip, wide && st.fxChipWide, active && st.fxChipOn]}
      activeOpacity={0.85}
    >
              {icon ? <Ionicons name={icon} size={12} color={active ? '#fff' : '#cbd5e1'} /> : null}
      {label ? <Text style={[st.fxChipText, active && st.fxChipTextOn]} numberOfLines={1}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

function FxStepper({ label, value, onMinus, onPlus }) {
  return (
    <View style={st.fxStepBar}>
      <Text style={st.fxStepLabel} numberOfLines={1}>{label}</Text>
      <TouchableOpacity onPress={() => { playTapSound(); onMinus?.(); }} style={st.fxMini} hitSlop={6}>
        <Ionicons name="remove" size={12} color="#cbd5e1" />
      </TouchableOpacity>
      <Text style={st.fxStepVal}>{value}</Text>
      <TouchableOpacity onPress={() => { playTapSound(); onPlus?.(); }} style={st.fxMini} hitSlop={6}>
        <Ionicons name="add" size={12} color="#cbd5e1" />
      </TouchableOpacity>
    </View>
  );
}
function FxDirPad({ value, onChange }) {
  return (
    <View style={st.fxPad}>
      {FX_DIR_IDS.map((id) => {
        const meta = FX_DIR_ICONS[id] || FX_DIR_ICONS.centro;
        const on = value === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => { playTapSound(); onChange?.(id); }}
            style={[st.fxPadCell, on && st.fxPadCellOn]}
            activeOpacity={0.85}
          >
            <Ionicons
              name={meta.icon}
              size={id === 'centro' ? 8 : 13}
              color={on ? '#fff' : '#cbd5e1'}
              style={{ transform: [{ rotate: meta.rot }] }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function HeroFxPanel({
  config,
  targetIds,
  primaryId,
  colors,
  accent,
  onFieldChange,
  onClose,
}) {
  const palette = colors || {};
  const [winSize, setWinSize] = useState(() => Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window: next }) => {
      if (next?.width) setWinSize(next);
    });
    return () => sub?.remove?.();
  }, []);
  const panelW = Math.min(winSize.width - 16, Math.max(248, Math.round(Math.min(winSize.width * 0.42, 360))));
  const panelMaxH = Math.max(220, Math.min(Math.round(winSize.height * 0.7), 420));
  const [pos, setPos] = useState(() => ({
    x: Math.max(8, winSize.width - panelW - 12),
    y: 56,
  }));
  const posRef = useRef(pos);
  posRef.current = pos;
  const origin = useRef({ x: 0, y: 0 });
  const layoutRef = useRef({ w: panelW, winW: winSize.width, winH: winSize.height });
  layoutRef.current = { w: panelW, winW: winSize.width, winH: winSize.height };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      origin.current = { ...posRef.current };
    },
    onPanResponderMove: (_, g) => {
      const { w, winW, winH } = layoutRef.current;
      const next = {
        x: Math.max(8, Math.min(origin.current.x + g.dx, Math.max(8, winW - w - 8))),
        y: Math.max(8, Math.min(origin.current.y + g.dy, Math.max(8, winH - 80))),
      };
      posRef.current = next;
      setPos(next);
    },
  })).current;

  const ids = targetIds?.length ? targetIds : (primaryId ? [primaryId] : []);
  if (!ids.length) return null;
  const colorKey = HERO_COLOR_KEYS[primaryId];
  const extraItem = isHeroExtraTextId(primaryId) ? getHeroTextos(config).find((t) => t.id === primaryId) : null;
  const isLogo = primaryId === 'logo' && ids.every((id) => id === 'logo');
  const fillColor = extraItem?.cor || config?.[colorKey] || config?.logoCor || '#ffffff';
  const fx = normalizeFonteEstilos(config)[primaryId] || normalizeFonteEstilo(null, fillColor);
  const accentColor = accent || '#64748b';
  const textIds = ids.filter((id) => id !== 'logo');

  const applyColor = (c) => {
    const estilos = { ...normalizeFonteEstilos(config) };
    let textos = getHeroTextos(config);
    let extraDirty = false;
    textIds.forEach((id) => {
      const key = HERO_COLOR_KEYS[id];
      if (key) onFieldChange?.(key, c);
      else if (isHeroExtraTextId(id)) {
        textos = textos.map((t) => (t.id === id ? { ...t, cor: c } : t));
        extraDirty = true;
      }
      const cur = estilos[id] || normalizeFonteEstilo(null, c);
      estilos[id] = { ...cur, cores: [c, cur.cores?.[1] || '#60a5fa'] };
    });
    if (extraDirty) onFieldChange?.('heroTextos', textos);
    onFieldChange?.('fonteEstilos', estilos);
  };

  const applyFx = (patch) => {
    const estilos = { ...normalizeFonteEstilos(config) };
    ids.forEach((id) => {
      const extra = isHeroExtraTextId(id) ? getHeroTextos(config).find((t) => t.id === id) : null;
      const solid = extra?.cor || (id === 'logo' ? (config?.logoCor || '#ffffff') : (config?.[HERO_COLOR_KEYS[id]] || '#ffffff'));
      estilos[id] = { ...normalizeFonteEstilo(estilos[id], solid), ...patch };
    });
    onFieldChange?.('fonteEstilos', estilos);
  };

  return (
    <View
      style={[st.fxPanel, { left: pos.x, top: pos.y, width: panelW, right: undefined }]}
      dataSet={{ heroKeep: '1' }}
    >
      <View {...pan.panHandlers} style={st.fxDragBar}>
        <View style={st.fxGrip}>
          <View style={st.fxGripDot} />
          <View style={st.fxGripDot} />
          <View style={st.fxGripDot} />
        </View>
        <Text style={st.fxDragText}>ESTÚDIO · EFEITOS</Text>
        <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} hitSlop={8} style={st.fxCloseBtn}>
          <Ionicons name="close" size={14} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
      <ScrollView style={[st.fxPanelScroll, { maxHeight: panelMaxH }]} contentContainerStyle={st.fxPanelBody} nestedScrollEnabled>
        {!isLogo ? (
          <>
            <Text style={st.fxSecTitle}>Preenchimento</Text>
            <View style={st.fxGrid}>
              {FONTE_FILL_OPTS.map((opt) => (
                <FxChip
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  active={fx.fill === opt.id}
                  onPress={() => applyFx({ fill: opt.id, contorno: opt.id === 'vazado' ? true : fx.contorno })}
                />
              ))}
            </View>
            <View style={st.fxGrid}>
              {fx.fill !== 'gradiente' ? (
                <CatalogoColorBrush
                  toolbar
                  caption="Cor"
                  value={fillColor}
                  onChange={applyColor}
                  colors={palette}
                  accent={accentColor}
                  wrapStyle={st.fxGrow}
                  buttonStyle={st.fxChipFill}
                  captionColor="#e2e8f0"
                />
              ) : null}
            </View>
            {fx.fill === 'gradiente' ? (
              <>
                <CatalogoGradientStops
                  compact
                  dark
                  stops={fx.stops}
                  cores={fx.cores}
                  look={{ forma: fx.forma, angulo: fx.angulo, inverter: false }}
                  onChange={(stops) => applyFx({ stops, cores: stops.map((s) => s.cor) })}
                  colors={{ text: '#fff', textSecondary: '#94a3b8', border: 'rgba(255,255,255,0.14)', bg: 'rgba(15,23,42,0.8)' }}
                  accent={accentColor}
                />
                <CatalogoGradientControls
                  compact
                  look={{ forma: fx.forma, angulo: fx.angulo, inverter: fx.inverter }}
                  onChange={(look) => applyFx(look)}
                  colors={{ text: '#fff', textSecondary: '#94a3b8', border: 'rgba(255,255,255,0.14)' }}
                  accent={accentColor}
                />
              </>
            ) : null}
          </>
        ) : null}

        <Text style={st.fxSecTitle}>Efeitos</Text>
        <View style={st.fxGrid}>
          {!isLogo ? (
            <FxChip
              icon="ellipse-outline"
              label="Contorno"
              active={!!fx.contorno || fx.fill === 'vazado'}
              onPress={() => {
                if (fx.fill === 'vazado') applyFx({ fill: 'solido', contorno: false });
                else applyFx({ contorno: !fx.contorno });
              }}
            />
          ) : null}
          {FX_EFFECT_OPTS.map((opt) => (
            <FxChip
              key={opt.id}
              icon={opt.icon}
              label={opt.label}
              active={!!fx[opt.id]}
              onPress={() => applyFx({ [opt.id]: !fx[opt.id] })}
            />
          ))}
          <CatalogoColorBrush
            toolbar
            caption="FX"
            value={fx.fxCor || '#ffffff'}
            onChange={(c) => applyFx({ fxCor: c })}
            colors={palette}
            accent={accentColor}
            wrapStyle={st.fxGrow}
            buttonStyle={st.fxChipFill}
            captionColor="#e2e8f0"
          />
        </View>
        {fx.sombra ? (
          <View style={st.fxGrid}>
            <CatalogoColorBrush
              toolbar
              caption="Sombra"
              value={fx.sombraCor || '#000000'}
              onChange={(c) => applyFx({ sombraCor: c, sombra: true })}
              colors={palette}
              accent={accentColor}
              wrapStyle={st.fxGrow}
              buttonStyle={st.fxChipFill}
              captionColor="#e2e8f0"
            />
          </View>
        ) : null}
        {!isLogo && (fx.contorno || fx.fill === 'vazado') ? (
          <View style={st.fxGrid}>
            <CatalogoColorBrush
              toolbar
              caption="Linha"
              value={fx.stroke || '#ffffff'}
              onChange={(c) => applyFx({ stroke: c, contorno: true })}
              colors={palette}
              accent={accentColor}
              wrapStyle={st.fxGrow}
              buttonStyle={st.fxChipFill}
              captionColor="#e2e8f0"
            />
            <FxStepper
              label="Espessura"
              value={fx.strokeW || 2}
              onMinus={() => applyFx({ strokeW: Math.max(1, (fx.strokeW || 2) - 1), contorno: true })}
              onPlus={() => applyFx({ strokeW: Math.min(8, (fx.strokeW || 2) + 1), contorno: true })}
            />
          </View>
        ) : null}

        <View style={st.fxDual}>
          <FxStepper
            label="Intensidade"
            value={fx.intensidade || 5}
            onMinus={() => applyFx({ intensidade: Math.max(1, (fx.intensidade || 5) - 1) })}
            onPlus={() => applyFx({ intensidade: Math.min(10, (fx.intensidade || 5) + 1) })}
          />
          <FxStepper
            label="Tamanho do efeito"
            value={fx.fxTamanho || 5}
            onMinus={() => applyFx({ fxTamanho: Math.max(1, (fx.fxTamanho || 5) - 1) })}
            onPlus={() => applyFx({ fxTamanho: Math.min(10, (fx.fxTamanho || 5) + 1) })}
          />
        </View>

        <View style={st.fxDual}>
          <View style={st.fxDualCol}>
            <Text style={st.fxSecTitle}>Direção</Text>
            <FxDirPad value={fx.fxDir || 'centro'} onChange={(id) => applyFx({ fxDir: id })} />
          </View>
          <View style={st.fxDualCol}>
            <Text style={st.fxSecTitle}>Posição</Text>
            <FxDirPad value={fx.fxPos || 'centro'} onChange={(id) => applyFx({ fxPos: id })} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function HeroMoveDock({
  config,
  selectedId,
  selectedIds,
  onNudge,
  onAlign,
  onReset,
  onScaleDelta,
  colors,
  accent,
  onEditText,
  onFieldChange,
  onOpenFonts,
  onPickLogo,
  onOpenFx,
  fxPanelOpen,
  onAddTexto,
}) {
  const [fly, setFly] = useState(null);
  const themeColors = useTheme()?.colors;
  const palette = colors || themeColors || {};
  const ids = selectedIds?.length ? selectedIds : (selectedId ? [selectedId] : []);
  const primaryId = ids[ids.length - 1] || selectedId;
  const textIds = ids.filter((id) => id !== 'logo');
  const isLogoOnly = textIds.length === 0;
  const colorKey = HERO_COLOR_KEYS[primaryId];
  const canRemove = !!primaryId;
  const canAddTexto = getHeroTextos(config).length < HERO_EXTRA_TEXT_MAX;
  const extras = [
    { id: 'texto', label: 'Texto', kind: 'texto' },
    { id: 'nome', label: 'Nome', on: config?.usaNomeProfissional === true, key: 'usaNomeProfissional' },
    { id: 'slogan', label: 'Slogan', on: config?.mostrarSlogan === true, key: 'mostrarSlogan' },
    { id: 'logo', label: 'Logo', on: config?.usaLogo !== false, key: 'usaLogo' },
  ].filter((x) => (x.kind === 'texto' ? canAddTexto : !x.on));

  const applyColor = (c) => {
    const estilos = { ...normalizeFonteEstilos(config) };
    let textos = getHeroTextos(config);
    let extraDirty = false;
    textIds.forEach((id) => {
      const key = HERO_COLOR_KEYS[id];
      if (key) onFieldChange?.(key, c);
      else if (isHeroExtraTextId(id)) {
        textos = textos.map((t) => (t.id === id ? { ...t, cor: c } : t));
        extraDirty = true;
      }
      const cur = estilos[id] || normalizeFonteEstilo(null, c);
      estilos[id] = { ...cur, cores: [c, cur.cores?.[1] || '#60a5fa'] };
    });
    if (extraDirty) onFieldChange?.('heroTextos', textos);
    onFieldChange?.('fonteEstilos', estilos);
  };

  const extraPrimary = isHeroExtraTextId(primaryId) ? getHeroTextos(config).find((t) => t.id === primaryId) : null;

  const hideSelected = () => {
    if (isHeroExtraTextId(primaryId)) {
      onFieldChange?.('heroTextos', removeHeroTexto(config, primaryId));
      return;
    }
    if (primaryId === 'subtitulo') onFieldChange?.('mostrarSubtitulo', false);
    if (primaryId === 'titulo') onFieldChange?.('mostrarTitulo', false);
    if (primaryId === 'nome') onFieldChange?.('usaNomeProfissional', false);
    if (primaryId === 'slogan') onFieldChange?.('mostrarSlogan', false);
    if (primaryId === 'logo') onFieldChange?.('usaLogo', false);
  };

  const toggleFly = (id) => setFly((cur) => (cur === id ? null : id));

  const ink = palette.text || '#fff';
  const icoBg = palette.bg || palette.primaryRgba?.(0.12) || 'rgba(148,163,184,0.18)';
  const flyBg = palette.card || '#0f172a';
  const flyBorder = palette.border || 'rgba(148,163,184,0.35)';

  const colorBrush = (
    <CatalogoColorBrush
      toolbar
      caption="Cor"
      value={isLogoOnly
        ? (config?.logoCor || config?.logoPlacaCor || '#ffffff')
        : (extraPrimary?.cor || config?.[colorKey] || '#ffffff')}
      onChange={isLogoOnly
        ? (c) => onFieldChange?.('logoCor', c)
        : applyColor}
      colors={palette}
      accent={accent || palette.primary || '#2563eb'}
      wrapStyle={st.dockSlot}
      buttonStyle={[st.dockBtn, { backgroundColor: icoBg, width: '100%' }]}
      captionColor={ink}
    />
  );

  return (
    <View style={[st.dockPro, { backgroundColor: palette.card || 'transparent', borderColor: palette.border || 'transparent' }]} dataSet={{ heroKeep: '1' }}>
      <View style={st.dockProRow}>
        {colorBrush}

        {isLogoOnly && primaryId === 'logo' ? (
          <DockSlot
            open={fly === 'logo'}
            fly={(
              <View style={[st.dockFlyInner, { backgroundColor: flyBg, borderColor: flyBorder }]}>
                {onPickLogo ? (
                  <DockBtn fill icon="image-outline" label="Trocar logo" ink={ink} icoBg={icoBg} onPress={onPickLogo} />
                ) : null}
                <DockBtn fill icon="sync-outline" label="Inverter" active={!!config?.logoInverter} ink={ink} icoBg={icoBg} onPress={() => onFieldChange?.('logoInverter', !config?.logoInverter)} />
                <DockBtn fill icon={config?.logoPlaca ? 'color-fill' : 'color-fill-outline'} label="Fundo" active={!!config?.logoPlaca} ink={ink} icoBg={icoBg} onPress={() => onFieldChange?.('logoPlaca', !config?.logoPlaca)} />
                <DockBtn
                  fill
                  icon="cut-outline"
                  label="Transparente"
                  active={config?.logoFundoImg && config.logoFundoImg !== 'manter'}
                  ink={ink}
                  icoBg={icoBg}
                  onPress={() => {
                    const on = config?.logoFundoImg && config.logoFundoImg !== 'manter';
                    if (on) onFieldChange?.('logoFundoImg', 'manter');
                    else {
                      onFieldChange?.('logoFundoImg', 'sem-branco');
                      onFieldChange?.('logoPlaca', false);
                      onFieldChange?.('logoMoldura', 'nenhuma');
                    }
                  }}
                />
                <DockBtn
                  fill
                  icon={config?.logoMoldura === 'nenhuma' ? 'image-outline' : 'ellipse-outline'}
                  label={config?.logoMoldura === 'nenhuma' ? 'Sem moldura' : 'Moldura'}
                  active={config?.logoMoldura !== 'nenhuma'}
                  ink={ink}
                  icoBg={icoBg}
                  onPress={() => {
                    if (config?.logoMoldura === 'nenhuma') onFieldChange?.('logoMoldura', 'circular');
                    else {
                      onFieldChange?.('logoMoldura', 'nenhuma');
                      onFieldChange?.('logoPlaca', false);
                    }
                  }}
                />
              </View>
            )}
          >
            <DockBtn icon="image-outline" label="Logo" active={fly === 'logo'} ink={ink} icoBg={icoBg} onPress={() => toggleFly('logo')} />
          </DockSlot>
        ) : null}

        {textIds.length === 1 ? (
          <DockBtn icon="pencil" label="Editar" ink={ink} icoBg={icoBg} onPress={() => onEditText?.(textIds[0])} />
        ) : null}
        {!isLogoOnly ? (
          <DockBtn icon="text" label="Fonte" ink={ink} icoBg={icoBg} onPress={() => onOpenFonts?.()} />
        ) : null}
        {primaryId ? (
          <DockBtn
            icon="color-wand-outline"
            label="Efeitos"
            ink={ink}
            icoBg={icoBg}
            active={!!fxPanelOpen}
            onPress={() => onOpenFx?.()}
          />
        ) : null}

        <DockSlot
          open={fly === 'move'}
          fly={(
            <View style={[st.dockFlyInner, { backgroundColor: flyBg, borderColor: flyBorder }]}>
              <DockBtn fill icon="arrow-back-outline" label="Esquerda" ink={ink} icoBg={icoBg} onPress={() => onAlign?.('esquerda')} />
              <DockBtn fill icon="scan-outline" label="Centro" ink={ink} icoBg={icoBg} onPress={() => onAlign?.('centro')} />
              <DockBtn fill icon="arrow-forward-outline" label="Direita" ink={ink} icoBg={icoBg} onPress={() => onAlign?.('direita')} />
              <DockBtn fill icon="chevron-up" label="Cima" ink={ink} icoBg={icoBg} onPress={() => onNudge?.(0, -4)} />
              <DockBtn fill icon="chevron-back" label="Esq." ink={ink} icoBg={icoBg} onPress={() => onNudge?.(-4, 0)} />
              <DockBtn fill icon="chevron-forward" label="Dir." ink={ink} icoBg={icoBg} onPress={() => onNudge?.(4, 0)} />
              <DockBtn fill icon="chevron-down" label="Baixo" ink={ink} icoBg={icoBg} onPress={() => onNudge?.(0, 4)} />
              <DockBtn fill icon="remove" label="Menor" ink={ink} icoBg={icoBg} onPress={() => onScaleDelta?.(-8)} />
              <DockBtn fill icon="add" label="Maior" ink={ink} icoBg={icoBg} onPress={() => onScaleDelta?.(8)} />
            </View>
          )}
        >
          <DockBtn icon="move-outline" label="Ajustar" active={fly === 'move'} ink={ink} icoBg={icoBg} onPress={() => toggleFly('move')} />
        </DockSlot>

        {extras.length ? (
          <DockSlot
            open={fly === 'add'}
            fly={(
              <View style={[st.dockFlyInner, { backgroundColor: flyBg, borderColor: flyBorder }]}>
                {extras.map((x) => (
                  <DockBtn
                    key={x.id}
                    fill
                    icon={x.kind === 'texto' ? 'text-outline' : 'add-outline'}
                    label={x.label}
                    ink={ink}
                    icoBg={icoBg}
                    onPress={() => {
                      if (x.kind === 'texto') {
                        if (canAddTexto) onAddTexto?.();
                      } else {
                        onFieldChange?.(x.key, true);
                      }
                      setFly(null);
                    }}
                  />
                ))}
              </View>
            )}
          >
            <DockBtn icon="add-circle-outline" label="Adicionar" active={fly === 'add'} ink={ink} icoBg={icoBg} onPress={() => toggleFly('add')} />
          </DockSlot>
        ) : null}

        {canRemove ? (
          <DockBtn icon="trash-outline" label="Ocultar" ink={ink} icoBg={icoBg} danger onPress={hideSelected} />
        ) : null}
        <DockBtn icon="refresh-outline" label="Resetar" ink={ink} icoBg={icoBg} onPress={onReset} />
      </View>
    </View>
  );
}

function HeroToolbarBtn({ icon, label, onPress, active }) {
  return (
    <TouchableOpacity
      onPress={() => { playTapSound(); onPress?.(); }}
      style={[st.tbBtn, active && st.tbBtnOn]}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={16} color="#fff" />
      {label ? <Text style={st.tbBtnText}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

export function LojaHeroBanner({
  config,
  hero,
  lojaNome,
  logoUri,
  heroBg,
  heroEditMode = false,
  heroResizeMode = false,
  onHeroPositionChange,
  onHeroScaleChange,
  onHeroTextChange,
  onDragStateChange,
  onPickLogo,
  ownerUserId,
}) {
  const uiColors = useTheme()?.colors || {};
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontPreviewId, setFontPreviewId] = useState(null);
  const [fxPanelOpen, setFxPanelOpen] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [wheelLocked, setWheelLocked] = useState(false);
  const hoverLockCount = useRef(0);
  const dragLock = useRef(false);
  const additiveRef = useRef(false);
  const [logoCutUri, setLogoCutUri] = useState(logoUri);
  const selectedId = selectedIds[selectedIds.length - 1] || '';
  const hasSelection = selectedIds.length > 0;
  const safePad = getHeroSafePadPercent(config, containerSize.w, containerSize.h);

  const emitScrollLock = useCallback(() => {
    const locked = dragLock.current || hoverLockCount.current > 0;
    onDragStateChange?.(locked);
    setWheelLocked(locked);
  }, [onDragStateChange]);

  const setHoverLock = useCallback((on) => {
    hoverLockCount.current = Math.max(0, hoverLockCount.current + (on ? 1 : -1));
    emitScrollLock();
  }, [emitScrollLock]);

  const setDragLock = useCallback((on) => {
    dragLock.current = !!on;
    emitScrollLock();
  }, [emitScrollLock]);

  const handleScale = useCallback((id, value) => {
    onHeroScaleChange?.(id, clampHeroScale(value));
  }, [onHeroScaleChange]);

  const handleTextChange = useCallback((id, text) => {
    if (isHeroExtraTextId(id)) {
      onHeroTextChange?.('heroTextos', patchHeroTexto(config, id, { texto: text }));
      return;
    }
    const key = HERO_TEXT_KEYS[id];
    if (!key) return;
    onHeroTextChange?.(key, text);
  }, [onHeroTextChange, config]);

  const handleFieldChange = useCallback((key, value) => {
    if (!key) return;
    onHeroTextChange?.(key, value);
  }, [onHeroTextChange]);

  useEffect(() => {
    const texts = selectedIds.filter((id) => id !== 'logo');
    if (!texts.length) {
      setFxPanelOpen(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    ensureCatalogoFonts(config);
  }, [config?.fontesUsuario]);

  useEffect(() => {
    let alive = true;
    const mode = config?.logoFundoImg || 'manter';
    if (!logoUri || mode === 'manter') {
      setLogoCutUri(logoUri);
      return undefined;
    }
    makeLogoTransparent(logoUri, mode).then((next) => {
      if (alive) setLogoCutUri(next || logoUri);
    });
    return () => { alive = false; };
  }, [logoUri, config?.logoFundoImg]);

  useEffect(() => {
    if (!logoUri || config?.logoTemTransparencia) return undefined;
    let alive = true;
    detectLogoTransparency(logoUri).then((has) => {
      if (!alive || !has) return;
      onHeroTextChange?.('logoTemTransparencia', true);
      onHeroTextChange?.('logoPlaca', false);
    });
    return () => { alive = false; };
  }, [logoUri, config?.logoTemTransparencia]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => isHeroElementVisible(config, id)));
  }, [config.usaNomeProfissional, config.mostrarSlogan, config.mostrarSubtitulo, config.usaLogo, config.mostrarTitulo, config.heroTextos]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) additiveRef.current = true;
    };
    const onUp = () => { additiveRef.current = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const selectItem = useCallback((id, mode) => {
    setSelectedIds((prev) => {
      const additive = mode === 'toggle' || (mode !== 'keep' && additiveRef.current);
      if (additive) {
        if (prev.includes(id)) return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
        return [...prev, id];
      }
      if (mode === 'keep' && prev.includes(id)) return prev;
      return [id];
    });
  }, []);

  const toggleSelect = useCallback((id) => selectItem(id, 'toggle'), [selectItem]);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(listHeroElementIds(config).filter((id) => isHeroElementVisible(config, id)));
  }, [config]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setEditingId(null);
    setFontPickerOpen(false);
    setFxPanelOpen(false);
  }, []);

  const canType = heroResizeMode || heroEditMode;

  useEffect(() => {
    if (!canType) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') clearSelection();
    };
    if (typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onDown = (e) => {
        const t = e.target;
        if (t?.closest?.('[data-hero-keep="1"], [data-hero-keep="true"], [aria-modal="true"], [role="dialog"]')) return;
        clearSelection();
      };
      document.addEventListener('mousedown', onDown, true);
      return () => {
        window.removeEventListener('keydown', onKey);
        document.removeEventListener('mousedown', onDown, true);
      };
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [canType, clearSelection]);

  const textLayers = (id) => {
    const preview = fontPreviewId && id !== 'logo' ? fontPreviewId : null;
    const family = getHeroFontFamily(config, id, preview);
    const color = fonts?.[id];
    const layers = getHeroTextFxLayers(config, id, color);
    const fam = family ? { fontFamily: family } : null;
    return {
      front: [fam, layers.front],
      back: layers.back ? [fam, layers.back] : null,
      reflect: layers.reflect ? [fam, layers.reflect] : null,
    };
  };

  const renderHeroText = (id, value, placeholder, style, numberOfLines) => {
    const layers = textLayers(id);
    return (
    <EditableHeroText
      id={id}
      value={value}
      placeholder={placeholder}
      style={[style, layers.front]}
      backStyle={layers.back}
      reflectStyle={layers.reflect}
      numberOfLines={numberOfLines}
      canEdit={canType}
      editing={editingId === id}
      onSelect={() => selectItem(id)}
      onStartEdit={(nextId) => {
        setSelectedIds([nextId]);
        setEditingId(nextId);
        dragLock.current = true;
        emitScrollLock();
      }}
      onEndEdit={() => {
        setEditingId(null);
        dragLock.current = false;
        emitScrollLock();
      }}
      onChangeText={handleTextChange}
    />
    );
  };

  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const editingRef = useRef(editingId);
  editingRef.current = editingId;
  const configRef = useRef(config);
  configRef.current = config;
  const handleScaleRef = useRef(handleScale);
  handleScaleRef.current = handleScale;

  useEffect(() => {
    if (!wheelLocked || Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onWheel = (e) => {
      if (editingRef.current) return;
      const ids = selectedIdsRef.current || [];
      if (!ids.length) return;
      e.preventDefault();
      const dy = e.deltaY || 0;
      if (!dy) return;
      const delta = dy > 0 ? -6 : 6;
      ids.forEach((id) => {
        const current = getHeroItemScale(configRef.current, id);
        handleScaleRef.current(id, current + delta);
      });
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheel, { capture: true });
  }, [wheelLocked]);
  const theme = getCatalogoTheme(config);
  const rotulos = getCatalogoRotulos(config);
  const fonts = getCatalogoFontColors(config, theme);
  const tituloFallback = rotulos.tituloPadrao;

  const handleMove = useCallback((id, pos) => {
    onHeroPositionChange?.(id, clampHeroPosToSafe(pos, getHeroSafePadPercent(configRef.current, containerSize.w, containerSize.h)));
  }, [onHeroPositionChange, containerSize.w, containerSize.h]);

  const currentScale = (id) => getHeroItemScale(config, id);

  const nudge = (dx, dy) => {
    playTapSound();
    const next = nudgeHeroItems(config, selectedIds, dx, dy);
    Object.keys(next).forEach((id) => {
      if (next[id]) next[id] = clampHeroPosToSafe(next[id], safePad);
    });
    onHeroPositionChange?.('*', next);
  };

  const alignSelected = (side) => {
    playTapSound();
    if (hero.manual || heroEditMode) {
      onHeroPositionChange?.('*', alignHeroItems(config, selectedIds, side));
    } else {
      onHeroTextChange?.('heroAlinhamentoTexto', side);
    }
  };

  useLayoutEffect(() => {
    if (!canType) {
      publishHeroDock(null);
      return undefined;
    }
    publishHeroDock(
      <HeroMoveDock
        key="hero-dock"
        config={config}
        selectedId={selectedId}
        selectedIds={selectedIds}
        onNudge={nudge}
        onAlign={alignSelected}
        onScaleDelta={(d) => selectedIds.forEach((id) => handleScale(id, currentScale(id) + d))}
        onReset={() => {
          playTapSound();
          onHeroPositionChange?.('*', { ...DEFAULT_HERO_POSICOES });
          listHeroElementIds(config).forEach((id) => handleScale(id, 100));
        }}
        accent={theme.corPrincipal}
        compact
        showEditTools
        onEditText={(id) => {
          if (id === 'logo') return;
          setSelectedIds([id]);
          setEditingId(id);
        }}
        onFieldChange={handleFieldChange}
        onOpenFonts={() => setFontPickerOpen(true)}
        onPickLogo={onPickLogo}
        onOpenFx={() => setFxPanelOpen((v) => !v)}
        fxPanelOpen={fxPanelOpen}
        onAddTexto={() => {
          const prev = getHeroTextos(config);
          const next = addHeroTexto(config);
          if (next.length === prev.length) return;
          handleFieldChange('heroTextos', next);
          const created = next[next.length - 1];
          if (created?.id) {
            setSelectedIds([created.id]);
            setEditingId(created.id);
          }
        }}
      />
    );
    return undefined;
  }, [canType, config, selectedId, selectedIds, theme.corPrincipal, onPickLogo, fxPanelOpen]);

  useEffect(() => () => {
    publishHeroDock(null);
    publishHeroFx(null);
  }, []);

  useLayoutEffect(() => {
    if (!canType || !fxPanelOpen || !selectedIds.length) {
      publishHeroFx(null);
      return undefined;
    }
    publishHeroFx(
      <HeroFxPanel
        config={config}
        targetIds={selectedIds}
        primaryId={selectedIds[selectedIds.length - 1]}
        colors={uiColors}
        accent={theme.corPrincipal}
        onFieldChange={handleFieldChange}
        onClose={() => setFxPanelOpen(false)}
      />
    );
    return undefined;
  }, [canType, fxPanelOpen, selectedIds, config, uiColors, theme.corPrincipal]);

  const renderLogo = () => {
    if (!isHeroElementVisible(config, 'logo')) return null;
    const look = hero.logoLook || {};
    const objFx = getHeroObjectFx(config, 'logo');
    const phStyle = {
      width: look.size || hero.logoPx,
      height: look.size || hero.logoPx,
      justifyContent: 'center',
      alignItems: 'center',
    };
    const renderMedia = (key) => (logoCutUri ? (
      <Image
        key={key}
        source={{ uri: logoCutUri }}
        style={look.img}
        resizeMode={look.resizeMode || 'contain'}
      />
    ) : (
      <View key={key} style={[phStyle, { backgroundColor: look.placa ? undefined : 'transparent' }]}>
        <Ionicons name="storefront" size={Math.round((look.size || hero.logoPx) * 0.45)} color="#fff" />
      </View>
    ));
    return (
      <View style={[look.wrap, { overflow: 'visible', position: 'relative' }]}>
        {objFx.glow ? (
          <View pointerEvents="none" style={objFx.glow}>
            {renderMedia('glow')}
          </View>
        ) : null}
        <View style={[look.clip, !look.placa && { backgroundColor: 'transparent' }, objFx.front]}>
          {renderMedia('front')}
        </View>
        {objFx.reflect ? (
          <View pointerEvents="none" style={objFx.reflect}>{renderMedia('reflect')}</View>
        ) : null}
      </View>
    );
  };

  const renderManualLayer = () => {
    const { w, h } = containerSize;
    const wrap = (id, node) => {
      if (!isHeroElementVisible(config, id)) return null;
      return (
        <DraggableHeroItem
          key={id}
          id={id}
          pos={clampHeroPosToSafe(hero.posicoes[id], safePad)}
          containerW={w}
          containerH={h}
          editable={heroEditMode && editingId !== id}
          resizable={heroResizeMode}
          selected={selectedIds.includes(id)}
          scale={currentScale(id)}
          safePad={safePad}
          onSelect={(id, mode) => selectItem(id, mode)}
          onMove={handleMove}
          onScale={handleScale}
          onHoverLock={setHoverLock}
          onDragStart={() => { setGuiding(true); setDragLock(true); }}
          onDragEnd={() => { setGuiding(false); setDragLock(false); }}
        >
          {node}
        </DraggableHeroItem>
      );
    };

    return (
      <>
        {wrap('logo', renderLogo())}
        {wrap('nome', renderHeroText('nome', lojaNome, 'Nome da loja', [st.heroBrand, { fontSize: hero.nomePx, color: fonts.nome, textAlign: 'center', maxWidth: w * 0.85 }], 2))}
        {wrap('slogan', renderHeroText('slogan', config.slogan, 'Slogan', [st.heroSlogan, { fontSize: hero.sloganPx, color: fonts.slogan, textAlign: 'center', maxWidth: w * 0.9 }], 2))}
        {wrap('titulo', renderHeroText('titulo', config.titulo, tituloFallback, [st.heroTitle, { fontSize: hero.tituloPx, color: fonts.titulo, textAlign: 'center', maxWidth: w * 0.9 }], 3))}
        {wrap('subtitulo', renderHeroText('subtitulo', config.subtitulo, 'Subtítulo', [st.heroSub, { fontSize: hero.subtituloPx, color: fonts.subtitulo, textAlign: 'center', maxWidth: w * 0.9 }], 2))}
        {getHeroTextos(config).map((item) => wrap(
          item.id,
          renderHeroText(item.id, item.texto, 'Novo texto', [st.heroSub, { fontSize: getHeroExtraPx(config, item.id), color: fonts[item.id] || item.cor, textAlign: 'center', maxWidth: w * 0.9, fontWeight: '700' }], 3),
        ))}
      </>
    );
  };

  const renderFlexLayer = () => {
    const wrapFlex = (id, node) => {
      if (!isHeroElementVisible(config, id)) return null;
      if (!heroResizeMode) {
        const s = Math.max(0.15, currentScale(id) / 100);
        return (
          <View key={id} style={{ transform: [{ scale: s }], transformOrigin: 'center center' }}>
            {node}
          </View>
        );
      }
      const on = selectedIds.includes(id);
      return (
        <HeroWheelLock
          key={id}
          enabled
          scale={currentScale(id)}
          onScale={(v) => handleScale(id, v)}
          onSelect={() => selectItem(id)}
          onHoverLock={setHoverLock}
          dataSet={{ heroKeep: '1' }}
          style={st.flexSizeWrap}
          // web
        >
          {on ? <View pointerEvents="none" style={st.selectRing} /> : null}
          <Pressable onPress={() => selectItem(id)} style={[st.absItemHit, { cursor: 'move' }]}>{node}</Pressable>
          {on ? (
            <ResizeHandle
              scale={currentScale(id)}
              onScale={(v) => handleScale(id, v)}
              onDragStart={() => { selectItem(id); setGuiding(true); setDragLock(true); }}
              onDragEnd={() => { setGuiding(false); setDragLock(false); }}
            />
          ) : null}
        </HeroWheelLock>
      );
    };
    return (
    <View style={[
      st.heroContent,
      {
        alignItems: hero.isRow ? 'center' : hero.contentAlign,
        flexDirection: hero.isRow ? 'row' : 'column',
        gap: hero.isRow ? 16 : (hero.landing ? 8 : 0),
        paddingVertical: (hero.landing ? 48 : 24) + (hero.frame?.padY || 0),
        paddingHorizontal: (hero.landing ? 28 : 24) + (hero.frame?.padX || 0),
      },
    ]}>
      {wrapFlex('logo', (
        <View style={{ marginBottom: hero.isRow ? 0 : (hero.landing ? 16 : 10) }}>{renderLogo()}</View>
      ))}
      <View style={{
        flex: hero.isRow ? 1 : undefined,
        alignItems: hero.flexAlign,
        alignSelf: hero.isRow ? undefined : (hero.disposicao === 'centro' ? 'stretch' : undefined),
        width: hero.isRow ? undefined : '100%',
        gap: hero.landing ? 8 : 4,
      }}>
        {wrapFlex('nome', renderHeroText('nome', lojaNome, 'Nome da loja', [st.heroBrand, { fontSize: hero.nomePx, color: fonts.nome, textAlign: hero.textAlign }], 2))}
        {wrapFlex('slogan', renderHeroText('slogan', config.slogan, 'Slogan', [st.heroSlogan, { fontSize: hero.sloganPx, color: fonts.slogan, textAlign: hero.textAlign }], 2))}
        {wrapFlex('titulo', renderHeroText('titulo', config.titulo, tituloFallback, [st.heroTitle, { textAlign: hero.textAlign, color: fonts.titulo, fontSize: hero.tituloPx }], 3))}
        {wrapFlex('subtitulo', renderHeroText('subtitulo', config.subtitulo, 'Subtítulo', [st.heroSub, { fontSize: hero.subtituloPx, color: fonts.subtitulo, textAlign: hero.textAlign }], 2))}
        {getHeroTextos(config).map((item) => wrapFlex(
          item.id,
          renderHeroText(item.id, item.texto, 'Novo texto', [st.heroSub, { fontSize: getHeroExtraPx(config, item.id), color: fonts[item.id] || item.cor, textAlign: hero.textAlign, fontWeight: '700' }], 3),
        ))}
      </View>
    </View>
    );
  };

  return (
    <View>
      <View
        style={[hero.frame?.wrap, hero.frame?.shadow, { position: 'relative', overflow: 'visible' }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== containerSize.w || height !== containerSize.h) {
            setContainerSize({ w: width, h: height });
          }
        }}
      >
      <CatalogoGradientFill
        cores={theme.usarGradiente ? theme.cores : [theme.corPrincipal, theme.corPrincipal]}
        stops={theme.usarGradiente ? theme.stops : undefined}
        look={theme.look || { forma: 'linear', angulo: 135, inverter: false }}
        style={[st.hero, hero.frame?.banner, {
          minHeight: hero.minHeight,
          justifyContent: hero.landing ? 'center' : 'flex-end',
          overflow: 'visible',
        }]}
      >
        {heroBg && (
          <Image source={heroBg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        )}
        <View style={[st.heroOverlay, heroBg && { backgroundColor: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }]} />
        {canType ? (
          <Pressable style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]} onPress={clearSelection} />
        ) : null}
        {guiding ? (
          <>
            <View style={[st.guideV, { left: '50%' }]} />
            <View style={[st.guideH, { top: '50%' }]} />
          </>
        ) : null}
        {canType && safePad.active ? (
          <View pointerEvents="none" style={[st.safeZone, {
            left: `${safePad.x}%`,
            right: `${safePad.x}%`,
            top: `${safePad.top ?? safePad.y}%`,
            bottom: `${safePad.bottom ?? safePad.y}%`,
          }]}
          >
            <Text style={st.safeZoneLabel}>Área segura</Text>
          </View>
        ) : null}
        {hero.manual || heroEditMode ? (
          <View style={[st.manualLayer, { pointerEvents: 'box-none' }]}>{renderManualLayer()}</View>
        ) : (
          renderFlexLayer()
        )}
      </CatalogoGradientFill>
      </View>
      <CatalogoFontPicker
        compact
        live
        visible={fontPickerOpen && canType && selectedIds.some((id) => id !== 'logo')}
        title={selectedIds.filter((id) => id !== 'logo').length > 1 ? 'Fonte · selecionados' : `Fonte · ${ELEMENT_LABELS[selectedId] || (isHeroExtraTextId(selectedId) ? 'Texto' : '')}`}
        value={isHeroExtraTextId(selectedId)
          ? (getHeroTextos(config).find((t) => t.id === selectedId)?.fonte || 'system')
          : config?.[HERO_FONT_KEYS[selectedId]]}
        config={config}
        ownerUserId={ownerUserId}
        onPreview={setFontPreviewId}
        onSelect={(fontId) => {
          setFontPreviewId(null);
          let textos = getHeroTextos(config);
          let extraDirty = false;
          selectedIds.forEach((id) => {
            const key = HERO_FONT_KEYS[id];
            if (key) handleFieldChange(key, fontId);
            else if (isHeroExtraTextId(id)) {
              textos = textos.map((t) => (t.id === id ? { ...t, fonte: fontId } : t));
              extraDirty = true;
            }
          });
          if (extraDirty) handleFieldChange('heroTextos', textos);
        }}
        onFontsChange={(patch) => {
          Object.entries(patch || {}).forEach(([key, val]) => handleFieldChange(key, val));
        }}
        onClose={() => {
          setFontPreviewId(null);
          setFontPickerOpen(false);
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  hero: { minHeight: 200, justifyContent: 'flex-end', overflow: 'visible' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, pointerEvents: 'none' },
  heroContent: { padding: 24, zIndex: 1, width: '100%' },
  manualLayer: { ...StyleSheet.absoluteFillObject, zIndex: 6, overflow: 'visible' },
  guideV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 1 },
  guideH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 1 },
  safeZone: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    zIndex: 2,
  },
  safeZoneLabel: {
    position: 'absolute',
    top: 4,
    left: 8,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.3,
  },
  absItem: { position: 'absolute', zIndex: 3, maxWidth: '92%', overflow: 'visible' },
  absItemHit: { zIndex: 1 },
  selectRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  flexSizeWrap: { position: 'relative', alignSelf: 'flex-start', overflow: 'visible' },
  resizeHandle: {
    position: 'absolute',
    right: -7,
    bottom: -7,
    width: 18,
    height: 18,
    minWidth: 18,
    paddingHorizontal: 0,
    borderRadius: 4,
    backgroundColor: '#0ea5e9',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    cursor: 'nwse-resize',
    shadowColor: '#22d3ee',
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  heroBrand: { fontSize: 32, fontWeight: '800', color: '#fff', opacity: 0.95, letterSpacing: 0.3 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 4 },
  heroSub: { fontSize: 14, color: '#fff', opacity: 0.92, marginTop: 6 },
  heroSlogan: { fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 8, fontStyle: 'italic' },
  heroTextMove: { cursor: 'move', userSelect: 'none' },
  heroTextHit: { cursor: 'move' },
  heroTextStack: { position: 'relative', overflow: 'visible' },
  heroTextFxBack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
    overflow: 'visible',
  },
  heroTextFxReflect: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    zIndex: 0,
    overflow: 'visible',
  },
  heroTextFxFront: {
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  heroInlineInput: {
    padding: 0,
    margin: 0,
    minWidth: 120,
    zIndex: 50,
    outlineStyle: 'none',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    cursor: 'text',
  },
  tbBtn: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tbBtnOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tbBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', maxWidth: 110 },
  dockBar: {
    zIndex: 8,
    marginBottom: 0,
  },
  dockPro: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    overflow: 'visible',
    zIndex: 24,
  },
  dockProRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
    overflow: 'visible',
  },
  dockSlot: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    zIndex: 2,
  },
  dockFlyCol: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 80,
  },
  dockFlyInner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    overflow: 'hidden',
  },
  dockBtn: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dockBtnFill: {
    flex: 0,
    width: '100%',
    minWidth: 0,
  },
  dockBtnLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.1, maxWidth: '100%', textAlign: 'center' },
  dockSep: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 4 },
  dockAddRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6 },
  dockAddChip: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockAddText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fxPanel: {
    position: 'absolute',
    minWidth: 248,
    maxWidth: 360,
    zIndex: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
    cursor: 'default',
    overflow: 'hidden',
  },
  fxFloatHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    pointerEvents: 'box-none',
  },
  fxDragBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    cursor: 'grab',
  },
  fxGrip: { flexDirection: 'row', gap: 2 },
  fxGripDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#94a3b8' },
  fxDragText: { color: '#e2e8f0', fontSize: 9, fontWeight: '800', letterSpacing: 1.1, flex: 1 },
  fxCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxPanelScroll: { maxHeight: 340 },
  fxPanelBody: { padding: 8, gap: 6, width: '100%' },
  fxPanelTitle: { color: '#e0f2fe', fontSize: 12, fontWeight: '800', letterSpacing: 0.4, marginBottom: 0 },
  fxSecTitle: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  fxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 6,
    width: '100%',
  },
  fxGrow: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '30%',
    minWidth: 72,
  },
  fxChip: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '30%',
    minWidth: 72,
    minHeight: 36,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fxChipFill: {
    width: '100%',
    minHeight: 36,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fxChipWide: { flexBasis: '46%' },
  fxChipGhost: { flexGrow: 1, flexBasis: '30%', minWidth: 72, minHeight: 36, opacity: 0 },
  fxChipOn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  fxChipText: { color: '#e2e8f0', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  fxChipTextOn: { color: '#fff' },
  fxMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fxMini: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  fxStepBar: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '46%',
    minWidth: 120,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fxStepLabel: { color: '#cbd5e1', fontSize: 8, fontWeight: '800', flex: 1, textTransform: 'uppercase' },
  fxStepVal: { color: '#fff', fontSize: 11, fontWeight: '800', minWidth: 14, textAlign: 'center' },
  fxMeter: {
    width: 74,
    minHeight: 34,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxMeterFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  fxMeterText: { color: '#fff', fontSize: 13, fontWeight: '800', zIndex: 1 },
  fxDual: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 6, width: '100%' },
  fxDualCol: { flexGrow: 1, flexShrink: 1, flexBasis: '46%', minWidth: 120, gap: 4 },
  fxPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: '100%',
  },
  fxPadCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '30%',
    minWidth: 28,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fxPadCellOn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  tbScale: { color: '#fff', fontSize: 12, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  fontModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  fontSheet: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxHeight: '80%',
  },
  fontTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  fontGroup: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  fontRow: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 4 },
  fontRowOn: { backgroundColor: 'rgba(37,99,235,0.35)' },
  fontSample: { color: '#fff', fontSize: 18 },
  dock: { padding: 10, gap: 8, borderTopWidth: 1 },
  dockHint: { fontSize: 11, fontWeight: '600' },
  dockCompact: { borderTopWidth: 0 },
  dockChips: { gap: 8, paddingBottom: 2 },
  dockChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  dockPad: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  padMid: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  padBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  padReset: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 36, borderRadius: 10, borderWidth: 1, marginLeft: 4 },
});
