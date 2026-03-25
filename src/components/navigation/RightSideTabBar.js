import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { AppIcon } from '../AppIcon';
import { playTapSound } from '../../utils/sounds';

export function RightSideTabBar({ activeRouteName, onNavigate, onAdd, onMeusGastos }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  if (!isWeb) return null;

  const items = [
    { key: 'Início', icon: 'home-outline', onPress: () => onNavigate?.('Início') },
    { key: 'Dinheiro', icon: 'wallet-outline', onPress: () => onNavigate?.('Dinheiro') },
    { key: 'Adicionar', icon: 'add', isAdd: true, onPress: () => onAdd?.() },
    { key: 'Agenda', icon: 'calendar-outline', onPress: () => onNavigate?.('Agenda') },
    { key: 'MeusGastos', icon: 'chatbubbles-outline', onPress: () => onMeusGastos?.() },
  ];

  return (
    <View style={[s.wrap, { top: Math.max(12, (insets.top || 0) + 90) }]} pointerEvents="box-none">
      <View style={[s.bar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {items.map((it) => {
          const active = activeRouteName === it.key;
          if (it.isAdd) {
            return (
              <TouchableOpacity
                key={it.key}
                activeOpacity={0.85}
                onPress={() => { playTapSound(); it.onPress?.(); }}
                style={[s.addBtn, { backgroundColor: colors.primary }]}
                accessibilityLabel="Adicionar"
              >
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={it.key}
              activeOpacity={0.85}
              onPress={() => { playTapSound(); it.onPress?.(); }}
              style={[s.item, active && { backgroundColor: colors.primaryRgba(0.12), borderColor: colors.primary + '55' }]}
              accessibilityLabel={it.key}
            >
              <AppIcon name={it.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 14,
    zIndex: 2147483644,
  },
  bar: {
    width: 56,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    gap: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },
  item: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 18,
  },
});

