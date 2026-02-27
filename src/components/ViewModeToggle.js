import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { playTapSound } from '../utils/sounds';

/**
 * Botões Pessoal / Empresa centralizados e em destaque.
 */
export function ViewModeToggle({ viewMode, setViewMode, colors }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.bg }}>
      {['pessoal', 'empresa'].map((m) => (
        <TouchableOpacity
          key={m}
          onPress={() => { playTapSound(); setViewMode(m); }}
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 24,
            marginHorizontal: 6,
            backgroundColor: viewMode === m ? colors.primary : colors.primaryRgba(0.12),
            minWidth: 100,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: viewMode === m ? '#fff' : colors.text,
              letterSpacing: 0.3,
            }}
          >
            {m === 'pessoal' ? 'Pessoal' : 'Empresa'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
