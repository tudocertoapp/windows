import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useIsDesktopLayout } from '../utils/platformLayout';
import {
  AUTH_DESKTOP_PRIMARY_BUTTON,
  AUTH_DESKTOP_PRIMARY_TEXT,
  AUTH_DESKTOP_PRIMARY_TOP,
} from './authUi';

/**
 * Botão primário reutilizado em Começar (Vamos começar) e Login (Entrar / Criar conta).
 * Mesma posição e tamanho quando desktopFixedTop; label e ícone opcionais.
 */
export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  /** Ícone à direita (ex.: arrow-forward na Landing). */
  iconRight,
  iconRightSize,
  /** Desktop: posição absoluta igual ao Entrar. */
  desktopFixedTop = false,
  /** Desktop: segundo botão (ex.: +44 para Criar conta). */
  desktopStackOffset = 0,
  marginTop,
  marginBottom,
  /** Estilos extras (ex.: maxWidth no mobile da Landing). */
  containerStyle,
  /** Tamanho do texto do rótulo (ex.: dois botões lado a lado na Começar). */
  labelFontSize,
}) {
  const { colors } = useTheme();
  const dw = Platform.OS === 'web' && useIsDesktopLayout();
  const compactAuth = !dw;
  const desktopButtonStyle = dw ? [s.actionButtonDesktop, s.actionButtonSizeDesktop] : null;
  const desktopButtonTextStyle = dw ? s.actionButtonTextDesktop : null;

  return (
    <TouchableOpacity
      style={[
        s.btnPrimary,
        dw && s.btnPrimaryDesktop,
        desktopFixedTop &&
          (desktopStackOffset
            ? {
                position: 'absolute',
                top: AUTH_DESKTOP_PRIMARY_TOP + desktopStackOffset,
                left: 14,
                right: 14,
              }
            : s.btnPrimaryDesktopFixedTop),
        compactAuth && s.btnPrimaryCompact,
        desktopButtonStyle,
        { backgroundColor: colors.primary },
        marginTop != null ? { marginTop } : null,
        marginBottom != null ? { marginBottom } : null,
        containerStyle,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={s.btnPrimaryRow}>
          <Text
            style={[
              s.btnPrimaryText,
              dw && s.btnPrimaryTextDesktop,
              compactAuth && s.btnPrimaryTextCompact,
              labelFontSize != null ? { fontSize: labelFontSize } : null,
              desktopButtonTextStyle,
            ]}
          >
            {label}
          </Text>
          {iconRight ? (
            <Ionicons name={iconRight} size={iconRightSize ?? (dw ? 14 : 20)} color="#fff" />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btnPrimary: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 7,
    alignSelf: 'stretch',
    width: '100%',
  },
  btnPrimaryDesktop: { ...AUTH_DESKTOP_PRIMARY_BUTTON },
  btnPrimaryDesktopFixedTop: {
    position: 'absolute',
    top: AUTH_DESKTOP_PRIMARY_TOP,
    left: 14,
    right: 14,
  },
  btnPrimaryCompact: {
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  btnPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  btnPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  btnPrimaryTextDesktop: { ...AUTH_DESKTOP_PRIMARY_TEXT },
  btnPrimaryTextCompact: { fontSize: 17 },
  actionButtonDesktop: {
    width: '100%',
    maxWidth: 325,
    alignSelf: 'center',
  },
  actionButtonSizeDesktop: {
    minHeight: 29,
  },
  actionButtonTextDesktop: {
    fontSize: 10,
  },
});
