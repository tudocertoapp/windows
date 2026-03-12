import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export function GlassCard({ children, style, contentStyle, colors }) {
  const darkBg = colors?.isDarkBg ?? (colors?.text === '#f9fafb');
  const borderColor = colors?.border || 'rgba(229,231,235,0.6)';
  const tint = darkBg ? 'dark' : 'light';
  const intensity = Platform.OS === 'ios' ? 80 : 60;
  const flattened = StyleSheet.flatten(style) || {};
  const { padding, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight, backgroundColor, ...wrapperStyle } = flattened;
  const contentPadding = { padding: padding ?? 16, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight };

  const overlayColor = darkBg
    ? 'rgba(255, 255, 255, 0.18)'
    : 'rgba(0, 0, 0, 0.08)';

  return (
    <View style={[styles.wrapper, wrapperStyle, { borderColor }]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
      <View style={[styles.content, contentPadding, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    zIndex: 1,
    padding: 16,
  },
});
