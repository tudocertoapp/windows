import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Dimensions, StyleSheet, Animated, TouchableOpacity } from 'react-native';
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

  useEffect(() => {
    if (!visible) return;
    const def = { x: W - OVERLAY_WIDTH - 16, y: safeTop + 40 };
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let pos;
      if (raw) {
        try {
          const { x, y } = JSON.parse(raw);
          pos = { x: Number.isFinite(x) ? x : def.x, y: Number.isFinite(y) ? y : def.y };
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
      <TouchableOpacity
        onPress={() => { playTapSound(); onClose?.(); }}
        style={[styles.overlayCloseBtn, { backgroundColor: colors.bg + 'CC', borderColor: colors.border }]}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.text} />
      </TouchableOpacity>
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
  dragHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: DRAG_HANDLE_HEIGHT,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  overlayCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    borderWidth: 1,
  },
});
