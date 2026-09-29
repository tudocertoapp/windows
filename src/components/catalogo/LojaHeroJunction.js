import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const DEFAULT_H = 48;

function pathFor(shape) {
  switch (shape) {
    case 'onda':
      return 'M0 48 L0 22 C40 4 80 38 120 18 C160 0 200 36 240 16 C280 -2 320 32 360 14 C380 8 400 22 400 22 L400 48 Z';
    case 'ondabaixa':
      return 'M0 48 L0 30 C50 18 90 38 140 28 C190 16 230 36 280 26 C330 16 370 32 400 24 L400 48 Z';
    case 'arco':
      return 'M0 48 L0 30 Q200 -8 400 30 L400 48 Z';
    case 'diagonal':
      return 'M0 48 L0 34 L400 8 L400 48 Z';
    case 'entalhe':
      return 'M0 48 L0 26 L130 26 Q200 2 270 26 L400 26 L400 48 Z';
    case 'vale':
      return 'M0 48 L0 8 L200 40 L400 8 L400 48 Z';
    case 'escama':
      return 'M0 48 L0 26 Q50 4 100 26 Q150 4 200 26 Q250 4 300 26 Q350 4 400 26 L400 48 Z';
    case 'zigue':
      return 'M0 48 L0 22 L40 6 L80 24 L120 6 L160 24 L200 6 L240 24 L280 6 L320 24 L360 6 L400 22 L400 48 Z';
    case 'serra':
      return 'M0 48 L0 28 L25 8 L50 28 L75 8 L100 28 L125 8 L150 28 L175 8 L200 28 L225 8 L250 28 L275 8 L300 28 L325 8 L350 28 L375 8 L400 28 L400 48 Z';
    case 'degrau':
      return 'M0 48 L0 10 L100 10 L100 26 L200 26 L200 10 L300 10 L300 26 L400 26 L400 48 Z';
    case 'petal':
      return 'M0 48 L0 32 Q100 32 200 4 Q300 32 400 32 L400 48 Z';
    case 'asa':
      return 'M0 48 L0 36 Q80 2 200 26 Q320 2 400 36 L400 48 Z';
    case 'concha':
      return 'M0 48 L0 12 Q200 44 400 12 L400 48 Z';
    case 'gota':
      return 'M0 48 L0 24 Q200 -10 400 24 L400 48 Z';
    case 'nuvem':
      return 'M0 48 L0 28 C28 28 40 10 72 14 C96 2 124 10 148 18 C176 6 214 6 244 18 C274 8 312 4 340 18 C362 10 382 20 400 26 L400 48 Z';
    default:
      return null;
  }
}

export function LojaHeroJunction({ shape, fill, height, inset }) {
  const d = pathFor(shape);
  if (!d) return null;
  const h = height || DEFAULT_H;
  return (
    <View
      style={[st.wrap, { marginTop: -(h - 1), height: h, marginHorizontal: inset || 0 }]}
      pointerEvents="none"
    >
      <Svg width="100%" height={h} viewBox="0 0 400 48" preserveAspectRatio="none">
        <Path d={d} fill={fill || '#f8fafc'} />
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginBottom: 0,
    zIndex: 8,
    elevation: 8,
  },
});
