import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { usePlan } from '../../contexts/PlanContext';
import { AppIcon } from '../AppIcon';
import { playTapSound } from '../../utils/sounds';
import { isDesktopOnlyFeatureClient, useIsDesktopLayout } from '../../utils/platformLayout';

/** Botões redondos da rail (tab bar + menu flutuante): 42×42. */
export const WEB_DESKTOP_RAIL_ROUND_BTN = 42;
const RAIL_ICON_SIZE = 21;

export function getWebDesktopRailMenuPosition() {
  const size = WEB_DESKTOP_RAIL_ROUND_BTN;
  const top = WEB_DESKTOP_RAIL_VERTICAL_INSET;
  const right = WEB_DESKTOP_RAIL_VIEWPORT_MARGIN + (WEB_DESKTOP_RAIL_WIDTH - size) / 2;
  return { top, right, size };
}

/** Atalho do botão de menu da rail (não usa F1–F10, reservados à página inicial). */
export const DESKTOP_MENU_SHORTCUT = 'M';

/** Ordem visual da rail desktop: Início, Dinheiro, Agenda, +, Meus gastos, WhatsApp, Calculadora. */
export function buildDesktopRailShortcuts(showEmpresaFeatures) {
  const items = [
    { key: '1', id: 'Início' },
    { key: '2', id: 'Dinheiro' },
    { key: '3', id: 'Agenda' },
    { key: '4', id: 'add' },
    { key: '5', id: 'MeusGastos' },
  ];
  if (showEmpresaFeatures) items.push({ key: '6', id: 'WhatsApp' });
  items.push({ key: String(items.length + 1), id: 'calculadora' });
  return items;
}

/** Ordem visual da tab bar inferior (web sem rail): Início, Dinheiro, +, Agenda, Meus gastos. */
export function buildGlassTabShortcuts() {
  return [
    { key: '1', id: 'Início' },
    { key: '2', id: 'Dinheiro' },
    { key: '3', id: 'add' },
    { key: '4', id: 'Agenda' },
    { key: '5', id: 'MeusGastos' },
  ];
}

/** Selo igual aos atalhos F da página inicial e do PDV. Fica fora do círculo para não ser cortado. */
export function TabShortcutChip({ label, colors, style }) {
  const isDesktopLayout = useIsDesktopLayout();
  if (!label || !isDesktopOnlyFeatureClient(isDesktopLayout)) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -7,
          right: 2,
          zIndex: 30,
          borderRadius: 7,
          paddingHorizontal: 6,
          paddingVertical: 1,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.primary,
          ...(Platform.OS === 'web' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.18)' } : { elevation: 12 }),
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary, lineHeight: 12 }}>{label}</Text>
    </View>
  );
}

function ShortcutAnchor({ shortcut, colors, children, style }) {
  return (
    <View style={[s.shortcutAnchor, style]}>
      {children}
      <TabShortcutChip label={shortcut} colors={colors} />
    </View>
  );
}

/** Botão redondo do menu — coluna da tab bar, no topo da rail (mesma linha vertical). */
export function DesktopRailMenuButton({ onPress, active, colors }) {
  if (Platform.OS !== 'web') return null;
  const { top, right, size } = getWebDesktopRailMenuPosition();
  return (
    <View
      style={{
        position: 'fixed',
        top,
        right,
        width: size,
        height: size,
        overflow: 'visible',
        zIndex: 2147483646,
      }}
    >
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => {
        playTapSound();
        onPress?.();
      }}
      accessibilityLabel={active ? `Fechar menu (${DESKTOP_MENU_SHORTCUT})` : `Abrir menu (${DESKTOP_MENU_SHORTCUT})`}
      accessibilityRole="button"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        ...(Platform.OS === 'web'
          ? { display: 'flex', boxShadow: 'none', cursor: 'pointer' }
          : {
              shadowOpacity: 0,
              elevation: 0,
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
    <TabShortcutChip label={DESKTOP_MENU_SHORTCUT} colors={colors} />
    </View>
  );
}

/** Margem da rail à borda direita da janela (não encosta no canto). */
export const WEB_DESKTOP_RAIL_VIEWPORT_MARGIN = 12;
/** Folga entre o conteúdo principal e a coluna da rail (evita sobreposição visual). */
export const WEB_DESKTOP_RAIL_CONTENT_GAP = 12;
/** Margem vertical da rail em relação ao topo/fundo da viewport. */
export const WEB_DESKTOP_RAIL_VERTICAL_INSET = 12;
/** Fileira de atalhos F1–F8 (Início desktop). */
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

function RailItem({ icon, label, onPress, active, colors, ionIcon, shortcut }) {
  return (
    <ShortcutAnchor shortcut={shortcut} colors={colors}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          playTapSound();
          onPress?.();
        }}
        style={[s.roundBtn]}
        accessibilityLabel={shortcut ? `${label} (${shortcut})` : label}
        accessibilityRole="button"
      >
        {ionIcon ? (
          <Ionicons name={ionIcon} size={ICON_SIZE} color={active ? colors.primary : colors.textSecondary} />
        ) : (
          <AppIcon name={icon} size={ICON_SIZE} color={active ? colors.primary : colors.textSecondary} />
        )}
      </TouchableOpacity>
    </ShortcutAnchor>
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
  const shortcutById = Object.fromEntries(
    buildDesktopRailShortcuts(showEmpresaFeatures).map((item) => [
      item.id === 'add' ? 'Adicionar' : item.id,
      item.key,
    ])
  );

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
      label: 'Dock',
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
        shortcut={shortcutById[it.key]}
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
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...(Platform.OS === 'web' ? { boxShadow: 'none' } : {}),
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
                <ShortcutAnchor key="Adicionar" shortcut={shortcutById.Adicionar} colors={colors}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    playTapSound();
                    it.onPress?.();
                  }}
                  style={[s.bottomAddRound, { backgroundColor: colors.primary }]}
                  accessibilityLabel={`Adicionar (${shortcutById.Adicionar || ''})`}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
                </ShortcutAnchor>
              );
            }
            const active = isItemActive(it);
            return (
              <ShortcutAnchor key={it.key} shortcut={shortcutById[it.key]} colors={colors}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  playTapSound();
                  it.onPress?.();
                }}
                style={[
                  s.bottomRoundBtn,
                ]}
                accessibilityLabel={shortcutById[it.key] ? `${it.label} (${shortcutById[it.key]})` : it.label}
                accessibilityRole="button"
              >
                {it.ionIcon ? (
                  <Ionicons name={it.ionIcon} size={19} color={active ? colors.primary : colors.textSecondary} />
                ) : (
                  <AppIcon name={it.icon} size={19} color={active ? colors.primary : colors.textSecondary} />
                )}
              </TouchableOpacity>
              </ShortcutAnchor>
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
              borderWidth: 1,
              elevation: 0,
              shadowOpacity: 0,
              ...(Platform.OS === 'web' ? { boxShadow: 'none' } : {}),
            },
          ]}
        >
          <View style={s.islandInner}>
            {tabItems.map((it) => {
              if (it.isAdd) {
                return (
                  <ShortcutAnchor key="Adicionar" shortcut={shortcutById.Adicionar} colors={colors}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      playTapSound();
                      it.onPress?.();
                    }}
                    style={[s.addRound, { backgroundColor: colors.primary }]}
                    accessibilityLabel={`Adicionar (${shortcutById.Adicionar || ''})`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="add" size={ADD_ICON_SIZE} color="#fff" />
                  </TouchableOpacity>
                  </ShortcutAnchor>
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
  shortcutAnchor: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 2,
  },
  railOuter: {
    flex: 1,
    alignSelf: 'stretch',
    width: WEB_DESKTOP_RAIL_WIDTH,
    minHeight: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
    maxWidth: WEB_DESKTOP_RAIL_WIDTH,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    overflow: 'visible',
  },
  /** Pílula compacta: altura = ícones + espaçamento (não preenche a viewport). */
  island: {
    flexShrink: 0,
    alignSelf: 'center',
    borderRadius: ISLAND_RADIUS,
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 7,
    overflow: 'visible',
    elevation: 0,
    shadowOpacity: 0,
  },
  islandInner: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: GAP,
    overflow: 'visible',
  },
  roundBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', boxShadow: 'none' } : {}),
  },
  addRound: {
    width: ADD_BTN,
    height: ADD_BTN,
    borderRadius: ADD_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
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
    overflow: 'visible',
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
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  bottomAddRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
