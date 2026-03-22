import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

/** Padrão Temas: fundo sólido colors.card, borda colors.border, borderWidth 1 */
export function GlassCard({ children, style, contentStyle, colors, solid }) {
  const flattened = StyleSheet.flatten(style) || {};
  const { padding, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight, backgroundColor, ...wrapperStyle } = flattened;
  const contentPadding = { padding: padding ?? 16, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight };

  if (solid && colors) {
    return (
      <View style={[styles.solidWrapper, wrapperStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.content, contentPadding, contentStyle]}>{children}</View>
      </View>
    );
  }

  const darkBg = colors?.isDarkBg ?? (colors?.text === '#f9fafb');
  const borderColor = darkBg ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)';
  const tint = darkBg ? 'dark' : 'light';
  const intensity = Platform.OS === 'ios' ? 90 : 75;
  const { borderColor: styleBorderColor, shadowColor: styleShadowColor, ...restWrapper } = wrapperStyle;
  const finalBorderColor = styleBorderColor ?? borderColor;
  const finalShadowColor = styleShadowColor ?? '#000';
  const overlayColor = darkBg ? 'rgba(17, 24, 39, 0.35)' : 'rgba(255, 255, 255, 0.25)';

  const useFallback = Platform.OS === 'web' || Platform.OS === 'android';
  return (
    <View style={[styles.wrapper, restWrapper, { borderColor: finalBorderColor, shadowColor: finalShadowColor }]}>
      {useFallback ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: darkBg ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.9)' }]} />
      ) : (
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
      <View style={[styles.content, contentPadding, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  solidWrapper: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
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
