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

export function HeroDockHost({ style }) {
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
      style={[{ minHeight: 46 }, style]}
    >
      {heroDockNode}
    </View>
  );
}

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

  return (
    <Pressable
      onPress={onPress}
      style={canEdit ? st.heroTextHit : undefined}
    >
      <Text
        style={[style, canEdit && st.heroTextMove]}
        numberOfLines={numberOfLines}
        onDoubleClick={canEdit ? (ev) => { ev?.stopPropagation?.(); startEdit(); } : undefined}
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
      dataSet={{ heroKeep: '1' }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!dragPx && (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5)) {
          setSize({ w: width, h: height });
        }
      }}
      style={[
        st.absItem,
        { left, top, zIndex: selected || dragPx ? 20 : 3, cursor: editable ? (dragPx ? 'grabbing' : 'move') : undefined },
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

function DockBtn({ icon, label, onPress, ink, icoBg, active, danger }) {
  return (
    <TouchableOpacity
      onPress={() => { playTapSound(); onPress?.(); }}
      style={[st.dockBtn, { backgroundColor: active ? '#2563eb' : icoBg }]}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={14} color={danger ? '#ef4444' : (active ? '#fff' : ink)} />
      {label ? (
        <Text style={[st.dockBtnLabel, { color: danger ? '#ef4444' : (active ? '#fff' : ink) }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
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
}) {
  const [addOpen, setAddOpen] = useState(false);
  const themeColors = useTheme()?.colors;
  const palette = colors || themeColors || {};
  const ids = selectedIds?.length ? selectedIds : (selectedId ? [selectedId] : []);
  const primaryId = ids[ids.length - 1] || selectedId;
  const textIds = ids.filter((id) => id !== 'logo');
  const isLogoOnly = textIds.length === 0;
  const colorKey = HERO_COLOR_KEYS[primaryId];
  const canRemove = !!primaryId;
  const extras = [
    { id: 'nome', label: 'Nome', on: config?.usaNomeProfissional === true, key: 'usaNomeProfissional' },
    { id: 'slogan', label: 'Slogan', on: config?.mostrarSlogan === true, key: 'mostrarSlogan' },
    { id: 'titulo', label: 'Título', on: config?.mostrarTitulo === true, key: 'mostrarTitulo' },
    { id: 'subtitulo', label: 'Subtítulo', on: config?.mostrarSubtitulo === true, key: 'mostrarSubtitulo' },
    { id: 'logo', label: 'Logo', on: config?.usaLogo !== false, key: 'usaLogo' },
  ].filter((x) => !x.on);

  const applyColor = (c) => {
    textIds.forEach((id) => {
      const key = HERO_COLOR_KEYS[id];
      if (key) onFieldChange?.(key, c);
    });
  };

  const hideSelected = () => {
    if (primaryId === 'subtitulo') onFieldChange?.('mostrarSubtitulo', false);
    if (primaryId === 'titulo') onFieldChange?.('mostrarTitulo', false);
    if (primaryId === 'nome') onFieldChange?.('usaNomeProfissional', false);
    if (primaryId === 'slogan') onFieldChange?.('mostrarSlogan', false);
    if (primaryId === 'logo') onFieldChange?.('usaLogo', false);
  };

  const ink = palette.text || '#fff';
  const icoBg = palette.bg || palette.primaryRgba?.(0.12) || 'rgba(148,163,184,0.18)';

  return (
    <View style={[st.dockPro, { backgroundColor: palette.card || 'transparent', borderColor: palette.border || 'transparent' }]} dataSet={{ heroKeep: '1' }}>
      <View style={st.dockProRow}>
        {[
          { id: 'esquerda', icon: 'arrow-back-outline', label: 'Esquerda' },
          { id: 'centro', icon: 'scan-outline', label: 'Centro' },
          { id: 'direita', icon: 'arrow-forward-outline', label: 'Direita' },
        ].map((al) => (
          <DockBtn key={al.id} icon={al.icon} label={al.label} ink={ink} icoBg={icoBg} onPress={() => onAlign?.(al.id)} />
        ))}
        <View style={[st.dockSep, { backgroundColor: palette.border || 'rgba(148,163,184,0.35)' }]} />
        {primaryId === 'logo' && onPickLogo ? (
          <DockBtn
            icon="image-outline"
            label="Trocar logo"
            ink={ink}
            icoBg={icoBg}
            onPress={onPickLogo}
          />
        ) : null}
        {!isLogoOnly && colorKey ? (
          <CatalogoColorBrush
            toolbar
            caption="Cor"
            value={config?.[colorKey] || '#ffffff'}
            onChange={applyColor}
            colors={palette}
            accent={accent || palette.primary || '#2563eb'}
          />
        ) : null}
        {isLogoOnly && primaryId === 'logo' ? (
          <CatalogoColorBrush
            toolbar
            caption="Cor"
            value={config?.logoCor || config?.logoPlacaCor || '#ffffff'}
            onChange={(c) => onFieldChange?.('logoCor', c)}
            colors={palette}
            accent={accent || palette.primary || '#2563eb'}
          />
        ) : null}
        {isLogoOnly && primaryId === 'logo' ? (
          <DockBtn
            icon={config?.logoPlaca ? 'color-fill' : 'color-fill-outline'}
            label="Fundo"
            active={!!config?.logoPlaca}
            ink={ink}
            icoBg={icoBg}
            onPress={() => onFieldChange?.('logoPlaca', !config?.logoPlaca)}
          />
        ) : null}
        {isLogoOnly && primaryId === 'logo' ? (
          <DockBtn
            icon="cut-outline"
            label="Transparente"
            active={config?.logoFundoImg && config.logoFundoImg !== 'manter'}
            ink={ink}
            icoBg={icoBg}
            onPress={() => {
              const on = config?.logoFundoImg && config.logoFundoImg !== 'manter';
              if (on) {
                onFieldChange?.('logoFundoImg', 'manter');
              } else {
                onFieldChange?.('logoFundoImg', 'sem-branco');
                onFieldChange?.('logoPlaca', false);
                onFieldChange?.('logoMoldura', 'nenhuma');
              }
            }}
          />
        ) : null}
        {isLogoOnly && primaryId === 'logo' ? (
          <DockBtn
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
        ) : null}
        {textIds.length === 1 ? (
          <DockBtn icon="pencil" label="Editar" ink={ink} icoBg={icoBg} onPress={() => onEditText?.(textIds[0])} />
        ) : null}
        {!isLogoOnly ? (
          <DockBtn icon="text" label="Fonte" ink={ink} icoBg={icoBg} onPress={() => onOpenFonts?.()} />
        ) : null}
        <View style={[st.dockSep, { backgroundColor: palette.border || 'rgba(148,163,184,0.35)' }]} />
        <DockBtn icon="chevron-up" label="Cima" ink={ink} icoBg={icoBg} onPress={() => onNudge?.(0, -4)} />
        <DockBtn icon="chevron-back" label="Esq." ink={ink} icoBg={icoBg} onPress={() => onNudge?.(-4, 0)} />
        <DockBtn icon="chevron-forward" label="Dir." ink={ink} icoBg={icoBg} onPress={() => onNudge?.(4, 0)} />
        <DockBtn icon="chevron-down" label="Baixo" ink={ink} icoBg={icoBg} onPress={() => onNudge?.(0, 4)} />
        <DockBtn icon="remove" label="Menor" ink={ink} icoBg={icoBg} onPress={() => onScaleDelta?.(-8)} />
        <DockBtn icon="add" label="Maior" ink={ink} icoBg={icoBg} onPress={() => onScaleDelta?.(8)} />
        <View style={[st.dockSep, { backgroundColor: palette.border || 'rgba(148,163,184,0.35)' }]} />
        {extras.length ? (
          <DockBtn icon="add-circle-outline" label="Incluir" ink={ink} icoBg={icoBg} onPress={() => setAddOpen((v) => !v)} />
        ) : null}
        {canRemove ? (
          <DockBtn icon="trash-outline" label="Ocultar" ink={ink} icoBg={icoBg} danger onPress={hideSelected} />
        ) : null}
        <DockBtn icon="refresh-outline" label="Resetar" ink={ink} icoBg={icoBg} onPress={onReset} />
      </View>
      {addOpen && extras.length ? (
        <View style={st.dockAddRow}>
          {extras.map((x) => (
            <TouchableOpacity
              key={x.id}
              style={[st.dockAddChip, { backgroundColor: icoBg }]}
              onPress={() => {
                playTapSound();
                onFieldChange?.(x.key, true);
                setAddOpen(false);
              }}
            >
              <Text style={[st.dockAddText, { color: ink }]}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
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
  const [logoCutUri, setLogoCutUri] = useState(logoUri);
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
  }, [config.usaNomeProfissional, config.mostrarSlogan, config.mostrarSubtitulo, config.usaLogo, config.mostrarTitulo]);

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
          Object.keys(HERO_SCALE_KEYS).forEach((id) => handleScale(id, 100));
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
      />
    );
    return undefined;
  }, [canType, config, selectedId, selectedIds, theme.corPrincipal, onPickLogo]);

  useEffect(() => () => publishHeroDock(null), []);

  const renderLogo = () => {
    if (!isHeroElementVisible(config, 'logo')) return null;
    const look = hero.logoLook || {};
    const phStyle = {
      width: look.size || hero.logoPx,
      height: look.size || hero.logoPx,
      justifyContent: 'center',
      alignItems: 'center',
    };
    return (
      <View style={look.wrap}>
        <View style={[look.clip, !look.placa && { backgroundColor: 'transparent' }]}>
          {logoCutUri ? (
            <Image
              source={{ uri: logoCutUri }}
              style={look.img}
              resizeMode={look.resizeMode || 'contain'}
            />
          ) : (
            <View style={[phStyle, { backgroundColor: look.placa ? undefined : 'transparent' }]}>
              <Ionicons name="storefront" size={Math.round((look.size || hero.logoPx) * 0.45)} color="#fff" />
            </View>
          )}
        </View>
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
        {wrap('slogan', renderHeroText('slogan', config.slogan, 'Slogan', [st.heroSlogan, { fontSize: hero.sloganPx, color: fonts.slogan, textAlign: 'center', maxWidth: w * 0.9 }], 2))}
        {wrap('titulo', renderHeroText('titulo', config.titulo, tituloFallback, [st.heroTitle, { fontSize: hero.tituloPx, color: fonts.titulo, textAlign: 'center', maxWidth: w * 0.9 }], 3))}
        {wrap('subtitulo', renderHeroText('subtitulo', config.subtitulo, 'Subtítulo', [st.heroSub, { fontSize: hero.subtituloPx, color: fonts.subtitulo, textAlign: 'center', maxWidth: w * 0.9 }], 2))}
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
        paddingVertical: hero.landing ? 48 : 24,
        paddingHorizontal: hero.landing ? 28 : 24,
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
      <LinearGradient
        colors={theme.heroColors.length >= 2 ? theme.heroColors : [theme.corPrincipal, theme.corPrincipal]}
        start={theme.start}
        end={theme.end}
        style={[st.hero, hero.frame?.banner, { minHeight: hero.minHeight, justifyContent: hero.landing ? 'center' : 'flex-end' }]}
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
        {hero.manual || heroEditMode ? (
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
  heroBrand: { fontSize: 32, fontWeight: '800', color: '#fff', opacity: 0.95, letterSpacing: 0.3 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 4 },
  heroSub: { fontSize: 14, color: '#fff', opacity: 0.92, marginTop: 6 },
  heroSlogan: { fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 8, fontStyle: 'italic' },
  heroTextMove: { cursor: 'move', userSelect: 'none' },
  heroTextHit: { cursor: 'move' },
  heroInlineInput: {
    padding: 0,
    margin: 0,
    minWidth: 120,
    outlineStyle: 'none',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  dockProRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dockIco: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dockBtn: {
    minWidth: 52,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dockBtnLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.1, maxWidth: 72, textAlign: 'center' },
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
