import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../utils/sounds';

const OPTIONS = [
  { id: 'pessoal', label: 'Pessoal', icon: 'person-outline' },
  { id: 'empresa', label: 'Empresa', icon: 'rocket-outline' },
];

/**
 * Botões Pessoal / Empresa largos, quadrados com bordas arredondadas, ícone + texto.
 */
export function ViewModeToggle({ viewMode, setViewMode, colors }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.bg }}>
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
              flex: 1,
              aspectRatio: 4.5,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: active ? (isEmpresa ? '#6366f1' : colors.primary) : (colors.border || 'rgba(255,255,255,0.15)'),
              backgroundColor: active ? activeBg : inactiveBg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons
                name={opt.icon}
                size={22}
                color={active ? activeColor : inactiveColor}
              />
              <Text
                style={{
                  fontSize: 13,
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
