import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { isHeroElementVisible, getCatalogoTheme, HERO_ELEMENTOS, nudgeHeroPos, DEFAULT_HERO_POSICOES } from '../../utils/catalogoStore';
import { playTapSound } from '../../utils/sounds';

const ELEMENT_LABELS = {
  logo: 'Logo',
  nome: 'Nome',
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  slogan: 'Slogan',
};

function DraggableHeroItem({
  id,
  pos,
  containerW,
  containerH,
  editable,
  selected,
  onSelect,
  onMove,
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
    onStartShouldSetPanResponder: () => !!cb.current.editable,
    onMoveShouldSetPanResponder: () => !!cb.current.editable,
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
      cb.current.onSelect?.(cb.current.id);
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
    <View
      {...(editable ? pan.panHandlers : {})}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!dragPx && (width !== size.w || height !== size.h)) setSize({ w: width, h: height });
      }}
      style={[
        st.absItem,
        { left, top, zIndex: selected || dragPx ? 20 : 3 },
        editable && st.absItemEdit,
        selected && st.absItemSelected,
      ]}
    >
      {editable ? (
        <View style={[st.dragTag, selected && st.dragTagOn]}>
          <Ionicons name="move" size={11} color="#fff" />
          <Text style={st.dragTagText}>{ELEMENT_LABELS[id]}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function HeroMoveDock({
  config,
  selectedId,
  onSelect,
  onNudge,
  onCenter,
  onReset,
  colors,
  accent,
  compact = false,
}) {
  const elementos = HERO_ELEMENTOS.filter((el) => isHeroElementVisible(config, el.id) || el.id === selectedId);
  return (
    <View style={[st.dock, compact && st.dockCompact, { backgroundColor: colors?.card || '#fff', borderColor: colors?.border || '#e2e8f0' }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.dockChips}>
        {elementos.map((el) => {
          const on = selectedId === el.id;
          return (
            <TouchableOpacity
              key={el.id}
              onPress={() => { playTapSound(); onSelect?.(el.id); }}
              style={[st.dockChip, { borderColor: on ? accent : (colors?.border || '#e2e8f0'), backgroundColor: on ? accent : 'transparent' }]}
            >
              <Ionicons name={el.icon} size={14} color={on ? '#fff' : (colors?.text || '#0f172a')} />
              <Text style={{ color: on ? '#fff' : (colors?.text || '#0f172a'), fontSize: 12, fontWeight: '700' }}>{el.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={st.dockPad}>
        <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(0, -4)}>
          <Ionicons name="chevron-up" size={18} color={accent} />
        </TouchableOpacity>
        <View style={st.padMid}>
          <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(-4, 0)}>
            <Ionicons name="chevron-back" size={18} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={onCenter}>
            <Ionicons name="scan-outline" size={16} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(4, 0)}>
            <Ionicons name="chevron-forward" size={18} color={accent} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[st.padBtn, { borderColor: colors?.border }]} onPress={() => onNudge?.(0, 4)}>
          <Ionicons name="chevron-down" size={18} color={accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.padReset, { borderColor: colors?.border }]} onPress={onReset}>
          <Ionicons name="refresh-outline" size={16} color={accent} />
          <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>Resetar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function LojaHeroBanner({
  config,
  hero,
  lojaNome,
  logoUri,
  heroBg,
  heroEditMode = false,
  onHeroPositionChange,
  onDragStateChange,
}) {
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = useState('titulo');
  const [guiding, setGuiding] = useState(false);
  const theme = getCatalogoTheme(config);

  const handleMove = useCallback((id, pos) => {
    onHeroPositionChange?.(id, pos);
  }, [onHeroPositionChange]);

  const nudge = (dx, dy) => {
    playTapSound();
    const next = nudgeHeroPos(config, selectedId, dx, dy);
    onHeroPositionChange?.(selectedId, next[selectedId]);
  };

  const centerSelected = () => {
    playTapSound();
    onHeroPositionChange?.(selectedId, { x: 50, y: hero.posicoes?.[selectedId]?.y ?? 50 });
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
          editable={heroEditMode}
          selected={selectedId === id}
          onSelect={setSelectedId}
          onMove={handleMove}
          onDragStart={() => { setGuiding(true); onDragStateChange?.(true); }}
          onDragEnd={() => { setGuiding(false); onDragStateChange?.(false); }}
        >
          {node}
        </DraggableHeroItem>
      );
    };

    return (
      <>
        {wrap('logo', renderLogo())}
        {wrap('nome', (
          <Text style={[st.heroBrand, { textAlign: 'center', maxWidth: w * 0.85 }]} numberOfLines={2}>
            {lojaNome}
          </Text>
        ))}
        {wrap('titulo', (
          <Text style={[st.heroTitle, { fontSize: hero.tituloPx, textAlign: 'center', maxWidth: w * 0.9 }]} numberOfLines={3}>
            {config.titulo || 'Minha Loja'}
          </Text>
        ))}
        {wrap('subtitulo', (
          <Text style={[st.heroSub, { textAlign: 'center', maxWidth: w * 0.9 }]} numberOfLines={2}>
            {config.subtitulo}
          </Text>
        ))}
        {wrap('slogan', (
          <Text style={[st.heroSlogan, { textAlign: 'center', maxWidth: w * 0.9 }]} numberOfLines={2}>
            {config.slogan}
          </Text>
        ))}
      </>
    );
  };

  const renderFlexLayer = () => (
    <View style={[
      st.heroContent,
      {
        alignItems: hero.isRow ? 'center' : hero.contentAlign,
        flexDirection: hero.isRow ? 'row' : 'column',
        gap: hero.isRow ? 16 : 0,
      },
    ]}>
      {isHeroElementVisible(config, 'logo') ? (
        <View style={{ marginBottom: hero.isRow ? 0 : 10 }}>{renderLogo()}</View>
      ) : null}
      <View style={{
        flex: hero.isRow ? 1 : undefined,
        alignItems: hero.flexAlign,
        alignSelf: hero.isRow ? undefined : (hero.disposicao === 'centro' ? 'stretch' : undefined),
        width: hero.isRow ? undefined : '100%',
      }}>
        {isHeroElementVisible(config, 'nome') && (
          <Text style={[st.heroBrand, { textAlign: hero.textAlign }]}>{lojaNome}</Text>
        )}
        {isHeroElementVisible(config, 'titulo') && (
          <Text style={[st.heroTitle, { textAlign: hero.textAlign, fontSize: hero.tituloPx }]}>
            {config.titulo || 'Minha Loja'}
          </Text>
        )}
        {isHeroElementVisible(config, 'subtitulo') && (
          <Text style={[st.heroSub, { textAlign: hero.textAlign }]}>{config.subtitulo}</Text>
        )}
        {isHeroElementVisible(config, 'slogan') && (
          <Text style={[st.heroSlogan, { textAlign: hero.textAlign }]}>{config.slogan}</Text>
        )}
      </View>
    </View>
  );

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
        style={[st.hero, { minHeight: hero.minHeight }]}
      >
        {heroBg && (
          <Image source={heroBg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        )}
        <View style={[st.heroOverlay, heroBg && { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        {guiding ? (
          <>
            <View style={[st.guideV, { left: '50%' }]} />
            <View style={[st.guideH, { top: '50%' }]} />
          </>
        ) : null}
        {hero.manual ? (
          <View style={st.manualLayer} pointerEvents="box-none">{renderManualLayer()}</View>
        ) : (
          renderFlexLayer()
        )}
      </LinearGradient>
      </View>
      {heroEditMode && hero.manual ? (
        <HeroMoveDock
          config={config}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNudge={nudge}
          onCenter={centerSelected}
          onReset={() => {
            playTapSound();
            onHeroPositionChange?.('*', { ...DEFAULT_HERO_POSICOES });
          }}
          colors={{ card: 'rgba(15,23,42,0.92)', border: 'rgba(255,255,255,0.14)', text: '#fff' }}
          accent={theme.corPrincipal}
          compact
        />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { minHeight: 200, justifyContent: 'flex-end', overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroContent: { padding: 24, zIndex: 1, width: '100%' },
  manualLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  guideV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 1 },
  guideH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.55)', zIndex: 1 },
  absItem: { position: 'absolute', zIndex: 3, maxWidth: '92%' },
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
  heroBrand: { fontSize: 13, fontWeight: '700', color: '#fff', opacity: 0.95, letterSpacing: 0.5 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroSub: { fontSize: 14, color: '#fff', opacity: 0.92, marginTop: 6 },
  heroSlogan: { fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 8, fontStyle: 'italic' },
  dock: { padding: 10, gap: 8, borderTopWidth: 1 },
  dockCompact: { borderTopWidth: 0 },
  dockChips: { gap: 8, paddingBottom: 2 },
  dockChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  dockPad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  padMid: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  padBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  padReset: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 36, borderRadius: 10, borderWidth: 1, marginLeft: 4 },
});
