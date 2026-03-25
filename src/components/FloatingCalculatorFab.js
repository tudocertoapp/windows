import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';

const DRAG_THRESHOLD = 6;
const SIZE = 56;

export function FloatingCalculatorFab({ visible, onPress }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const animPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const draggingRef = useRef(false);
  const initializedRef = useRef(false);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    // Importante (web mobile): a altura do viewport muda ao rolar (barra do browser),
    // não podemos "resetar" a posição do FAB durante scroll.
    const becameVisible = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;

    if (!visible) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current && !becameVisible) return;

    const { width: W, height: H } = Dimensions.get('window');
    const safeBottom = insets.bottom || 0;
    const safeTop = insets.top || 0;
    // Posição padrão: canto inferior direito (acima da tab bar)
    const defX = Math.max(12, W - SIZE - 16);
    const defY = Math.max(12 + safeTop, H - SIZE - (safeBottom + 170));
    animPos.setValue({ x: defX, y: defY });
    initializedRef.current = true;
  }, [visible, animPos, insets.bottom, insets.top]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: () => {
        draggingRef.current = false;
        animPos.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: animPos.x, dy: animPos.y }], {
        useNativeDriver: false,
        listener: (_evt, g) => {
          if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) draggingRef.current = true;
        },
      }),
      onPanResponderRelease: () => {
        animPos.flattenOffset();
        // mantém dentro da tela
        const { width: W, height: H } = Dimensions.get('window');
        const safeBottom = insets.bottom || 0;
        const x = animPos.x.__getValue();
        const y = animPos.y.__getValue();
        const minX = 12;
        const maxX = Math.max(12, W - SIZE - 12);
        const minY = 12 + (insets.top || 0);
        const maxY = Math.max(minY, H - SIZE - (safeBottom + 150));
        animPos.setValue({
          x: Math.max(minX, Math.min(x, maxX)),
          y: Math.max(minY, Math.min(y, maxY)),
        });
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [{ translateX: animPos.x }, { translateY: animPos.y }],
        },
      ]}
      {...panResponder.panHandlers}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (draggingRef.current) return;
          playTapSound();
          onPress?.();
        }}
        style={[styles.fab, { backgroundColor: colors.primary, borderColor: colors.primary + '99' }]}
        accessibilityLabel="Abrir calculadora"
      >
        <View style={styles.inner}>
          <Ionicons name="calculator-outline" size={24} color="#fff" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // No web mobile, "absolute + transform" pode criar barra de rolagem.
    // Usamos fixed para não afetar o layout/scroll.
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    left: 0,
    top: 0,
    zIndex: 2147483645,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 20,
  },
  inner: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

