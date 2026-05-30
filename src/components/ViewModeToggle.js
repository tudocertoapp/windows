import React from 'react';
import { View, Text, TouchableOpacity, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout, scaleWebDesktop } from '../utils/platformLayout';
import { WEB_DESKTOP_RAIL_LAYOUT_RESERVE } from './navigation/RightSideTabBar';

const OPTIONS = [
  { id: 'pessoal', label: 'Pessoal', icon: 'person-outline', color: '#10b981', fn: 9 },
  { id: 'empresa', label: 'Empresa', icon: 'business-outline', color: '#6366f1', fn: 10 },
];

/** Fade acima dos botões (mobile / fileira standalone). No desktop abaixo do cabeçalho usa 0. */
export const VIEW_MODE_TOGGLE_FADE_ABOVE = 18;
export const VIEW_MODE_TOGGLE_FADE_ABOVE_DESKTOP = 0;
/** Fade abaixo dos botões (suaviza a borda inferior — evita corte seco). */
export const VIEW_MODE_TOGGLE_FADE_BELOW = 24;
/** Desktop abaixo do cabeçalho: sem degradê inferior nos botões Pessoal/Empresa. */
export const VIEW_MODE_TOGGLE_FADE_BELOW_DESKTOP = 0;
export const VIEW_MODE_TOGGLE_FADE_HEIGHT = VIEW_MODE_TOGGLE_FADE_ABOVE + VIEW_MODE_TOGGLE_FADE_BELOW;
/** Espaço livre abaixo dos botões (além da zona de fade). */
export const VIEW_MODE_TOGGLE_BOTTOM_GAP = 5;
/** Folga acima da fileira Pessoal/Empresa (abaixo do cabeçalho desktop). */
export const VIEW_MODE_TOGGLE_TOP_GAP = 6;
/** Sobe a fileira (somente mobile/standalone; desktop = 0 para não cobrir o avatar). */
export const VIEW_MODE_TOGGLE_LIFT = 0;
/** Empilhamento: botões sempre acima do conteúdo que rola e do degradê. */
export const VIEW_MODE_TOGGLE_Z = 20;
/** Altura do avatar no cabeçalho desktop (TopBar). */
export const VIEW_MODE_TOGGLE_AVATAR_H = 52;

function parseBgRgb(bg) {
  const raw = String(bg || '#f9fafb').trim();
  if (raw.startsWith('rgba(')) {
    const m = raw.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  }
  if (raw.startsWith('#') && raw.length >= 7) {
    return {
      r: parseInt(raw.slice(1, 3), 16),
      g: parseInt(raw.slice(3, 5), 16),
      b: parseInt(raw.slice(5, 7), 16),
    };
  }
  return { r: 249, g: 250, b: 251 };
}

function bgRgba(bg, alpha) {
  const { r, g, b } = parseBgRgb(bg);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Degradê suave: sólido no topo (cabeçalho) → fade → botões → fade na base. */
function buildScrollFadeGradient(bg) {
  const t0 = bgRgba(bg, 0);
  const t1 = bgRgba(bg, 0.5);
  const t2 = bgRgba(bg, 0.75);
  const solid = bgRgba(bg, 1);
  return {
    colors: [solid, t1, solid, solid, t2, t0],
    locations: [0, 0.16, 0.34, 0.58, 0.8, 1],
  };
}

function buildWebFadeBackground(bg) {
  const t0 = bgRgba(bg, 0);
  const t1 = bgRgba(bg, 0.5);
  const t2 = bgRgba(bg, 0.75);
  const solid = bgRgba(bg, 1);
  return `linear-gradient(to bottom, ${solid} 0%, ${t1} 16%, ${solid} 34%, ${solid} 58%, ${t2} 80%, ${t0} 100%)`;
}

/** Desktop (abaixo do cabeçalho): degradê só na base — sem faixa sólida em cima dos botões. */
function buildDesktopHeaderFadeGradient(bg) {
  const t0 = bgRgba(bg, 0);
  const t2 = bgRgba(bg, 0.72);
  const solid = bgRgba(bg, 1);
  return {
    colors: [solid, solid, t2, t0],
    locations: [0, 0.5, 0.82, 1],
  };
}

function buildWebDesktopHeaderFadeBackground(bg) {
  const t0 = bgRgba(bg, 0);
  const t2 = bgRgba(bg, 0.72);
  const solid = bgRgba(bg, 1);
  return `linear-gradient(to bottom, ${solid} 0%, ${solid} 50%, ${t2} 82%, ${t0} 100%)`;
}

/** Margem negativa no ScrollView para o conteúdo entrar na zona do fade inferior. */
export function getViewModeToggleScrollStyle(hasToggle, useWebLayout) {
  if (!hasToggle) return undefined;
  const belowRaw = useWebLayout ? VIEW_MODE_TOGGLE_FADE_BELOW_DESKTOP : VIEW_MODE_TOGGLE_FADE_BELOW;
  const below = useWebLayout ? scaleWebDesktop(belowRaw, true) : belowRaw;
  if (!below) return { zIndex: 0, position: 'relative' };
  return { marginTop: -below, zIndex: 0, position: 'relative' };
}

/**
 * Mesma largura dos cards logo abaixo (par 50/50 no scroll): área útil − gap, dividido em 2.
 * Desconta a reserva da rail direita no web desktop.
 */
export function getWebDesktopGridButtonMetrics(winWidth, useWebLayout) {
  const desktopPagePad = scaleWebDesktop(10, useWebLayout);
  const desktopRowGap = scaleWebDesktop(8, useWebLayout);
  const railReserve = useWebLayout ? WEB_DESKTOP_RAIL_LAYOUT_RESERVE : 0;
  const contentW = Math.max(200, winWidth - railReserve - 2 * desktopPagePad);
  const cardW = (contentW - desktopRowGap) / 2;
  const trackW = contentW;
  return { desktopPagePad, desktopRowGap, cardW, trackW, contentW };
}

/**
 * Botões Pessoal / Empresa largos, quadrados com bordas arredondadas, ícone + texto.
 */
export function ViewModeToggle({
  viewMode,
  setViewMode,
  colors,
  inline = false,
  inlineCardWidth,
  inlineCardHeight,
  inlineGap,
  inlineContainerWidth,
  desktopHeaderSplit = false,
  scrollFadeBackdrop,
}) {
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
  const useDesktopInlineCards = inline && useWebLayout;
  const useDesktopHeaderSplit = desktopHeaderSplit && useWebLayout;
  const useDesktopGridBtnSizing = useDesktopInlineCards || useDesktopHeaderSplit;
  const useDesktopFlexPair = useDesktopHeaderSplit;
  const { width: winWidth } = useWindowDimensions();
  const gridMetrics = getWebDesktopGridButtonMetrics(winWidth, useWebLayout);
  const desktopPagePad = gridMetrics.desktopPagePad;
  const desktopRowGap = gridMetrics.desktopRowGap;
  const defaultInlineCardWidth = useDesktopGridBtnSizing ? gridMetrics.cardW : 132;
  const resolvedInlineCardWidth = inlineCardWidth ?? defaultInlineCardWidth;
  const resolvedInlineGap = inlineGap ?? (useDesktopGridBtnSizing ? desktopRowGap : 6);
  const defaultInlineContainerWidth = useDesktopGridBtnSizing ? gridMetrics.trackW : undefined;
  const resolvedInlineContainerWidth = inlineContainerWidth ?? defaultInlineContainerWidth;
  const useScrollFade = scrollFadeBackdrop ?? (useDesktopHeaderSplit || (!inline && !useDesktopInlineCards));
  const fadeAboveRaw = useDesktopHeaderSplit ? VIEW_MODE_TOGGLE_FADE_ABOVE_DESKTOP : VIEW_MODE_TOGGLE_FADE_ABOVE;
  const fadeAbove = scaleWebDesktop(fadeAboveRaw, useWebLayout || isWeb);
  const fadeBelowRaw = useDesktopHeaderSplit ? VIEW_MODE_TOGGLE_FADE_BELOW_DESKTOP : VIEW_MODE_TOGGLE_FADE_BELOW;
  const fadeBelow = scaleWebDesktop(fadeBelowRaw, useWebLayout || isWeb);
  const bottomGap = scaleWebDesktop(VIEW_MODE_TOGGLE_BOTTOM_GAP, useWebLayout || isWeb);
  const liftUp = useDesktopHeaderSplit ? 0 : scaleWebDesktop(VIEW_MODE_TOGGLE_LIFT, useWebLayout || isWeb);
  const fadeGradient = useDesktopHeaderSplit
    ? buildDesktopHeaderFadeGradient(colors.bg)
    : buildScrollFadeGradient(colors.bg);
  const showFnBadge = useDesktopGridBtnSizing;
  const desktopGridWrapStyle = useDesktopHeaderSplit
    ? { width: '100%', alignSelf: 'stretch' }
    : useDesktopGridBtnSizing && resolvedInlineContainerWidth
    ? { width: resolvedInlineContainerWidth, alignSelf: 'flex-end' }
    : null;
  const toggleFrontStyle = {
    position: 'relative',
    zIndex: VIEW_MODE_TOGGLE_Z,
    ...(Platform.OS === 'web' ? { isolation: 'isolate' } : { elevation: 8 }),
  };
  const buttonFrontStyle = {
    position: 'relative',
    zIndex: VIEW_MODE_TOGGLE_Z + 1,
    ...(Platform.OS === 'android' ? { elevation: 10 } : null),
  };

  const buttonsRow = (
    <View
      style={{
        flexDirection: 'row',
        position: 'relative',
        zIndex: VIEW_MODE_TOGGLE_Z + 1,
        gap: useDesktopHeaderSplit ? scaleWebDesktop(8, true) : (inline ? resolvedInlineGap : (useWebLayout ? 10 : 12)),
        paddingVertical: useDesktopHeaderSplit ? 0 : (inline ? 0 : (useWebLayout ? 10 : 14)),
        paddingHorizontal: useDesktopHeaderSplit ? 0 : (inline ? 0 : 16),
        ...(useDesktopFlexPair
          ? { width: '100%' }
          : useDesktopGridBtnSizing && resolvedInlineContainerWidth
          ? { width: resolvedInlineContainerWidth, alignSelf: 'flex-end' }
          : null),
        backgroundColor: 'transparent',
        justifyContent: 'flex-start',
        flexWrap: inline ? 'nowrap' : 'wrap',
        overflow: 'visible',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = viewMode === opt.id;
        const accent = opt.id === 'pessoal' ? colors.primary : opt.color;
        const activeBg = accent;
        const inactiveBg = colors.card || colors.bgSecondary;
        const activeColor = '#fff';
        const inactiveColor = colors.textSecondary;
        const segmentLikeHeader = useDesktopHeaderSplit;
        const labelColor = segmentLikeHeader ? (active ? '#fff' : colors.text) : (active ? activeColor : inactiveColor);
        const iconColor = segmentLikeHeader ? (active ? '#fff' : colors.text) : (active ? activeColor : inactiveColor);
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => { playTapSound(); setViewMode(opt.id); }}
            style={{
              ...buttonFrontStyle,
              flex: useDesktopFlexPair ? 1 : (useDesktopGridBtnSizing ? 0 : (useWebLayout ? 0 : 1)),
              flexBasis: useDesktopFlexPair ? 0 : undefined,
              width: useDesktopFlexPair
                ? undefined
                : useDesktopGridBtnSizing
                ? resolvedInlineCardWidth
                : (inline ? 132 : (useWebLayout ? 130 : undefined)),
              minWidth: useDesktopFlexPair ? 0 : useDesktopGridBtnSizing
                ? resolvedInlineCardWidth
                : (inline ? 126 : (useWebLayout ? 120 : undefined)),
              maxWidth: useDesktopFlexPair ? undefined : (useDesktopGridBtnSizing ? resolvedInlineCardWidth : undefined),
              ...(useDesktopHeaderSplit
                ? { height: scaleWebDesktop(36, true) }
                : (useDesktopInlineCards ? { height: (inlineCardHeight ?? 40) } : { aspectRatio: 4.5 })),
              borderRadius: useDesktopHeaderSplit ? scaleWebDesktop(12, true) : (useDesktopInlineCards ? 14 : (inline ? 8 : (useWebLayout ? 10 : 14))),
              borderWidth: 1,
              borderColor: useDesktopInlineCards
                ? (active ? accent : `${accent}55`)
                : (active ? accent : (colors.border || 'rgba(255,255,255,0.15)')),
              backgroundColor: useDesktopHeaderSplit
                ? (active ? accent : (opt.id === 'pessoal' ? colors.primaryRgba(0.15) : 'rgba(99,102,241,0.15)'))
                : useDesktopInlineCards
                ? (active ? `${accent}28` : `${accent}16`)
                : (active ? activeBg : inactiveBg),
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: useDesktopHeaderSplit ? 7 : (useDesktopInlineCards ? 10 : (inline ? 5 : (useWebLayout ? 6 : 8))),
              paddingHorizontal: useDesktopHeaderSplit ? scaleWebDesktop(8, true) : (useDesktopInlineCards ? 10 : (inline ? 7 : 8)),
              position: showFnBadge ? 'relative' : 'static',
              overflow: showFnBadge ? 'visible' : 'hidden',
            }}
          >
            {showFnBadge ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -5,
                  right: 6,
                  borderRadius: 7,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: accent,
                  zIndex: VIEW_MODE_TOGGLE_Z + 4,
                  elevation: 12,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: accent }}>{`F${opt.fn}`}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: useDesktopHeaderSplit ? scaleWebDesktop(6, true) : (useDesktopInlineCards ? 6 : (inline ? 4 : (useWebLayout ? 6 : 8))) }}>
              <Ionicons
                name={opt.icon}
                size={useDesktopHeaderSplit ? scaleWebDesktop(15, true) : (useDesktopInlineCards ? 16 : (inline ? 14 : (useWebLayout ? 17 : 22)))}
                color={segmentLikeHeader ? iconColor : ((useDesktopInlineCards) ? accent : (active ? activeColor : inactiveColor))}
              />
              <Text
                style={{
                  fontSize: useDesktopHeaderSplit ? scaleWebDesktop(11, true) : (useDesktopInlineCards ? 12 : (inline ? 11 : (useWebLayout ? 11 : 13))),
                  fontWeight: '700',
                  color: segmentLikeHeader ? labelColor : ((useDesktopInlineCards) ? accent : (active ? activeColor : inactiveColor)),
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

  if (!useScrollFade || useDesktopHeaderSplit) {
    return (
      <View
        style={{
          marginTop: -liftUp,
          marginBottom: bottomGap,
          backgroundColor: 'transparent',
          ...toggleFrontStyle,
          ...desktopGridWrapStyle,
        }}
      >
        {buttonsRow}
      </View>
    );
  }

  const webFadeBg = isWeb
    ? (useDesktopHeaderSplit ? buildWebDesktopHeaderFadeBackground(colors.bg) : buildWebFadeBackground(colors.bg))
    : null;

  return (
    <View
      style={{
        ...toggleFrontStyle,
        paddingTop: fadeAbove,
        paddingBottom: fadeBelow,
        marginTop: -liftUp,
        marginBottom: bottomGap,
        overflow: 'visible',
        ...desktopGridWrapStyle,
        ...(isWeb
          ? {
              backgroundImage: webFadeBg,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
            }
          : null),
      }}
      pointerEvents="box-none"
    >
      {!isWeb ? (
        <LinearGradient
          pointerEvents="none"
          colors={fadeGradient.colors}
          locations={fadeGradient.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
        />
      ) : null}
      <View style={{ position: 'relative', zIndex: VIEW_MODE_TOGGLE_Z + 1 }} pointerEvents="auto">
        {buttonsRow}
      </View>
    </View>
  );
}
