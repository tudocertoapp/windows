import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlan } from '../../contexts/PlanContext';
import { useMenu } from '../../contexts/MenuContext';
import { AppIcon } from '../AppIcon';
import { playTapSound } from '../../utils/sounds';

/**
 * Largura da coluna direita (layout desktop web) — reservada no flex.
 * Mantém a rail fina; a “pílula” só envolve os ícones (não estica a altura da viewport).
 */
export const WEB_DESKTOP_RAIL_WIDTH = 64;

const ISLAND_RADIUS = 28;
const BTN = 42;
const ADD_BTN = 50;
const ICON_SIZE = 21;
const ADD_ICON_SIZE = 28;

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

/** Deslocamento da pílula (desktop web): sobe 1/8 da altura útil e puxa um pouco para a esquerda. */
const ISLAND_SHIFT_X = 12;

export function RightSideTabBar({ activeRouteName, onNavigate, onAdd }) {
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const { openCalculadoraFull } = useMenu();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const islandTransform = useMemo(() => {
    const h = windowHeight > 0 ? windowHeight : 640;
    return [{ translateY: -(h / 8) }, { translateX: -ISLAND_SHIFT_X }];
  }, [windowHeight]);

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
      onPress: () => onNavigate?.('MeusGastos'),
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
      key: 'WhatsApp',
      label: 'WhatsApp',
      ionIcon: 'logo-whatsapp',
      onPress: () => onNavigate?.('WhatsApp'),
    });
  }

  /** Safe area; altura útil = viewport entre paddings. O + fica no centro vertical dessa área. */
  const padTop = insets.top || 0;
  const padBottom = Math.max(12, insets.bottom || 0);

  const renderRailEntry = (it) => {
    const active = activeRouteName === it.key;
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
  };

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
            transform: islandTransform,
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: '0 10px 40px rgba(0,0,0,0.14), 0 2px 10px rgba(0,0,0,0.08)',
                }
              : {}),
          },
        ]}
      >
        <View style={s.islandInner}>
          {tabItems.map((it) => {
            if (it.isAdd) {
              return (
                <TouchableOpacity
                  key="Adicionar"
                  activeOpacity={0.85}
                  onPress={() => {
                    playTapSound();
                    it.onPress?.();
                  }}
                  style={[s.addRound, { backgroundColor: colors.primary }]}
                  accessibilityLabel="Adicionar"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={ADD_ICON_SIZE} color="#fff" />
                </TouchableOpacity>
              );
            }
            return renderRailEntry(it);
          })}
        </View>
      </View>
    </View>
  );
}

const GAP = 10;

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: WEB_DESKTOP_RAIL_WIDTH,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  /** Pílula compacta: altura = ícones + espaçamento (não preenche a viewport). */
  island: {
    flexShrink: 0,
    alignSelf: 'center',
    borderRadius: ISLAND_RADIUS,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 7,
    overflow: 'visible',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  islandInner: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: GAP,
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
    width: ADD_BTN,
    height: ADD_BTN,
    borderRadius: ADD_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
