import React, { memo, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabShortcutChip } from './RightSideTabBar';
import { isDesktopOnlyFeatureClient, useIsDesktopLayout } from '../../utils/platformLayout';

const SPRING_CONFIG = { damping: 18, stiffness: 180 };
const ICON_MAP = {
  Início: 'home-outline',
  Home: 'home-outline',
  Dinheiro: 'wallet-outline',
  Agenda: 'calendar-outline',
  MeusGastos: 'chatbubbles-outline',
  WhatsApp: 'logo-whatsapp',
  Menu: 'menu-outline',
  Clientes: 'people-outline',
  Vendas: 'cart-outline',
  Relatórios: 'stats-chart-outline',
  Perfil: 'person-outline',
  Adicionar: 'add',
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function TabItem({ route, isFocused, onPress, onLongPress, primaryColor, inactiveColor, isDark, icon, label, showLabel, shortcut, colors }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isFocused ? 1 : 0.85);
  const iconName = ICON_MAP[route.name] || 'ellipse-outline';
  const displayLabel = label ?? route.name;

  const animatedItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRING_CONFIG);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1, SPRING_CONFIG);
  }, [scale, isFocused]);
  const handlePress = useCallback(() => {
    opacity.value = withTiming(1, { duration: 200 });
    onPress();
  }, [onPress, opacity]);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1, SPRING_CONFIG);
    opacity.value = withTiming(isFocused ? 1 : 0.85, { duration: 200 });
  }, [isFocused, scale, opacity]);

  const color = isFocused ? '#e4e4e7' : '#a1a1aa';
  const IconElement = icon;

  const tabInner = (
    <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
      {isFocused && (
        <View style={[styles.activeIndicator, { backgroundColor: 'rgba(24,24,27,0.95)' }]} />
      )}
      <View style={[styles.iconWrap, !showLabel && styles.iconWrapOnly]}>
        {IconElement || <Ionicons name={iconName} size={24} color={color} />}
      </View>
      {showLabel ? (
        <Text
          style={[
            styles.label,
            {
              color,
              fontWeight: isFocused ? '600' : '500',
              opacity: isFocused ? 1 : 0.8,
            },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      ) : null}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        accessible
        accessibilityRole="button"
        accessibilityLabel={shortcut ? `${displayLabel} (${shortcut})` : displayLabel}
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.tabItem, { overflow: 'visible', position: 'relative' }]}
        activeOpacity={0.85}
      >
        <View style={{ position: 'relative', overflow: 'visible' }}>
          {tabInner}
          <TabShortcutChip label={shortcut} colors={colors} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <AnimatedTouchable
      accessible
      accessibilityRole="button"
      accessibilityLabel={shortcut ? `${displayLabel} (${shortcut})` : displayLabel}
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabItem, animatedItemStyle]}
      activeOpacity={1}
    >
      {tabInner}
    </AnimatedTouchable>
  );
}

const TabItemMemo = memo(TabItem);

function GlassTabBarComponent({ state, descriptors, navigation, primaryColor, inactiveColor, isDark, customHandlers = {}, showLabel = false, hiddenRouteNames = [] }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const paddingBottom = Math.max(insets.bottom, 8);
  const routes = state?.routes;
  const isDesktopLayout = useIsDesktopLayout();
  const showShortcuts = isDesktopOnlyFeatureClient(isDesktopLayout);

  if (!routes?.length || !descriptors || !navigation) return null;

  return (
    <View style={[styles.container, { paddingBottom, pointerEvents: 'box-none' }]}>
      <View style={[styles.glass, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.glassInner, { borderRadius: 26, backgroundColor: colors.card }]}>
          {Platform.OS === 'web' || Platform.OS === 'android' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : (
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: 'transparent' }]} />
          <View style={[StyleSheet.absoluteFill, styles.borderWrap, { borderColor: colors.border }]} />
        </View>
        <View style={styles.tabsRow}>
          {routes
            .filter((route) => !hiddenRouteNames.includes(route.name))
            .map((route) => {
            const descriptor = descriptors[route.key];
            const options = descriptor?.options || {};
            const index = routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === index;
            const isAddButton = route.name === 'Adicionar';
            const shortcut = showShortcuts ? String(index + 1) : null;

            if (isAddButton) {
              const onAdd = customHandlers[route.name];
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={() => (onAdd ? onAdd() : navigation.emit({ type: 'tabPress', target: route.key }))}
                  style={styles.addButtonWrap}
                  activeOpacity={0.8}
                  accessibilityLabel={shortcut ? `Adicionar (${shortcut})` : 'Adicionar'}
                >
                  <View style={{ position: 'relative', overflow: 'visible' }}>
                    <View style={[styles.addButton, { backgroundColor: primaryColor }]}>
                      <Ionicons name="add" size={28} color="#fff" />
                    </View>
                    <TabShortcutChip label={shortcut} colors={colors} />
                  </View>
                </TouchableOpacity>
              );
            }

            const customHandler = customHandlers[route.name];
            const color = isFocused ? primaryColor : inactiveColor;
            const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color, size: 24 }) : null;
            const tabLabel = options.tabBarLabel ?? options.title;

            return (
              <TabItemMemo
                key={route.key}
                route={route}
                isFocused={isFocused}
                icon={icon}
                label={tabLabel}
                showLabel={showLabel}
                onPress={() => {
                  if (customHandler) {
                    customHandler();
                    return;
                  }
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                primaryColor={primaryColor}
                inactiveColor={inactiveColor}
                isDark={isDark}
                shortcut={shortcut}
                colors={colors}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const GlassTabBar = memo(function GlassTabBar(props) {
  const { colors } = useTheme();
  const primaryColor = props.primaryColor ?? colors.primary;
  const inactiveColor = props.inactiveColor ?? colors.textSecondary;
  const isDark = colors.isDarkBg ?? (colors.text === '#ffffff' || colors.text === '#f9fafb');

  return (
    <GlassTabBarComponent
      {...props}
      primaryColor={primaryColor}
      inactiveColor={inactiveColor}
      isDark={isDark}
      customHandlers={props.customHandlers}
      showLabel={props.showLabel ?? false}
      hiddenRouteNames={props.hiddenRouteNames ?? []}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Descer 10px no mobile e web mobile
    bottom: Platform.OS === 'web' ? 2 : 10,
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    ...(Platform.OS === 'web'
      ? { zIndex: 10000, elevation: 10000 }
      : { zIndex: 10000, elevation: 10000 }),
  },
  glass: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'visible',
    ...(Platform.OS === 'web'
      ? { boxShadow: 'none' }
      : {
          shadowOpacity: 0,
          elevation: 0,
        }),
  },
  glassInner: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 26,
  },
  webFallback: {
    backgroundColor: 'rgba(9,9,11,0.96)',
  },
  webFallbackDark: {
    backgroundColor: 'rgba(9,9,11,0.96)',
  },
  overlay: {
    zIndex: 1,
  },
  overlayLight: {
    backgroundColor: 'transparent',
  },
  overlayDark: {
    backgroundColor: 'transparent',
  },
  borderWrap: {
    zIndex: 2,
    borderWidth: 1,
    borderRadius: 26,
  },
  borderLight: {
    borderColor: '#27272a',
  },
  borderDark: {
    borderColor: '#27272a',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 52,
    backgroundColor: 'transparent',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  tabContentActive: {
    minWidth: 64,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    opacity: 0.5,
  },
  iconWrap: {
    marginBottom: 2,
  },
  iconWrapOnly: {
    marginBottom: 0,
  },
  label: {
    fontSize: 10,
  },
  addButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    // Menos agressivo no nativo para reduzir risco de recorte pelo conteúdo acima.
    marginTop: Platform.OS === 'web' ? -32 : -26,
  },
  addButton: {
    borderWidth: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 14px rgba(0,0,0,0.22)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
});

export { GlassTabBar };
