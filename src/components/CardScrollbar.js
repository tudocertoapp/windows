import React from 'react';
import { View } from 'react-native';

/** Mesma faixa da timeline do card Agenda. */
export const CARD_SCROLLBAR_W = 10;

export function CardScrollbar({ visible, height, thumbTop, thumbHeight, colors, accentColor }) {
  if (!visible || !(height > 0)) return null;
  const h = Math.max(20, Number(thumbHeight) || 20);
  const top = Math.max(0, Number(thumbTop) || 0);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: CARD_SCROLLBAR_W,
        height,
        borderRadius: 5,
        backgroundColor: `${colors.border}25`,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 2,
          width: 6,
          borderRadius: 3,
          top,
          height: h,
          backgroundColor: `${accentColor || colors.primary}80`,
        }}
      />
    </View>
  );
}
