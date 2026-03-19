import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export function GlassCard({ children, style, contentStyle, colors }) {
  const darkBg = colors?.isDarkBg ?? (colors?.text === '#f9fafb');
  const borderColor = darkBg ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)';
  const tint = darkBg ? 'dark' : 'light';
  const intensity = Platform.OS === 'ios' ? 90 : 75;
  const flattened = StyleSheet.flatten(style) || {};
  const { padding, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight, backgroundColor, ...wrapperStyle } = flattened;
  const contentPadding = { padding: padding ?? 16, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight };

  const overlayColor = darkBg
    ? 'rgba(17, 24, 39, 0.35)'
    : 'rgba(255, 255, 255, 0.25)';

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
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    zIndex: 1,
    padding: 16,
  },
});
