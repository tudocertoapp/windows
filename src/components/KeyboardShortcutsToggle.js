import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useKeyboardShortcuts } from '../contexts/KeyboardShortcutsContext';
import { isDesktopOnlyFeatureClient, useIsDesktopLayout } from '../utils/platformLayout';
import { playTapSound } from '../utils/sounds';

/** Ícone só: liga/desliga atalhos do teclado. Reutilizável no cabeçalho e no PDV. */
export function KeyboardShortcutsToggle({
  color,
  size = 22,
  style,
  alwaysShow = false,
}) {
  const { colors } = useTheme();
  const isDesktopLayout = useIsDesktopLayout();
  const { shortcutsEnabled, toggleShortcuts } = useKeyboardShortcuts();

  if (!alwaysShow && Platform.OS !== 'web') return null;
  if (!alwaysShow && !isDesktopOnlyFeatureClient(isDesktopLayout)) return null;

  const tint = color || (shortcutsEnabled ? colors.primary : colors.textSecondary);

  return (
    <TouchableOpacity
      onPress={() => {
        playTapSound();
        toggleShortcuts();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={shortcutsEnabled ? 'Desativar atalhos do teclado' : 'Ativar atalhos do teclado'}
      style={[{ padding: 8, backgroundColor: 'transparent' }, Platform.OS === 'web' ? { cursor: 'pointer' } : null, style]}
    >
      <Ionicons
        name={shortcutsEnabled ? 'keypad' : 'keypad-outline'}
        size={size}
        color={tint}
      />
    </TouchableOpacity>
  );
}
