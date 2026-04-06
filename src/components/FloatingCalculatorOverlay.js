import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, PanResponder, StyleSheet, Animated, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalculatorScreenPro } from '../screens/CalculatorScreenPro';
import { playTapSound } from '../utils/sounds';

const OVERLAY_WIDTH = 212;
const OVERLAY_HEIGHT = 316;
/** Cabeçalho absoluto (histórico / expandir / fechar) */
const HEADER_H = 52;
/** Reserva nas laterais do header para os ícones (~42px + padding) */
const HEADER_ICON_INSET = 54;
/**
 * Acima disto: área do teclado (teclas no fundo do painel em layout compact).
 * Estimativa: 5 fileiras × (~34px botão + ~6 gap) + paddings do pad.
 */
const KEYPAD_ZONE_HEIGHT = 188;
const KEYPAD_TOP_Y = OVERLAY_HEIGHT - KEYPAD_ZONE_HEIGHT;
const MOVE_THRESHOLD = 3;

/**
 * Zonas de arraste (coordenadas relativas ao painel):
 * - Faixa central do topo (sem cobrir ícones)
 * - Área do visor / espaço até o teclado (sem cobrir botões)
 */
function isOverlayDragZone(x, y) {
  if (y < 0 || y > OVERLAY_HEIGHT || x < 0 || x > OVERLAY_WIDTH) return false;
  if (y >= KEYPAD_TOP_Y) return false;
  if (y <= HEADER_H) {
    return x >= HEADER_ICON_INSET && x <= OVERLAY_WIDTH - HEADER_ICON_INSET;
  }
  return true;
}

export function FloatingCalculatorOverlay({
  visible,
  onClose,
  onExpand,
  expression,
  result,
  history,
  onExpressionChange,
  onResultChange,
  onHistoryChange,
}) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const [position, setPosition] = useState(null);
  const animPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragStartRef = useRef({ x: 0, y: 0 });

  const { width: W, height: H } = useWindowDimensions();
  const safeTop = insets.top || 0;
  const safeBottom = insets.bottom || 0;

  const clampPos = (p) => {
    const x = Number(p?.x) || 0;
    const y = Number(p?.y) || 0;
    const minX = 12;
    const minY = Math.max(12, safeTop + 12);
    const maxX = Math.max(minX, W - OVERLAY_WIDTH - 12);
    const maxY = Math.max(minY, H - OVERLAY_HEIGHT - (safeBottom + 12));
    return { x: Math.max(minX, Math.min(x, maxX)), y: Math.max(minY, Math.min(y, maxY)) };
  };

  useEffect(() => {
    if (!visible) {
      // Ao fechar: zera estado/posição para reabrir sempre centralizada.
      setPosition(null);
      animPos.setValue({ x: 0, y: 0 });
      return;
    }
    const centered = {
      x: (W - OVERLAY_WIDTH) / 2,
      y: (H - OVERLAY_HEIGHT) / 2,
    };
    const pos = clampPos(centered);
    setPosition(pos);
    animPos.setValue(pos);
  }, [visible, W, H, safeTop, safeBottom, animPos]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          const x = evt?.nativeEvent?.locationX ?? 0;
          const y = evt?.nativeEvent?.locationY ?? 0;
          dragStartRef.current = { x, y };
          return isOverlayDragZone(x, y);
        },
        onMoveShouldSetPanResponder: (_evt, g) =>
          isOverlayDragZone(dragStartRef.current.x, dragStartRef.current.y) &&
          (Math.abs(g.dx) > MOVE_THRESHOLD || Math.abs(g.dy) > MOVE_THRESHOLD),
        onPanResponderGrant: () => {
          animPos.extractOffset();
        },
        onPanResponderMove: Animated.event([null, { dx: animPos.x, dy: animPos.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          animPos.flattenOffset();
          const x = animPos.x.__getValue();
          const y = animPos.y.__getValue();
          const clamped = clampPos({ x, y });
          animPos.setValue(clamped);
          setPosition(clamped);
        },
        onPanResponderTerminate: () => {
          animPos.flattenOffset();
          const x = animPos.x.__getValue();
          const y = animPos.y.__getValue();
          const clamped = clampPos({ x, y });
          animPos.setValue(clamped);
          setPosition(clamped);
        },
      }),
    [animPos, W, H, safeTop, safeBottom]
  );

  if (!visible || position === null) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.overlay,
        Platform.OS === 'web' && styles.overlayWeb,
        {
          width: OVERLAY_WIDTH,
          height: OVERLAY_HEIGHT,
          left: 0,
          top: 0,
          transform: [{ translateX: animPos.x }, { translateY: animPos.y }],
        },
      ]}
    >
      <View style={styles.content} pointerEvents="box-none" collapsable={false}>
        <CalculatorScreenPro
          compact
          isModal
          floatingOverlay
          onClose={() => { playTapSound(); onClose?.(); }}
          onExpand={onExpand ? () => { playTapSound(); onExpand?.(); } : undefined}
          expression={expression}
          result={result}
          history={history}
          onExpressionChange={onExpressionChange}
          onResultChange={onResultChange}
          onHistoryChange={onHistoryChange}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    zIndex: 2147483000,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 16,
  },
  overlayWeb: {
    // @ts-ignore RN Web
    willChange: 'transform',
    boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
  },
  content: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
