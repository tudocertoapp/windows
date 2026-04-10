import React from 'react';
import { View, Text, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout, scaleWebDesktop } from '../utils/platformLayout';

const OPTIONS = [
  { id: 'pessoal', label: 'Pessoal', icon: 'person-outline', color: '#10b981', fn: 9 },
  { id: 'empresa', label: 'Empresa', icon: 'business-outline', color: '#6366f1', fn: 10 },
];

/**
 * Botões Pessoal / Empresa largos, quadrados com bordas arredondadas, ícone + texto.
 */
export function ViewModeToggle({ viewMode, setViewMode, colors, inline = false, inlineCardWidth, inlineCardHeight, inlineGap, inlineContainerWidth, desktopHeaderSplit = false }) {
  const isWeb = Platform.OS === 'web';
  const isDesktopLayout = useIsDesktopLayout();
  const useWebLayout = isWeb && isDesktopLayout;
  const useDesktopInlineCards = inline && useWebLayout;
  const { width: winWidth } = useWindowDimensions();
  const desktopPagePad = scaleWebDesktop(10, useWebLayout);
  const desktopRowGap = scaleWebDesktop(8, useWebLayout);
  const defaultInlineCardWidth = useDesktopInlineCards
    ? Math.max(90, ((Math.max(200, winWidth - (2 * desktopPagePad))) - (desktopRowGap * 7)) / 8)
    : 132;
  const resolvedInlineCardWidth = inlineCardWidth ?? defaultInlineCardWidth;
  const resolvedInlineGap = inlineGap ?? (useDesktopInlineCards ? desktopRowGap : 6);
  const defaultInlineContainerWidth = useDesktopInlineCards
    ? ((resolvedInlineCardWidth * 2) + resolvedInlineGap)
    : undefined;
  const resolvedInlineContainerWidth = inlineContainerWidth ?? defaultInlineContainerWidth;
  const useDesktopHeaderSplit = desktopHeaderSplit && useWebLayout;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: useDesktopHeaderSplit ? scaleWebDesktop(8, true) : (inline ? resolvedInlineGap : (useWebLayout ? 10 : 12)),
        paddingVertical: useDesktopHeaderSplit ? 0 : (inline ? 0 : (useWebLayout ? 10 : 14)),
        paddingHorizontal: useDesktopHeaderSplit ? 0 : (inline ? 0 : 16),
        ...(useDesktopInlineCards && resolvedInlineContainerWidth ? { width: resolvedInlineContainerWidth } : null),
        ...(useDesktopHeaderSplit ? { width: '100%' } : null),
        backgroundColor: inline ? 'transparent' : colors.bg,
        justifyContent: useDesktopHeaderSplit ? 'space-between' : (inline ? 'flex-start' : (useWebLayout ? 'center' : 'flex-start')),
        flexWrap: inline ? 'nowrap' : 'wrap',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = viewMode === opt.id;
        const accent = opt.id === 'pessoal' ? colors.primary : opt.color;
        const activeBg = accent;
        const inactiveBg = colors.card || colors.bgSecondary;
        const activeColor = '#fff';
        const inactiveColor = colors.textSecondary;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => { playTapSound(); setViewMode(opt.id); }}
            style={{
              flex: useDesktopHeaderSplit ? 1 : (useWebLayout ? 0 : 1),
              width: useDesktopHeaderSplit
                ? undefined
                : useDesktopInlineCards
                ? resolvedInlineCardWidth
                : (inline ? 132 : (useWebLayout ? 130 : undefined)),
              minWidth: useDesktopHeaderSplit
                ? 0
                : useDesktopInlineCards
                ? resolvedInlineCardWidth
                : (inline ? 126 : (useWebLayout ? 120 : undefined)),
              maxWidth: useDesktopHeaderSplit ? undefined : (useDesktopInlineCards ? resolvedInlineCardWidth : undefined),
              ...(useDesktopHeaderSplit
                ? { height: scaleWebDesktop(36, true) }
                : (useDesktopInlineCards ? { height: (inlineCardHeight ?? 40) } : { aspectRatio: 4.5 })),
              borderRadius: useDesktopHeaderSplit ? scaleWebDesktop(12, true) : (useDesktopInlineCards ? 14 : (inline ? 8 : (useWebLayout ? 10 : 14))),
              borderWidth: 1,
              borderColor: useDesktopInlineCards
                ? (active ? accent : `${accent}55`)
                : (active ? accent : (colors.border || 'rgba(255,255,255,0.15)')),
              backgroundColor: useDesktopHeaderSplit
                ? (active ? `${accent}2F` : `${accent}14`)
                : useDesktopInlineCards
                ? (active ? `${accent}28` : `${accent}16`)
                : (active ? activeBg : inactiveBg),
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: useDesktopHeaderSplit ? 7 : (useDesktopInlineCards ? 10 : (inline ? 5 : (useWebLayout ? 6 : 8))),
              paddingHorizontal: useDesktopHeaderSplit ? scaleWebDesktop(8, true) : (useDesktopInlineCards ? 10 : (inline ? 7 : 8)),
              position: useDesktopInlineCards ? 'relative' : 'static',
            }}
          >
            {useDesktopInlineCards ? (
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
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: accent }}>{`F${opt.fn}`}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: useDesktopHeaderSplit ? scaleWebDesktop(6, true) : (useDesktopInlineCards ? 6 : (inline ? 4 : (useWebLayout ? 6 : 8))) }}>
              <Ionicons
                name={opt.icon}
                size={useDesktopHeaderSplit ? scaleWebDesktop(15, true) : (useDesktopInlineCards ? 16 : (inline ? 14 : (useWebLayout ? 17 : 22)))}
                color={(useDesktopInlineCards || useDesktopHeaderSplit) ? accent : (active ? activeColor : inactiveColor)}
              />
              <Text
                style={{
                  fontSize: useDesktopHeaderSplit ? scaleWebDesktop(11, true) : (useDesktopInlineCards ? 12 : (inline ? 11 : (useWebLayout ? 11 : 13))),
                  fontWeight: '700',
                  color: (useDesktopInlineCards || useDesktopHeaderSplit) ? accent : (active ? activeColor : inactiveColor),
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
