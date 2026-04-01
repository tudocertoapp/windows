import React from 'react';
import { View, Image } from 'react-native';
import { AUTH_LOGO_SOURCE, AUTH_MOBILE_LOGO_OVERLAY, getAuthMobileLogo } from './authUi';

/** Logomarca fixa no topo no mobile (web + nativo), mesma âncora em todas as telas de auth. */
export function AuthLogoMobile({ winW }) {
  const size = getAuthMobileLogo(winW);
  return (
    <View style={AUTH_MOBILE_LOGO_OVERLAY} pointerEvents="box-none">
      <Image
        source={AUTH_LOGO_SOURCE}
        style={{ width: size.width, height: size.height, marginBottom: 4 }}
        resizeMode="contain"
        accessibilityLabel="Tudo Certo"
      />
    </View>
  );
}
