import React, { useEffect, useRef, useMemo } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useNativeDriverSafe } from '../utils/platformLayout';
import {
  SPLASH_BACKGROUND,
  SPLASH_LOGO_WIDTH,
  SPLASH_LOGO_HEIGHT,
} from '../constants/splashLayout.json';

const logoImage = require('../../assets/logo-splash.png');

/**
 * Splash com logo (sem texto). Só some quando dataReady e decorreram pelo menos minHoldMs,
 * depois fade-out suave. Pulso leve até lá (web + mobile).
 * overlay=true: mesmo layout visual (centro, tamanho fixo), só muda posicionamento em relação ao app.
 */
export function SplashScreen({
  dataReady = false,
  minHoldMs = 4000,
  onFinish,
  backgroundColor = SPLASH_BACKGROUND,
  overlay = false,
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const startedAt = useRef(Date.now());
  const dismissed = useRef(false);
  const pulseLoop = useRef(null);

  const containerStyle = useMemo(() => {
    if (overlay) {
      return [
        StyleSheet.absoluteFillObject,
        {
          zIndex: 99999,
          elevation: 99999,
          justifyContent: 'center',
          alignItems: 'center',
          ...(Platform.OS === 'web'
            ? { position: 'fixed', left: 0, right: 0, top: 0, bottom: 0 }
            : {}),
        },
      ];
    }
    return [s.container];
  }, [overlay]);

  useEffect(() => {
    const easing = Easing.bezier(0.4, 0, 0.2, 1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 1400,
          easing,
          useNativeDriver: useNativeDriverSafe,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1400,
          easing,
          useNativeDriver: useNativeDriverSafe,
        }),
      ])
    );
    pulseLoop.current = loop;
    loop.start();
    return () => {
      loop.stop();
    };
  }, [scale]);

  useEffect(() => {
    const tryDismiss = () => {
      if (dismissed.current) return;
      const elapsed = Date.now() - startedAt.current;
      if (!dataReady || elapsed < minHoldMs) return;
      dismissed.current = true;
      pulseLoop.current?.stop();
      Animated.timing(opacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNativeDriverSafe,
      }).start(({ finished }) => {
        if (finished) onFinish?.();
      });
    };

    const id = setInterval(tryDismiss, 100);
    tryDismiss();
    return () => clearInterval(id);
  }, [dataReady, minHoldMs, onFinish, opacity]);

  return (
    <Animated.View style={[containerStyle, { backgroundColor, opacity }]}>
      <View style={s.inner}>
        <Animated.View
          style={[
            s.logoWrap,
            { width: SPLASH_LOGO_WIDTH, height: SPLASH_LOGO_HEIGHT },
            { transform: [{ scale }] },
          ]}
        >
          {/* Fundo opaco evita artefactos de alpha (buracos) no Electron/Web empacotado */}
          <View style={[s.logoPlate, { backgroundColor }]}>
            <Image
              source={logoImage}
              style={{ width: SPLASH_LOGO_WIDTH, height: SPLASH_LOGO_HEIGHT }}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlate: {
    borderRadius: 9999,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
