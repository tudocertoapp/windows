import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout } from '../utils/platformLayout';

const OPTIONS = [
  { id: 'pessoal', label: 'Pessoal', icon: 'person-outline' },
  { id: 'empresa', label: 'Empresa', icon: 'business-outline' },
];

/**
 * Botões Pessoal / Empresa largos, quadrados com bordas arredondadas, ícone + texto.
 */
export function ViewModeToggle({ viewMode, setViewMode, colors, inline = false }) {
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: inline ? 6 : (useWebLayout ? 10 : 12),
        paddingVertical: inline ? 0 : (useWebLayout ? 10 : 14),
        paddingHorizontal: inline ? 0 : 16,
        backgroundColor: inline ? 'transparent' : colors.bg,
        justifyContent: inline ? 'flex-start' : (useWebLayout ? 'center' : 'flex-start'),
        flexWrap: inline ? 'nowrap' : 'wrap',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = viewMode === opt.id;
        const isEmpresa = opt.id === 'empresa';
        const activeBg = isEmpresa ? '#6366f1' : colors.primary;
        const inactiveBg = colors.card || colors.bgSecondary;
        const activeColor = '#fff';
        const inactiveColor = colors.textSecondary;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => { playTapSound(); setViewMode(opt.id); }}
            style={{
              flex: useWebLayout ? 0 : 1,
              width: inline ? 92 : (useWebLayout ? 130 : undefined),
              minWidth: inline ? 88 : (useWebLayout ? 120 : undefined),
              aspectRatio: 4.5,
              borderRadius: inline ? 8 : (useWebLayout ? 10 : 14),
              borderWidth: 1,
              borderColor: active ? (isEmpresa ? '#6366f1' : colors.primary) : (colors.border || 'rgba(255,255,255,0.15)'),
              backgroundColor: active ? activeBg : inactiveBg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: inline ? 4 : (useWebLayout ? 6 : 8),
              paddingHorizontal: inline ? 6 : 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: inline ? 4 : (useWebLayout ? 6 : 8) }}>
              <Ionicons
                name={opt.icon}
                size={inline ? 13 : (useWebLayout ? 17 : 22)}
                color={active ? activeColor : inactiveColor}
              />
              <Text
                style={{
                  fontSize: inline ? 10 : (useWebLayout ? 11 : 13),
                  fontWeight: '700',
                  color: active ? activeColor : inactiveColor,
                  letterSpacing: 0.2,
                }}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
