import React from 'react';
import { Image, View } from 'react-native';

const DOCK = require('../../assets/dock/dock-8k.png');

export function dockPoseSource() {
  return DOCK;
}

export function DockMascot({ size = 72, style, ...rest }) {
  const h = Number(size) || 72;
  const w = Math.round(h * 0.73);
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: w,
          height: h,
          overflow: 'hidden',
          flexShrink: 0,
          flexGrow: 0,
        },
        style,
      ]}
    >
      <Image
        source={DOCK}
        accessibilityLabel="Dock"
        resizeMode="contain"
        style={{ width: w, height: h }}
        {...rest}
      />
    </View>
  );
}
