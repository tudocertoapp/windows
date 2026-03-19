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

const SPRING_CONFIG = { damping: 18, stiffness: 180 };
const ICON_MAP = {
  Início: 'home-outline',
  Home: 'home-outline',
  Dinheiro: 'wallet-outline',
  Agenda: 'calendar-outline',
  Menu: 'menu-outline',
  Clientes: 'people-outline',
  Vendas: 'cart-outline',
  Relatórios: 'stats-chart-outline',
  Perfil: 'person-outline',
  Adicionar: 'add',
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function TabItem({ route, isFocused, onPress, onLongPress, primaryColor, inactiveColor, isDark, icon }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isFocused ? 1 : 0.85);
  const iconName = ICON_MAP[route.name] || 'ellipse-outline';

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

  const color = isFocused ? primaryColor : inactiveColor;
  const IconElement = icon;

  return (
    <AnimatedTouchable
      accessible
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tabItem, animatedItemStyle]}
      activeOpacity={1}
    >
      <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
        {isFocused && (
          <View style={[styles.activeIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)' }]} />
        )}
        <View style={styles.iconWrap}>
          {IconElement || <Ionicons name={iconName} size={24} color={color} />}
        </View>
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
          {route.name}
        </Text>
      </View>
    </AnimatedTouchable>
  );
}

const TabItemMemo = memo(TabItem);

function GlassTabBarComponent({ state, descriptors, navigation, primaryColor, inactiveColor, isDark, customHandlers = {} }) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { paddingBottom }]} pointerEvents="box-none">
      <View style={[styles.glass, isDark ? styles.glassDark : styles.glassLight]}>
        <View style={[styles.glassInner, { borderRadius: 26 }]}>
          {Platform.OS === 'web' ? (
            <View style={[StyleSheet.absoluteFill, styles.webFallback, isDark && styles.webFallbackDark]} />
          ) : (
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={[StyleSheet.absoluteFill, styles.overlay, isDark ? styles.overlayDark : styles.overlayLight]} />
          <View style={[StyleSheet.absoluteFill, styles.borderWrap, isDark ? styles.borderDark : styles.borderLight]} />
        </View>
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isAddButton = route.name === 'Adicionar';

            if (isAddButton) {
              const onAdd = customHandlers[route.name];
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={() => (onAdd ? onAdd() : navigation.emit({ type: 'tabPress', target: route.key }))}
                  style={styles.addButtonWrap}
                  activeOpacity={0.8}
                >
                  <View style={[styles.addButton, { backgroundColor: primaryColor }]}>
                    <Ionicons name="add" size={28} color="#fff" />
                  </View>
                </TouchableOpacity>
              );
            }

            const customHandler = customHandlers[route.name];
            const color = isFocused ? primaryColor : inactiveColor;
            const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color, size: 24 }) : null;

            return (
              <TabItemMemo
                key={route.key}
                route={route}
                isFocused={isFocused}
                icon={icon}
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
    />
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  glass: {
    width: '100%',
    borderRadius: 26,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  glassLight: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  glassDark: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassInner: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 26,
  },
  webFallback: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  webFallbackDark: {
    backgroundColor: 'rgba(30,41,59,0.4)',
  },
  overlay: {
    zIndex: 1,
  },
  overlayLight: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  overlayDark: {
    backgroundColor: 'rgba(17,24,39,0.25)',
  },
  borderWrap: {
    zIndex: 2,
    borderWidth: 1,
    borderRadius: 26,
  },
  borderLight: {
    borderColor: 'rgba(255,255,255,0.4)',
  },
  borderDark: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 64,
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
  label: {
    fontSize: 10,
  },
  addButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});

export { GlassTabBar };
