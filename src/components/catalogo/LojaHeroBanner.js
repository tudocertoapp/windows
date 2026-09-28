import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { isHeroElementVisible, getCatalogoTheme, getCatalogoRotulos, getCatalogoFontColors, HERO_ELEMENTOS, HERO_SCALE_KEYS, clampHeroScale, nudgeHeroItems, alignHeroItems, DEFAULT_HERO_POSICOES } from '../../utils/catalogoStore';
import {
  HERO_COLOR_KEYS,
  HERO_FONT_KEYS,
  getHeroFontFamily,
  getCatalogoFonte,
  ensureCatalogoGoogleFonts,
} from '../../utils/catalogoFonts';
import { playTapSound } from '../../utils/sounds';
import { CatalogoColorBrush } from './CatalogoColorBrush';
import { CatalogoFontPicker } from './CatalogoFontPicker';

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

function EditableHeroText({
  id,
  value,
  placeholder,
  style,
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

  const onPress = () => {
    if (!canEdit) return;
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => onSelect?.(id)}
      style={canEdit ? st.heroTextHit : undefined}
    >
      <Text
        style={[style, canEdit && st.heroTextEditable]}
        numberOfLines={numberOfLines}
        onDoubleClick={canEdit ? startEdit : undefined}
      >
        {value || placeholder}
      </Text>
    </Pressable>
  );
}

function getDomNode(refVal) {
  if (!refVal) return null;
  if (typeof refVal.addEventListener === 'function') return refVal;
  const node = refVal._nativeNode || refVal._node || refVal.childNodes?.[0];
  return typeof node?.addEventListener === 'function' ? node : null;
}

function HeroWheelLock({ enabled, scale, onScale, onHoverLock, onSelect, style, onLayout, panHandlers, children }) {
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
      {...(panHandlers || {})}
      onLayout={onLayout}
      style={style}
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
      accessibilityLabel="Redimensionar"
    >
      <View style={st.resizeGrip} />
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
      const x = dragOrigin.current.x + g.dx;
      const y = dragOrigin.current.y + g.dy;
      let nx = box.w ? (x / box.w) * 100 : 50;
      let ny = box.h ? (y / box.h) * 100 : 50;
      if (Math.abs(nx - 50) < 3) nx = 50;
      if (Math.abs(ny - 50) < 3) ny = 50;
      nx = Math.min(96, Math.max(4, nx));
      ny = Math.min(96, Math.max(4, ny));
      setDragPx(null);
      cb.current.onMove?.(cb.current.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 });
      cb.current.onDragEnd?.();
    },
    onPanResponderTerminate: () => {
      setDragPx(null);
      cb.current.onDragEnd?.();
    },
  })).current;

  if (!containerW || !containerH) return null;

  const centerX = dragPx ? dragOrigin.current.x + dragPx.dx : (pos.x / 100) * containerW;
  const centerY = dragPx ? dragOrigin.current.y + dragPx.dy : (pos.y / 100) * containerH;
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
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!dragPx && (width !== size.w || height !== size.h)) setSize({ w: width, h: height });
      }}
      style={[
        st.absItem,
        { left, top, zIndex: selected || dragPx ? 20 : 3, cursor: editable ? 'grab' : undefined },
        selected && st.absItemEdit,
        selected && st.absItemSelected,
      ]}
    >
      {selected ? (
        <View style={[st.dragTag, st.dragTagOn]}>
          <Ionicons name="move" size={11} color="#fff" />
          <Text style={st.dragTagText}>{ELEMENT_LABELS[id]} {Math.round(scale)}%</Text>
        </View>
      ) : null}
      <Pressable onPress={() => onSelect?.(id)}>
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

export function HeroMoveDock({
  config,
  selectedId,
  selectedIds,
  onSelect,
  onToggleSelect,
  onSelectAll,
  onNudge,
  onCenter,
  onAlign,
  onReset,
  onScaleDelta,
  colors,
  accent,
  compact = false,
  showEditTools = false,
  onEditText,
  onFieldChange,
  onOpenFonts,
}) {
  const ids = selectedIds?.length ? selectedIds : (selectedId ? [selectedId] : []);
  const primaryId = ids[ids.length - 1] || selectedId;
  const elementos = HERO_ELEMENTOS.filter((el) => isHeroElementVisible(config, el.id) || ids.includes(el.id));
  const textIds = ids.filter((id) => id !== 'logo');
  const isLogoOnly = textIds.length === 0;
  const colorKey = HERO_COLOR_KEYS[primaryId];
  const font = getCatalogoFonte(config?.[HERO_FONT_KEYS[primaryId]]);
  const iconColor = compact ? '#fff' : accent;
  const handleChip = (id) => {
    playTapSound();
    if (onToggleSelect) onToggleSelect(id);
    else onSelect?.(id);
  };
  const applyColor = (c) => {
    textIds.forEach((id) => {
      const key = HERO_COLOR_KEYS[id];
      if (key) onFieldChange?.(key, c);
    });
  };
  return (
    <View style={[st.dock, compact && st.dockCompact, { backgroundColor: colors?.card || '#fff', borderColor: colors?.border || '#e2e8f0' }]}>
      {onToggleSelect ? (
        <Text style={[st.dockHint, { color: compact ? 'rgba(255,255,255,0.65)' : (colors?.textSecondary || '#64748b') }]}>
          Toque nos itens para marcar vários
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.dockChips}>
        {onSelectAll ? (
          <TouchableOpacity
            onPress={() => { playTapSound(); onSelectAll(); }}
            style={[st.dockChip, { borderColor: colors?.border || '#e2e8f0' }]}
          >
            <Ionicons name="checkbox-outline" size={14} color={colors?.text || '#fff'} />
            <Text style={{ color: colors?.text || '#fff', fontSize: 12, fontWeight: '700' }}>Todos</Text>
          </TouchableOpacity>
        ) : null}
        {elementos.map((el) => {
          const on = ids.includes(el.id);
          return (
            <TouchableOpacity
              key={el.id}
              onPress={() => handleChip(el.id)}
              style={[st.dockChip, { borderColor: on ? accent : (colors?.border || '#e2e8f0'), backgroundColor: on ? accent : 'transparent' }]}
            >
              <Ionicons name={el.icon} size={14} color={on ? '#fff' : (colors?.text || '#0f172a')} />
              <Text style={{ color: on ? '#fff' : (colors?.text || '#0f172a'), fontSize: 12, fontWeight: '700' }}>{el.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={st.dockPad}>
        {[
          { id: 'esquerda', icon: 'arrow-back-outline', label: 'Esquerda' },
          { id: 'centro', icon: 'scan-outline', label: 'Centro' },
          { id: 'direita', icon: 'arrow-forward-outline', label: 'Direita' },
        ].map((al) => (
          <TouchableOpacity
            key={al.id}
            style={[st.padReset, { borderColor: colors?.border }]}
            onPress={() => {
              playTapSound();
              if (onAlign) onAlign(al.id);
              else if (al.id === 'centro') onCenter?.();
            }}
          >
            <Ionicons name={al.icon} size={16} color={iconColor} />
            <Text style={{ color: iconColor, fontWeight: '700', fontSize: 12 }}>{al.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {showEditTools && !isLogoOnly ? (
        <View style={st.dockPad}>
          {colorKey ? (
            <CatalogoColorBrush
              toolbar
              value={config?.[colorKey] || '#ffffff'}
              onChange={applyColor}
              colors={{ card: '#0f172a', border: '#334155', text: '#fff', textSecondary: '#94a3b8', bg: '#1e293b' }}
              accent="#2563eb"
            />
          ) : null}
          {textIds.length === 1 ? (
            <HeroToolbarBtn icon="pencil" label="Editar" onPress={() => onEditText?.(textIds[0])} />
          ) : null}
          <HeroToolbarBtn
            icon="text"
            label={font?.family ? font.label : 'Fonte'}
            onPress={onOpenFonts}
          />
        </View>
      ) : null}
      <View style={st.dockPad}>
        <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(0, -4)}>
          <Ionicons name="chevron-up" size={18} color={iconColor} />
        </TouchableOpacity>
        <View style={st.padMid}>
          <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(-4, 0)}>
            <Ionicons name="chevron-back" size={18} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(4, 0)}>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(0, 4)}>
          <Ionicons name="chevron-down" size={18} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onScaleDelta?.(-8)}>
          <Ionicons name="remove" size={18} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onScaleDelta?.(8)}>
          <Ionicons name="add" size={18} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.padReset, { borderColor: colors?.border }]} onPress={onReset}>
          <Ionicons name="refresh-outline" size={16} color={iconColor} />
          <Text style={{ color: iconColor, fontWeight: '700', fontSize: 12 }}>Resetar</Text>
        </TouchableOpacity>
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
}) {
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [wheelLocked, setWheelLocked] = useState(false);
  const hoverLockCount = useRef(0);
  const dragLock = useRef(false);
  const additiveRef = useRef(false);
  const selectedId = selectedIds[selectedIds.length - 1] || '';
  const hasSelection = selectedIds.length > 0;

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
    const key = HERO_TEXT_KEYS[id];
    if (!key) return;
    onHeroTextChange?.(key, text);
  }, [onHeroTextChange]);

  const handleFieldChange = useCallback((key, value) => {
    if (!key) return;
    onHeroTextChange?.(key, value);
  }, [onHeroTextChange]);

  useEffect(() => {
    ensureCatalogoGoogleFonts();
  }, []);

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
    setSelectedIds(HERO_ELEMENTOS.filter((el) => isHeroElementVisible(config, el.id)).map((el) => el.id));
  }, [config]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setEditingId(null);
    setFontPickerOpen(false);
  }, []);

  const canType = heroResizeMode || heroEditMode;

  useEffect(() => {
    if (!canType || Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canType, clearSelection]);

  const textStyleExtra = (id) => {
    const family = getHeroFontFamily(config, id);
    return family ? { fontFamily: family } : null;
  };

  const renderHeroText = (id, value, placeholder, style, numberOfLines) => (
    <EditableHeroText
      id={id}
      value={value}
      placeholder={placeholder}
      style={[style, textStyleExtra(id)]}
      numberOfLines={numberOfLines}
      canEdit={canType}
      editing={editingId === id}
      onSelect={() => selectItem(id)}
      onStartEdit={(nextId) => {
        setSelectedIds([nextId]);
        setEditingId(nextId);
      }}
      onEndEdit={() => setEditingId(null)}
      onChangeText={handleTextChange}
    />
  );

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
        const key = HERO_SCALE_KEYS[id];
        const n = Number(configRef.current?.[key]);
        const current = Number.isFinite(n) ? n : 100;
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
    onHeroPositionChange?.(id, pos);
  }, [onHeroPositionChange]);

  const currentScale = (id) => {
    const key = HERO_SCALE_KEYS[id];
    const n = Number(config?.[key]);
    return Number.isFinite(n) ? n : 100;
  };

  const nudge = (dx, dy) => {
    playTapSound();
    onHeroPositionChange?.('*', nudgeHeroItems(config, selectedIds, dx, dy));
  };

  const alignSelected = (side) => {
    playTapSound();
    if (hero.manual) {
      onHeroPositionChange?.('*', alignHeroItems(config, selectedIds, side));
    } else {
      onHeroTextChange?.('heroAlinhamentoTexto', side);
    }
  };

  const renderLogo = () => {
    if (!isHeroElementVisible(config, 'logo')) return null;
    const phStyle = {
      width: hero.logoPx,
      height: hero.logoPx,
      borderRadius: hero.logoStyle.borderRadius,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    };
    if (logoUri) {
      return (
        <Image
          source={{ uri: logoUri }}
          style={hero.logoStyle}
          resizeMode={hero.logoResizeMode}
        />
      );
    }
    return (
      <View style={phStyle}>
        <Ionicons name="storefront" size={Math.round(hero.logoPx * 0.45)} color="#fff" />
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
          pos={hero.posicoes[id]}
          containerW={w}
          containerH={h}
          editable={heroEditMode && editingId !== id}
          resizable={heroResizeMode}
          selected={selectedIds.includes(id)}
          scale={currentScale(id)}
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
        {wrap('titulo', renderHeroText('titulo', config.titulo, tituloFallback, [st.heroTitle, { fontSize: hero.tituloPx, color: fonts.titulo, textAlign: 'center', maxWidth: w * 0.9 }], 3))}
        {wrap('subtitulo', renderHeroText('subtitulo', config.subtitulo, 'Subtítulo', [st.heroSub, { fontSize: hero.subtituloPx, color: fonts.subtitulo, textAlign: 'center', maxWidth: w * 0.9 }], 2))}
        {wrap('slogan', renderHeroText('slogan', config.slogan, 'Slogan', [st.heroSlogan, { fontSize: hero.sloganPx, color: fonts.slogan, textAlign: 'center', maxWidth: w * 0.9 }], 2))}
      </>
    );
  };

  const renderFlexLayer = () => {
    const wrapFlex = (id, node) => {
      if (!isHeroElementVisible(config, id)) return null;
      if (!heroResizeMode) return node;
      const on = selectedIds.includes(id);
      return (
        <HeroWheelLock
          key={id}
          enabled
          scale={currentScale(id)}
          onScale={(v) => handleScale(id, v)}
          onSelect={() => selectItem(id)}
          onHoverLock={setHoverLock}
          style={[st.flexSizeWrap, on && st.absItemSelected]}
        >
          <Pressable onPress={() => selectItem(id)}>{node}</Pressable>
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
        gap: hero.isRow ? 16 : 0,
      },
    ]}>
      {wrapFlex('logo', (
        <View style={{ marginBottom: hero.isRow ? 0 : 10 }}>{renderLogo()}</View>
      ))}
      <View style={{
        flex: hero.isRow ? 1 : undefined,
        alignItems: hero.flexAlign,
        alignSelf: hero.isRow ? undefined : (hero.disposicao === 'centro' ? 'stretch' : undefined),
        width: hero.isRow ? undefined : '100%',
        gap: 4,
      }}>
        {wrapFlex('nome', renderHeroText('nome', lojaNome, 'Nome da loja', [st.heroBrand, { fontSize: hero.nomePx, color: fonts.nome, textAlign: hero.textAlign }], 2))}
        {wrapFlex('titulo', renderHeroText('titulo', config.titulo, tituloFallback, [st.heroTitle, { textAlign: hero.textAlign, color: fonts.titulo, fontSize: hero.tituloPx }], 3))}
        {wrapFlex('subtitulo', renderHeroText('subtitulo', config.subtitulo, 'Subtítulo', [st.heroSub, { fontSize: hero.subtituloPx, color: fonts.subtitulo, textAlign: hero.textAlign }], 2))}
        {wrapFlex('slogan', renderHeroText('slogan', config.slogan, 'Slogan', [st.heroSlogan, { fontSize: hero.sloganPx, color: fonts.slogan, textAlign: hero.textAlign }], 2))}
      </View>
    </View>
    );
  };

  return (
    <View>
      <View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== containerSize.w || height !== containerSize.h) {
            setContainerSize({ w: width, h: height });
          }
        }}
      >
      <LinearGradient
        colors={theme.heroColors.length >= 2 ? theme.heroColors : [theme.corPrincipal, theme.corPrincipal]}
        start={theme.start}
        end={theme.end}
        style={[st.hero, { minHeight: hero.minHeight, overflow: 'visible' }]}
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
        {hero.manual ? (
          <View style={[st.manualLayer, { pointerEvents: 'box-none' }]}>{renderManualLayer()}</View>
        ) : (
          renderFlexLayer()
        )}
      </LinearGradient>
      </View>
      <CatalogoFontPicker
        compact
        live
        visible={fontPickerOpen && canType && selectedIds.some((id) => id !== 'logo')}
        title={selectedIds.filter((id) => id !== 'logo').length > 1 ? 'Fonte · selecionados' : `Fonte · ${ELEMENT_LABELS[selectedId] || ''}`}
        value={config?.[HERO_FONT_KEYS[selectedId]]}
        onSelect={(fontId) => {
          selectedIds.forEach((id) => {
            const key = HERO_FONT_KEYS[id];
            if (key) handleFieldChange(key, fontId);
          });
        }}
        onClose={() => setFontPickerOpen(false)}
      />
      {canType && hasSelection ? (
        <HeroMoveDock
          config={config}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAllVisible}
          onNudge={nudge}
          onAlign={alignSelected}
          onScaleDelta={(d) => selectedIds.forEach((id) => handleScale(id, currentScale(id) + d))}
          onReset={() => {
            playTapSound();
            onHeroPositionChange?.('*', { ...DEFAULT_HERO_POSICOES });
            Object.keys(HERO_SCALE_KEYS).forEach((id) => handleScale(id, 100));
          }}
          colors={{ card: 'rgba(15,23,42,0.92)', border: 'rgba(255,255,255,0.14)', text: '#fff' }}
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
        />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { minHeight: 200, justifyContent: 'flex-end', overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, pointerEvents: 'none' },
  heroContent: { padding: 24, zIndex: 1, width: '100%' },
  manualLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  guideV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 1 },
  guideH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 1 },
  absItem: { position: 'absolute', zIndex: 3, maxWidth: '92%', overflow: 'visible' },
  absItemEdit: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    cursor: 'grab',
  },
  absItemSelected: {
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dragTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  dragTagOn: { backgroundColor: 'rgba(37,99,235,0.9)' },
  dragTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  resizeHandle: {
    position: 'absolute',
    right: -7,
    bottom: -7,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    cursor: 'nwse-resize',
  },
  resizeGrip: { width: 6, height: 6, borderRadius: 1, backgroundColor: '#2563eb' },
  flexSizeWrap: { position: 'relative', alignSelf: 'flex-start', paddingRight: 8, paddingBottom: 8 },
  heroBrand: { fontSize: 32, fontWeight: '800', color: '#fff', opacity: 0.95, letterSpacing: 0.3 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 4 },
  heroSub: { fontSize: 14, color: '#fff', opacity: 0.92, marginTop: 6 },
  heroSlogan: { fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 8, fontStyle: 'italic' },
  heroTextEditable: { cursor: 'text' },
  heroTextHit: { cursor: 'pointer' },
  heroInlineInput: {
    padding: 0,
    margin: 0,
    minWidth: 120,
    outlineStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
