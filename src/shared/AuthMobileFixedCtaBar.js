import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { getAuthMobileFixedCtaBottom } from './authUi';

/**
 * Barra de CTAs fixa no fundo (mobile web + nativo), mesma âncora em Começar e Login.
 */
export function AuthMobileFixedCtaBar({ insetsBottom, isWebMobile, children }) {
  const bottom = getAuthMobileFixedCtaBottom(insetsBottom, isWebMobile);
  return (
    <View
      style={[
        s.bar,
        Platform.OS === 'web' && s.barWeb,
        { bottom },
      ]}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 4,
    alignItems: 'center',
    zIndex: 100,
    elevation: 12,
  },
  barWeb: {
    position: 'fixed',
    zIndex: 9999,
  },
});
