import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Dimensions, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalculatorScreenPro } from '../screens/CalculatorScreenPro';
import { playTapSound } from '../utils/sounds';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const STORAGE_KEY = '@tudocerto_calc_overlay_pos';
const OVERLAY_WIDTH = 212;
const OVERLAY_HEIGHT = 316;
const DRAG_THRESHOLD = 6;
const DRAG_HANDLE_HEIGHT = 48;
const DRAG_HANDLE_WIDTH_RATIO = 0.5;

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
  const { colors } = useTheme();
  const [position, setPosition] = useState(null);
  const animPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPos = useRef({ x: 0, y: 0 });
  const dragEnabledRef = useRef(false);

  const { width: W, height: H } = Dimensions.get('window');
  const safeTop = insets.top || 44;
  const isWeb = Platform.OS === 'web';

  const clampPos = (p) => {
    const x = Number(p?.x) || 0;
    const y = Number(p?.y) || 0;
    const minX = 12;
    const minY = Math.max(12, safeTop);
    const maxX = Math.max(minX, W - OVERLAY_WIDTH - 12);
    const maxY = Math.max(minY, H - OVERLAY_HEIGHT - 12);
    return { x: Math.max(minX, Math.min(x, maxX)), y: Math.max(minY, Math.min(y, maxY)) };
  };

  useEffect(() => {
    if (!visible) return;
    const def = { x: W - OVERLAY_WIDTH - 16, y: safeTop + 40 };
    // No web mobile a viewport muda com o scroll e posições persistidas podem ficar fora da tela.
    // Para evitar "sumir" e não atrapalhar a tabbar, no web usamos sempre a posição padrão.
    if (isWeb) {
      const pos = clampPos(def);
      setPosition(pos);
      lastPos.current = pos;
      animPos.setValue(pos);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let pos;
      if (raw) {
        try {
          const { x, y } = JSON.parse(raw);
          pos = clampPos({ x: Number.isFinite(x) ? x : def.x, y: Number.isFinite(y) ? y : def.y });
        } catch (_) {
          pos = clampPos(def);
        }
      } else {
        pos = clampPos(def);
      }
      setPosition(pos);
      lastPos.current = pos;
      animPos.setValue(pos);
    });
  }, [visible, W, H, safeTop, isWeb]);

  useEffect(() => {
    if (position && visible && !isWeb) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, visible, isWeb]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const x = evt?.nativeEvent?.locationX ?? 0;
        const y = evt?.nativeEvent?.locationY ?? 0;
        const maxX = OVERLAY_WIDTH * DRAG_HANDLE_WIDTH_RATIO;
        const enabled = y <= DRAG_HANDLE_HEIGHT && x <= maxX;
        dragEnabledRef.current = enabled;
        return enabled;
      },
      onMoveShouldSetPanResponder: (_evt, g) => {
        if (!dragEnabledRef.current) return false;
        return Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD;
      },
      onPanResponderGrant: () => {
        animPos.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: animPos.x, dy: animPos.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        animPos.flattenOffset();
        const x = animPos.x.__getValue();
        const y = animPos.y.__getValue();
        lastPos.current = { x, y };
        setPosition({ x, y });
      },
      onPanResponderTerminate: () => {
        animPos.flattenOffset();
        const x = animPos.x.__getValue();
        const y = animPos.y.__getValue();
        lastPos.current = { x, y };
        setPosition({ x, y });
      },
    })
  ).current;

  if (!visible || position === null) return null;

  return (
    <Animated.View
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
      <View {...panResponder.panHandlers} style={styles.dragHandle} />
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
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
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
  dragHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: DRAG_HANDLE_HEIGHT,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
});
