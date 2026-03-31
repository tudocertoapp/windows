import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import { useNativeDriverSafe } from '../utils/platformLayout';

const logoImage = require('../../assets/logo-splash.png');

/**
 * Splash screen reutilizável com logo animado (aumenta e diminui fluidamente).
 * Duração padrão: 4 segundos.
 * @param {number} duration - Duração total em ms (padrão 4000)
 * @param {function} onFinish - Callback ao terminar a animação
 * @param {string} backgroundColor - Cor de fundo (padrão #111827)
 */
export function SplashScreen({ duration = 4000, onFinish, backgroundColor = '#111827' }) {
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const half = duration / 2;
    const easing = Easing.bezier(0.4, 0, 0.2, 1);
    const anim = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: half,
        easing,
        useNativeDriver: useNativeDriverSafe,
      }),
      Animated.timing(scale, {
        toValue: 0.92,
        duration: half,
        easing,
        useNativeDriver: useNativeDriverSafe,
      }),
    ]);
    anim.start(() => {
      onFinish?.();
    });
    return () => anim.stop();
  }, [duration, scale, onFinish]);

  return (
    <View style={[s.container, { backgroundColor }]}>
      <Animated.View style={[s.logoWrap, { transform: [{ scale }] }]}>
        <Image source={logoImage} style={s.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    width: 320,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 320,
    height: 96,
  },
});
