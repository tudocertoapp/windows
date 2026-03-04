import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Dimensions, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playTapSound } from '../utils/sounds';

const STORAGE_KEY = '@tudocerto_calc_btn_pos';
const BTN_SIZE = 56;
const DRAG_THRESHOLD = 8;

export function FloatingCalculatorButton({ onPress }) {
  const { primaryColor } = useTheme();
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState(null);
  const animPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const posAtGrant = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const { width: W, height: H } = Dimensions.get('window');
  const safeBottom = insets.bottom || 20;
  const safeTop = insets.top || 44;
  const tabBarHeight = 44 + safeBottom + 24;
  const minX = 16;
  const maxX = W - BTN_SIZE - 16;
  const minY = safeTop + 20;
  const maxY = H - tabBarHeight - BTN_SIZE - 20;

  const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

  useEffect(() => {
    const def = { x: W - BTN_SIZE - 24, y: minY + 80 };
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
      lastPos.current = { x: pos.x, y: pos.y };
      animPos.setValue({ x: pos.x, y: pos.y });
    });
  }, []);

  useEffect(() => {
    if (position) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x: position.x, y: position.y }));
    }
  }, [position]);

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
        const dx = Math.abs(g.dx);
        const dy = Math.abs(g.dy);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) hasMoved.current = true;
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
        if (!hasMoved.current) {
          playTapSound();
          onPress?.();
        }
      },
    })
  ).current;

  if (position === null) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.wrap,
        {
          width: BTN_SIZE,
          height: BTN_SIZE,
          borderRadius: BTN_SIZE / 2,
          backgroundColor: primaryColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 10,
          transform: [
            { translateX: animPos.x },
            { translateY: animPos.y },
          ],
        },
      ]}
    >
      <View style={styles.touch}>
        <Ionicons name="calculator-outline" size={28} color="#fff" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
