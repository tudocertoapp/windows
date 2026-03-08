import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Dimensions, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalculatorScreenPro } from '../screens/CalculatorScreenPro';
import { playTapSound } from '../utils/sounds';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tudocerto_calc_overlay_pos';
const OVERLAY_WIDTH = 236;
const OVERLAY_HEIGHT = 350;
const DRAG_THRESHOLD = 6;

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
  const [position, setPosition] = useState(null);
  const animPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const posAtGrant = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const { width: W, height: H } = Dimensions.get('window');
  const safeTop = insets.top || 44;
  const tabBarH = 44 + (insets.bottom || 20) + 24;
  const minX = 8;
  const maxX = W - OVERLAY_WIDTH - 8;
  const minY = safeTop + 8;
  const maxY = H - tabBarH - OVERLAY_HEIGHT - 8;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  useEffect(() => {
    if (!visible) return;
    const def = { x: W - OVERLAY_WIDTH - 16, y: minY + 40 };
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let pos;
      if (raw) {
        try {
          const { x, y } = JSON.parse(raw);
          pos = { x: clamp(x, minX, maxX), y: clamp(y, minY, maxY) };
        } catch (_) {
          pos = def;
        }
      } else {
        pos = def;
      }
      setPosition(pos);
      lastPos.current = pos;
      animPos.setValue(pos);
    });
  }, [visible]);

  useEffect(() => {
    if (position && visible) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        animPos.flattenOffset();
        posAtGrant.current = { ...lastPos.current };
        hasMoved.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) hasMoved.current = true;
        const nx = clamp(posAtGrant.current.x + g.dx, minX, maxX);
        const ny = clamp(posAtGrant.current.y + g.dy, minY, maxY);
        lastPos.current = { x: nx, y: ny };
        animPos.setValue({ x: nx, y: ny });
      },
      onPanResponderRelease: () => {
        const x = clamp(lastPos.current.x, minX, maxX);
        const y = clamp(lastPos.current.y, minY, maxY);
        setPosition({ x, y });
        animPos.setValue({ x, y });
      },
    })
  ).current;

  if (!visible || position === null) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.overlay,
        {
          width: OVERLAY_WIDTH,
          height: OVERLAY_HEIGHT,
          left: 0,
          top: 0,
          transform: [
            { translateX: animPos.x },
            { translateY: animPos.y },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        <CalculatorScreenPro
          compact
          isModal
          onClose={() => { playTapSound(); onClose?.(); }}
          onExpand={() => { playTapSound(); onExpand?.(); }}
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
    position: 'absolute',
    zIndex: 1000,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  content: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
