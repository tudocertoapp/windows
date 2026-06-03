import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isHeroElementVisible } from '../../utils/catalogoStore';

const ELEMENT_LABELS = {
  logo: 'Logo',
  nome: 'Nome',
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  slogan: 'Slogan',
};

function clampPx(v, max) {
  return Math.min(max, Math.max(0, v));
}

function DraggableHeroItem({
  id,
  pos,
  containerW,
  containerH,
  editable,
  onMove,
  onDragStart,
  onDragEnd,
  children,
}) {
  const [drag, setDrag] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const startRef = useRef({ x: 0, y: 0 });

  const centerX = (pos.x / 100) * containerW;
  const centerY = (pos.y / 100) * containerH;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => editable,
    onMoveShouldSetPanResponder: () => editable,
    onPanResponderGrant: () => {
      startRef.current = { x: centerX, y: centerY };
      setDrag({ dx: 0, dy: 0 });
      onDragStart?.();
    },
    onPanResponderMove: (_, g) => {
      setDrag({ dx: g.dx, dy: g.dy });
    },
    onPanResponderRelease: (_, g) => {
      const nx = clampPx(((startRef.current.x + g.dx) / containerW) * 100, 100);
      const ny = clampPx(((startRef.current.y + g.dy) / containerH) * 100, 100);
      const clampedX = Math.min(96, Math.max(4, nx));
      const clampedY = Math.min(96, Math.max(4, ny));
      setDrag(null);
      onMove?.(id, { x: clampedX, y: clampedY });
      onDragEnd?.();
    },
    onPanResponderTerminate: () => {
      setDrag(null);
      onDragEnd?.();
    },
  }), [editable, containerW, containerH, centerX, centerY, id, onMove, onDragStart, onDragEnd]);

  if (!containerW || !containerH) return null;

  const px = drag ? startRef.current.x + drag.dx : centerX;
  const py = drag ? startRef.current.y + drag.dy : centerY;
  const left = px - size.w / 2;
  const top = py - size.h / 2;

  return (
    <View
      {...(editable ? panResponder.panHandlers : {})}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
      }}
      style={[
        st.absItem,
        { left, top },
        editable && st.absItemEdit,
      ]}
    >
      {editable ? (
        <View style={st.dragTag}>
          <Ionicons name="move-outline" size={10} color="#fff" />
          <Text style={st.dragTagText}>{ELEMENT_LABELS[id]}</Text>
        </View>
      ) : null}
      {children}
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

  const handleMove = useCallback((id, pos) => {
    onHeroPositionChange?.(id, pos);
  }, [onHeroPositionChange]);

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
          onMove={handleMove}
          onDragStart={() => onDragStateChange?.(true)}
          onDragEnd={() => onDragStateChange?.(false)}
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
    <View
      style={[st.hero, { backgroundColor: config.corPrincipal, minHeight: hero.minHeight }]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== containerSize.w || height !== containerSize.h) {
          setContainerSize({ w: width, h: height });
        }
      }}
    >
      {heroBg && (
        <Image source={heroBg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      )}
      <View style={[st.heroOverlay, heroBg && { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      {heroEditMode ? (
        <View style={st.editHint}>
          <Ionicons name="hand-left-outline" size={14} color="#fff" />
          <Text style={st.editHintText}>Arraste logo e textos para posicionar</Text>
        </View>
      ) : null}
      {hero.manual ? (
        <View style={st.manualLayer}>{renderManualLayer()}</View>
      ) : (
        renderFlexLayer()
      )}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { minHeight: 200, justifyContent: 'flex-end', overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroContent: { padding: 24, zIndex: 1, width: '100%' },
  manualLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  absItem: { position: 'absolute', zIndex: 3 },
  absItemEdit: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  dragTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  dragTagText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  editHint: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editHintText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  heroBrand: { fontSize: 13, fontWeight: '700', color: '#fff', opacity: 0.95, letterSpacing: 0.5 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroSub: { fontSize: 14, color: '#fff', opacity: 0.92, marginTop: 6 },
  heroSlogan: { fontSize: 12, color: '#fff', opacity: 0.85, marginTop: 8, fontStyle: 'italic' },
});
