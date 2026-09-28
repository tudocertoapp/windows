import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const SHAPE_H = 42;

function pathFor(shape) {
  if (shape === 'onda') {
    return 'M0 42 L0 18 C50 0 90 36 140 16 C190 -4 230 34 280 16 C330 -2 370 28 400 14 L400 42 Z';
  }
  if (shape === 'arco') {
    return 'M0 42 L0 26 Q200 -10 400 26 L400 42 Z';
  }
  if (shape === 'diagonal') {
    return 'M0 42 L0 28 L400 6 L400 42 Z';
  }
  return null;
}

export function LojaHeroJunction({ shape, fill }) {
  const d = pathFor(shape);
  if (!d) return null;
  return (
    <View style={st.wrap} pointerEvents="none">
      <Svg width="100%" height={SHAPE_H} viewBox="0 0 400 42" preserveAspectRatio="none">
        <Path d={d} fill={fill || '#f8fafc'} />
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginTop: -SHAPE_H + 2,
    marginBottom: -2,
    height: SHAPE_H,
    zIndex: 5,
  },
});
