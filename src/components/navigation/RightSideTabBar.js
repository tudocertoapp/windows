import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlan } from '../../contexts/PlanContext';
import { useMenu } from '../../contexts/MenuContext';
import { AppIcon } from '../AppIcon';
import { playTapSound } from '../../utils/sounds';

/**
 * Largura da coluna direita (layout desktop web) — reservada no flex.
 */
export const WEB_DESKTOP_RAIL_WIDTH = 72;

const ISLAND_RADIUS = 22;
const BTN = 44;
const ICON_SIZE = 22;
const ADD_ICON_SIZE = 26;

function RailItem({ icon, label, onPress, active, colors, ionIcon }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        playTapSound();
        onPress?.();
      }}
      style={[
        s.roundBtn,
        { borderColor: colors.border },
        active && { backgroundColor: colors.primaryRgba(0.14), borderColor: colors.primary + '44' },
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      {ionIcon ? (
        <Ionicons name={ionIcon} size={ICON_SIZE} color={active ? colors.primary : colors.textSecondary} />
      ) : (
        <AppIcon name={icon} size={ICON_SIZE} color={active ? colors.primary : colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

export function RightSideTabBar({ activeRouteName, onNavigate, onAdd, onMeusGastos }) {
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const { openCalculadoraFull, openMensagensWhatsApp } = useMenu();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  if (!isWeb) return null;

  const tabItems = [
    { key: 'Início', label: 'Início', icon: 'home-outline', onPress: () => onNavigate?.('Início') },
    { key: 'Dinheiro', label: 'Dinheiro', icon: 'wallet-outline', onPress: () => onNavigate?.('Dinheiro') },
    { key: 'Agenda', label: 'Agenda', icon: 'calendar-outline', onPress: () => onNavigate?.('Agenda') },
    {
      key: 'Adicionar',
      label: 'Adicionar',
      icon: 'add',
      isAdd: true,
      onPress: () => onAdd?.(),
    },
    {
      key: 'MeusGastos',
      label: 'Meus gastos',
      icon: 'chatbubbles-outline',
      onPress: () => onMeusGastos?.(),
    },
    {
      key: 'calc',
      label: 'Calculadora',
      icon: 'calculator-outline',
      onPress: () => openCalculadoraFull?.(),
    },
  ];

  if (showEmpresaFeatures) {
    tabItems.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      ionIcon: 'logo-whatsapp',
      onPress: () => openMensagensWhatsApp?.(),
    });
  }

  /** Safe area só; ilha centralizada na altura total da página (viewport), não “só abaixo do cabeçalho”. */
  const padTop = insets.top || 0;
  const padBottom = Math.max(12, insets.bottom || 0);

  return (
    <View
      style={[
        s.wrap,
        {
          width: WEB_DESKTOP_RAIL_WIDTH,
          paddingTop: padTop,
          paddingBottom: padBottom,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View
        style={[
          s.island,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
                }
              : {}),
          },
        ]}
      >
        <View style={s.btnColumn}>
          {tabItems.map((it) => {
            const active = !it.isAdd && activeRouteName === it.key;
            if (it.isAdd) {
              return (
                <TouchableOpacity
                  key={it.key}
                  activeOpacity={0.85}
                  onPress={() => {
                    playTapSound();
                    it.onPress?.();
                  }}
                  style={[s.addRound, { backgroundColor: colors.primary }]}
                  accessibilityLabel={it.label}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={ADD_ICON_SIZE} color="#fff" />
                </TouchableOpacity>
              );
            }
            return (
              <RailItem
                key={it.key}
                icon={it.icon}
                ionIcon={it.ionIcon}
                label={it.label}
                onPress={it.onPress}
                active={active}
                colors={colors}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: WEB_DESKTOP_RAIL_WIDTH,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  island: {
    alignSelf: 'center',
    flexShrink: 1,
    maxHeight: '100%',
    borderRadius: ISLAND_RADIUS,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  btnColumn: {
    alignItems: 'center',
    gap: 8,
  },
  roundBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRound: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
});
