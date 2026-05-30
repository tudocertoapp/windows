import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlan } from '../../contexts/PlanContext';
import { AppIcon } from '../AppIcon';
import { playTapSound } from '../../utils/sounds';
import { scaleWebDesktop } from '../../utils/platformLayout';

/** Botões redondos da rail (tab bar + menu flutuante): 42×42. */
export const WEB_DESKTOP_RAIL_ROUND_BTN = 42;
const RAIL_ICON_SIZE = 21;

export function getWebDesktopRailCalcPosition(quickBtnHeight = scaleWebDesktop(36, true)) {
  const size = WEB_DESKTOP_RAIL_ROUND_BTN;
  const quickRowTotalH = WEB_DESKTOP_QUICK_ROW_SHELL_PAD_V * 2 + quickBtnHeight;
  const bottom = WEB_DESKTOP_QUICK_ROW_BOTTOM + quickRowTotalH / 2 - size / 2;
  const right = WEB_DESKTOP_RAIL_VIEWPORT_MARGIN + (WEB_DESKTOP_RAIL_WIDTH - size) / 2;
  return { bottom, right, size };
}

/** Botão redondo do menu — coluna da tab bar, alinhado à fileira F1–F8. */
export function DesktopRailMenuButton({ onPress, active, colors, quickBtnHeight }) {
  if (Platform.OS !== 'web') return null;
  const { bottom, right, size } = getWebDesktopRailCalcPosition(
    quickBtnHeight ?? scaleWebDesktop(36, true),
  );
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => {
        playTapSound();
        onPress?.();
      }}
      accessibilityLabel={active ? 'Fechar menu' : 'Abrir menu'}
      accessibilityRole="button"
      style={{
        position: 'fixed',
        bottom,
        right,
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.primaryRgba(0.14) : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary + '44' : colors.border,
        zIndex: 2147483646,
        ...(Platform.OS === 'web'
          ? { display: 'flex', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', cursor: 'pointer' }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 12,
            }),
      }}
    >
      <View
        style={{
          width: RAIL_ICON_SIZE,
          height: RAIL_ICON_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          ...(Platform.OS === 'web' ? { display: 'flex' } : {}),
        }}
      >
        <Ionicons
          name="menu"
          size={RAIL_ICON_SIZE}
          color={active ? colors.primary : colors.textSecondary}
          style={Platform.OS === 'web' ? { lineHeight: RAIL_ICON_SIZE, textAlign: 'center' } : undefined}
        />
      </View>
    </TouchableOpacity>
  );
}

/** Margem da rail à borda direita da janela (não encosta no canto). */
export const WEB_DESKTOP_RAIL_VIEWPORT_MARGIN = 12;
/** Folga entre o conteúdo principal e a coluna da rail (evita sobreposição visual). */
export const WEB_DESKTOP_RAIL_CONTENT_GAP = 12;
/** Margem vertical da rail em relação ao topo/fundo da viewport. */
export const WEB_DESKTOP_RAIL_VERTICAL_INSET = 12;
/** Fileira de atalhos F1–F8 (Início desktop): mesma linha vertical do menu flutuante na rail. */
export const WEB_DESKTOP_QUICK_ROW_BOTTOM = 8;
export const WEB_DESKTOP_QUICK_ROW_SHELL_PAD_V = 6;
/**
 * Largura da coluna dos botões (layout desktop web).
 * Reservada no flex do AppNavigator + folgas — ver WEB_DESKTOP_RAIL_LAYOUT_RESERVE.
 */
export const WEB_DESKTOP_RAIL_WIDTH = 64;
/** Espaço total a reservar à direita no layout: margem janela + rail + folga até o conteúdo. */
export const WEB_DESKTOP_RAIL_LAYOUT_RESERVE =
  WEB_DESKTOP_RAIL_VIEWPORT_MARGIN + WEB_DESKTOP_RAIL_WIDTH + WEB_DESKTOP_RAIL_CONTENT_GAP;

const ISLAND_RADIUS = 28;
const BTN = WEB_DESKTOP_RAIL_ROUND_BTN;
const ADD_BTN = 50;
const ICON_SIZE = RAIL_ICON_SIZE;
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

export function RightSideTabBar({
  activeRouteName,
  onNavigate,
  onAdd,
  onCalculadora,
  mode = 'side',
  calculatorActive = false,
}) {
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  if (!isWeb) return null;
  const isBottomMode = mode === 'bottom';

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
  ];

  if (showEmpresaFeatures) {
    tabItems.push({
      key: 'WhatsApp',
      label: 'WhatsApp',
      ionIcon: 'logo-whatsapp',
      onPress: () => onNavigate?.('WhatsApp'),
    });
  }
  tabItems.push({
    key: 'calculadora',
    label: 'Calculadora',
    icon: 'calculator-outline',
    onPress: () => onCalculadora?.(),
  });

  /** Safe area; altura útil = viewport entre paddings. O + fica no centro vertical dessa área. */
  const padTop = insets.top || 0;
  const padBottom = Math.max(12, insets.bottom || 0);

  const isItemActive = (it) => {
    if (it.key === 'calculadora') return calculatorActive;
    return activeRouteName === it.key;
  };

  const renderRailEntry = (it) => {
    const active = isItemActive(it);
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

  if (isBottomMode) {
    const estimatedWidth = Math.max(420, tabItems.length * 56 + 64);
    return (
      <View
        style={[
          s.bottomWrap,
          {
            width: estimatedWidth,
            borderColor: colors.border + '88',
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 10px 40px rgba(0,0,0,0.14), 0 2px 10px rgba(0,0,0,0.08)' }
              : {}),
          },
        ]}
      >
        <BlurView
          intensity={60}
          tint={(colors.isDarkBg ?? false) ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: (colors.isDarkBg ?? false)
                ? 'rgba(17,24,39,0.25)'
                : 'rgba(255,255,255,0.25)',
            },
          ]}
        />
        <View style={s.bottomInner}>
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
                  style={[s.bottomAddRound, { backgroundColor: colors.primary }]}
                  accessibilityLabel="Adicionar"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              );
            }
            const active = isItemActive(it);
            return (
              <TouchableOpacity
                key={it.key}
                activeOpacity={0.85}
                onPress={() => {
                  playTapSound();
                  it.onPress?.();
                }}
                style={[
                  s.bottomRoundBtn,
                  { borderColor: colors.border },
                  active && { backgroundColor: colors.primaryRgba(0.14), borderColor: colors.primary + '44' },
                ]}
                accessibilityLabel={it.label}
                accessibilityRole="button"
              >
                {it.ionIcon ? (
                  <Ionicons name={it.ionIcon} size={19} color={active ? colors.primary : colors.textSecondary} />
                ) : (
                  <AppIcon name={it.icon} size={19} color={active ? colors.primary : colors.textSecondary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.railOuter, { backgroundColor: 'transparent' }]}>
      <View
        style={[
          s.wrap,
          {
            paddingTop: padTop,
            paddingBottom: padBottom,
            backgroundColor: 'transparent',
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
    </View>
  );
}

const GAP = 10;

const s = StyleSheet.create({
  /** Coluna da rail: preenche a altura útil; justifyContent centra a pílula quando a coluna é mais alta que o conteúdo. */
  railOuter: {
    flex: 1,
    alignSelf: 'stretch',
    width: WEB_DESKTOP_RAIL_WIDTH,
    minHeight: 0,
    justifyContent: 'center',
  },
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: WEB_DESKTOP_RAIL_WIDTH,
    paddingHorizontal: 8,
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
  bottomWrap: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  bottomRoundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAddRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
